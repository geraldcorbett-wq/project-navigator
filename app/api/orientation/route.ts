import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest, isAuthFailure } from "../../../lib/api/auth";
import { cleanOptionalText, jsonError, readJsonObject } from "../../../lib/api/json";

export const dynamic = "force-dynamic";

const selection =
  "user_id, situation, focus, desired_outcome, constraints, context, revision, created_at, updated_at";

function cleanContext(value: unknown): Record<string, unknown> | null {
  if (value === undefined) return null;
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

export async function GET(request: NextRequest) {
  const auth = await authenticateRequest(request);
  if (isAuthFailure(auth)) return jsonError(auth.error, auth.status);

  const { data, error } = await auth.supabase
    .from("orientation")
    .select(selection)
    .eq("user_id", auth.user.id)
    .maybeSingle();

  if (error) return jsonError(error.message, 500);
  return NextResponse.json({ orientation: data });
}

export async function PUT(request: NextRequest) {
  const auth = await authenticateRequest(request);
  if (isAuthFailure(auth)) return jsonError(auth.error, auth.status);

  const body = await readJsonObject(request);
  if (!body) return jsonError("A JSON object is required.", 400);

  const context = body.context === undefined ? {} : cleanContext(body.context);
  if (context === null) return jsonError("context must be a JSON object.", 400);

  const orientation = {
    user_id: auth.user.id,
    situation: cleanOptionalText(body.situation, 4000) ?? null,
    focus: cleanOptionalText(body.focus, 1000) ?? null,
    desired_outcome: cleanOptionalText(body.desired_outcome, 2000) ?? null,
    constraints: cleanOptionalText(body.constraints, 4000) ?? null,
    context
  };

  const { data, error } = await auth.supabase
    .from("orientation")
    .upsert(orientation, { onConflict: "user_id" })
    .select(selection)
    .single();

  if (error) return jsonError(error.message, 500);
  return NextResponse.json({ orientation: data });
}

export async function DELETE(request: NextRequest) {
  const auth = await authenticateRequest(request);
  if (isAuthFailure(auth)) return jsonError(auth.error, auth.status);

  const { error } = await auth.supabase
    .from("orientation")
    .delete()
    .eq("user_id", auth.user.id);

  if (error) return jsonError(error.message, 500);
  return new NextResponse(null, { status: 204 });
}
