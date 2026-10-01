import { timingSafeEqual } from "crypto";
import { NextResponse } from "next/server";
import { FieldValue, Timestamp, type Firestore } from "firebase-admin/firestore";
import { collectionName } from "@/lib/constants";
import { sendUnreadChatEmail } from "@/lib/email";
import { getAdminAuth, getAdminDb } from "@/lib/firebase-admin";
import {
  selectUnreadBursts,
  type NotifiedBursts,
  type UnreadMessage,
} from "@/lib/unread-chat";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_SENDS = 30;

function cronAuthorized(request: Request): { ok: true } | { ok: false; status: number; error: string } {
  const secret = process.env.CRON_SECRET?.trim() ?? "";
  if (!secret) {
    return {
      ok: false,
      status: 503,
      error: "CRON_SECRET is not set. Vercel cron cannot send unread chat email until it is.",
    };
  }
  const header = request.headers.get("authorization") ?? "";
  const token = header.startsWith("Bearer ") ? header.slice("Bearer ".length) : "";
  const a = Buffer.from(token);
  const b = Buffer.from(secret);
  if (a.length !== b.length || !timingSafeEqual(a, b)) {
    return { ok: false, status: 401, error: "Unauthorized" };
  }
  return { ok: true };
}

function timestampMs(value: unknown): number | null {
  if (value instanceof Timestamp) return value.toMillis();
  if (
    value &&
    typeof value === "object" &&
    "toMillis" in value &&
    typeof (value as { toMillis: () => number }).toMillis === "function"
  ) {
    return (value as { toMillis: () => number }).toMillis();
  }
  if (typeof value === "string" || typeof value === "number") {
    const ms = new Date(value).getTime();
    return Number.isFinite(ms) ? ms : null;
  }
  return null;
}

async function loadUnseen(db: Firestore) {
  const cutoff = Timestamp.fromMillis(Date.now() - 5 * 60 * 1000);
  const group = db.collectionGroup("messages");
  try {
    return await group
      .where("seen", "==", false)
      .where("timestamp", "<=", cutoff)
      .orderBy("timestamp", "asc")
      .limit(400)
      .get();
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    if (!/index|FAILED_PRECONDITION/i.test(message)) throw err;
    console.error("unread chat index not ready, scanning seen==false", message);
    return group.where("seen", "==", false).limit(400).get();
  }
}

async function emailForUid(db: Firestore, uid: string): Promise<string> {
  const id = uid.trim();
  if (!id) return "";
  const snap = await db.collection(collectionName("users")).doc(id).get();
  const data = snap.data() ?? {};
  const fromProfile = String(data.email ?? data.cuhkEmail ?? "")
    .trim()
    .toLowerCase();
  if (fromProfile.includes("@")) return fromProfile;
  const auth = getAdminAuth();
  if (!auth) return "";
  try {
    const user = await auth.getUser(id);
    return (user.email ?? "").trim().toLowerCase();
  } catch {
    return "";
  }
}

export async function GET(request: Request) {
  const auth = cronAuthorized(request);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const db = getAdminDb();
  if (!db) {
    return NextResponse.json(
      { error: "Firebase admin is not configured." },
      { status: 503 },
    );
  }

  const chatsCollection = collectionName("chats");
  const ordersCollection = collectionName("orders");
  let scanned = 0;
  let sent = 0;
  let skipped = 0;
  const errors: string[] = [];

  try {
    const snap = await loadUnseen(db);
    const byOrder = new Map<string, UnreadMessage[]>();

    for (const doc of snap.docs) {
      const parent = doc.ref.parent.parent;
      if (!parent || parent.parent.id !== chatsCollection) continue;
      if (doc.ref.parent.id !== "messages") continue;
      const data = doc.data();
      if (data.seen === true) continue;
      const ms = timestampMs(data.timestamp);
      if (ms == null) continue;
      scanned += 1;
      const role = String(data.senderRole ?? "");
      const row: UnreadMessage = {
        id: doc.id,
        senderId: String(data.senderId ?? ""),
        senderRole:
          role === "customer" || role === "runner" || role === "admin"
            ? role
            : undefined,
        timestampMs: ms,
      };
      const list = byOrder.get(parent.id) ?? [];
      list.push(row);
      byOrder.set(parent.id, list);
    }

    const emailCache = new Map<string, string>();

    for (const [orderId, messages] of byOrder) {
      if (sent >= MAX_SENDS) break;
      const [orderSnap, chatSnap] = await Promise.all([
        db.collection(ordersCollection).doc(orderId).get(),
        db.collection(chatsCollection).doc(orderId).get(),
      ]);
      if (!orderSnap.exists) {
        skipped += 1;
        continue;
      }
      const order = orderSnap.data() ?? {};
      const storedUnread = (chatSnap.get("unreadEmail") ?? {}) as Record<
        string,
        unknown
      >;
      const notified: NotifiedBursts = {
        customerBurstId: String(storedUnread.customerBurstId ?? "") || undefined,
        runnerBurstId: String(storedUnread.runnerBurstId ?? "") || undefined,
      };
      const bursts = selectUnreadBursts({
        messages,
        order: {
          customerId: String(order.customerId ?? ""),
          runnerUid: String(order.runnerUid ?? ""),
          runnerId: String(order.runnerId ?? ""),
        },
        notified,
        nowMs: Date.now(),
      });

      for (const burst of bursts) {
        if (sent >= MAX_SENDS) break;
        const to =
          burst.recipient === "customer"
            ? String(order.customerEmail ?? "")
                .trim()
                .toLowerCase() ||
              (await cachedEmail(emailCache, db, String(order.customerId ?? "")))
            : String(order.runnerEmail ?? "")
                .trim()
                .toLowerCase() ||
              (await cachedEmail(
                emailCache,
                db,
                String(order.runnerUid ?? order.runnerId ?? ""),
              ));
        if (!to.includes("@")) {
          skipped += 1;
          continue;
        }
        try {
          await sendUnreadChatEmail({
            to,
            orderId,
            campus: String(order.campus ?? ""),
          });
          if (burst.recipient === "customer") {
            notified.customerBurstId = burst.burstId;
          } else {
            notified.runnerBurstId = burst.burstId;
          }
          const chatRef = db.collection(chatsCollection).doc(orderId);
          // Dotted fields merge so a customer burst does not erase the runner burst.
          await chatRef.set(
            {
              [`unreadEmail.${burst.recipient}BurstId`]: burst.burstId,
              [`unreadEmail.${burst.recipient}SentAt`]:
                FieldValue.serverTimestamp(),
            },
            { merge: true },
          );
          sent += 1;
        } catch (err) {
          const message = err instanceof Error ? err.message : "send failed";
          errors.push(`${orderId}: ${message}`);
        }
      }
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unread chat scan failed";
    console.error("unread chat cron failed", err);
    return NextResponse.json({ error: message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, scanned, sent, skipped, errors });
}

async function cachedEmail(
  cache: Map<string, string>,
  db: Firestore,
  uid: string,
): Promise<string> {
  const id = uid.trim();
  if (!id) return "";
  const hit = cache.get(id);
  if (hit != null) return hit;
  const email = await emailForUid(db, id);
  cache.set(id, email);
  return email;
}
