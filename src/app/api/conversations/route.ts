import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest, isAuthFailure } from "../../../lib/api/auth";
import { cleanOptionalText, jsonError, readJsonObject } from "../../../lib/api/json";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const auth = await authenticateRequest(request);
  if (isAuthFailure(auth)) return jsonError(auth.error, auth.status);

  const limitParam = Number(request.nextUrl.searchParams.get("limit") || "50");
  const limit = Number.isFinite(limitParam) ? Math.min(Math.max(Math.trunc(limitParam), 1), 100) : 50;
  const archived = request.nextUrl.searchParams.get("archived");

  let query = auth.supabase
    .from("conversations")
    .select("id, title, summary, status, created_at, updated_at, last_message_at")
    .eq("user_id", auth.user.id)
    .order("last_message_at", { ascending: false })
    .limit(limit);

  if (archived !== "all") query = query.eq("status", archived === "true" ? "archived" : "active");

  const { data, error } = await query;
  if (error) return jsonError(error.message, 500);
  return NextResponse.json({ conversations: data });
}

export async function POST(request: NextRequest) {
  const auth = await authenticateRequest(request);
  if (isAuthFailure(auth)) return jsonError(auth.error, auth.status);

  const body = await readJsonObject(request);
  if (!body) return jsonError("A JSON object is required.", 400);

  const title = cleanOptionalText(body.title, 160) ?? "New conversation";
  const summary = cleanOptionalText(body.summary, 2000) ?? null;

  const { data, error } = await auth.supabase
    .from("conversations")
    .insert({ user_id: auth.user.id, title, summary })
    .select("id, title, summary, status, created_at, updated_at, last_message_at")
    .single();

  if (error) return jsonError(error.message, 500);
  return NextResponse.json({ conversation: data }, { status: 201 });
}
