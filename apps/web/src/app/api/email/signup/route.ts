import { NextResponse } from "next/server";
import { sendAdminNewUserNotice } from "@/lib/email";
import { dispatchSignupPush } from "@/lib/expo-push";
import {
  AdminAuthError,
  requireAuthFromRequest,
} from "@/lib/firebase-admin";

function cap(value: string, max: number): string {
  return value.slice(0, max);
}

export async function POST(request: Request) {
  let auth;
  try {
    auth = await requireAuthFromRequest(request);
  } catch (err) {
    if (err instanceof AdminAuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: {
    fullName?: string;
    email?: string;
    campus?: string;
    referralSource?: string;
    isRunner?: boolean;
  };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const email = cap((body.email ?? "").trim().toLowerCase(), 320);
  const fullName = cap((body.fullName ?? "").trim(), 120);
  const campus = cap((body.campus ?? "").trim(), 40);
  const referralSource = cap((body.referralSource ?? "").trim(), 40);
  const authEmail = (auth.email ?? "").trim().toLowerCase();

  if (!email || !email.includes("@")) {
    return NextResponse.json({ error: "Valid email is required" }, { status: 400 });
  }
  // Case-insensitive: Firebase token email casing can differ from the form.
  if (!authEmail || authEmail !== email) {
    return NextResponse.json(
      { error: "Email must match the signed-in account." },
      { status: 403 },
    );
  }

  try {
    await sendAdminNewUserNotice({
      fullName,
      email,
      campus,
      referralSource,
      isRunner: Boolean(body.isRunner),
    });
  } catch (err) {
    console.error("admin new-user notice failed after retry", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Could not send email" },
      { status: 502 },
    );
  }

  // Best-effort phone buzz for admins with Expo tokens (does not fail signup).
  try {
    await dispatchSignupPush({
      fullName,
      email,
      campus,
      skipUid: auth.uid,
    });
  } catch (err) {
    console.error("admin signup push failed", err);
  }

  return NextResponse.json({ ok: true });
}
