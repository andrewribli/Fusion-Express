import { NextResponse } from "next/server";
import { sendDirectAdminEmail } from "@/lib/email";
import { AdminAuthError, requireAdminFromRequest } from "@/lib/firebase-admin";

export async function POST(request: Request) {
  try {
    await requireAdminFromRequest(request);
  } catch (err) {
    if (err instanceof AdminAuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { to?: string; recipientName?: string; message?: string };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const to = body.to?.trim() ?? "";
  const message = body.message?.trim() ?? "";
  if (!to || !message) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }

  try {
    await sendDirectAdminEmail(to, body.recipientName ?? "", message);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("direct email failed", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Could not send email" },
      { status: 502 },
    );
  }
}
