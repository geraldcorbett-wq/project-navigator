import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest, isAuthFailure } from "../../../../lib/api/auth";
import { jsonError, readJsonObject } from "../../../../lib/api/json";

type Context = { params: { jobId: string } };

export async function PATCH(request: NextRequest, { params }: Context) {
  const auth = await authenticateRequest(request);
  if (isAuthFailure(auth)) return jsonError(auth.error, auth.status);
  const body = await readJsonObject(request);
  if (!body) return jsonError("A JSON object is required.", 400);
  const allowed = ["queued", "running", "completed", "failed", "cancelled"];
  if (!allowed.includes(String(body.status))) return jsonError("Invalid job status.", 400);
  const patch: Record<string, unknown> = { status: body.status };
  if (body.result !== undefined) patch.result = body.result;
  if (body.error !== undefined) patch.error = body.error;
  if (body.status === "running") patch.started_at = new Date().toISOString();
  if (["completed", "failed", "cancelled"].includes(String(body.status))) patch.finished_at = new Date().toISOString();
  const { data, error } = await auth.supabase.from("jobs").update(patch)
    .eq("id", params.jobId).eq("user_id", auth.user.id).select("*").maybeSingle();
  if (error) return jsonError(error.message, 500);
  if (!data) return jsonError("Job not found.", 404);
  return NextResponse.json({ job: data });
}

export async function DELETE(request: NextRequest, { params }: Context) {
  const auth = await authenticateRequest(request);
  if (isAuthFailure(auth)) return jsonError(auth.error, auth.status);
  const { data, error } = await auth.supabase.from("jobs").delete()
    .eq("id", params.jobId).eq("user_id", auth.user.id).select("id").maybeSingle();
  if (error) return jsonError(error.message, 500);
  if (!data) return jsonError("Job not found.", 404);
  return NextResponse.json({ ok: true, id: data.id });
}
