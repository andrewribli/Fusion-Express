import { validateCampusEmail } from "@/ptero/config/campus";

export function validateEmail(email: string): string | null {
  return validateCampusEmail(email);
}

export function validatePassword(password: string): string | null {
  if (password.length < 8) return "Password must be at least 8 characters";
  return null;
}

export function validatePhone(phone: string): string | null {
  const digits = phone.replace(/\D/g, "");
  if (digits.length < 8) return "Enter a valid Hong Kong mobile number";
  return null;
}

/** Prototype-only hash — not for production. */
export async function hashPassword(password: string): Promise<string> {
  const data = new TextEncoder().encode(`gracerun-cityu:${password}`);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}
