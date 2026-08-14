import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest, isAuthFailure } from "../../../../lib/api/auth";
import { jsonError, readJsonObject } from "../../../../lib/api/json";

type Context = { params: { notificationId: string } };

export async function PATCH(request: NextRequest, { params }: Context) {
  const auth = await authenticateRequest(request);
  if (isAuthFailure(auth)) return jsonError(auth.error, auth.status);
  const body = await readJsonObject(request);
  if (!body) return jsonError("A JSON object is required.", 400);
  const patch: Record<string, unknown> = {};
  if (body.read !== undefined) patch.read_at = body.read ? new Date().toISOString() : null;
  if (body.status !== undefined) patch.status = body.status;
  if (Object.keys(patch).length === 0) return jsonError("No valid changes supplied.", 400);
  const { data, error } = await auth.supabase.from("notifications").update(patch)
    .eq("id", params.notificationId).eq("user_id", auth.user.id).select("*").maybeSingle();
  if (error) return jsonError(error.message, 500);
  if (!data) return jsonError("Notification not found.", 404);
  return NextResponse.json({ notification: data });
}

export async function DELETE(request: NextRequest, { params }: Context) {
  const auth = await authenticateRequest(request);
  if (isAuthFailure(auth)) return jsonError(auth.error, auth.status);
  const { data, error } = await auth.supabase.from("notifications").delete()
    .eq("id", params.notificationId).eq("user_id", auth.user.id).select("id").maybeSingle();
  if (error) return jsonError(error.message, 500);
  if (!data) return jsonError("Notification not found.", 404);
  return NextResponse.json({ ok: true, id: data.id });
}
