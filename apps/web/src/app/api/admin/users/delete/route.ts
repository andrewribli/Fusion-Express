import { NextRequest, NextResponse } from "next/server";
import { deleteUserAccount } from "@/lib/firebase-admin";
import { verifyAdminIdTokenRest } from "@/lib/identity-toolkit-rest";

function jsonError(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

export async function POST(request: NextRequest) {
  const authHeader = request.headers.get("authorization") ?? "";
  const token = authHeader.startsWith("Bearer ")
    ? authHeader.slice("Bearer ".length).trim()
    : null;
  // Prefer REST verify so this route can auth even when firebase-admin/auth
  // fails to load (jose ESM). deleteUserAccount still needs Admin SDK.
  const admin = await verifyAdminIdTokenRest(token);
  if (!admin) {
    return jsonError("Admin access required.", 403);
  }

  let body: { uid?: string; username?: string };
  try {
    body = (await request.json()) as { uid?: string; username?: string };
  } catch {
    return jsonError("Invalid request", 400);
  }

  const uid = body.uid?.trim() ?? "";
  if (!uid) return jsonError("Missing uid", 400);
  if (uid === admin.uid) {
    return jsonError("You cannot delete your own admin account.", 400);
  }

  try {
    const result = await deleteUserAccount({
      uid,
      username: body.username,
    });
    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    console.error("admin delete user failed", err);
    return jsonError(
      err instanceof Error ? err.message : "Could not delete account.",
      502,
    );
  }
}
