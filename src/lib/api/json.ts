import { NextRequest, NextResponse } from "next/server";

export async function readJsonObject(
  request: NextRequest
): Promise<Record<string, unknown> | null> {
  try {
    const body: unknown = await request.json();
    if (!body || typeof body !== "object" || Array.isArray(body)) return null;
    return body as Record<string, unknown>;
  } catch {
    return null;
  }
}

export function jsonError(error: string, status: number) {
  return NextResponse.json({ error }, { status });
}

export function cleanOptionalText(
  value: unknown,
  maxLength: number
): string | null | undefined {
  if (value === undefined) return undefined;
  if (value === null) return null;
  if (typeof value !== "string") return undefined;
  const cleaned = value.trim();
  return cleaned ? cleaned.slice(0, maxLength) : null;
}
