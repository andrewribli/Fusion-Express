import { NextResponse } from "next/server";
import {
  ADMIN_SESSION_COOKIE,
  isAdminAllowlistEmail,
} from "@/lib/admin-emails";
import { RestAuthError, requireAdminRest } from "@/lib/firestore-rest";

/**
 * POST: verify admin + set httpOnly session cookie for middleware.
 * DELETE: clear the cookie on logout / failed gate.
 */
export async function POST(request: Request) {
  try {
    const auth = await requireAdminRest(request);
    if (!isAdminAllowlistEmail(auth.email)) {
      return clearAndForbid();
    }
    const res = NextResponse.json({ ok: true });
    res.cookies.set(ADMIN_SESSION_COOKIE, "1", {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 12,
    });
    return res;
  } catch (err) {
    if (err instanceof RestAuthError) {
      return clearAndForbid(err.status === 401 ? 401 : 403);
    }
    return clearAndForbid(403);
  }
}

export async function DELETE() {
  const res = NextResponse.json({ ok: true });
  res.cookies.set(ADMIN_SESSION_COOKIE, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
  });
  return res;
}

function clearAndForbid(status = 403) {
  const res = NextResponse.json({ error: "Forbidden" }, { status });
  res.cookies.set(ADMIN_SESSION_COOKIE, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
  });
  return res;
}
