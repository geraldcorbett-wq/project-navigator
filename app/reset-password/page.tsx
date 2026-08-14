"use client";

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { getSupabaseBrowserClient } from "../../lib/supabase/client";

type RecoveryState = "checking" | "ready" | "invalid" | "complete";

function urlRecoveryError(): string | null {
  if (typeof window === "undefined") return null;
  const hash = new URLSearchParams(window.location.hash.replace(/^#/, ""));
  const query = new URLSearchParams(window.location.search);
  return hash.get("error_description") || query.get("error_description") || hash.get("error") || query.get("error");
}

export default function ResetPasswordPage() {
  const supabase = useMemo(() => getSupabaseBrowserClient(), []);
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [state, setState] = useState<RecoveryState>("checking");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("Confirming reset link…");

  useEffect(() => {
    let active = true;
    let settled = false;

    const fail = (detail?: string) => {
      if (!active || settled) return;
      settled = true;
      setState("invalid");
      setMessage(detail || "This reset link is invalid, expired, or has already been used.");
    };

    const succeed = () => {
      if (!active || settled) return;
      settled = true;
      setState("ready");
      setMessage("Choose a new password.");
    };

    const linkError = urlRecoveryError();
    if (linkError) {
      fail(decodeURIComponent(linkError.replace(/\+/g, " ")));
      return () => { active = false; };
    }

    const { data: listener } = supabase.auth.onAuthStateChange((event, session) => {
      if (!active) return;
      if (event === "PASSWORD_RECOVERY" && session) succeed();
    });

    void (async () => {
      const code = new URLSearchParams(window.location.search).get("code");
      if (code) {
        const { error } = await supabase.auth.exchangeCodeForSession(code);
        if (error) {
          fail(error.message);
          return;
        }
        succeed();
        window.history.replaceState({}, document.title, window.location.pathname);
        return;
      }

      const { data, error } = await supabase.auth.getSession();
      if (error) {
        fail(error.message);
        return;
      }
      if (data.session) succeed();
    })();

    const timeout = window.setTimeout(() => {
      fail("This reset link could not be confirmed. It may be expired, already used, or opened from an older reset email.");
    }, 5000);

    return () => {
      active = false;
      window.clearTimeout(timeout);
      listener.subscription.unsubscribe();
    };
  }, [supabase]);

  async function updatePassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (password.length < 6) {
      setMessage("Password must contain at least 6 characters.");
      return;
    }
    if (password !== confirmation) {
      setMessage("The passwords do not match.");
      return;
    }

    setBusy(true);
    setMessage("Updating password…");
    const { error } = await supabase.auth.updateUser({ password });

    if (error) {
      setBusy(false);
      setMessage(error.message);
      return;
    }

    await supabase.auth.signOut();
    setBusy(false);
    setPassword("");
    setConfirmation("");
    setState("complete");
    setMessage("Password updated. Return to Hi and sign in with the new password.");
  }

  return (
    <main className="shell">
      <section className="panel compactPanel" aria-labelledby="reset-title">
        <div className="brandRow">
          <div className="mark" aria-hidden="true"><span /><span /></div>
          <p className="brand">Project Navigator</p>
        </div>

        <div className="mePage">
          <Link className="backLink" href="/">← Hi</Link>
          <p className="eyebrow">IDENTITY</p>
          <h1 id="reset-title" className="pageTitle">Reset password.</h1>

          {state === "ready" && (
            <form className="authForm" onSubmit={updatePassword}>
              <label>
                New password
                <input type="password" autoComplete="new-password" value={password} onChange={(event) => setPassword(event.target.value)} minLength={6} required />
              </label>
              <label>
                Confirm password
                <input type="password" autoComplete="new-password" value={confirmation} onChange={(event) => setConfirmation(event.target.value)} minLength={6} required />
              </label>
              <button type="submit" className="primaryButton" disabled={busy}>{busy ? "Working…" : "Update password"}</button>
            </form>
          )}

          <p className="authMessage" aria-live="polite">{message}</p>

          {(state === "invalid" || state === "complete") && (
            <Link className="primaryButton inlineAction" href="/">
              {state === "complete" ? "Return to Hi" : "Request a new reset email"}
            </Link>
          )}
        </div>
      </section>
    </main>
  );
}
