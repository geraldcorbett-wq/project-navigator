import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest, isAuthFailure } from "../../../../lib/api/auth";
import { deleteEntityLinks } from "../../../../lib/api/entity-links";
import { cleanOptionalText, jsonError, readJsonObject } from "../../../../lib/api/json";

export async function PATCH(request: NextRequest, { params }: { params: { memoryId: string } }) {
  const auth = await authenticateRequest(request);
  if (isAuthFailure(auth)) return jsonError(auth.error, auth.status);
  const body = await readJsonObject(request);
  if (!body) return jsonError("A JSON object is required.", 400);

  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (body.content !== undefined) patch.content = cleanOptionalText(body.content, 8000);
  if (body.category !== undefined) patch.category = cleanOptionalText(body.category, 80);
  if (body.importance !== undefined) patch.importance = Math.min(5, Math.max(1, Number(body.importance) || 3));
  if (body.metadata !== undefined) patch.metadata = body.metadata;

  if (body.is_pinned !== undefined) {
    const wantsPin = Boolean(body.is_pinned);
    if (wantsPin) {
      const { data: profile, error: profileError } = await auth.supabase
        .from("profiles")
        .select("memory_pin_limit")
        .eq("id", auth.user.id)
        .maybeSingle();
      if (profileError) return jsonError(profileError.message, 500);
      const limit = Math.min(5, Math.max(3, Number(profile?.memory_pin_limit) || 3));
      const { count, error: countError } = await auth.supabase
        .from("memories")
        .select("id", { count: "exact", head: true })
        .eq("user_id", auth.user.id)
        .eq("is_pinned", true)
        .neq("id", params.memoryId);
      if (countError) return jsonError(countError.message, 500);
      if ((count || 0) >= limit) return jsonError(`You can pin up to ${limit} memories. Unpin one first.`, 409);
    }
    patch.is_pinned = wantsPin;
  }

  const { data, error } = await auth.supabase
    .from("memories")
    .update(patch)
    .eq("id", params.memoryId)
    .eq("user_id", auth.user.id)
    .select("*")
    .single();
  if (error) return jsonError(error.message, 500);
  return NextResponse.json({ memory: data });
}

export async function DELETE(request: NextRequest, { params }: { params: { memoryId: string } }) {
  const auth = await authenticateRequest(request);
  if (isAuthFailure(auth)) return jsonError(auth.error, auth.status);
  try {
    await deleteEntityLinks(auth.supabase, auth.user.id, "memory", params.memoryId);
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : "Could not remove connections.", 500);
  }
  const { error } = await auth.supabase.from("memories").delete().eq("id", params.memoryId).eq("user_id", auth.user.id);
  if (error) return jsonError(error.message, 500);
  return new NextResponse(null, { status: 204 });
}
