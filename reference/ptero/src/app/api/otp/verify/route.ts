import { NextResponse } from "next/server";
import {
  isCityUStudentEmail,
  normalizeEmail,
} from "@/lib/cityu-email";
import {
  issueSignupSessionCookie,
  jsonError,
  OTP_COOKIE,
  otpCookieOptions,
  OtpConfigError,
  requireOtpSecret,
  SIGNUP_SESSION_COOKIE,
  verifyOtpCookie,
  type OtpPurpose,
} from "@/lib/otp-server";

export async function POST(request: Request) {
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
    if (!isCityUStudentEmail(email)) {
      return jsonError(
        "Please use your CityU email to sign up. (@cityu.edu.hk or @my.cityu.edu.hk)",
        400,
      );
    }
    if (!/^\d{6}$/.test(code)) {
      return jsonError("Enter the 6-digit code", 400);
    }

    const purpose: OtpPurpose =
      body.purpose === "reset" ? "reset" : "signup";

    const cookie = request.headers
      .get("cookie")
      ?.split(";")
      .map((c) => c.trim())
      .find((c) => c.startsWith(`${OTP_COOKIE}=`))
      ?.slice(OTP_COOKIE.length + 1);

    if (!verifyOtpCookie(cookie, email, code, purpose)) {
      return jsonError("Invalid or expired code", 400);
    }

    const response = NextResponse.json({ ok: true, email });
    response.cookies.set(OTP_COOKIE, "", { ...otpCookieOptions(0), maxAge: 0 });
    if (purpose === "signup") {
      response.cookies.set(
        SIGNUP_SESSION_COOKIE,
        issueSignupSessionCookie(email),
        otpCookieOptions(30 * 60),
      );
    }
    return response;
  } catch (err) {
    if (err instanceof OtpConfigError) {
      return jsonError(err.message, 503);
    }
    console.error("otp verify failed", err);
    return jsonError("Could not verify code", 500);
  }
}
