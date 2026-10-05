import { NextResponse } from "next/server";
import { processChatMediaCleanup } from "@/lib/cleanup-chat-media";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

function cronAuthorized(request: Request): boolean {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) return false;
  return request.headers.get("authorization") === `Bearer ${secret}`;
}

/** Daily: purge order chat media (30d) and admin chat media (90d). */
export async function GET(request: Request) {
  if (!cronAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const summary = await processChatMediaCleanup();
    return NextResponse.json({ ok: true, ...summary });
  } catch (err) {
    console.error("cleanup-chat-media cron failed", err);
    return NextResponse.json({ ok: false });
  }
}
