import { NextRequest, NextResponse } from "next/server";
import { isCuhkStudentEmail, normalizeEmail } from "@fusion-express/shared";
import {
  issueResetSessionCookie,
  jsonError,
  OTP_COOKIE,
  otpCookieOptions,
  type OtpPurpose,
  RESET_SESSION_COOKIE,
  verifyOtpCookie,
} from "@/lib/otp-server";

export async function POST(request: NextRequest) {
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

  const cookie = request.cookies.get(OTP_COOKIE)?.value;
  if (!verifyOtpCookie(cookie, email, code, purpose)) {
    return jsonError("That code is invalid or expired. Request a new one.", 400);
  }

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
}
