import { NextResponse } from "next/server";
import { processExpiredDeliveryWarnings } from "@/lib/expired-warning-job";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

function cronAuthorized(request: Request): boolean {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) return false;
  return request.headers.get("authorization") === `Bearer ${secret}`;
}

/** Vercel cron. Stamps expired deliveries and emails the runner. Never throws. */
export async function GET(request: Request) {
  if (!cronAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const summary = await processExpiredDeliveryWarnings();
    return NextResponse.json({ ok: true, ...summary });
  } catch (err) {
    console.error("expire deliveries cron failed", err);
    return NextResponse.json({ ok: false });
  }
}
