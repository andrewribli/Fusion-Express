import { NextResponse } from "next/server";
import {
  readDeliveryIdentity,
  saveDeliveryIdentity,
} from "@/lib/delivery-identity-server";
import {
  AdminAuthError,
  getAdminDb,
  requireAuthFromRequest,
} from "@/lib/firebase-admin";

export async function GET(request: Request) {
  try {
    const auth = await requireAuthFromRequest(request);
    const db = getAdminDb();
    if (!db) {
      return NextResponse.json({ error: "Account service unavailable." }, { status: 503 });
    }
    const identity = await readDeliveryIdentity(db, auth.uid);
    return NextResponse.json(identity);
  } catch (err) {
    if (err instanceof AdminAuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    console.error("read delivery identity failed", err);
    return NextResponse.json({ error: "Could not load delivery identity." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const auth = await requireAuthFromRequest(request);
    const db = getAdminDb();
    if (!db) {
      return NextResponse.json({ error: "Account service unavailable." }, { status: 503 });
    }
    const body = (await request.json()) as {
      displayName?: unknown;
      isAnonymous?: unknown;
      photoUrl?: unknown;
      clearPhoto?: boolean;
      changePseudonym?: boolean;
    };
    const identity = await saveDeliveryIdentity(db, auth.uid, body);
    return NextResponse.json(identity);
  } catch (err) {
    if (err instanceof AdminAuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    const status = (err as { status?: number }).status;
    const retryAt = (err as { retryAt?: string }).retryAt;
    if (err instanceof Error && status === 429) {
      return NextResponse.json({ error: err.message, retryAt }, { status: 429 });
    }
    if (err instanceof Error && /invalid|fewer|email|avatar|anonymous/i.test(err.message)) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
    console.error("save delivery identity failed", err);
    return NextResponse.json({ error: "Could not save delivery identity." }, { status: 500 });
  }
}
