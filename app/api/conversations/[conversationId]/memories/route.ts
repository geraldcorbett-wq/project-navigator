import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest, isAuthFailure } from "../../../../../lib/api/auth";
import { jsonError, readJsonObject } from "../../../../../lib/api/json";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest, { params }: { params: { conversationId: string } }) {
  const auth = await authenticateRequest(request);
  if (isAuthFailure(auth)) return jsonError(auth.error, auth.status);

  const { data: conversation, error: conversationError } = await auth.supabase
    .from("conversations")
    .select("id,title")
    .eq("id", params.conversationId)
    .eq("user_id", auth.user.id)
    .single();
  if (conversationError || !conversation) return jsonError("Conversation not found.", 404);

  const { data: links, error: linkError } = await auth.supabase
    .from("memory_conversations")
    .select("memory_id")
    .eq("conversation_id", params.conversationId)
    .eq("user_id", auth.user.id);
  if (linkError) return jsonError(linkError.message, 500);

  const linkedIds = (links || []).map((item) => item.memory_id);
  let linked: unknown[] = [];
  if (linkedIds.length) {
    const { data, error } = await auth.supabase.from("memories").select("*").in("id", linkedIds).eq("user_id", auth.user.id).order("is_pinned", { ascending: false }).order("importance", { ascending: false });
    if (error) return jsonError(error.message, 500);
    linked = data || [];
  }

  const words = String(conversation.title || "").toLowerCase().match(/[a-z0-9]{4,}/g)?.slice(0, 6) || [];
  let relevant: unknown[] = [];
  if (words.length) {
    const filter = words.map((word) => `content.ilike.%${word.replace(/[%_,()]/g, "")}%`).join(",");
    const { data, error } = await auth.supabase.from("memories").select("*").eq("user_id", auth.user.id).or(filter).order("is_pinned", { ascending: false }).order("importance", { ascending: false }).limit(8);
    if (!error) relevant = (data || []).filter((item: { id: string }) => !linkedIds.includes(item.id));
  }

  return NextResponse.json({ linked, relevant });
}

export async function POST(request: NextRequest, { params }: { params: { conversationId: string } }) {
  const auth = await authenticateRequest(request);
  if (isAuthFailure(auth)) return jsonError(auth.error, auth.status);
  const body = await readJsonObject(request);
  const memoryId = typeof body?.memory_id === "string" ? body.memory_id : "";
  if (!memoryId) return jsonError("memory_id is required.", 400);

  const [{ data: conversation }, { data: memory }] = await Promise.all([
    auth.supabase.from("conversations").select("id").eq("id", params.conversationId).eq("user_id", auth.user.id).maybeSingle(),
    auth.supabase.from("memories").select("id").eq("id", memoryId).eq("user_id", auth.user.id).maybeSingle()
  ]);
  if (!conversation || !memory) return jsonError("Conversation or memory not found.", 404);

  const { error } = await auth.supabase.from("memory_conversations").upsert({ memory_id: memoryId, conversation_id: params.conversationId, user_id: auth.user.id }, { onConflict: "memory_id,conversation_id" });
  if (error) return jsonError(error.message, 500);
  return NextResponse.json({ ok: true }, { status: 201 });
}

export async function DELETE(request: NextRequest, { params }: { params: { conversationId: string } }) {
  const auth = await authenticateRequest(request);
  if (isAuthFailure(auth)) return jsonError(auth.error, auth.status);
  const memoryId = request.nextUrl.searchParams.get("memory_id");
  if (!memoryId) return jsonError("memory_id is required.", 400);
  const { error } = await auth.supabase.from("memory_conversations").delete().eq("memory_id", memoryId).eq("conversation_id", params.conversationId).eq("user_id", auth.user.id);
  if (error) return jsonError(error.message, 500);
  return new NextResponse(null, { status: 204 });
}
