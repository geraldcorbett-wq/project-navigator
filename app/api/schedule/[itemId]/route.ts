import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest, isAuthFailure } from "../../../../lib/api/auth";
import { deleteEntityLinks } from "../../../../lib/api/entity-links";
import { cleanOptionalText, jsonError, readJsonObject } from "../../../../lib/api/json";
export const dynamic = "force-dynamic";
export async function PATCH(request: NextRequest, { params }: { params: { itemId: string } }) {
  const auth = await authenticateRequest(request); if (isAuthFailure(auth)) return jsonError(auth.error, auth.status);
  const body = await readJsonObject(request); if (!body) return jsonError("A JSON object is required.", 400);
  const update: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if ("title" in body) { const title = cleanOptionalText(body.title, 200); if (!title) return jsonError("title cannot be empty.", 400); update.title = title; }
  if ("notes" in body) update.notes = cleanOptionalText(body.notes, 4000) ?? null;
  if ("starts_at" in body) update.starts_at = body.starts_at;
  if ("ends_at" in body) update.ends_at = body.ends_at || null;
  if ("status" in body && ["scheduled", "completed", "cancelled"].includes(String(body.status))) update.status = body.status;
  if ("is_pinned" in body) {
    const nextPinned = Boolean(body.is_pinned);
    if (nextPinned) {
      const { count, error: countError } = await auth.supabase.from("schedule_items").select("id", { count: "exact", head: true }).eq("user_id", auth.user.id).eq("is_pinned", true).neq("id", params.itemId);
      if (countError) return jsonError(countError.message, 500);
      if ((count || 0) >= 3) return jsonError("You can pin up to 3 schedule items.", 409);
    }
    update.is_pinned = nextPinned;
  }
  const { data, error } = await auth.supabase.from("schedule_items").update(update).eq("id", params.itemId).eq("user_id", auth.user.id).select("*").single();
  if (error) return jsonError(error.message, 500); return NextResponse.json({ item: data });
}
export async function DELETE(request: NextRequest, { params }: { params: { itemId: string } }) {
  const auth = await authenticateRequest(request);
  if (isAuthFailure(auth)) return jsonError(auth.error, auth.status);
  try {
    await deleteEntityLinks(auth.supabase, auth.user.id, "schedule", params.itemId);
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : "Could not remove connections.", 500);
  }
  const { error } = await auth.supabase.from("schedule_items").delete().eq("id", params.itemId).eq("user_id", auth.user.id);
  if (error) return jsonError(error.message, 500);
  return NextResponse.json({ ok: true });
}
