import { NextResponse } from "next/server";

export function GET() {
  return NextResponse.json({
    ok: true,
    app: "Navigator",
    version: "0.0.1",
    status: "shell-online"
  });
}
