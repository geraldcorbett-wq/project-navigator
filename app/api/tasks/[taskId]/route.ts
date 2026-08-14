import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest, isAuthFailure } from "../../../../lib/api/auth";
import { cleanOptionalText, jsonError, readJsonObject } from "../../../../lib/api/json";

type Context = { params: { taskId: string } };

export async function PATCH(request: NextRequest, { params }: Context) {
  const auth = await authenticateRequest(request);
  if (isAuthFailure(auth)) return jsonError(auth.error, auth.status);
  const body = await readJsonObject(request);
  if (!body) return jsonError("A JSON object is required.", 400);

  const patch: Record<string, unknown> = {};
  if (body.title !== undefined) {
    const title = cleanOptionalText(body.title, 240);
    if (!title) return jsonError("Title cannot be empty.", 400);
    patch.title = title;
  }
  if (body.status !== undefined) {
    if (!["pending", "active", "completed", "cancelled"].includes(String(body.status))) {
      return jsonError("Invalid task status.", 400);
    }
    patch.status = body.status;
  }
  if (body.position !== undefined) patch.position = Math.max(0, Number(body.position) || 0);
  if (body.due_at !== undefined) patch.due_at = body.due_at || null;
  if (Object.keys(patch).length === 0) return jsonError("No valid changes supplied.", 400);

  const { data, error } = await auth.supabase
    .from("tasks").update(patch)
    .eq("id", params.taskId).eq("user_id", auth.user.id)
    .select("*").maybeSingle();
  if (error) return jsonError(error.message, 500);
  if (!data) return jsonError("Task not found.", 404);
  return NextResponse.json({ task: data });
}

export async function DELETE(request: NextRequest, { params }: Context) {
  const auth = await authenticateRequest(request);
  if (isAuthFailure(auth)) return jsonError(auth.error, auth.status);
  const { data, error } = await auth.supabase
    .from("tasks").delete()
    .eq("id", params.taskId).eq("user_id", auth.user.id)
    .select("id").maybeSingle();
  if (error) return jsonError(error.message, 500);
  if (!data) return jsonError("Task not found.", 404);
  return NextResponse.json({ ok: true, id: data.id });
}
