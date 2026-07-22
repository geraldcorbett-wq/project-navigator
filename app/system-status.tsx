"use client";

import { useEffect, useState } from "react";

type Health = {
  ok: boolean;
  app: string;
  version: string;
  message: string;
  frontend: "healthy";
  backend: "healthy";
  supabase: "connected" | "disconnected" | "not-configured";
};

const INITIAL: Health = {
  ok: false,
  app: "Project Navigator",
  version: "0.0.3",
  message: "Checking systems…",
  frontend: "healthy",
  backend: "healthy",
  supabase: "not-configured"
};

export default function SystemStatus() {
  const [health, setHealth] = useState<Health>(INITIAL);

  useEffect(() => {
    const controller = new AbortController();

    async function checkHealth() {
      try {
        const response = await fetch("/api/health", {
          cache: "no-store",
          signal: controller.signal
        });
        const body = (await response.json()) as Health;
        setHealth(body);
      } catch {
        if (!controller.signal.aborted) {
          setHealth({
            ...INITIAL,
            message: "Backend unavailable.",
            supabase: "disconnected"
          });
        }
      }
    }

    void checkHealth();
    return () => controller.abort();
  }, []);

  const connected = health.ok && health.supabase === "connected";

  return (
    <div className="systemStatus" aria-live="polite">
      <span className={`statusDot ${connected ? "" : "statusDotPending"}`} aria-hidden="true" />
      <span>{health.message}</span>
      <span className="statusDivider" aria-hidden="true">•</span>
      <span>Backend {health.backend}</span>
      <span className="statusDivider" aria-hidden="true">•</span>
      <span>Supabase {health.supabase}</span>
    </div>
  );
}
