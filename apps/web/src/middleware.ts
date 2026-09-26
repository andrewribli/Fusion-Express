import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { ADMIN_SESSION_COOKIE } from "@/lib/admin-emails";

/**
 * Gate /admin/* pages. Cookie is set by POST /api/admin/session after the
 * signed-in allowlisted admin is verified. Missing/invalid cookie → silent
 * redirect to home (do not reveal that an admin area exists).
 *
 * API routes under /api/admin/* are not matched here; they use requireAdminRest.
 */
export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (!pathname.startsWith("/admin")) {
    return NextResponse.next();
  }

  const session = request.cookies.get(ADMIN_SESSION_COOKIE)?.value;
  if (session === "1") {
    return NextResponse.next();
  }

  const url = request.nextUrl.clone();
  url.pathname = "/";
  url.search = "";
  return NextResponse.redirect(url);
}

export const config = {
  matcher: ["/admin/:path*"],
};
