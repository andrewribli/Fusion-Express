import { NextResponse } from "next/server";
import { dispatchOrderPush } from "@/lib/expo-push";
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

  let body: { orderId?: string; event?: string; preview?: string };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const orderId = body.orderId?.trim() ?? "";
  const event = body.event;
  if (
    !orderId ||
    (event !== "created" &&
      event !== "accepted" &&
      event !== "chat" &&
      event !== "lobby")
  ) {
    return NextResponse.json({ error: "Missing order event." }, { status: 400 });
  }

  try {
    const sent = await dispatchOrderPush({
      auth,
      orderId,
      event,
      preview: body.preview,
    });
    return NextResponse.json({ ok: true, sent });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Could not send notification.";
    const status = /not allowed/i.test(message)
      ? 403
      : /not found/i.test(message)
        ? 404
        : 502;
    console.error("order push failed", err);
    return NextResponse.json({ error: message }, { status });
  }
}
