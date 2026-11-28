import { normalizePhone } from "./auth";

/** Digits only when the customer opted in and the order carries a phone. */
export function sharedCustomerPhone(
  order: { customerPhone?: string | null } | null | undefined,
): string | null {
  const digits = normalizePhone(order?.customerPhone ?? "");
  return digits.length >= 8 ? digits : null;
}

/** Stamp for createOrder — empty when opt-in is off or phone invalid. */
export function customerPhoneStamp(profile: {
  sharePhoneWithRunner?: boolean | null;
  phone?: string | null;
}): { customerPhone?: string } {
  if (profile.sharePhoneWithRunner !== true) return {};
  const digits = normalizePhone(profile.phone ?? "");
  if (digits.length < 8 || digits.length > 15) return {};
  return { customerPhone: digits };
}

/** E.164-ish for tel:/wa.me — HK 8-digit numbers get +852. */
export function phoneE164(digitsOrRaw: string): string {
  const digits = normalizePhone(digitsOrRaw);
  if (!digits) return "";
  if (digits.startsWith("852") && digits.length >= 11) return `+${digits}`;
  if (digits.length === 8) return `+852${digits}`;
  if (digits.startsWith("1") && digits.length === 11) return `+${digits}`;
  return `+${digits}`;
}

export function telUrl(digitsOrRaw: string): string {
  const e164 = phoneE164(digitsOrRaw);
  return e164 ? `tel:${e164}` : "";
}

/** WhatsApp click-to-chat (no prefilled text). */
export function whatsAppUrl(digitsOrRaw: string): string {
  const e164 = phoneE164(digitsOrRaw).replace(/^\+/, "");
  return e164 ? `https://wa.me/${e164}` : "";
}
