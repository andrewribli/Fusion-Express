import { NextResponse } from "next/server";
import {
  deleteOwnAccountRest,
  verifyBearerUid,
} from "@/lib/account-delete-rest";

export async function POST(request: Request) {
  try {
    const auth = await verifyBearerUid(request);
    const result = await deleteOwnAccountRest(auth.uid);
    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    console.error("account delete failed", err);
    const message = err instanceof Error ? err.message : "Could not delete account.";
    const status = /token|authorization/i.test(message) ? 401 : 502;
    return NextResponse.json({ error: message }, { status });
  }
}
