import { NextResponse } from "next/server";
import {
  requireAdminRest,
  RestAuthError,
} from "@/lib/firestore-rest";
import { sendWhatsAppText } from "@/lib/whatsapp";

export const runtime = "nodejs";

/**
 * POST /api/whatsapp/send
 * Body: { to: string, message: string, previewUrl?: boolean }
 * Auth: Firebase ID token + /admins/{uid}
 *
 * Uses Meta Cloud API:
 *   POST https://graph.facebook.com/{version}/{PHONE_NUMBER_ID}/messages
 */
export async function POST(request: Request) {
  try {
    await requireAdminRest(request);
  } catch (err) {
    if (err instanceof RestAuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: {
    to?: string;
    phone?: string;
    message?: string;
    body?: string;
    previewUrl?: boolean;
  };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const to = (body.to ?? body.phone)?.trim() ?? "";
  const message = (body.message ?? body.body)?.trim() ?? "";
  if (!to) {
    return NextResponse.json(
      { error: "to (phone number) is required" },
      { status: 400 },
    );
  }
  if (!message) {
    return NextResponse.json({ error: "message is required" }, { status: 400 });
  }

  try {
    const result = await sendWhatsAppText({
      to,
      message,
      previewUrl: body.previewUrl,
    });
    return NextResponse.json({
      ok: true,
      messageId: result.messageId,
      waId: result.waId,
    });
  } catch (err) {
    console.error("whatsapp send failed", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Could not send WhatsApp" },
      { status: 502 },
    );
  }
}
