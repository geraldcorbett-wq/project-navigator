import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest, isAuthFailure } from "../../../../../lib/api/auth";
import { jsonError, readJsonObject } from "../../../../../lib/api/json";
import { getNavigatorAdminClient } from "../../../../../lib/api/admin";
export const dynamic = "force-dynamic";
type Context = { params: Promise<{ circleId: string }> };

export async function GET(request: NextRequest, { params }: Context) {
  const { circleId } = await params;
  const auth = await authenticateRequest(request); if (isAuthFailure(auth)) return jsonError(auth.error, auth.status);
  const { data, error } = await auth.supabase.from("circle_responses")
    .select("id,circle_id,user_id,content,created_at").eq("circle_id", circleId).order("created_at", { ascending:true }).limit(200);
  if (error) return jsonError(error.message, 500);
  return NextResponse.json({ responses: data ?? [] }, { headers: { "Cache-Control":"no-store" } });
}

export async function POST(request: NextRequest, { params }: Context) {
  const { circleId } = await params;
  const auth = await authenticateRequest(request); if (isAuthFailure(auth)) return jsonError(auth.error, auth.status);
  const body = await readJsonObject(request); if (!body || typeof body.content !== "string" || !body.content.trim()) return jsonError("Response is required.", 400);
  const content = body.content.trim(); if (content.length > 4000) return jsonError("Response is too long.", 400);
  const { data, error } = await auth.supabase.from("circle_responses").insert({ circle_id: circleId, user_id: auth.user.id, content })
    .select("id,circle_id,user_id,content,created_at").single();
  if (error) return jsonError(error.message, 500);
  const { data: members } = await auth.supabase.from("circle_members").select("id,user_id").eq("circle_id", circleId);
  const others = (members || []).filter((member:any) => member.user_id && member.user_id !== auth.user.id);
  if (others.length === 1) {
    const admin=getNavigatorAdminClient();
    if(admin) await admin.from("contact_interactions").insert({ user_id: auth.user.id, circle_member_id: others[0].id, interaction_kind: "circle_response" });
  }
  return NextResponse.json({ response: data }, { status:201 });
}
