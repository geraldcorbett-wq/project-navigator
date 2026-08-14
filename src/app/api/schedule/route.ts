import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest, isAuthFailure } from "../../../lib/api/auth";
import { cleanOptionalText, jsonError, readJsonObject } from "../../../lib/api/json";
export const dynamic = "force-dynamic";
export async function GET(request: NextRequest) {
  const auth = await authenticateRequest(request); if (isAuthFailure(auth)) return jsonError(auth.error, auth.status);
  const q = request.nextUrl.searchParams.get("q")?.trim() || "";
  const includePast = request.nextUrl.searchParams.get("includePast") === "1";
  const from = request.nextUrl.searchParams.get("from");
  let query = auth.supabase.from("schedule_items").select("*, circles(name)").eq("user_id", auth.user.id);
  if (!includePast) {
    const cutoff = from && !Number.isNaN(Date.parse(from)) ? from : new Date().toISOString();
    query = query.gte("starts_at", cutoff);
  }
  if (q) query = query.or(`title.ilike.%${q.replace(/[%_,]/g, "") }%,notes.ilike.%${q.replace(/[%_,]/g, "")}%`);
  const { data, error } = await query.order("is_pinned", { ascending: false }).order("starts_at", { ascending: true });
  if (error) return jsonError(error.message, 500); return NextResponse.json({ items: data ?? [] });
}
export async function POST(request: NextRequest) {
  const auth = await authenticateRequest(request); if (isAuthFailure(auth)) return jsonError(auth.error, auth.status);
  const body = await readJsonObject(request); if (!body) return jsonError("A JSON object is required.", 400);
  const title = cleanOptionalText(body.title, 200); if (!title) return jsonError("title is required.", 400);
  if (typeof body.starts_at !== "string" || Number.isNaN(Date.parse(body.starts_at))) return jsonError("starts_at must be a valid date.", 400);
  const row = { user_id: auth.user.id, title, notes: cleanOptionalText(body.notes, 4000) ?? null, starts_at: body.starts_at, ends_at: typeof body.ends_at === "string" && body.ends_at ? body.ends_at : null, time_zone: cleanOptionalText(body.time_zone, 80) ?? "UTC", circle_id: typeof body.circle_id === "string" && body.circle_id ? body.circle_id : null, is_pinned: false };
  const { data, error } = await auth.supabase.from("schedule_items").insert(row).select("*").single();
  if (error) return jsonError(error.message, 500); return NextResponse.json({ item: data }, { status: 201 });
}
