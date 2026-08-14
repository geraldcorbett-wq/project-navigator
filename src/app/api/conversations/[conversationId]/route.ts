import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest, isAuthFailure } from "../../../../lib/api/auth";
import { deleteEntityLinks } from "../../../../lib/api/entity-links";
import { cleanOptionalText, jsonError, readJsonObject } from "../../../../lib/api/json";

export const dynamic = "force-dynamic";

type Context = { params: { conversationId: string } };

export async function GET(request: NextRequest, { params }: Context) {
  const auth = await authenticateRequest(request);
  if (isAuthFailure(auth)) return jsonError(auth.error, auth.status);

  const { data, error } = await auth.supabase
    .from("conversations")
    .select("id, title, summary, status, created_at, updated_at, last_message_at")
    .eq("id", params.conversationId)
    .eq("user_id", auth.user.id)
    .maybeSingle();

  if (error) return jsonError(error.message, 500);
  if (!data) return jsonError("Conversation not found.", 404);
  return NextResponse.json({ conversation: data });
}

export async function PATCH(request: NextRequest, { params }: Context) {
  const auth = await authenticateRequest(request);
  if (isAuthFailure(auth)) return jsonError(auth.error, auth.status);

  const body = await readJsonObject(request);
  if (!body) return jsonError("A JSON object is required.", 400);

  const updates: Record<string, string | null> = {};
  const title = cleanOptionalText(body.title, 160);
  const summary = cleanOptionalText(body.summary, 2000);

  if (title !== undefined) {
    if (title === null) return jsonError("Title cannot be empty.", 400);
    updates.title = title;
  }
  if (summary !== undefined) updates.summary = summary;
  if (body.status !== undefined) {
    if (body.status !== "active" && body.status !== "archived") {
      return jsonError("Status must be active or archived.", 400);
    }
    updates.status = body.status;
  }

  if (Object.keys(updates).length === 0) return jsonError("No valid changes supplied.", 400);

  const { data, error } = await auth.supabase
    .from("conversations")
    .update(updates)
    .eq("id", params.conversationId)
    .eq("user_id", auth.user.id)
    .select("id, title, summary, status, created_at, updated_at, last_message_at")
    .maybeSingle();

  if (error) return jsonError(error.message, 500);
  if (!data) return jsonError("Conversation not found.", 404);
  return NextResponse.json({ conversation: data });
}

export async function DELETE(request: NextRequest, { params }: Context) {
  const auth = await authenticateRequest(request);
  if (isAuthFailure(auth)) return jsonError(auth.error, auth.status);

  try {
    await deleteEntityLinks(auth.supabase, auth.user.id, "conversation", params.conversationId);
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : "Could not remove connections.", 500);
  }

  const { data, error } = await auth.supabase
    .from("conversations")
    .delete()
    .eq("id", params.conversationId)
    .eq("user_id", auth.user.id)
    .select("id")
    .maybeSingle();

  if (error) return jsonError(error.message, 500);
  if (!data) return jsonError("Conversation not found.", 404);
  return NextResponse.json({ ok: true, id: data.id });
}
