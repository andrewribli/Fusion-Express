import { NextRequest, NextResponse } from "next/server";
import { isAnyCampusEmail, normalizeEmail } from "@fusion-express/shared";
import { updateAuthPassword } from "@/lib/firebase-admin-auth";
import {
  jsonError,
  otpCookieOptions,
  OtpConfigError,
  requireOtpSecret,
  RESET_SESSION_COOKIE,
  verifyResetSessionCookie,
} from "@/lib/otp-server";

export async function POST(request: NextRequest) {
  try {
    requireOtpSecret();
  } catch (err) {
    if (err instanceof OtpConfigError) {
      console.error(err.message);
      return jsonError("Password reset is not configured.", 500);
    }
    throw err;
  }

  let body: { email?: string; password?: string };
  try {
    body = (await request.json()) as { email?: string; password?: string };
  } catch {
    return jsonError("Invalid request", 400);
  }

  const email = normalizeEmail(body.email ?? "");
  const password = body.password ?? "";
  if (!isAnyCampusEmail(email)) {
    return jsonError("Please use your CUHK or CityU email", 400);
  }
  if (password.length < 6) {
    return jsonError("Password must be at least 6 characters", 400);
  }

  let sessionOk = false;
  try {
    const session = request.cookies.get(RESET_SESSION_COOKIE)?.value;
    sessionOk = verifyResetSessionCookie(session, email);
  } catch (err) {
    if (err instanceof OtpConfigError) {
      console.error(err.message);
      return jsonError("Password reset is not configured.", 500);
    }
    throw err;
  }
  if (!sessionOk) {
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
