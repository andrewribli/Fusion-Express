import { NextRequest, NextResponse } from "next/server";
import { isCuhkStudentEmail, normalizeEmail } from "@fusion-express/shared";
import { updateAuthPassword } from "@/lib/firebase-admin-auth";
import {
  jsonError,
  otpCookieOptions,
  RESET_SESSION_COOKIE,
  verifyResetSessionCookie,
} from "@/lib/otp-server";

export async function POST(request: NextRequest) {
  let body: { email?: string; password?: string };
  try {
    body = (await request.json()) as { email?: string; password?: string };
  } catch {
    return jsonError("Invalid request", 400);
  }

  const email = normalizeEmail(body.email ?? "");
  const password = body.password ?? "";
  if (!isCuhkStudentEmail(email)) {
    return jsonError("Use your @link.cuhk.edu.hk email", 400);
  }
  if (password.length < 6) {
    return jsonError("Password must be at least 6 characters", 400);
  }

  const session = request.cookies.get(RESET_SESSION_COOKIE)?.value;
  if (!verifyResetSessionCookie(session, email)) {
    return jsonError(
      "Reset session expired. Request a new verification code.",
      401,
    );
  }

  try {
    await updateAuthPassword(email, password);
  } catch (err) {
    console.error("password reset failed", err);
    return jsonError("Could not update password.", 502);
  }

  const response = NextResponse.json({ ok: true });
  response.cookies.set(RESET_SESSION_COOKIE, "", {
    ...otpCookieOptions(),
    maxAge: 0,
  });
  return response;
}
