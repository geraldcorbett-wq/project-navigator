import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest, isAuthFailure } from "../../../lib/api/auth";
import { jsonError, readJsonObject } from "../../../lib/api/json";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const auth = await authenticateRequest(request);
  if (isAuthFailure(auth)) return jsonError(auth.error, auth.status);
  const { data, error } = await auth.supabase
    .from("profiles")
    .select("id,preferred_name,display_name,preferred_language,time_zone,navigator_name,memory_pin_limit")
    .eq("id", auth.user.id)
    .maybeSingle();
  if (error) return jsonError(error.message, 500);
  return NextResponse.json({ profile: data });
}

export async function PATCH(request: NextRequest) {
  const auth = await authenticateRequest(request);
  if (isAuthFailure(auth)) return jsonError(auth.error, auth.status);
  const body = await readJsonObject(request);
  if (!body) return jsonError("A JSON object is required.", 400);
  const nextLimit = Number(body.memory_pin_limit);
  if (![3, 4, 5].includes(nextLimit)) return jsonError("memory_pin_limit must be 3, 4, or 5.", 400);
  const { data, error } = await auth.supabase
    .from("profiles")
    .update({ memory_pin_limit: nextLimit, updated_at: new Date().toISOString() })
    .eq("id", auth.user.id)
    .select("*")
    .single();
  if (error) return jsonError(error.message, 500);
  return NextResponse.json({ profile: data });
}
