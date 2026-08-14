"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { getSupabaseBrowserClient } from "../lib/supabase/client";

type Memory = { id: string; content: string; category: string; importance: number; is_pinned: boolean };
type Circle = { id: string; name: string; description: string | null; is_pinned: boolean };
type ScheduleItem = { id: string; title: string; starts_at: string; status: string; is_pinned?: boolean };
type Conversation = { id: string; title: string; updated_at: string };

type DashboardData = {
  memories: Memory[];
  circles: Circle[];
  schedule: ScheduleItem[];
  conversations: Conversation[];
};

function partOfDay() {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

function importanceLabel(value: number) {
  return ({ 5: "Critical", 4: "High", 3: "Medium", 2: "Low", 1: "None" } as Record<number, string>)[value] || "None";
}

export default function DashboardPanel({ name, onSignOut, busy }: { name: string; onSignOut: () => void; busy: boolean }) {
  const supabase = useMemo(() => getSupabaseBrowserClient(), []);
  const [data, setData] = useState<DashboardData>({ memories: [], circles: [], schedule: [], conversations: [] });
  const [message, setMessage] = useState("Preparing your briefing…");

  useEffect(() => {
    let active = true;
    async function load() {
      const accessToken = (await supabase.auth.getSession()).data.session?.access_token;
      if (!accessToken) return;
      const headers = { Authorization: `Bearer ${accessToken}` };
      const responses = await Promise.all([
        fetch("/api/memories", { headers }),
        fetch("/api/circles", { headers }),
        fetch("/api/schedule", { headers }),
        fetch("/api/conversations", { headers })
      ]);
      const bodies = await Promise.all(responses.map(async response => ({ ok: response.ok, body: await response.json() })));
      if (!active) return;
      if (bodies.some(result => !result.ok)) {
        setMessage("Your briefing is partially available.");
      } else {
        setMessage("");
      }
      setData({
        memories: bodies[0].body.memories || [],
        circles: bodies[1].body.circles || [],
        schedule: bodies[2].body.items || [],
        conversations: bodies[3].body.conversations || []
      });
    }
    void load();
    return () => { active = false; };
  }, [supabase]);

  const now = Date.now();
  const pinnedMemories = data.memories.filter(item => item.is_pinned).slice(0, 3);
  const pinnedCircle = data.circles.find(item => item.is_pinned);
  const upcoming = data.schedule.filter(item => new Date(item.starts_at).getTime() >= now && item.status !== "cancelled").slice(0, 3);
  const critical = data.memories.filter(item => item.importance === 5 && !item.is_pinned).slice(0, 3);
  const recentConversation = data.conversations[0];

  return (
    <section className="dashboard" aria-labelledby="dashboard-heading">
      <div className="dashboardGreeting">
        <p className="eyebrow">{partOfDay().toUpperCase()}</p>
        <h2 id="dashboard-heading">Hi, {name}.</h2>
        <p>Here&apos;s what deserves your attention right now.</p>
      </div>

      {message && <p className="authMessage" aria-live="polite">{message}</p>}

      <div className="dashboardGrid">
        <section className="dashboardCard dashboardSpanTwo">
          <div className="dashboardCardHeader"><h3>Pinned memories</h3><Link href="/memories">View all</Link></div>
          {pinnedMemories.length ? pinnedMemories.map(memory => (
            <div className="dashboardItem pinnedCue" key={memory.id}>
              <span className="pinMark" aria-hidden="true">●</span>
              <div><strong>{memory.content}</strong><small className={`importance importance${memory.importance}`}>{importanceLabel(memory.importance)}</small></div>
            </div>
          )) : <p className="dashboardEmpty">No pinned memories.</p>}
        </section>

        <section className="dashboardCard">
          <div className="dashboardCardHeader"><h3>Pinned circle</h3><Link href="/circles">View circles</Link></div>
          {pinnedCircle ? <div className="dashboardItem pinnedCue"><span className="pinMark">●</span><div><strong>{pinnedCircle.name}</strong><small>{pinnedCircle.description || "Ready when you are."}</small></div></div> : <p className="dashboardEmpty">No circle pinned.</p>}
        </section>

        <section className="dashboardCard">
          <div className="dashboardCardHeader"><h3>Next</h3><Link href="/schedule">Schedule</Link></div>
          {upcoming.length ? upcoming.map(item => <div className="dashboardItem" key={item.id}><div><strong>{item.title}</strong><small>{new Date(item.starts_at).toLocaleString()}</small></div></div>) : <p className="dashboardEmpty">Nothing scheduled.</p>}
        </section>

        <section className="dashboardCard">
          <div className="dashboardCardHeader"><h3>Critical</h3><Link href="/memories">Memory</Link></div>
          {critical.length ? critical.map(memory => <div className="dashboardItem" key={memory.id}><div><strong>{memory.content}</strong><small className="importance importance5">Critical</small></div></div>) : <p className="dashboardEmpty">Nothing critical.</p>}
        </section>

        <section className="dashboardCard">
          <div className="dashboardCardHeader"><h3>Resume</h3><Link href="/conversations">Conversations</Link></div>
          {recentConversation ? <Link className="resumeLink" href={`/conversations/${recentConversation.id}`}><strong>{recentConversation.title}</strong><small>{new Date(recentConversation.updated_at).toLocaleString()}</small></Link> : <p className="dashboardEmpty">No recent conversation.</p>}
        </section>
      </div>

      <nav className="dashboardNav" aria-label="Navigator destinations">
        <Link href="/conversations">Conversations</Link>
        <Link href="/memories">Memory</Link>
        <Link href="/circles">Circles</Link>
        <Link href="/schedule">Schedule</Link>
        <Link href="/me">Me</Link>
      </nav>
      <button type="button" className="quietButton" onClick={onSignOut} disabled={busy}>Sign out</button>
    </section>
  );
}
