"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { getSupabaseBrowserClient } from "../lib/supabase/client";
import type { EntityType } from "./use-link-selection";

type Entity = { id: string; type: EntityType; label: string; href: string };
type LinkItem = Entity & { link_id: string; direction: string };

const destinations: { value: EntityType; label: string; path: string }[] = [
  { value: "memory", label: "Memory", path: "/memories" },
  { value: "circle", label: "Circle", path: "/circles" },
  { value: "schedule", label: "Schedule", path: "/schedule" },
  { value: "conversation", label: "Conversation", path: "/conversations" }
];

export default function RelatedPanel({ entityType, entityId }: { entityType: EntityType; entityId: string }) {
  const router = useRouter();
  const supabase = useMemo(() => getSupabaseBrowserClient(), []);
  const [links, setLinks] = useState<LinkItem[]>([]);
  const [msg, setMsg] = useState("");

  async function token() { return (await supabase.auth.getSession()).data.session?.access_token; }
  async function load() {
    const t = await token();
    if (!t) return;
    const response = await fetch(`/api/relationships?entity_type=${entityType}&entity_id=${entityId}`, { headers: { Authorization: `Bearer ${t}` } });
    const body = await response.json();
    if (response.ok) setLinks(body.links || []);
  }

  useEffect(() => {
    void load();
    const refresh = () => void load();
    const onVisibility = () => { if (document.visibilityState === "visible") refresh(); };
    window.addEventListener("focus", refresh);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      window.removeEventListener("focus", refresh);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [entityType, entityId]);

  function beginLink(targetType: EntityType) {
    const destination = destinations.find(item => item.value === targetType);
    if (!destination) return;
    const returnTo = `${window.location.pathname}${window.location.search}`;
    const params = new URLSearchParams({
      select: "1",
      sourceType: entityType,
      sourceId: entityId,
      returnTo
    });
    router.push(`${destination.path}?${params.toString()}`);
  }

  async function remove(id: string) {
    const t = await token();
    if (!t) return;
    const response = await fetch(`/api/relationships/${id}`, { method: "DELETE", headers: { Authorization: `Bearer ${t}` } });
    if (!response.ok) { const body = await response.json(); setMsg(body.error || "Could not remove link."); return; }
    await load();
  }

  return (
    <section className="relatedPanel">
      <div className="relatedHeader">
        <h3>Chain</h3>
        <label className="linkToControl">
          <span className="srOnly">Link to</span>
          <select defaultValue="" onChange={(event) => { const value = event.target.value as EntityType; if (value) beginLink(value); event.currentTarget.value = ""; }}>
            <option value="" disabled>Link To</option>
            {destinations.map(item => <option key={item.value} value={item.value}>{item.label}</option>)}
          </select>
        </label>
      </div>
      <div className="relatedList">
        {links.map(link => (
          <div key={link.link_id}>
            <Link href={link.href}><span>{link.type}</span>{link.label}</Link>
            <button type="button" className="textLink" onClick={() => void remove(link.link_id)}>unlink</button>
          </div>
        ))}
        {!links.length && <small>No links yet.</small>}
      </div>
      {msg && <small aria-live="polite">{msg}</small>}
    </section>
  );
}
