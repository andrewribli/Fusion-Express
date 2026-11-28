/**
 * Runner trust pack — Call / WhatsApp helpers.
 * Phone is only stamped on orders when the customer opted in
 * (`sharePhoneWithRunner`). Absent phone = no contact buttons.
 */

export function digitsOnlyPhone(phone: string | null | undefined): string {
  return String(phone ?? "").replace(/\D/g, "");
}

/** Stamp for createOrder — empty object when opt-in is off or phone invalid. */
export function customerPhoneStamp(profile: {
  sharePhoneWithRunner?: boolean | null;
  phone?: string | null;
}): { customerPhone?: string } {
  if (profile.sharePhoneWithRunner !== true) return {};
  const digits = digitsOnlyPhone(profile.phone);
  if (digits.length < 8 || digits.length > 15) return {};
  return { customerPhone: digits };
}

/** Digits from an order (or empty). */
export function sharedCustomerPhone(
  order: { customerPhone?: string | null } | null | undefined,
): string {
  const digits = digitsOnlyPhone(order?.customerPhone);
  return digits.length >= 8 && digits.length <= 15 ? digits : "";
}

export function telUrl(phone: string | null | undefined): string | null {
  const digits = sharedCustomerPhone({ customerPhone: phone ?? undefined });
  return digits ? `tel:${digits}` : null;
}

/**
 * WhatsApp deep link. HK 8-digit mobiles get a 852 country prefix.
 * Longer numbers (already international) are used as-is.
 */
export function whatsAppMeUrl(phone: string | null | undefined): string | null {
  const digits = sharedCustomerPhone({ customerPhone: phone ?? undefined });
  if (!digits) return null;
  const intl = digits.length === 8 ? `852${digits}` : digits;
  return `https://wa.me/${intl}`;
}
