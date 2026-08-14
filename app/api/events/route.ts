import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest, isAuthFailure } from "../../../lib/api/auth";
import { jsonError } from "../../../lib/api/json";

export const dynamic = "force-dynamic";

function cleanFilter(value: string | null, maxLength: number) {
  if (!value) return null;
  const cleaned = value.trim();
  if (!cleaned || cleaned.length > maxLength) return null;
  return cleaned;
}

export async function GET(request: NextRequest) {
  const auth = await authenticateRequest(request);
  if (isAuthFailure(auth)) return jsonError(auth.error, auth.status);

  const limitParam = Number(request.nextUrl.searchParams.get("limit") || "100");
  const limit = Number.isFinite(limitParam)
    ? Math.min(Math.max(Math.trunc(limitParam), 1), 250)
    : 100;

  const before = request.nextUrl.searchParams.get("before");
  const eventType = cleanFilter(request.nextUrl.searchParams.get("event_type"), 120);
  const entityType = cleanFilter(request.nextUrl.searchParams.get("entity_type"), 80);
  const entityId = cleanFilter(request.nextUrl.searchParams.get("entity_id"), 36);

  let query = auth.supabase
    .from("events")
    .select("id, event_type, entity_type, entity_id, payload, occurred_at")
    .eq("user_id", auth.user.id)
    .order("occurred_at", { ascending: false })
    .limit(limit);

  if (before) query = query.lt("occurred_at", before);
  if (eventType) query = query.eq("event_type", eventType);
  if (entityType) query = query.eq("entity_type", entityType);
  if (entityId) query = query.eq("entity_id", entityId);

  const { data, error } = await query;
  if (error) return jsonError(error.message, 500);

  const nextBefore = data && data.length === limit
    ? data[data.length - 1]?.occurred_at ?? null
    : null;

  return NextResponse.json({ events: data, next_before: nextBefore });
}
