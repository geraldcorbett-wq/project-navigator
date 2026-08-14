import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest, isAuthFailure } from "../../../lib/api/auth";
import { cleanOptionalText, jsonError, readJsonObject } from "../../../lib/api/json";
export const dynamic = "force-dynamic";
export async function GET(request: NextRequest) {
  const auth = await authenticateRequest(request); if (isAuthFailure(auth)) return jsonError(auth.error, auth.status);
  const q = request.nextUrl.searchParams.get("q")?.trim();
  let query = auth.supabase.from("memories").select("*, memory_conversations(conversation_id)").eq("user_id", auth.user.id).order("is_pinned", { ascending:false }).order("importance", { ascending:false }).order("updated_at", { ascending:false }).limit(100);
  if (q) { const clean = q.slice(0,200).replace(/[%_,()]/g, ""); query = query.or(`content.ilike.%${clean}%,category.ilike.%${clean}%`); }
  const {data,error}=await query; if(error) return jsonError(error.message,500); return NextResponse.json({memories:data});
}
export async function POST(request: NextRequest) {
  const auth=await authenticateRequest(request); if(isAuthFailure(auth)) return jsonError(auth.error,auth.status);
  const body=await readJsonObject(request); if(!body) return jsonError("A JSON object is required.",400);
  const content=cleanOptionalText(body.content,8000); if(!content) return jsonError("content is required.",400);
  const category=cleanOptionalText(body.category,80) ?? "general";
  const importance=Math.min(5,Math.max(1,Number(body.importance)||3));
  const {data,error}=await auth.supabase.from("memories").insert({user_id:auth.user.id,content,category,importance,source_conversation_id:body.source_conversation_id??null,metadata:body.metadata??{},is_pinned:Boolean(body.is_pinned)}).select("*").single();
  if(error) return jsonError(error.message,500); return NextResponse.json({memory:data},{status:201});
}
