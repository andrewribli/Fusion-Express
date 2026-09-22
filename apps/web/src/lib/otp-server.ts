import { NextResponse } from "next/server";
import { createHmac, randomInt, timingSafeEqual } from "crypto";
import { isCuhkStudentEmail, normalizeEmail } from "@fusion-express/shared";
import { collectionName } from "@/lib/constants";
import {
  adminAccessToken,
  deleteAdminDocumentRest,
  getAdminDocumentRest,
  patchAdminDocumentRest,
} from "@/lib/firestore-rest";

export const OTP_COOKIE = "gr_cuhk_otp";
export type OtpPurpose = "signup" | "reset";

const TTL_MS = 10 * 60 * 1000;
export const OTP_MAX_FAILURES = 5;

export class OtpConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "OtpConfigError";
  }
}

/** Fail closed: OTP_SECRET must be set. No RESEND / hardcoded fallbacks. */
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
/** Set after signup OTP verify. Full create-user gate via API is follow-up. */
export const SIGNUP_SESSION_COOKIE = "gr_signup_ok";

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

export function issueSignupSessionCookie(email: string): string {
  const expires = Date.now() + TTL_MS;
  const payload = `${normalizeEmail(email)}|signup-ok|${expires}`;
  return `${expires}.${hmac(payload)}`;
}

export function verifySignupSessionCookie(
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
    `${normalizeEmail(email)}|signup-ok|${expires}`,
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

function otpDocId(email: string, purpose: OtpPurpose): string {
  // Doc ids cannot contain `/`; email is already normalized lowercase.
  return `${purpose}_${normalizeEmail(email).replace(/[^a-z0-9@_.+-]/gi, "_")}`;
}

/**
 * Reset failure counter when a fresh OTP is issued.
 * Uses Firestore REST (emailOtps is deny-all for clients). Avoids
 * firebase-admin/jose which crashes Auth routes on Vercel.
 */
function otpCollection(): string {
  return collectionName("emailOtps");
}

async function assertOtpFirestoreAvailable(): Promise<void> {
  const ctx = await adminAccessToken();
  if (!ctx) {
    throw new OtpConfigError(
      "Firebase Admin REST is not configured for OTP attempt tracking.",
    );
  }
}

export async function resetOtpFailures(
  email: string,
  purpose: OtpPurpose,
): Promise<void> {
  try {
    await assertOtpFirestoreAvailable();
    await patchAdminDocumentRest(otpCollection(), otpDocId(email, purpose), {
      email: normalizeEmail(email),
      purpose,
      failCount: 0,
      locked: false,
      updatedAt: new Date(),
    });
  } catch (err) {
    if (err instanceof OtpConfigError) {
      if (process.env.NODE_ENV === "production") throw err;
      return;
    }
    if (process.env.NODE_ENV === "production") {
      console.error("resetOtpFailures failed", err);
      throw new OtpConfigError(
        "Firebase Admin REST is not configured for OTP attempt tracking.",
      );
    }
  }
}

export async function getOtpFailCount(
  email: string,
  purpose: OtpPurpose,
): Promise<number> {
  try {
    await assertOtpFirestoreAvailable();
    const data = await getAdminDocumentRest(
      otpCollection(),
      otpDocId(email, purpose),
    );
    if (!data) return 0;
    if (data.locked) return OTP_MAX_FAILURES;
    return Number(data.failCount ?? 0);
  } catch (err) {
    if (err instanceof OtpConfigError) {
      if (process.env.NODE_ENV === "production") throw err;
      return 0;
    }
    if (process.env.NODE_ENV === "production") {
      console.error("getOtpFailCount failed", err);
      throw new OtpConfigError(
        "Firebase Admin REST is not configured for OTP attempt tracking.",
      );
    }
    return 0;
  }
}

/** Returns the new fail count after recording a bad verify attempt. */
export async function recordOtpFailure(
  email: string,
  purpose: OtpPurpose,
): Promise<number> {
  try {
    await assertOtpFirestoreAvailable();
    const data = await getAdminDocumentRest(
      otpCollection(),
      otpDocId(email, purpose),
    );
    const prev = data ? Number(data.failCount ?? 0) : 0;
    const failCount = prev + 1;
    const locked = failCount >= OTP_MAX_FAILURES;
    await patchAdminDocumentRest(otpCollection(), otpDocId(email, purpose), {
      email: normalizeEmail(email),
      purpose,
      failCount,
      locked,
      updatedAt: new Date(),
    });
    return failCount;
  } catch (err) {
    if (err instanceof OtpConfigError) {
      if (process.env.NODE_ENV === "production") throw err;
      return 1;
    }
    if (process.env.NODE_ENV === "production") {
      console.error("recordOtpFailure failed", err);
      throw new OtpConfigError(
        "Firebase Admin REST is not configured for OTP attempt tracking.",
      );
    }
    return 1;
  }
}

export async function clearOtpFailures(
  email: string,
  purpose: OtpPurpose,
): Promise<void> {
  await deleteAdminDocumentRest(
    otpCollection(),
    otpDocId(email, purpose),
  ).catch(() => {
    /* ignore */
  });
}

export { isCuhkStudentEmail, normalizeEmail };
