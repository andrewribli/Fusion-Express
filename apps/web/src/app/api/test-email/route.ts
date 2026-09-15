import { NextRequest, NextResponse } from "next/server";
import { sendOrderConfirmation } from "@/lib/email";

function allowedTo(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export async function POST(request: NextRequest) {
  let body: { to?: string };
  try {
    body = (await request.json()) as { to?: string };
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const to = body.to?.trim().toLowerCase() ?? "";
  if (!allowedTo(to)) {
    return NextResponse.json({ error: "Provide a valid to email" }, { status: 400 });
  }

  try {
    await sendOrderConfirmation(
      to,
      "TEST-1001",
      [
        { name: "Shin Ramen", quantity: 2, price: 9 },
        { name: "Banana milk", quantity: 1, price: 8.5 },
      ],
      36.5,
    );
    return NextResponse.json({ ok: true, to });
  } catch (err) {
    console.error("test-email failed", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Could not send test email" },
      { status: 502 },
    );
  }
}
