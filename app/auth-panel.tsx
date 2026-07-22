"use client";

import type { Session } from "@supabase/supabase-js";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { getSupabaseBrowserClient } from "../lib/supabase/client";

type Mode = "sign-in" | "sign-up";
type State = "checking" | "signed-out" | "signed-in";

export default function AuthPanel() {
  const supabase = useMemo(() => getSupabaseBrowserClient(), []);
  const [session, setSession] = useState<Session | null>(null);
  const [state, setState] = useState<State>("checking");
  const [mode, setMode] = useState<Mode>("sign-in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("Checking identity…");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let active = true;

    void supabase.auth.getSession().then(({ data, error }) => {
      if (!active) return;

      if (error) {
        setState("signed-out");
        setMessage(error.message);
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
    setMessage(mode === "sign-in" ? "Signing in…" : "Creating identity…");

    try {
      if (mode === "sign-in") {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        setMessage("Identity confirmed.");
      } else {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: window.location.origin
          }
        });
        if (error) throw error;

        setMessage(
          data.session
            ? "Identity created and confirmed."
            : "Identity created. Check your email to confirm it."
        );
      }
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Identity request failed.");
    } finally {
      setBusy(false);
    }
  }

  async function signOut() {
    setBusy(true);
    setMessage("Signing out…");
    const { error } = await supabase.auth.signOut();
    setBusy(false);
    setMessage(error ? error.message : "Signed out.");
  }

  if (state === "checking") {
    return <p className="authMessage" aria-live="polite">{message}</p>;
  }

  if (state === "signed-in" && session?.user) {
    return (
      <section className="identityCard" aria-labelledby="identity-heading">
        <p className="eyebrow">IDENTITY CONFIRMED</p>
        <h2 id="identity-heading">Welcome.</h2>
        <p className="identityEmail">{session.user.email}</p>
        <p className="authMessage" aria-live="polite">{message}</p>
        <button type="button" className="secondaryButton" onClick={signOut} disabled={busy}>
          {busy ? "Working…" : "Sign out"}
        </button>
      </section>
    );
  }

  return (
    <section className="identityCard" aria-labelledby="identity-heading">
      <div className="authHeadingRow">
        <div>
          <p className="eyebrow">IDENTITY</p>
          <h2 id="identity-heading">{mode === "sign-in" ? "Sign in." : "Create account."}</h2>
        </div>
        <div className="modeSwitch" aria-label="Choose identity action">
          <button
            type="button"
            className={mode === "sign-in" ? "modeActive" : ""}
            onClick={() => setMode("sign-in")}
            disabled={busy}
          >
            Sign in
          </button>
          <button
            type="button"
            className={mode === "sign-up" ? "modeActive" : ""}
            onClick={() => setMode("sign-up")}
            disabled={busy}
          >
            Sign up
          </button>
        </div>
      </div>

      <form className="authForm" onSubmit={submit}>
        <label>
          Email
          <input
            type="email"
            autoComplete="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
          />
        </label>
        <label>
          Password
          <input
            type="password"
            autoComplete={mode === "sign-in" ? "current-password" : "new-password"}
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            minLength={6}
            required
          />
        </label>
        <button type="submit" className="primaryButton" disabled={busy}>
          {busy ? "Working…" : mode === "sign-in" ? "Sign in" : "Create account"}
        </button>
      </form>
      <p className="authMessage" aria-live="polite">{message}</p>
    </section>
  );
}
