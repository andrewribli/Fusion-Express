import { NextRequest, NextResponse } from "next/server";
import {
  lookupAuthContactsRest,
  verifyAdminIdTokenRest,
} from "@/lib/identity-toolkit-rest";

function jsonError(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

/** Display-only Auth email/name for incomplete Firestore profiles. Does not write profiles. */
export async function POST(request: NextRequest) {
  const authHeader = request.headers.get("authorization") ?? "";
  const token = authHeader.startsWith("Bearer ")
    ? authHeader.slice("Bearer ".length).trim()
    : null;
  const admin = await verifyAdminIdTokenRest(token);
  if (!admin) {
    return jsonError("Admin access required.", 403);
  }

  let body: { uids?: unknown };
  try {
    body = (await request.json()) as { uids?: unknown };
  } catch {
    return jsonError("Invalid request", 400);
  }

  const uids = Array.isArray(body.uids)
    ? body.uids.filter((uid): uid is string => typeof uid === "string")
    : [];
  if (uids.length === 0) {
    return NextResponse.json({ contacts: {} });
  }

  try {
    const contacts = await lookupAuthContactsRest(uids);
    return NextResponse.json({ contacts });
  } catch (err) {
    console.error("directory auth lookup failed", err);
    return NextResponse.json({ contacts: {} });
  }
}
