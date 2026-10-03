import { NextRequest, NextResponse } from "next/server";
import { syncAndListCityUUsers } from "@/lib/cityu-user-directory";
import { verifyAdminIdTokenRest } from "@/lib/identity-toolkit-rest";

function jsonError(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization") ?? "";
  const token = authHeader.startsWith("Bearer ")
    ? authHeader.slice("Bearer ".length).trim()
    : null;
  const admin = await verifyAdminIdTokenRest(token);
  if (!admin) {
    return jsonError("Admin access required.", 403);
  }

  try {
    const result = await syncAndListCityUUsers();
    return NextResponse.json(result);
  } catch (err) {
    console.error("cityu admin users list failed", err);
    return jsonError(
      err instanceof Error ? err.message : "Could not load CityU users.",
      502,
    );
  }
}
