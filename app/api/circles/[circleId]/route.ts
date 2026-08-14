import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest, isAuthFailure } from "../../../../lib/api/auth";
import { deleteEntityLinks } from "../../../../lib/api/entity-links";
import { cleanOptionalText, jsonError, readJsonObject } from "../../../../lib/api/json";
export const dynamic = "force-dynamic";

export async function PATCH(request: NextRequest, { params }: { params: { circleId: string } }) {
  const auth = await authenticateRequest(request);
  if (isAuthFailure(auth)) return jsonError(auth.error, auth.status);
  const body = await readJsonObject(request);
  if (!body) return jsonError("A JSON object is required.", 400);
  const update: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if ("name" in body) {
    const name = cleanOptionalText(body.name, 120);
    if (!name) return jsonError("name cannot be empty.", 400);
    update.name = name;
  }
  if ("description" in body) update.description = cleanOptionalText(body.description, 2000) ?? null;
  if ("is_pinned" in body) {
    const wantsPin = Boolean(body.is_pinned);
    if (wantsPin) {
      await auth.supabase.from("circles").update({ is_pinned: false }).eq("user_id", auth.user.id).neq("id", params.circleId);
    }
    update.is_pinned = wantsPin;
  }
  const { data, error } = await auth.supabase
    .from("circles")
    .update(update)
    .eq("id", params.circleId)
    .eq("user_id", auth.user.id)
    .select("*")
    .single();
  if (error) return jsonError(error.message, 500);
  return NextResponse.json({ circle: data });
}

export async function DELETE(request: NextRequest, { params }: { params: { circleId: string } }) {
  const auth = await authenticateRequest(request);
  if (isAuthFailure(auth)) return jsonError(auth.error, auth.status);
  try {
    await deleteEntityLinks(auth.supabase, auth.user.id, "circle", params.circleId);
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : "Could not remove connections.", 500);
  }
  const { error } = await auth.supabase.from("circles").delete().eq("id", params.circleId).eq("user_id", auth.user.id);
  if (error) return jsonError(error.message, 500);
  return NextResponse.json({ ok: true });
}
