"use client";

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { getSupabaseBrowserClient } from "../../lib/supabase/client";
import { useLinkSelection } from "../../components/use-link-selection";

type Conversation={id:string;title:string;summary:string|null;status:"active"|"archived";last_message_at:string};
export default function ConversationsPanel(){
 const supabase=useMemo(()=>getSupabaseBrowserClient(),[]);const[conversations,setConversations]=useState<Conversation[]>([]);const[title,setTitle]=useState("");const[message,setMessage]=useState("Loading conversations…");const[busy,setBusy]=useState(false);const{selectionMode,selectEntity,cancelSelection,selectionMessage}=useLinkSelection();
 async function accessToken(){return(await supabase.auth.getSession()).data.session?.access_token;}
 async function load(){const token=await accessToken();if(!token){setMessage("Sign in to use conversations.");return;}const response=await fetch("/api/conversations",{headers:{Authorization:`Bearer ${token}`}});const body=await response.json();if(!response.ok){setMessage(body.error||"Could not load conversations.");return;}setConversations(body.conversations||[]);setMessage(body.conversations?.length?"":"No conversations yet.");}
 useEffect(()=>{void load();},[]);
 async function create(event:FormEvent<HTMLFormElement>){event.preventDefault();setBusy(true);const token=await accessToken();if(!token){setBusy(false);setMessage("Sign in to create a conversation.");return;}const response=await fetch("/api/conversations",{method:"POST",headers:{"Content-Type":"application/json",Authorization:`Bearer ${token}`},body:JSON.stringify({title:title.trim()||"New conversation"})});const body=await response.json();setBusy(false);if(!response.ok){setMessage(body.error||"Could not create conversation.");return;}window.location.href=`/conversations/${body.conversation.id}`;}
 async function remove(id:string){const token=await accessToken();if(!token)return;const response=await fetch(`/api/conversations/${id}`,{method:"DELETE",headers:{Authorization:`Bearer ${token}`}});if(!response.ok){const body=await response.json();setMessage(body.error||"Could not delete conversation.");return;}await load();}
 return <div className="featureStack">
  {selectionMode&&<div className="selectionBanner"><strong>Select a conversation to link</strong><button type="button" className="quietButton" onClick={cancelSelection}>Cancel</button></div>}
  {!selectionMode&&<form className="featureForm conversationCreate" onSubmit={create}><label>Conversation name<input value={title} onChange={event=>setTitle(event.target.value)} maxLength={160} placeholder="New conversation"/></label><button className="primaryButton" disabled={busy}>{busy?"Creating…":"Create conversation"}</button></form>}
  {(selectionMessage||message)&&<p className="authMessage" aria-live="polite">{selectionMessage||message}</p>}
  <div className="itemList">{conversations.map(conversation=>selectionMode?<button type="button" className="itemCard selectionCard" key={conversation.id} onClick={()=>void selectEntity("conversation",conversation.id)}><div><h2>{conversation.title}</h2>{conversation.summary&&<p>{conversation.summary}</p>}<small>{new Date(conversation.last_message_at).toLocaleString()}</small></div></button>:<article className="itemCard" key={conversation.id}><div><h2><Link className="conversationLink" href={`/conversations/${conversation.id}`}>{conversation.title}</Link></h2>{conversation.summary&&<p>{conversation.summary}</p>}<small>{new Date(conversation.last_message_at).toLocaleString()}</small></div><button className="dangerLink" type="button" onClick={()=>void remove(conversation.id)}>delete</button></article>)}</div>
 </div>;
}
