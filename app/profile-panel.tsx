"use client";

import type { Session, User } from "@supabase/supabase-js";
import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { getSupabaseBrowserClient } from "../lib/supabase/client";

type Profile = {
  id: string;
  preferred_name: string;
  display_name: string;
  preferred_language: string;
  time_zone: string;
  navigator_name: string;
};

const deviceLanguage = () => navigator.languages?.[0] || navigator.language || "en-US";
const localTimeZone = () => Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
const initialName = (user: User) => String(user.user_metadata?.display_name || user.email?.split("@")[0] || "Me");

export default function ProfilePanel() {
  const supabase = useMemo(() => getSupabaseBrowserClient(), []);
  const router = useRouter();
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("Loading…");
  const [busy, setBusy] = useState(true);
  const [showRename, setShowRename] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const [deleteWord, setDeleteWord] = useState("");

  const load = useCallback(async () => {
    setBusy(true);
    const { data: authData } = await supabase.auth.getSession();
    const current = authData.session;
    if (!current) { router.replace("/"); return; }
    setSession(current);
    setEmail(current.user.email || "");

    const { data, error } = await supabase.from("profiles").select("id, preferred_name, display_name, preferred_language, time_zone, navigator_name").eq("id", current.user.id).maybeSingle<Profile>();
    if (error) {
      const missingProfiles = error.message.toLowerCase().includes("public.profiles") || error.message.toLowerCase().includes("schema cache");
      setMessage(missingProfiles ? "Database setup is incomplete. Run supabase/project-navigator-setup.sql in the Supabase SQL Editor." : error.message);
      setBusy(false);
      return;
    }
    if (data) { setProfile(data); setMessage(""); setBusy(false); return; }

    const name = initialName(current.user);
    const fresh: Profile = { id: current.user.id, preferred_name: name, display_name: name, preferred_language: deviceLanguage(), time_zone: localTimeZone(), navigator_name: "Navigator" };
    const { error: insertError } = await supabase.from("profiles").insert(fresh);
    if (insertError) setMessage(insertError.message); else { setProfile(fresh); setMessage(""); }
    setBusy(false);
  }, [router, supabase]);

  useEffect(() => { void load(); }, [load]);

  function setField<K extends keyof Profile>(key: K, value: Profile[K]) {
    setProfile((current) => current ? { ...current, [key]: value } : current);
  }

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!profile || !session) return;
    setBusy(true); setMessage("Saving…");
    const clean = { ...profile, preferred_name: profile.preferred_name.trim(), display_name: profile.display_name.trim(), preferred_language: profile.preferred_language.trim(), time_zone: profile.time_zone.trim(), navigator_name: profile.navigator_name.trim() || "Navigator", updated_at: new Date().toISOString() };
    const { error } = await supabase.from("profiles").update(clean).eq("id", profile.id);
    if (!error) await supabase.auth.updateUser({ data: { preferred_name: clean.preferred_name, display_name: clean.display_name } });
    setBusy(false); setMessage(error ? error.message : "Saved."); setProfile(clean);
  }

  async function changeEmail() {
    if (!session || email === session.user.email) { setMessage("Enter a different email address first."); return; }
    setBusy(true);
    const { error } = await supabase.auth.updateUser({ email }, { emailRedirectTo: window.location.origin + "/me" });
    setBusy(false);
    setMessage(error ? error.message : "Verification sent. Your current email remains active until the new one is verified.");
  }

  async function deleteAccount() {
    if (!session || deleteWord !== "DELETE") return;
    setBusy(true); setMessage("Deleting account…");
    const response = await fetch("/api/account/delete", { method: "DELETE", headers: { Authorization: `Bearer ${session.access_token}` } });
    const result = await response.json();
    if (!response.ok) { setBusy(false); setMessage(result.error || "Account deletion failed."); return; }
    await supabase.auth.signOut();
    router.replace("/");
  }

  if (!profile) return <p className="authMessage">{message}</p>;

  return (
    <div className="interfaceStack">
      <form className="identityGroup" onSubmit={save}>
        <h2>{profile.display_name || "Me"}</h2>
        <label>Preferred Name<input value={profile.preferred_name} onChange={(e) => setField("preferred_name", e.target.value)} maxLength={80} required /></label>
        <label>Display Name<input value={profile.display_name} onChange={(e) => setField("display_name", e.target.value)} maxLength={80} required /></label>
        <label>Preferred Language<input value={profile.preferred_language} onChange={(e) => setField("preferred_language", e.target.value)} maxLength={35} required /></label>
        <label>Time Zone<input value={profile.time_zone} onChange={(e) => setField("time_zone", e.target.value)} maxLength={80} required /></label>
        <label>Email<input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required /></label>
        {session?.user.email !== email && <button type="button" className="textLink" onClick={changeEmail} disabled={busy}>verify new email</button>}
        <button type="submit" className="primaryButton" disabled={busy}>{busy ? "Working…" : "Save"}</button>
      </form>

      <section className="identityGroup navigatorIdentity">
        <h2>{profile.navigator_name}</h2>
        {!showRename ? <button type="button" className="textLink" onClick={() => setShowRename(true)}>change my name</button> : (
          <div className="renameBox"><label>What would you like to name me?<input value={profile.navigator_name} onChange={(e) => setField("navigator_name", e.target.value)} maxLength={80} /></label><button type="button" className="textLink" onClick={() => setShowRename(false)}>done</button></div>
        )}
      </section>

      <p className="authMessage" aria-live="polite">{message}</p>
      <section className="dangerZone">
        {!showDelete ? <button type="button" className="dangerLink" onClick={() => setShowDelete(true)}>delete my account</button> : (
          <div className="deleteConfirm"><p>This permanently deletes your Navigator identity and profile. Type DELETE to continue.</p><input value={deleteWord} onChange={(e) => setDeleteWord(e.target.value)} aria-label="Type DELETE to confirm" /><div><button type="button" className="quietButton" onClick={() => { setShowDelete(false); setDeleteWord(""); }}>Cancel</button><button type="button" className="dangerButton" disabled={deleteWord !== "DELETE" || busy} onClick={deleteAccount}>Delete permanently</button></div></div>
        )}
      </section>
    </div>
  );
}
