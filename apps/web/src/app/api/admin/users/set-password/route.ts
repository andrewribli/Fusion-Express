import { NextRequest, NextResponse } from "next/server";
import {
  setAuthPasswordForUidRest,
  verifyAdminIdTokenRest,
} from "@/lib/identity-toolkit-rest";

function jsonError(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

/** Admin-only: set a temporary password on any Auth uid (guest chase). */
export async function POST(request: NextRequest) {
  const authHeader = request.headers.get("authorization") ?? "";
  const token = authHeader.startsWith("Bearer ")
    ? authHeader.slice("Bearer ".length).trim()
    : null;
  const admin = await verifyAdminIdTokenRest(token);
  if (!admin) {
    return jsonError("Admin access required.", 403);
  }

  let body: { uid?: string; password?: string };
  try {
    body = (await request.json()) as { uid?: string; password?: string };
  } catch {
    return jsonError("Invalid request", 400);
  }

  const uid = body.uid?.trim() ?? "";
  const password = body.password?.trim() ?? "";
  if (!uid) return jsonError("Missing uid", 400);
  if (password.length < 6) {
    return jsonError("Password must be at least 6 characters", 400);
  }

  try {
    const result = await setAuthPasswordForUidRest(uid, password);
    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    console.error("admin set password failed", err);
    return jsonError(
      err instanceof Error ? err.message : "Could not set password.",
      502,
    );
  }
}
