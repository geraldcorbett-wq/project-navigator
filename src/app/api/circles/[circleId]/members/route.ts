import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest, isAuthFailure } from "../../../../../lib/api/auth";
import { cleanOptionalText, jsonError, readJsonObject } from "../../../../../lib/api/json";
export const dynamic = "force-dynamic";
export async function POST(request: NextRequest, { params }: { params: { circleId: string } }) {
  const auth = await authenticateRequest(request); if (isAuthFailure(auth)) return jsonError(auth.error, auth.status);
  const body = await readJsonObject(request); if (!body) return jsonError("A JSON object is required.", 400);
  const displayName = cleanOptionalText(body.display_name, 120); if (!displayName) return jsonError("display_name is required.", 400);
  const email = cleanOptionalText(body.email, 320);
  const memberUserId = typeof body.user_id === "string" && body.user_id ? body.user_id : null;
  const { data, error } = await auth.supabase.from("circle_members").insert({ circle_id: params.circleId, user_id: memberUserId, display_name: displayName, email: email ?? null, role: "member" }).select("*").single();
  if (error) return jsonError(error.message, 500); return NextResponse.json({ member: data }, { status: 201 });
}
