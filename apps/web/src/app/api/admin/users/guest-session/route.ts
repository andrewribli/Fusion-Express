import { NextRequest, NextResponse } from "next/server";
import {
  mintCustomAuthToken,
  verifyAdminIdTokenRest,
} from "@/lib/identity-toolkit-rest";

function jsonError(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

/**
 * Admin-only: mint a short-lived custom token so ops can text a guest a
 * one-click https://gracerun.fit/auth/session?token=… link.
 */
export async function POST(request: NextRequest) {
  const authHeader = request.headers.get("authorization") ?? "";
  const token = authHeader.startsWith("Bearer ")
    ? authHeader.slice("Bearer ".length).trim()
    : null;
  const admin = await verifyAdminIdTokenRest(token);
  if (!admin) {
    return jsonError("Admin access required.", 403);
  }

  let body: { uid?: string; next?: string };
  try {
    body = (await request.json()) as { uid?: string; next?: string };
  } catch {
    return jsonError("Invalid request", 400);
  }

  const uid = body.uid?.trim() ?? "";
  if (!uid) return jsonError("Missing uid", 400);

  const next =
    body.next && body.next.startsWith("/") && !body.next.startsWith("//")
      ? body.next
      : "/";

  try {
    const customToken = mintCustomAuthToken(uid, 3600);
    return NextResponse.json({
      ok: true,
      uid,
      customToken,
      expiresInSec: 3600,
      sessionPath: `/auth/session?token=${encodeURIComponent(customToken)}&next=${encodeURIComponent(next)}`,
    });
  } catch (err) {
    console.error("admin guest-session failed", err);
    return jsonError(
      err instanceof Error ? err.message : "Could not mint session.",
      502,
    );
  }
}
