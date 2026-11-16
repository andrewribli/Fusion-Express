import "server-only";

/**
 * Meta WhatsApp Cloud API (Graph) helpers.
 * Env:
 * - WHATSAPP_PHONE_NUMBER_ID — from Meta App → WhatsApp → API Setup
 * - WHATSAPP_ACCESS_TOKEN — permanent system user token (or temp token for testing)
 * - WHATSAPP_API_VERSION — optional, defaults to v22.0
 * - WHATSAPP_OWNER_PHONE — digits with country code, no +, for owner order alerts
 */

export type WhatsAppSendResult = {
  messageId: string | null;
  waId: string | null;
  raw: unknown;
};

function graphVersion(): string {
  const raw = process.env.WHATSAPP_API_VERSION?.trim() || "v22.0";
  return raw.startsWith("v") ? raw : `v${raw}`;
}

function phoneNumberId(): string {
  const id = process.env.WHATSAPP_PHONE_NUMBER_ID?.trim();
  if (!id) throw new Error("WHATSAPP_PHONE_NUMBER_ID is not set");
  return id;
}

function accessToken(): string {
  const token = process.env.WHATSAPP_ACCESS_TOKEN?.trim();
  if (!token) throw new Error("WHATSAPP_ACCESS_TOKEN is not set");
  return token;
}

/** Strip non-digits; Meta accepts digits with country code (no +). */
export function normalizeWhatsAppPhone(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (digits.length < 8) {
    throw new Error("Phone number looks too short.");
  }
  return digits;
}

export function isWhatsAppConfigured(): boolean {
  return Boolean(
    process.env.WHATSAPP_PHONE_NUMBER_ID?.trim() &&
      process.env.WHATSAPP_ACCESS_TOKEN?.trim(),
  );
}

export async function sendWhatsAppText(opts: {
  to: string;
  message: string;
  previewUrl?: boolean;
}): Promise<WhatsAppSendResult> {
  const to = normalizeWhatsAppPhone(opts.to);
  const body = opts.message.trim();
  if (!body) throw new Error("Message is required");
  if (body.length > 4096) {
    throw new Error("Message is too long (max 4096 characters).");
  }

  const url = `https://graph.facebook.com/${graphVersion()}/${phoneNumberId()}/messages`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken()}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      recipient_type: "individual",
      to,
      type: "text",
      text: {
        preview_url: Boolean(opts.previewUrl),
        body,
      },
    }),
  });

  const raw = (await res.json().catch(() => null)) as
    | {
        messages?: { id?: string }[];
        contacts?: { wa_id?: string }[];
        error?: { message?: string; code?: number; error_user_msg?: string };
      }
    | null;

  if (!res.ok) {
    const msg =
      raw?.error?.error_user_msg ||
      raw?.error?.message ||
      `WhatsApp API error (${res.status})`;
    throw new Error(msg);
  }

  return {
    messageId: raw?.messages?.[0]?.id ?? null,
    waId: raw?.contacts?.[0]?.wa_id ?? null,
    raw,
  };
}

/** Owner inbox for new-order WhatsApp alerts. No-op when phone/token unset. */
export async function notifyOwnerWhatsAppNewOrder(opts: {
  customerName: string;
  items: { name: string; quantity: number }[];
  deliveryLocation: string;
  total: number;
  orderId: string;
}): Promise<{ sent: boolean; skipped?: string }> {
  if (!isWhatsAppConfigured()) {
    return { sent: false, skipped: "WhatsApp env not configured" };
  }
  const to = process.env.WHATSAPP_OWNER_PHONE?.trim();
  if (!to) {
    return { sent: false, skipped: "WHATSAPP_OWNER_PHONE is not set" };
  }

  const customerName = opts.customerName.trim() || "Customer";
  const itemList =
    opts.items.map((item) => `${item.quantity}× ${item.name}`).join(", ") ||
    "—";
  const total =
    Math.round(opts.total * 10) / 10;
  const totalLabel = Number.isInteger(total) ? String(total) : total.toFixed(1);

  const message = `New GraceRun order

Customer: ${customerName}
Items: ${itemList}
Dorm/Lobby: ${opts.deliveryLocation.trim() || "—"}
Estimated total: HK$${totalLabel}
Order: ${opts.orderId}`;

  await sendWhatsAppText({ to, message });
  return { sent: true };
}
