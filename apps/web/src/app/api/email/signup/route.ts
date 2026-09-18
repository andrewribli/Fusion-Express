import { NextResponse } from "next/server";
import { sendAdminNewUserNotice } from "@/lib/email";
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
    isRunner?: boolean;
  };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const email = cap((body.email ?? "").trim().toLowerCase(), 320);
  const fullName = cap((body.fullName ?? "").trim(), 120);

  if (!email || !email.includes("@")) {
    return NextResponse.json({ error: "Valid email is required" }, { status: 400 });
  }
  if (!auth.email || auth.email !== email) {
    return NextResponse.json(
      { error: "Email must match the signed-in account." },
      { status: 403 },
    );
  }

  try {
    await sendAdminNewUserNotice({
      fullName,
      email,
      collegeHall: "",
      isRunner: Boolean(body.isRunner),
    });
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("admin new-user notice failed after retry", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Could not send email" },
      { status: 502 },
    );
  }
}
