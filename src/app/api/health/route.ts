import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

type SupabaseStatus = "connected" | "disconnected" | "not-configured";

async function checkSupabase(): Promise<SupabaseStatus> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (!url || !key) {
    return "not-configured";
  }

  try {
    const response = await fetch(`${url.replace(/\/$/, "")}/auth/v1/health`, {
      method: "GET",
      headers: {
        apikey: key,
      },
      cache: "no-store",
      signal: AbortSignal.timeout(5000)
    });

    return response.ok ? "connected" : "disconnected";
  } catch {
    return "disconnected";
  }
}

export async function GET() {
  const supabase = await checkSupabase();
  const ok = supabase === "connected";

  return NextResponse.json(
    {
      ok,
      app: "Project Navigator",
      version: "1.0.2-package-1",
      message: ok ? "Hi, I'm awake and ready to go." : "I'm awake. Supabase needs attention.",
      frontend: "healthy",
      backend: "healthy",
      supabase,
      timestamp: new Date().toISOString()
    },
    {
      status: ok ? 200 : 503,
      headers: { "Cache-Control": "no-store" }
    }
  );
}
