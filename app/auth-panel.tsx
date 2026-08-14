"use client";

import type { Session } from "@supabase/supabase-js";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { getSupabaseBrowserClient } from "../lib/supabase/client";
import DashboardPanel from "./dashboard-panel";

type Mode = "sign-in" | "sign-up";
type State = "checking" | "signed-out" | "signed-in";

const RESET_COOLDOWN_MS = 60_000;
const RESET_COOLDOWN_KEY = "navigator.passwordResetAvailableAt";

function friendlyAuthMessage(message: string): string {
  const lower = message.toLowerCase();
  if (lower.includes("invalid login credentials")) return "That email and password do not match.";
  if (lower.includes("email not confirmed")) return "Please verify your email before signing in.";
  if (lower.includes("user already registered")) return "An account already exists for that email.";
  if (lower.includes("rate limit") || lower.includes("security purposes")) return "A reset email was recently requested. Wait a moment, then try again.";
  return message;
}

function readResetAvailableAt(): number {
  if (typeof window === "undefined") return 0;
  const value = Number(window.localStorage.getItem(RESET_COOLDOWN_KEY) || "0");
  return Number.isFinite(value) ? value : 0;
}

export default function AuthPanel() {
  const supabase = useMemo(() => getSupabaseBrowserClient(), []);
  const [session, setSession] = useState<Session | null>(null);
  const [state, setState] = useState<State>("checking");
  const [mode, setMode] = useState<Mode>("sign-in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [message, setMessage] = useState("Checking identity…");
  const [busy, setBusy] = useState(false);
  const [resetAvailableAt, setResetAvailableAt] = useState(0);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    setResetAvailableAt(readResetAvailableAt());
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    let active = true;
    void supabase.auth.getSession().then(({ data, error }) => {
      if (!active) return;
      if (error) {
        setState("signed-out");
        setMessage(friendlyAuthMessage(error.message));
        return;
      }
      setSession(data.session);
      setState(data.session ? "signed-in" : "signed-out");
      setMessage(data.session ? "Identity confirmed." : "Identity ready.");
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      if (!active) return;
      setSession(nextSession);
      setState(nextSession ? "signed-in" : "signed-out");
      setMessage(nextSession ? "Identity confirmed." : "Signed out.");
    });

    return () => {
      active = false;
      listener.subscription.unsubscribe();
    };
  }, [supabase]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setMessage(mode === "sign-in" ? "Signing in…" : "Creating account…");
    try {
      if (mode === "sign-in") {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      } else {
        const cleanName = displayName.trim();
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: window.location.origin,
            data: { display_name: cleanName, preferred_name: cleanName }
          }
        });
        if (error) throw error;
        setMessage(data.session ? "Account created." : "Account created. Check your email to verify it.");
      }
    } catch (error) {
      setMessage(friendlyAuthMessage(error instanceof Error ? error.message : "Identity request failed."));
    } finally {
      setBusy(false);
    }
  }

  async function requestPasswordReset() {
    const cleanEmail = email.trim();
    if (!cleanEmail) {
      setMessage("Enter your email address first.");
      return;
    }

    const availableAt = readResetAvailableAt();
    if (availableAt > Date.now()) {
      setResetAvailableAt(availableAt);
      setMessage("A reset email was already requested. Use the newest email, or wait before requesting another.");
      return;
    }

    setBusy(true);
    setMessage("Sending reset email…");
    const { error } = await supabase.auth.resetPasswordForEmail(cleanEmail, {
      redirectTo: `${window.location.origin}/reset-password`
    });
    setBusy(false);

    if (error) {
      setMessage(friendlyAuthMessage(error.message));
      return;
    }

    const nextAvailableAt = Date.now() + RESET_COOLDOWN_MS;
    window.localStorage.setItem(RESET_COOLDOWN_KEY, String(nextAvailableAt));
    setResetAvailableAt(nextAvailableAt);
    setNow(Date.now());
    setMessage("Password reset email sent. Use only the newest reset email; earlier links may no longer work.");
  }

  async function signOut() {
    setBusy(true);
    const { error } = await supabase.auth.signOut();
    setBusy(false);
    setMessage(error ? friendlyAuthMessage(error.message) : "Signed out.");
  }

  if (state === "checking") return <p className="authMessage" aria-live="polite">{message}</p>;

  if (state === "signed-in" && session?.user) {
    const name = String(session.user.user_metadata?.preferred_name || session.user.user_metadata?.display_name || session.user.email?.split("@")[0] || "there");
    return <DashboardPanel name={name} onSignOut={() => void signOut()} busy={busy} />;
  }

  const cooldownSeconds = Math.max(0, Math.ceil((resetAvailableAt - now) / 1000));

  return (
    <section className="identityCard" aria-labelledby="identity-heading">
      <div className="authHeadingRow">
        <div><p className="eyebrow">IDENTITY</p><h2 id="identity-heading">{mode === "sign-in" ? "Sign in." : "Create account."}</h2></div>
        <div className="modeSwitch" aria-label="Choose identity action">
          <button type="button" className={mode === "sign-in" ? "modeActive" : ""} onClick={() => setMode("sign-in")} disabled={busy}>Sign in</button>
          <button type="button" className={mode === "sign-up" ? "modeActive" : ""} onClick={() => setMode("sign-up")} disabled={busy}>Sign up</button>
        </div>
      </div>
      <form className="authForm" onSubmit={submit}>
        {mode === "sign-up" && <label>Display name<input type="text" autoComplete="name" value={displayName} onChange={(e) => setDisplayName(e.target.value)} maxLength={80} required /></label>}
        <label>Email<input type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} required /></label>
        <label>Password<input type="password" autoComplete={mode === "sign-in" ? "current-password" : "new-password"} value={password} onChange={(e) => setPassword(e.target.value)} minLength={6} required /></label>
        <button type="submit" className="primaryButton" disabled={busy}>{busy ? "Working…" : mode === "sign-in" ? "Sign in" : "Create account"}</button>
      </form>
      {mode === "sign-in" && (
        <button type="button" className="quietButton" onClick={requestPasswordReset} disabled={busy || cooldownSeconds > 0}>
          {cooldownSeconds > 0 ? `Request another reset in ${cooldownSeconds}s` : "Forgot password?"}
        </button>
      )}
      <p className="authMessage" aria-live="polite">{message}</p>
    </section>
  );
}
