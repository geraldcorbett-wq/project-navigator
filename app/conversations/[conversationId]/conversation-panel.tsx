"use client";

import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { registerPlugin } from "@capacitor/core";
import { getSupabaseBrowserClient } from "../../../lib/supabase/client";
import RelatedPanel from "../../../components/related-panel";

type Conversation = {
  id: string;
  title: string;
  summary: string | null;
  status: "active" | "archived";
};

type Memory = { id: string; content: string; category: string; importance: number; is_pinned: boolean };

type Message = {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  created_at: string;
};
interface NavigatorLocalAIPlugin {
  availability(): Promise<{ available: boolean; reason?: string; message?: string }>;
  respond(options: { instructions: string; prompt: string }): Promise<{ text: string }>;
}

const NavigatorLocalAI = registerPlugin<NavigatorLocalAIPlugin>("NavigatorLocalAI");


export default function ConversationPanel({ conversationId }: { conversationId: string }) {
  const supabase = useMemo(() => getSupabaseBrowserClient(), []);
  const router = useRouter();
  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [linkedMemories, setLinkedMemories] = useState<Memory[]>([]);
  const [relevantMemories, setRelevantMemories] = useState<Memory[]>([]);
  const [draft, setDraft] = useState("");
  const [editingTitle, setEditingTitle] = useState(false);
  const [title, setTitle] = useState("");
  const [status, setStatus] = useState("Loading…");
  const [busy, setBusy] = useState(false);
  const bottomRef = useRef<HTMLDivElement | null>(null);

  async function accessToken() {
    return (await supabase.auth.getSession()).data.session?.access_token;
  }

  async function load() {
    const token = await accessToken();
    if (!token) {
      setStatus("Sign in to use conversations.");
      return;
    }

    const [conversationResponse, messagesResponse, memoriesResponse] = await Promise.all([
      fetch(`/api/conversations/${conversationId}`, { headers: { Authorization: `Bearer ${token}` } }),
      fetch(`/api/conversations/${conversationId}/messages`, { headers: { Authorization: `Bearer ${token}` } }),
      fetch(`/api/conversations/${conversationId}/memories`, { headers: { Authorization: `Bearer ${token}` } })
    ]);

    const conversationBody = await conversationResponse.json();
    const messagesBody = await messagesResponse.json();
    const memoriesBody = await memoriesResponse.json();

    if (!conversationResponse.ok) {
      setStatus(conversationBody.error || "Could not load conversation.");
      return;
    }
    if (!messagesResponse.ok) {
      setStatus(messagesBody.error || "Could not load messages.");
      return;
    }

    setConversation(conversationBody.conversation);
    setTitle(conversationBody.conversation.title);
    setMessages(messagesBody.messages || []);
    if (memoriesResponse.ok) {
      setLinkedMemories(memoriesBody.linked || []);
      setRelevantMemories(memoriesBody.relevant || []);
    }
    setStatus("");
  }

  useEffect(() => {
    void load();
  }, [conversationId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function send(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const clean = draft.trim();
    if (!clean || busy) return;

    setBusy(true);
    const token = await accessToken();
    if (!token) {
      setBusy(false);
      setStatus("Sign in to send messages.");
      return;
    }

    setDraft("");
    setStatus("Navigator is thinking…");

    try {
      const userResponse = await fetch(`/api/conversations/${conversationId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ content: clean })
      });
      const userBody = await userResponse.json();
      if (!userResponse.ok) {
        setDraft(clean);
        setStatus(userBody.error || "Could not save message.");
        return;
      }

      if (userBody.message) {
        setMessages((current) => current.some((item) => item.id === userBody.message.id) ? current : [...current, userBody.message]);
      }

      const contextResponse = await fetch(`/api/conversations/${conversationId}/local-context`, {
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store"
      });
      const contextBody = await contextResponse.json();
      if (!contextResponse.ok) {
        setStatus(contextBody.error || "Navigator context is unavailable.");
        return;
      }

      const availability = await NavigatorLocalAI.availability();
      if (!availability.available) {
        setStatus(availability.message || "Navigator local AI is not ready on this device.");
        return;
      }

      const local = await NavigatorLocalAI.respond({ instructions: contextBody.instructions, prompt: contextBody.prompt });
      if (!local.text?.trim()) {
        setStatus("Navigator did not produce a response.");
        return;
      }

      const saveResponse = await fetch(`/api/conversations/${conversationId}/local-result`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ content: local.text.trim() })
      });
      const saveBody = await saveResponse.json();
      if (!saveResponse.ok) {
        setStatus(saveBody.error || "Navigator could not save its response.");
        return;
      }

      if (saveBody.assistant_message) {
        setMessages((current) => current.some((item) => item.id === saveBody.assistant_message.id) ? current : [...current, saveBody.assistant_message]);
      }
      setStatus("");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Local AI request failed.";
      setStatus(message.includes("not implemented") ? "Navigator local AI is available in the iPhone app only." : `Navigator could not answer: ${message}`);
    } finally {
      setBusy(false);
    }
  }

  async function saveTitle() {
    const clean = title.trim();
    if (!clean) return;
    const token = await accessToken();
    if (!token) return;

    const response = await fetch(`/api/conversations/${conversationId}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({ title: clean })
    });
    const body = await response.json();
    if (!response.ok) {
      setStatus(body.error || "Could not rename conversation.");
      return;
    }

    setConversation(body.conversation);
    setEditingTitle(false);
    setStatus("Renamed.");
  }

  async function attachMemory(memoryId: string) {
    const token = await accessToken();
    if (!token) return;
    const response = await fetch(`/api/conversations/${conversationId}/memories`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ memory_id: memoryId })
    });
    if (!response.ok) { const body = await response.json(); setStatus(body.error || "Could not attach memory."); return; }
    await load();
    setStatus("Memory attached.");
  }

  async function detachMemory(memoryId: string) {
    const token = await accessToken();
    if (!token) return;
    const response = await fetch(`/api/conversations/${conversationId}/memories?memory_id=${encodeURIComponent(memoryId)}`, {
      method: "DELETE", headers: { Authorization: `Bearer ${token}` }
    });
    if (!response.ok) { const body = await response.json(); setStatus(body.error || "Could not detach memory."); return; }
    await load();
    setStatus("Memory detached.");
  }

  async function remove() {
    const token = await accessToken();
    if (!token) return;
    const response = await fetch(`/api/conversations/${conversationId}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` }
    });
    if (!response.ok) {
      const body = await response.json();
      setStatus(body.error || "Could not delete conversation.");
      return;
    }
    router.replace("/conversations");
  }

  if (!conversation) {
    return <p className="authMessage">{status}</p>;
  }

  return (
    <div className="conversationWorkspace">
      <header className="conversationHeader">
        <div>
          {editingTitle ? (
            <div className="titleEditRow">
              <input value={title} onChange={(event) => setTitle(event.target.value)} maxLength={160} autoFocus />
              <button type="button" className="textLink" onClick={() => void saveTitle()}>save</button>
              <button type="button" className="textLink" onClick={() => { setEditingTitle(false); setTitle(conversation.title); }}>cancel</button>
            </div>
          ) : (
            <h1 className="conversationTitle">{conversation.title}</h1>
          )}
          {!editingTitle && <button type="button" className="textLink" onClick={() => setEditingTitle(true)}>rename</button>}
        </div>
        <button type="button" className="dangerLink" onClick={() => void remove()}>delete conversation</button>
      </header>

      <RelatedPanel entityType="conversation" entityId={conversationId} />

      {(linkedMemories.length > 0 || relevantMemories.length > 0) && (
        <aside className="conversationMemoryPanel" aria-label="Conversation memory">
          <h2>Memory</h2>
          {linkedMemories.map((memory) => (
            <div className="conversationMemoryItem" key={memory.id}>
              <p>{memory.content}</p>
              <button type="button" className="textLink" onClick={() => void detachMemory(memory.id)}>detach</button>
            </div>
          ))}
          {relevantMemories.length > 0 && <p className="memorySuggestionLabel">Possibly relevant</p>}
          {relevantMemories.map((memory) => (
            <div className="conversationMemoryItem suggested" key={memory.id}>
              <p>{memory.content}</p>
              <button type="button" className="textLink" onClick={() => void attachMemory(memory.id)}>attach</button>
            </div>
          ))}
        </aside>
      )}

      <div className="messageList" aria-live="polite">
        {messages.length === 0 && <p className="emptyConversation">Start the conversation.</p>}
        {messages.map((message) => (
          <article className={`messageBubble ${message.role}`} key={message.id}>
            <p>{message.content}</p>
            <small>{new Date(message.created_at).toLocaleString()}</small>
          </article>
        ))}
        <div ref={bottomRef} />
      </div>

      <form className="messageComposer" onSubmit={send}>
        <label>
          Message
          <textarea value={draft} onChange={(event) => setDraft(event.target.value)} rows={4} maxLength={50000} placeholder="Write a message…" />
        </label>
        <button className="primaryButton" disabled={busy || !draft.trim()}>{busy ? "Saving…" : "Send"}</button>
      </form>
      {status && <p className="authMessage">{status}</p>}
    </div>
  );
}
