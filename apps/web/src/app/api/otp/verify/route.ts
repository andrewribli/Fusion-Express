import { NextRequest, NextResponse } from "next/server";
import { isCuhkStudentEmail, normalizeEmail } from "@fusion-express/shared";
import {
  clearOtpFailures,
  getOtpFailCount,
  issueResetSessionCookie,
  jsonError,
  OTP_COOKIE,
  OTP_MAX_FAILURES,
  otpCookieOptions,
  OtpConfigError,
  type OtpPurpose,
  recordOtpFailure,
  requireOtpSecret,
  RESET_SESSION_COOKIE,
  verifyOtpCookie,
} from "@/lib/otp-server";
import { clientIp, consumeRateLimit } from "@/lib/rate-limit";

const VERIFY_EMAIL_LIMIT = 20;
const VERIFY_IP_LIMIT = 40;
const VERIFY_WINDOW_MS = 15 * 60 * 1000;

export async function POST(request: NextRequest) {
  try {
    requireOtpSecret();

    let body: { email?: string; code?: string; purpose?: string };
    try {
      body = (await request.json()) as {
        email?: string;
        code?: string;
        purpose?: string;
      };
    } catch {
      return jsonError("Invalid request", 400);
    }

    const email = normalizeEmail(body.email ?? "");
    const code = (body.code ?? "").trim();
    const purpose: OtpPurpose =
      body.purpose === "reset" ? "reset" : "signup";

    if (!isCuhkStudentEmail(email)) {
      return jsonError("Use your @link.cuhk.edu.hk email", 400);
    }
    if (!/^\d{6}$/.test(code)) {
      return jsonError("Enter the 6-digit code", 400);
    }

    const ip = clientIp(request);
    if (
      !consumeRateLimit(`otp-verify:ip:${ip}`, VERIFY_IP_LIMIT, VERIFY_WINDOW_MS) ||
      !consumeRateLimit(
        `otp-verify:email:${email}`,
        VERIFY_EMAIL_LIMIT,
        VERIFY_WINDOW_MS,
      )
    ) {
      return jsonError("Too many requests. Try again later.", 429);
    }

    const priorFails = await getOtpFailCount(email, purpose);
    if (priorFails >= OTP_MAX_FAILURES) {
      const response = jsonError(
        "Too many incorrect attempts. Request a new code.",
        429,
      );
      response.cookies.set(OTP_COOKIE, "", { ...otpCookieOptions(), maxAge: 0 });
      return response;
    }

    const cookie = request.cookies.get(OTP_COOKIE)?.value;
    if (!verifyOtpCookie(cookie, email, code, purpose)) {
      const fails = await recordOtpFailure(email, purpose);
      if (fails >= OTP_MAX_FAILURES) {
        const response = jsonError(
          "Too many incorrect attempts. Request a new code.",
          429,
        );
        response.cookies.set(OTP_COOKIE, "", {
          ...otpCookieOptions(),
          maxAge: 0,
        });
        return response;
      }
      return jsonError("That code is invalid or expired. Request a new one.", 400);
    }

    await clearOtpFailures(email, purpose);

    const response = NextResponse.json({ ok: true, email, purpose });
    response.cookies.set(OTP_COOKIE, "", { ...otpCookieOptions(), maxAge: 0 });
    if (purpose === "reset") {
      response.cookies.set(
        RESET_SESSION_COOKIE,
        issueResetSessionCookie(email),
        otpCookieOptions(),
      );
    }
    return response;
  } catch (err) {
    if (err instanceof OtpConfigError) {
      console.error(err.message);
      return jsonError("Verification is not configured.", 500);
    }
    console.error("otp verify failed", err);
    return jsonError("Could not verify code", 500);
  }
}
