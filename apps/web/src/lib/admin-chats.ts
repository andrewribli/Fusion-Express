"use client";

import {
  addDoc,
  collection,
  collectionGroup,
  doc,
  getDocs,
  limit,
  onSnapshot,
  orderBy,
  query,
  setDoc,
  Timestamp,
  updateDoc,
  where,
  type Unsubscribe,
} from "firebase/firestore";
import { getDb, isFirebaseConfigured } from "@/lib/firebase";

export type AdminChatMessage = {
  id: string;
  senderId: string;
  text: string;
  createdAt: Date;
  seen: boolean;
};

export type AdminChatThread = {
  userId: string;
  lastMessage: string;
  updatedAt: Date;
  unreadForAdmin: number;
};

const mockThreads = new Map<string, AdminChatMessage[]>();

function messagesCol(userId: string) {
  return collection(getDb(), "adminChats", userId, "messages");
}

function threadDoc(userId: string) {
  return doc(getDb(), "adminChats", userId);
}

function parseMessage(
  id: string,
  data: Record<string, unknown>,
): AdminChatMessage {
  const ts = data.createdAt ?? data.timestamp;
  return {
    id,
    senderId: String(data.senderId ?? ""),
    text: String(data.text ?? data.message ?? ""),
    seen: Boolean(data.seen),
    createdAt:
      ts && typeof ts === "object" && "toDate" in ts
        ? (ts as Timestamp).toDate()
        : new Date(String(ts ?? Date.now())),
  };
}

export async function sendAdminChatMessage(opts: {
  userId: string;
  senderId: string;
  text: string;
}): Promise<AdminChatMessage> {
  const trimmed = opts.text.trim();
  if (!trimmed) throw new Error("Message cannot be empty");
  const now = new Date();
  const row: AdminChatMessage = {
    id: crypto.randomUUID(),
    senderId: opts.senderId,
    text: trimmed,
    createdAt: now,
    seen: false,
  };

  if (isFirebaseConfigured()) {
    const ref = await addDoc(messagesCol(opts.userId), {
      senderId: opts.senderId,
      text: trimmed,
      createdAt: Timestamp.fromDate(now),
      seen: false,
    });
    await setDoc(
      threadDoc(opts.userId),
      {
        userId: opts.userId,
        lastMessage: trimmed.slice(0, 200),
        updatedAt: Timestamp.fromDate(now),
        lastSenderId: opts.senderId,
      },
      { merge: true },
    );
    return { ...row, id: ref.id };
  }

  const existing = mockThreads.get(opts.userId) ?? [];
  mockThreads.set(opts.userId, [...existing, row]);
  return row;
}

export function subscribeAdminChatMessages(
  userId: string,
  onMessages: (messages: AdminChatMessage[]) => void,
): Unsubscribe {
  if (isFirebaseConfigured()) {
    const q = query(messagesCol(userId), orderBy("createdAt", "asc"));
    return onSnapshot(
      q,
      (snap) => {
        onMessages(
          snap.docs.map((d) =>
            parseMessage(d.id, d.data() as Record<string, unknown>),
          ),
        );
      },
      () => onMessages([]),
    );
  }
  onMessages(mockThreads.get(userId) ?? []);
  return () => undefined;
}

export async function markAdminChatSeen(opts: {
  userId: string;
  readerId: string;
}): Promise<void> {
  if (!isFirebaseConfigured()) return;
  const snap = await getDocs(query(messagesCol(opts.userId), limit(100)));
  await Promise.all(
    snap.docs.map(async (d) => {
      const data = d.data() as Record<string, unknown>;
      if (data.seen) return;
      if (String(data.senderId) === opts.readerId) return;
      await updateDoc(d.ref, { seen: true });
    }),
  );
}

export async function fetchAdminChatThreads(): Promise<AdminChatThread[]> {
  if (!isFirebaseConfigured()) {
    return [...mockThreads.entries()].map(([userId, messages]) => {
      const last = messages[messages.length - 1];
      return {
        userId,
        lastMessage: last?.text ?? "",
        updatedAt: last?.createdAt ?? new Date(),
        unreadForAdmin: messages.filter((m) => !m.seen && m.senderId === userId)
          .length,
      };
    });
  }

  try {
    const snap = await getDocs(collection(getDb(), "adminChats"));
    const rows: AdminChatThread[] = [];
    for (const d of snap.docs) {
      const data = d.data() as Record<string, unknown>;
      const ts = data.updatedAt;
      rows.push({
        userId: String(data.userId ?? d.id),
        lastMessage: String(data.lastMessage ?? ""),
        updatedAt:
          ts && typeof ts === "object" && "toDate" in ts
            ? (ts as Timestamp).toDate()
            : new Date(String(ts ?? Date.now())),
        unreadForAdmin: Number(data.unreadForAdmin ?? 0),
      });
    }
    rows.sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
    return rows;
  } catch {
    // Fallback: collection group on messages if parent docs are sparse.
    const q = query(collectionGroup(getDb(), "messages"), limit(200));
    const snap = await getDocs(q);
    const byUser = new Map<string, AdminChatThread>();
    for (const d of snap.docs) {
      if (!d.ref.path.startsWith("adminChats/")) continue;
      const userId = d.ref.parent.parent?.id;
      if (!userId) continue;
      const msg = parseMessage(d.id, d.data() as Record<string, unknown>);
      const prev = byUser.get(userId);
      if (!prev || msg.createdAt > prev.updatedAt) {
        byUser.set(userId, {
          userId,
          lastMessage: msg.text,
          updatedAt: msg.createdAt,
          unreadForAdmin: 0,
        });
      }
    }
    return [...byUser.values()].sort(
      (a, b) => b.updatedAt.getTime() - a.updatedAt.getTime(),
    );
  }
}

export async function listUserIdsWithAdminChats(): Promise<string[]> {
  const threads = await fetchAdminChatThreads();
  return threads.map((t) => t.userId);
}

/** For inbox badge: unread admin messages for this user. */
export function subscribeAdminInboxUnread(
  userId: string,
  onCount: (n: number) => void,
): Unsubscribe {
  if (!isFirebaseConfigured()) {
    const msgs = mockThreads.get(userId) ?? [];
    onCount(msgs.filter((m) => !m.seen && m.senderId !== userId).length);
    return () => undefined;
  }
  const q = query(
    messagesCol(userId),
    where("seen", "==", false),
    limit(40),
  );
  return onSnapshot(
    q,
    (snap) => {
      const n = snap.docs.filter(
        (d) => String((d.data() as { senderId?: string }).senderId) !== userId,
      ).length;
      onCount(n);
    },
    () => onCount(0),
  );
}
