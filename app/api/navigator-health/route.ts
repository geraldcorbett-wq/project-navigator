import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const ready = Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() &&
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim()
  );
  return NextResponse.json({ ok: ready }, { status: ready ? 200 : 503, headers: { "Cache-Control": "no-store" } });
}
