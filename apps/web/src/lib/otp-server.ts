import { NextResponse } from "next/server";
import { createHmac, randomInt, timingSafeEqual } from "crypto";
import { isCuhkStudentEmail, normalizeEmail } from "@fusion-express/shared";

export const OTP_COOKIE = "gr_cuhk_otp";
export type OtpPurpose = "signup" | "reset";

const TTL_MS = 10 * 60 * 1000;

function secret(): string {
  return (
    process.env.OTP_SECRET ||
    process.env.RESEND_API_KEY ||
    "dev-only-otp-secret-change-me"
  );
}

function hmac(value: string): string {
  return createHmac("sha256", secret()).update(value).digest("hex");
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
  let expiresRaw: string;
  let cookiePurpose: OtpPurpose;
  let sig: string;
  if (parts.length === 3 && (parts[1] === "signup" || parts[1] === "reset")) {
    [expiresRaw, cookiePurpose, sig] = parts as [string, OtpPurpose, string];
  } else if (parts.length === 2) {
    expiresRaw = parts[0];
    cookiePurpose = "signup";
    sig = parts[1];
  } else {
    return false;
  }
  if (cookiePurpose !== purpose) return false;
  const expires = Number(expiresRaw);
  if (!expiresRaw || !sig || Number.isNaN(expires) || Date.now() > expires) {
    return false;
  }
  const expected = hmac(
    `${normalizeEmail(email)}|${code.trim()}|${purpose}|${expires}`,
  );
  const legacyExpected = hmac(
    `${normalizeEmail(email)}|${code.trim()}|${expires}`,
  );
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  const c = Buffer.from(legacyExpected);
  if (a.length === b.length && timingSafeEqual(a, b)) return true;
  if (
    purpose === "signup" &&
    parts.length === 2 &&
    a.length === c.length &&
    timingSafeEqual(a, c)
  ) {
    return true;
  }
  return false;
}

export const RESET_SESSION_COOKIE = "gr_pw_reset";

export function issueResetSessionCookie(email: string): string {
  const expires = Date.now() + TTL_MS;
  const payload = `${normalizeEmail(email)}|reset-ok|${expires}`;
  return `${expires}.${hmac(payload)}`;
}

export function verifyResetSessionCookie(
  cookie: string | undefined,
  email: string,
): boolean {
  if (!cookie) return false;
  const [expiresRaw, sig] = cookie.split(".");
  const expires = Number(expiresRaw);
  if (!expiresRaw || !sig || Number.isNaN(expires) || Date.now() > expires) {
    return false;
  }
  const expected = hmac(
    `${normalizeEmail(email)}|reset-ok|${expires}`,
  );
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

export function generateOtpCode(): string {
  return String(randomInt(100000, 1000000));
}

export function otpCookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge: 10 * 60,
  };
}

export function otpFromAddress(): string {
  return process.env.RESEND_FROM ?? "GraceRun <verify@gracerun.fit>";
}

export function jsonError(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

export { isCuhkStudentEmail, normalizeEmail };
