import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest, isAuthFailure } from "../../../../../lib/api/auth";
import { jsonError, readJsonObject } from "../../../../../lib/api/json";

export const dynamic = "force-dynamic";
type Context = { params: Promise<{ conversationId: string }> };

export async function GET(request: NextRequest, { params }: Context) {
  const { conversationId } = await params;
  const auth = await authenticateRequest(request);
  if (isAuthFailure(auth)) return jsonError(auth.error, auth.status);
  const limitParam = Number(request.nextUrl.searchParams.get("limit") || "100");
  const limit = Number.isFinite(limitParam) ? Math.min(Math.max(Math.trunc(limitParam), 1), 200) : 100;
  const before = request.nextUrl.searchParams.get("before");
  let query = auth.supabase.from("messages").select("id, conversation_id, role, content, metadata, created_at")
    .eq("conversation_id", conversationId).eq("user_id", auth.user.id).order("created_at", { ascending: true }).limit(limit);
  if (before) query = query.lt("created_at", before);
  const { data, error } = await query;
  if (error) return jsonError(error.message, 500);
  return NextResponse.json({ messages: data }, { headers: { "Cache-Control": "no-store" } });
}

export async function POST(request: NextRequest, { params }: Context) {
  const { conversationId } = await params;
  const auth = await authenticateRequest(request);
  if (isAuthFailure(auth)) return jsonError(auth.error, auth.status);
  const body = await readJsonObject(request);
  if (!body) return jsonError("A JSON object is required.", 400);
  if (body.role !== undefined && body.role !== "user") return jsonError("Only Human messages can be created here.", 403);
  if (typeof body.content !== "string" || !body.content.trim()) return jsonError("Message content is required.", 400);
  const content = body.content.trim();
  if (content.length > 8000) return jsonError("Message is too long.", 400);
  const { data: conversation, error: conversationError } = await auth.supabase.from("conversations").select("id")
    .eq("id", conversationId).eq("user_id", auth.user.id).maybeSingle();
  if (conversationError) return jsonError(conversationError.message, 500);
  if (!conversation) return jsonError("Conversation not found.", 404);
  const { data, error } = await auth.supabase.from("messages").insert({
    conversation_id: conversationId, user_id: auth.user.id, role: "user", content, metadata: { source: "human" }
  }).select("id, conversation_id, role, content, metadata, created_at").single();
  if (error) return jsonError(error.message, 500);
  return NextResponse.json({ message: data }, { status: 201 });
}
