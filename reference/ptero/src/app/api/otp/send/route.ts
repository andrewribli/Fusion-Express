import { NextResponse } from "next/server";
import {
  isCityUStudentEmail,
  normalizeEmail,
} from "@/lib/cityu-email";
import {
  generateOtpCode,
  issueOtpCookie,
  jsonError,
  OTP_COOKIE,
  otpCookieOptions,
  otpFromAddress,
  OtpConfigError,
  requireOtpSecret,
  type OtpPurpose,
} from "@/lib/otp-server";
import { clientIp, consumeRateLimit } from "@/lib/rate-limit";

const SEND_EMAIL_LIMIT = 5;
const SEND_IP_LIMIT = 15;
const SEND_WINDOW_MS = 15 * 60 * 1000;

async function sendOtpEmail(email: string, code: string): Promise<boolean> {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  if (!apiKey) return false;
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: otpFromAddress(),
      to: [email],
      subject: "Your Ptero verification code",
      text: `Your Ptero CityU verification code is ${code}. It expires in 10 minutes.`,
      html: `<p>Your Ptero CityU verification code is <strong>${code}</strong>.</p><p>It expires in 10 minutes.</p>`,
    }),
  });
  if (!res.ok) {
    console.error("Resend OTP failed", res.status, await res.text());
    return false;
  }
  return true;
}

export async function POST(request: Request) {
  try {
    requireOtpSecret();

    let body: { email?: string; purpose?: string };
    try {
      body = (await request.json()) as { email?: string; purpose?: string };
    } catch {
      return jsonError("Invalid request", 400);
    }

    const email = normalizeEmail(body.email ?? "");
    if (!isCityUStudentEmail(email)) {
      return jsonError(
        "Please use your CityU email to sign up. (@cityu.edu.hk or @my.cityu.edu.hk)",
        400,
      );
    }

    const purpose: OtpPurpose =
      body.purpose === "reset" ? "reset" : "signup";

    const ip = clientIp(request);
    if (
      !consumeRateLimit(`otp-email:${email}`, SEND_EMAIL_LIMIT, SEND_WINDOW_MS) ||
      !consumeRateLimit(`otp-ip:${ip}`, SEND_IP_LIMIT, SEND_WINDOW_MS)
    ) {
      return jsonError("Too many codes requested. Try again later.", 429);
    }

    const code = generateOtpCode();
    const emailed = await sendOtpEmail(email, code);
    const cookie = issueOtpCookie(email, code, purpose);
    const response = NextResponse.json({
      ok: true,
      message: emailed
        ? "Code sent to your CityU email"
        : "Code generated (email provider not configured — use the on-screen code)",
      ...(emailed || process.env.NODE_ENV === "production"
        ? {}
        : { devCode: code }),
      // Always expose in prototype until Resend is wired for CityU
      ...(!emailed ? { devCode: code } : {}),
    });
    response.cookies.set(OTP_COOKIE, cookie, otpCookieOptions());
    return response;
  } catch (err) {
    if (err instanceof OtpConfigError) {
      return jsonError(err.message, 503);
    }
    console.error("otp send failed", err);
    return jsonError("Could not send code", 500);
  }
}
