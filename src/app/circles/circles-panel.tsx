"use client";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { getSupabaseBrowserClient } from "../../lib/supabase/client";
import RelatedPanel from "../../components/related-panel";
import { useLinkSelection } from "../../components/use-link-selection";

type Member = { id: string; display_name: string; email: string | null; role: string };
type Circle = { id: string; name: string; description: string | null; is_pinned: boolean; circle_members: Member[] };

export default function CirclesPanel() {
  const supabase = useMemo(() => getSupabaseBrowserClient(), []);
  const [circles, setCircles] = useState<Circle[]>([]);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [query, setQuery] = useState("");
  const [message, setMessage] = useState("Loading circles…");
  const [busy, setBusy] = useState(false);
  const { selectionMode, selectEntity, cancelSelection, selectionMessage } = useLinkSelection();
  async function token() { return (await supabase.auth.getSession()).data.session?.access_token; }
  async function load(search = query) { const accessToken=await token(); if(!accessToken){setMessage("Sign in to use circles.");return;} const suffix=search.trim()?`?q=${encodeURIComponent(search.trim())}`:""; const response=await fetch(`/api/circles${suffix}`,{headers:{Authorization:`Bearer ${accessToken}`}}); const body=await response.json(); if(!response.ok){setMessage(body.error||"Could not load circles.");return;} setCircles(body.circles||[]); setMessage(body.circles?.length?"":"No circles found."); }
  useEffect(()=>{void load("");},[]);
  async function create(event:FormEvent){event.preventDefault();setBusy(true);const accessToken=await token();const response=await fetch("/api/circles",{method:"POST",headers:{"Content-Type":"application/json",Authorization:`Bearer ${accessToken}`},body:JSON.stringify({name,description})});const body=await response.json();setBusy(false);if(!response.ok){setMessage(body.error||"Could not create circle.");return;}setName("");setDescription("");setMessage("Circle created.");await load();}
  async function patch(id:string,values:Record<string,unknown>){const accessToken=await token();if(!accessToken)return;const response=await fetch(`/api/circles/${id}`,{method:"PATCH",headers:{"Content-Type":"application/json",Authorization:`Bearer ${accessToken}`},body:JSON.stringify(values)});const body=await response.json();if(!response.ok){setMessage(body.error||"Could not update circle.");return;}await load();}
  async function remove(id:string){const accessToken=await token();const response=await fetch(`/api/circles/${id}`,{method:"DELETE",headers:{Authorization:`Bearer ${accessToken}`}});if(!response.ok){const body=await response.json();setMessage(body.error||"Could not delete circle.");return;}await load();}
  return <div className="featureStack">
    {selectionMode && <div className="selectionBanner"><strong>Select a circle to link</strong><button type="button" className="quietButton" onClick={cancelSelection}>Cancel</button></div>}
    {!selectionMode && <form className="featureForm" onSubmit={create}><label>Circle name<input value={name} onChange={e=>setName(e.target.value)} maxLength={120} required /></label><label>Description<textarea value={description} onChange={e=>setDescription(e.target.value)} maxLength={2000} rows={3}/></label><button className="primaryButton" disabled={busy}>{busy?"Creating…":"Create circle"}</button></form>}
    <form className="memorySearch" onSubmit={event=>{event.preventDefault();void load();}}><label>Search circles<input value={query} onChange={event=>setQuery(event.target.value)} placeholder="Search name or description" /></label><button className="quietButton">Search</button></form>
    {(selectionMessage||message)&&<p className="authMessage" aria-live="polite">{selectionMessage||message}</p>}
    <div className="itemList">{circles.map(circle=>selectionMode ? <button type="button" className={`itemCard selectionCard ${circle.is_pinned?"pinnedCard":""}`} key={circle.id} onClick={()=>void selectEntity("circle",circle.id)}><div><h2>{circle.name}</h2>{circle.description&&<p>{circle.description}</p>}<small>{circle.circle_members?.length||0} member(s)</small></div></button> : <article className={`itemCard ${circle.is_pinned?"memoryPinned pinnedCard":""}`} key={circle.id}><div>{circle.is_pinned&&<span className="pinnedBadge">Pinned</span>}<h2>{circle.name}</h2>{circle.description&&<p>{circle.description}</p>}<small>{circle.circle_members?.length||0} member(s){circle.is_pinned?" · pinned":""}</small></div><div className="cardActions"><button className="textLink" type="button" onClick={()=>void patch(circle.id,{is_pinned:!circle.is_pinned})}>{circle.is_pinned?"unpin":"pin"}</button><button className="dangerLink" type="button" onClick={()=>void remove(circle.id)}>delete</button></div><RelatedPanel entityType="circle" entityId={circle.id}/></article>)}</div>
  </div>;
}
