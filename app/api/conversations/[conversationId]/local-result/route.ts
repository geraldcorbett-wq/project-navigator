import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest, isAuthFailure } from "../../../../../lib/api/auth";
import { jsonError, readJsonObject } from "../../../../../lib/api/json";

export const dynamic = "force-dynamic";
type Context = { params: Promise<{ conversationId: string }> };

export async function POST(request: NextRequest, { params }: Context) {
  const { conversationId } = await params;
  const auth = await authenticateRequest(request);
  if (isAuthFailure(auth)) return jsonError(auth.error, auth.status);

  const body = await readJsonObject(request);
  if (!body || typeof body.content !== "string" || !body.content.trim()) return jsonError("Navigator response is required.", 400);
  const content = body.content.trim();
  if (content.length > 12000) return jsonError("Navigator response is too long.", 400);

  const { data: conversation, error: conversationError } = await auth.supabase
    .from("conversations")
    .select("id")
    .eq("id", conversationId)
    .eq("user_id", auth.user.id)
    .maybeSingle();
  if (conversationError) return jsonError(conversationError.message, 500);
  if (!conversation) return jsonError("Conversation not found.", 404);

  const now = new Date().toISOString();
  const { data: message, error } = await auth.supabase.from("messages").insert({
    conversation_id: conversationId,
    user_id: auth.user.id,
    role: "assistant",
    content,
    metadata: { source: "navigator-local" }
  }).select("id, conversation_id, role, content, metadata, created_at").single();
  if (error) return jsonError(error.message, 500);

  await auth.supabase.from("conversations").update({ last_message_at: now, updated_at: now })
    .eq("id", conversationId).eq("user_id", auth.user.id);

  return NextResponse.json({ assistant_message: message }, { status: 201, headers: { "Cache-Control": "no-store" } });
}
