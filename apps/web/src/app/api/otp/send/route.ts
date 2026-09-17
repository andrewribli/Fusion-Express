import { NextResponse } from "next/server";
import { isCuhkStudentEmail, normalizeEmail } from "@fusion-express/shared";
import { emailIsRegistered } from "@/lib/firebase-admin";
import {
  generateOtpCode,
  issueOtpCookie,
  jsonError,
  OTP_COOKIE,
  otpCookieOptions,
  otpFromAddress,
  type OtpPurpose,
} from "@/lib/otp-server";

export async function POST(request: Request) {
  let body: { email?: string; purpose?: string };
  try {
    body = (await request.json()) as { email?: string; purpose?: string };
  } catch {
    return jsonError("Invalid request", 400);
  }

  const email = normalizeEmail(body.email ?? "");
  if (!isCuhkStudentEmail(email)) {
    return jsonError("Use your @link.cuhk.edu.hk email", 400);
  }

  const purpose: OtpPurpose =
    body.purpose === "reset" ? "reset" : "signup";

  const registered = await emailIsRegistered(email);
  if (purpose === "signup" && registered === true) {
    return jsonError(
      "This email is already in use. Please log in instead.",
      409,
    );
  }
  if (purpose === "reset") {
    if (registered === false) {
      return jsonError("No account found with this email.", 404);
    }
    if (registered === null) {
      return jsonError(
        "Could not verify this email right now. Try again in a moment.",
        503,
      );
    }
  }

  const code = generateOtpCode();
  const apiKey = process.env.RESEND_API_KEY;
  const from = otpFromAddress();

  if (apiKey) {
    const subject =
      purpose === "reset"
        ? "Your GraceRun password reset code"
        : "Your GraceRun verification code";
    const text =
      purpose === "reset"
        ? `Your GraceRun password reset code is ${code}. It expires in 10 minutes. If you did not request this, ignore this email.`
        : `Your GraceRun CUHK verification code is ${code}. It expires in 10 minutes. If you did not request this, ignore this email.`;

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to: [email],
        subject,
        text,
      }),
    });
    if (!res.ok) {
      const detail = await res.text();
      console.error("Resend send failed", res.status, detail);
      const blocked =
        res.status === 403 ||
        /only send testing emails|verify a domain/i.test(detail);
      return jsonError(
        blocked
          ? "Could not send to this address yet. Add a verified domain, then set RESEND_FROM to GraceRun <verify@gracerun.fit>."
          : "Could not send the verification email. Try again.",
        502,
      );
    }
  } else if (process.env.NODE_ENV === "production") {
    return jsonError("Email sending is not configured.", 503);
  } else {
    console.info(`[OTP:${purpose}] ${email} → ${code}`);
  }

  const response = NextResponse.json({
    ok: true,
    purpose,
    devCode: apiKey || process.env.NODE_ENV === "production" ? undefined : code,
  });
  response.cookies.set(
    OTP_COOKIE,
    issueOtpCookie(email, code, purpose),
    otpCookieOptions(),
  );
  return response;
}
