import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const OLD_HOSTS = new Set([
  "gracerun-cityu.vercel.app",
  "gracerun-cityu-fusion-1468.vercel.app",
]);

const CANONICAL_ORIGIN = "https://ptero-cityu.vercel.app";

export function middleware(request: NextRequest) {
  const host = request.headers.get("host")?.split(":")[0]?.toLowerCase();
  if (!host || !OLD_HOSTS.has(host)) {
    return NextResponse.next();
  }

  const dest = new URL(request.nextUrl.pathname + request.nextUrl.search, CANONICAL_ORIGIN);
  return NextResponse.redirect(dest, 308);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\..*).*)"],
};
