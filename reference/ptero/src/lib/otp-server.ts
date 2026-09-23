import { NextResponse } from "next/server";
import { createHmac, randomInt, timingSafeEqual } from "crypto";
import { normalizeEmail } from "@/lib/cityu-email";

export const OTP_COOKIE = "ptero_cityu_otp";
export const SIGNUP_SESSION_COOKIE = "ptero_signup_ok";
export type OtpPurpose = "signup" | "reset";

const TTL_MS = 10 * 60 * 1000;

export class OtpConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "OtpConfigError";
  }
}

export function requireOtpSecret(): string {
  const value = process.env.OTP_SECRET?.trim();
  if (!value) {
    throw new OtpConfigError(
      "OTP_SECRET is not configured. Set it in the server environment.",
    );
  }
  return value;
}

function hmac(value: string): string {
  return createHmac("sha256", requireOtpSecret()).update(value).digest("hex");
}

export function generateOtpCode(): string {
  return String(randomInt(100000, 999999));
}

export function issueOtpCookie(
  email: string,
  code: string,
  purpose: OtpPurpose = "signup",
): string {
  const expires = Date.now() + TTL_MS;
  const payload = `${normalizeEmail(email)}|${code}|${purpose}|${expires}`;
  return `${expires}.${purpose}.${hmac(payload)}`;
}

export function verifyOtpCookie(
  cookie: string | undefined,
  email: string,
  code: string,
  purpose: OtpPurpose = "signup",
): boolean {
  if (!cookie || !code) return false;
  const parts = cookie.split(".");
  if (parts.length !== 3) return false;
  const [expiresRaw, cookiePurpose, sig] = parts;
  if (cookiePurpose !== purpose || !expiresRaw || !sig) return false;
  const expires = Number(expiresRaw);
  if (Number.isNaN(expires) || Date.now() > expires) return false;
  const expected = hmac(
    `${normalizeEmail(email)}|${code.trim()}|${purpose}|${expires}`,
  );
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

export function issueSignupSessionCookie(email: string): string {
  const expires = Date.now() + 30 * 60 * 1000;
  const payload = `${normalizeEmail(email)}|signup|${expires}`;
  return `${expires}.${hmac(payload)}`;
}

export function otpCookieOptions(maxAgeSec = 600) {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge: maxAgeSec,
  };
}

export function jsonError(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

export function otpFromAddress(): string {
  return process.env.RESEND_FROM?.trim() || "Ptero <verify@gracerun.fit>";
}
