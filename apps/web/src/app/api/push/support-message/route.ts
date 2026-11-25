import { NextResponse } from "next/server";
import { dispatchSupportPush } from "@/lib/expo-push";
import { requireAuthRest, RestAuthError } from "@/lib/firestore-rest";

export const runtime = "nodejs";

export async function POST(request: Request) {
  let auth;
  try {
    auth = await requireAuthRest(request);
  } catch (err) {
    if (err instanceof RestAuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { userId?: string; preview?: string };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const userId = body.userId?.trim() ?? "";
  if (!userId) {
    return NextResponse.json({ error: "Missing support thread." }, { status: 400 });
  }

  try {
    const sent = await dispatchSupportPush({
      auth,
      threadUserId: userId,
      preview: body.preview,
    });
    return NextResponse.json({ ok: true, sent });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Could not send notification.";
    const status = /not allowed/i.test(message)
      ? 403
      : /missing/i.test(message)
        ? 400
        : 502;
    console.error("support push failed", err);
    return NextResponse.json({ error: message }, { status });
  }
}
