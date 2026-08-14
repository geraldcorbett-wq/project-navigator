import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest, isAuthFailure } from "../../../lib/api/auth";
import { cleanOptionalText, jsonError, readJsonObject } from "../../../lib/api/json";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const auth = await authenticateRequest(request);
  if (isAuthFailure(auth)) return jsonError(auth.error, auth.status);
  const q = request.nextUrl.searchParams.get("q")?.trim();
  let query = auth.supabase
    .from("circles")
    .select("*, circle_members(*)")
    .eq("user_id", auth.user.id)
    .order("is_pinned", { ascending: false })
    .order("updated_at", { ascending: false });
  if (q) {
    const clean = q.slice(0, 200).replace(/[%_,()]/g, "");
    query = query.or(`name.ilike.%${clean}%,description.ilike.%${clean}%`);
  }
  const { data, error } = await query;
  if (error) return jsonError(error.message, 500);
  return NextResponse.json({ circles: data ?? [] });
}

export async function POST(request: NextRequest) {
  const auth = await authenticateRequest(request);
  if (isAuthFailure(auth)) return jsonError(auth.error, auth.status);
  const body = await readJsonObject(request);
  if (!body) return jsonError("A JSON object is required.", 400);
  const name = cleanOptionalText(body.name, 120);
  if (!name) return jsonError("name is required.", 400);
  const { data, error } = await auth.supabase
    .from("circles")
    .insert({ user_id: auth.user.id, name, description: cleanOptionalText(body.description, 2000) ?? null })
    .select("*")
    .single();
  if (error) return jsonError(error.message, 500);
  await auth.supabase.from("circle_members").insert({
    circle_id: data.id,
    user_id: auth.user.id,
    display_name: String(auth.user.user_metadata?.display_name || auth.user.email || "Me"),
    email: auth.user.email ?? null,
    role: "owner"
  });
  return NextResponse.json({ circle: data }, { status: 201 });
}
