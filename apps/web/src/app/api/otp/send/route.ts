import { createSign } from "crypto";
import { NextResponse } from "next/server";
import { isCuhkStudentEmail, normalizeEmail } from "@fusion-express/shared";
import {
  generateOtpCode,
  issueOtpCookie,
  jsonError,
  OTP_COOKIE,
  otpCookieOptions,
  otpFromAddress,
  type OtpPurpose,
} from "@/lib/otp-server";

type ServiceAccount = {
  client_email?: string;
  private_key?: string;
  project_id?: string;
};

function serviceAccount(): ServiceAccount | null {
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT_JSON?.trim();
  if (!raw) return null;
  try {
    return JSON.parse(raw) as ServiceAccount;
  } catch {
    return null;
  }
}

async function googleAccessToken(account: ServiceAccount): Promise<string | null> {
  if (!account.client_email || !account.private_key) return null;
  const now = Math.floor(Date.now() / 1000);
  const header = Buffer.from(JSON.stringify({ alg: "RS256", typ: "JWT" })).toString(
    "base64url",
  );
  const claim = Buffer.from(
    JSON.stringify({
      iss: account.client_email,
      scope: "https://www.googleapis.com/auth/identitytoolkit",
      aud: "https://oauth2.googleapis.com/token",
      iat: now,
      exp: now + 3600,
    }),
  ).toString("base64url");
  const signer = createSign("RSA-SHA256");
  signer.update(`${header}.${claim}`);
  const jwt = `${header}.${claim}.${signer.sign(account.private_key, "base64url")}`;
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${jwt}`,
  });
  if (!res.ok) {
    console.error("google access token failed", res.status);
    return null;
  }
  const data = (await res.json()) as { access_token?: string };
  return data.access_token ?? null;
}

async function emailRegisteredViaAdmin(email: string): Promise<boolean | null> {
  const account = serviceAccount();
  const project =
    account?.project_id || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID?.trim();
  if (!account || !project) return null;
  try {
    const token = await googleAccessToken(account);
    if (!token) return null;
    const res = await fetch(
      `https://identitytoolkit.googleapis.com/v1/projects/${project}/accounts:lookup`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email: [email] }),
      },
    );
    if (res.status === 200) {
      const data = (await res.json()) as { users?: unknown[] };
      return Array.isArray(data.users) && data.users.length > 0;
    }
    if (res.status === 404) return false;
    console.error("accounts:lookup failed", res.status);
    return null;
  } catch (err) {
    console.error("emailRegisteredViaAdmin failed", err);
    return null;
  }
}

async function emailAlreadyRegistered(email: string): Promise<boolean | null> {
  return emailRegisteredViaAdmin(email);
}

export async function POST(request: Request) {
  try {
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

    const registered = await emailAlreadyRegistered(email);
    if (purpose === "signup" && registered === true) {
      return jsonError("Account already exists", 409);
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
  } catch (err) {
    console.error("otp send failed", err);
    return jsonError("Could not send code", 500);
  }
}
