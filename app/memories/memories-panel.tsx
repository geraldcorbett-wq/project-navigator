"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { getSupabaseBrowserClient } from "../../lib/supabase/client";
import RelatedPanel from "../../components/related-panel";
import { useLinkSelection } from "../../components/use-link-selection";

type Memory = {
  id: string;
  content: string;
  category: string;
  importance: number;
  is_pinned: boolean;
  updated_at: string;
  memory_conversations?: { conversation_id: string }[];
};

type Conversation = { id: string; title: string };

export default function MemoriesPanel() {
  const supabase = useMemo(() => getSupabaseBrowserClient(), []);
  const [memories, setMemories] = useState<Memory[]>([]);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [content, setContent] = useState("");
  const [category, setCategory] = useState("general");
  const [importance, setImportance] = useState(3);
  const [query, setQuery] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [message, setMessage] = useState("Loading memories…");
  const [busy, setBusy] = useState(false);
  const [pinLimit, setPinLimit] = useState(3);
  const { selectionMode, selectEntity, cancelSelection, selectionMessage } = useLinkSelection();

  async function token() {
    return (await supabase.auth.getSession()).data.session?.access_token;
  }

  async function load(search = query) {
    const accessToken = await token();
    if (!accessToken) { setMessage("Sign in to use memory."); return; }
    const suffix = search.trim() ? `?q=${encodeURIComponent(search.trim())}` : "";
    const [memoryResponse, conversationResponse, profileResponse] = await Promise.all([
      fetch(`/api/memories${suffix}`, { headers: { Authorization: `Bearer ${accessToken}` } }),
      fetch("/api/conversations", { headers: { Authorization: `Bearer ${accessToken}` } }),
      fetch("/api/profile", { headers: { Authorization: `Bearer ${accessToken}` } })
    ]);
    const memoryBody = await memoryResponse.json();
    const conversationBody = await conversationResponse.json();
    const profileBody = profileResponse.ok ? await profileResponse.json() : null;
    if (!memoryResponse.ok) { setMessage(memoryBody.error || "Could not load memories."); return; }
    setMemories(memoryBody.memories || []);
    if (conversationResponse.ok) setConversations(conversationBody.conversations || []);
    if (profileBody?.profile?.memory_pin_limit) setPinLimit(Number(profileBody.profile.memory_pin_limit));
    setMessage(memoryBody.memories?.length ? "" : "No memories found.");
  }

  useEffect(() => { void load(""); }, []);

  function resetForm() {
    setEditingId(null);
    setContent("");
    setCategory("general");
    setImportance(3);
  }

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const clean = content.trim();
    if (!clean) return;
    setBusy(true);
    const accessToken = await token();
    if (!accessToken) { setBusy(false); return; }
    const response = await fetch(editingId ? `/api/memories/${editingId}` : "/api/memories", {
      method: editingId ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${accessToken}` },
      body: JSON.stringify({ content: clean, category: category.trim() || "general", importance })
    });
    const body = await response.json();
    setBusy(false);
    if (!response.ok) { setMessage(body.error || "Could not save memory."); return; }
    resetForm();
    await load();
    setMessage(editingId ? "Memory updated." : "Memory saved.");
  }

  async function patch(id: string, values: Record<string, unknown>) {
    const accessToken = await token();
    if (!accessToken) return;
    const response = await fetch(`/api/memories/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${accessToken}` },
      body: JSON.stringify(values)
    });
    if (!response.ok) { const body = await response.json(); setMessage(body.error || "Could not update memory."); return; }
    await load();
  }

  async function remove(id: string) {
    const accessToken = await token();
    if (!accessToken) return;
    const response = await fetch(`/api/memories/${id}`, { method: "DELETE", headers: { Authorization: `Bearer ${accessToken}` } });
    if (!response.ok) { const body = await response.json(); setMessage(body.error || "Could not delete memory."); return; }
    if (editingId === id) resetForm();
    await load();
  }

  async function attach(memoryId: string, conversationId: string) {
    if (!conversationId) return;
    const accessToken = await token();
    if (!accessToken) return;
    const response = await fetch(`/api/conversations/${conversationId}/memories`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${accessToken}` },
      body: JSON.stringify({ memory_id: memoryId })
    });
    const body = response.status === 204 ? null : await response.json();
    if (!response.ok) { setMessage(body?.error || "Could not attach memory."); return; }
    await load();
    setMessage("Memory attached.");
  }


  async function changePinLimit(nextLimit: number) {
    const accessToken = await token();
    if (!accessToken) return;
    const response = await fetch("/api/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${accessToken}` },
      body: JSON.stringify({ memory_pin_limit: nextLimit })
    });
    const body = await response.json();
    if (!response.ok) { setMessage(body.error || "Could not change pin limit."); return; }
    setPinLimit(nextLimit);
    setMessage(`Memory pin limit set to ${nextLimit}.`);
  }

  function beginEdit(memory: Memory) {
    setEditingId(memory.id);
    setContent(memory.content);
    setCategory(memory.category);
    setImportance(memory.importance);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  return (
    <div className="featureStack">
      {selectionMode && <div className="selectionBanner"><strong>Select a memory to link</strong><button type="button" className="quietButton" onClick={cancelSelection}>Cancel</button></div>}
      {!selectionMode && <form className="featureForm memoryForm" onSubmit={save}>
        <label>Memory<textarea rows={4} maxLength={8000} value={content} onChange={(event) => setContent(event.target.value)} placeholder="What should Navigator remember?" /></label>
        <div className="memoryFields">
          <label>Category<input maxLength={80} value={category} onChange={(event) => setCategory(event.target.value)} /></label>
          <label>Importance<select value={importance} onChange={(event) => setImportance(Number(event.target.value))}>
            <option value={5}>5 - Critical</option>
            <option value={4}>4 - High</option>
            <option value={3}>3 - Medium</option>
            <option value={2}>2 - Low</option>
            <option value={1}>1 - None</option>
          </select></label>
        </div>
        <div className="inlineActions">
          <button className="primaryButton" disabled={busy || !content.trim()}>{busy ? "Saving…" : editingId ? "Update memory" : "Save memory"}</button>
          {editingId && <button type="button" className="quietButton" onClick={resetForm}>Cancel</button>}
        </div>
      </form>}

      {!selectionMode && <div className="memoryTools">
        <form className="memorySearch" onSubmit={(event) => { event.preventDefault(); void load(); }}>
          <label>Search memories<input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search content or category" /></label>
          <button className="quietButton">Search</button>
        </form>
        <label>Memory pin limit
          <select value={pinLimit} onChange={(event) => void changePinLimit(Number(event.target.value))}>
            <option value={3}>3</option>
            <option value={4}>4</option>
            <option value={5}>5</option>
          </select>
        </label>
      </div>}

      {(selectionMessage || message) && <p className="authMessage" aria-live="polite">{selectionMessage || message}</p>}

      <div className="itemList">
        {memories.map((memory) => selectionMode ? (
          <button type="button" className={`itemCard selectionCard ${memory.is_pinned ? "pinnedCard" : ""}`} key={memory.id} onClick={() => void selectEntity("memory", memory.id)}>
            <div><div className="memoryMeta"><span>{memory.category}</span><span className={`importance importance${memory.importance}`}>{({5:"Critical",4:"High",3:"Medium",2:"Low",1:"None"} as Record<number,string>)[memory.importance]}</span></div><p>{memory.content}</p></div>
          </button>
        ) : (
          <article className={`itemCard memoryCard ${memory.is_pinned ? "memoryPinned pinnedCard" : ""}`} key={memory.id}>
            <div className="memoryBody">
              <div className="memoryMeta"><span>{memory.category}</span><span className={`importance importance${memory.importance}`}>{({5:"Critical",4:"High",3:"Medium",2:"Low",1:"None"} as Record<number,string>)[memory.importance]}</span>{memory.is_pinned && <span>pinned</span>}</div>
              <p>{memory.content}</p>
              <small>{new Date(memory.updated_at).toLocaleString()}</small>
              {conversations.length > 0 && (
                <label className="attachMemory">Attach to conversation
                  <select defaultValue="" onChange={(event) => { void attach(memory.id, event.target.value); event.currentTarget.value = ""; }}>
                    <option value="">Choose…</option>
                    {conversations.map((conversation) => <option key={conversation.id} value={conversation.id}>{conversation.title}</option>)}
                  </select>
                </label>
              )}
            </div>
            <div className="cardActions">
              <button className="textLink" type="button" onClick={() => void patch(memory.id, { is_pinned: !memory.is_pinned })}>{memory.is_pinned ? "unpin" : "pin"}</button>
              <button className="textLink" type="button" onClick={() => beginEdit(memory)}>edit</button>
              <button className="dangerLink" type="button" onClick={() => void remove(memory.id)}>delete</button>
            </div>
            <RelatedPanel entityType="memory" entityId={memory.id} />
          </article>
        ))}
      </div>
    </div>
  );
}
