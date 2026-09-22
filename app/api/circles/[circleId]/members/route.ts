import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest, isAuthFailure } from "../../../../../lib/api/auth";
import { cleanOptionalText, jsonError, readJsonObject } from "../../../../../lib/api/json";
export const dynamic = "force-dynamic";
type Context = { params: Promise<{ circleId: string }> };

export async function GET(request: NextRequest, { params }: Context) {
  const { circleId } = await params;
  const auth=await authenticateRequest(request); if(isAuthFailure(auth)) return jsonError(auth.error,auth.status);
  const {data,error}=await auth.supabase.from("circle_members").select("id,user_id,display_name,email,role,relationship_label,created_at").eq("circle_id",circleId).order("created_at",{ascending:true});
  if(error)return jsonError(error.message,500); return NextResponse.json({members:data??[]});
}

export async function POST(request: NextRequest, { params }: Context) {
  const { circleId } = await params;
  const auth = await authenticateRequest(request); if (isAuthFailure(auth)) return jsonError(auth.error, auth.status);
  const body = await readJsonObject(request); if (!body) return jsonError("A JSON object is required.", 400);
  const displayName = cleanOptionalText(body.display_name, 120); if (!displayName) return jsonError("display_name is required.", 400);
  const email = cleanOptionalText(body.email, 320); const relationshipLabel = cleanOptionalText(body.relationship_label, 80);
  const memberUserId = typeof body.user_id === "string" && body.user_id ? body.user_id : null;
  const { data, error } = await auth.supabase.from("circle_members").insert({ circle_id: circleId, user_id: memberUserId, display_name: displayName, email: email ?? null, relationship_label: relationshipLabel ?? null, role: "member" }).select("id,user_id,display_name,email,role,relationship_label,created_at").single();
  if (error) return jsonError(error.message, 500); return NextResponse.json({ member: data }, { status: 201 });
}
