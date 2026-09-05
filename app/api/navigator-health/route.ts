import { NextResponse } from "next/server";
export const dynamic = "force-dynamic";
export async function GET() {
  const ready = Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() &&
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim() &&
    process.env.OPENAI_API_KEY?.trim() &&
    process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() &&
    process.env.NAVIGATOR_RATE_LIMIT_SALT?.trim()
  );
  return NextResponse.json({ ok: ready }, { status: ready ? 200 : 503, headers: { "Cache-Control": "no-store" } });
}
