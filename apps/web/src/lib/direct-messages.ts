"use client";

import {
  addDoc,
  collection,
  getDocs,
  limit,
  onSnapshot,
  orderBy,
  query,
  Timestamp,
  where,
  writeBatch,
  type Unsubscribe,
} from "firebase/firestore";
import { collectionName } from "@/lib/constants";
import { getAuthClient, getDb, isFirebaseConfigured } from "@/lib/firebase";

export type DirectMessage = {
  id: string;
  userId: string;
  senderId: string;
  message: string;
  createdAt: Date;
  read: boolean;
};

const mockByUser = new Map<string, DirectMessage[]>();

function col() {
  return collectionName("messages");
}

function parse(id: string, data: Record<string, unknown>): DirectMessage {
  const ts = data.createdAt;
  return {
    id,
    userId: String(data.userId ?? ""),
    senderId: String(data.senderId ?? ""),
    message: String(data.message ?? ""),
    read: Boolean(data.read),
    createdAt:
      ts && typeof ts === "object" && "toDate" in ts
        ? (ts as Timestamp).toDate()
        : new Date(String(ts ?? Date.now())),
  };
}

export async function sendDirectMessage(opts: {
  userId: string;
  senderId: string;
  message: string;
}): Promise<DirectMessage> {
  const trimmed = opts.message.trim();
  if (!trimmed) throw new Error("Message cannot be empty");
  const now = new Date();
  const row: DirectMessage = {
    id: crypto.randomUUID(),
    userId: opts.userId,
    senderId: opts.senderId,
    message: trimmed,
    createdAt: now,
    read: false,
  };

  if (isFirebaseConfigured()) {
    const ref = await addDoc(collection(getDb(), col()), {
      userId: opts.userId,
      senderId: opts.senderId,
      message: trimmed,
      createdAt: Timestamp.fromDate(now),
      read: false,
    });
    return { ...row, id: ref.id };
  }

  const existing = mockByUser.get(opts.userId) ?? [];
  mockByUser.set(opts.userId, [...existing, row]);
  return row;
}

export async function emailDirectMessage(opts: {
  to: string;
  recipientName: string;
  message: string;
}): Promise<void> {
  const user = getAuthClient().currentUser;
  if (!user) throw new Error("Sign in required.");
  const token = await user.getIdToken();
  const res = await fetch("/api/email/direct", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      to: opts.to,
      recipientName: opts.recipientName,
      message: opts.message,
    }),
  });
  const text = await res.text();
  let parsed: { error?: string } = {};
  try {
    parsed = text ? (JSON.parse(text) as { error?: string }) : {};
  } catch {
    parsed = { error: text || "Could not send email" };
  }
  if (!res.ok) {
    throw new Error(parsed.error || "Could not send email");
  }
}

export function subscribeDirectMessages(
  userId: string,
  onMessages: (messages: DirectMessage[]) => void,
): Unsubscribe {
  if (isFirebaseConfigured()) {
    const q = query(
      collection(getDb(), col()),
      where("userId", "==", userId),
      orderBy("createdAt", "asc"),
    );
    return onSnapshot(q, (snap) => {
      onMessages(snap.docs.map((d) => parse(d.id, d.data() as Record<string, unknown>)));
    });
  }

  onMessages(mockByUser.get(userId) ?? []);
  const interval = setInterval(() => {
    onMessages(mockByUser.get(userId) ?? []);
  }, 2500);
  return () => clearInterval(interval);
}

export async function markThreadRead(opts: {
  userId: string;
  readerId: string;
}): Promise<void> {
  const incomingFromOther = (msg: DirectMessage) =>
    msg.userId === opts.userId &&
    !msg.read &&
    msg.senderId !== opts.readerId;

  if (!isFirebaseConfigured()) {
    const next = (mockByUser.get(opts.userId) ?? []).map((msg) =>
      incomingFromOther(msg) ? { ...msg, read: true } : msg,
    );
    mockByUser.set(opts.userId, next);
    return;
  }

  const snap = await getDocs(
    query(
      collection(getDb(), col()),
      where("userId", "==", opts.userId),
      where("read", "==", false),
    ),
  );
  const batch = writeBatch(getDb());
  let count = 0;
  for (const docSnap of snap.docs) {
    const msg = parse(docSnap.id, docSnap.data() as Record<string, unknown>);
    if (!incomingFromOther(msg)) continue;
    batch.update(docSnap.ref, { read: true });
    count += 1;
    if (count >= 400) break;
  }
  if (count > 0) await batch.commit();
}

export async function fetchUnreadReplyCounts(): Promise<Record<string, number>> {
  const counts: Record<string, number> = {};
  if (!isFirebaseConfigured()) {
    for (const msgs of mockByUser.values()) {
      for (const msg of msgs) {
        if (!msg.read && msg.senderId === msg.userId) {
          counts[msg.userId] = (counts[msg.userId] ?? 0) + 1;
        }
      }
    }
    return counts;
  }

  const snap = await getDocs(
    query(collection(getDb(), col()), where("read", "==", false), limit(500)),
  );
  for (const docSnap of snap.docs) {
    const msg = parse(docSnap.id, docSnap.data() as Record<string, unknown>);
    if (msg.senderId === msg.userId) {
      counts[msg.userId] = (counts[msg.userId] ?? 0) + 1;
    }
  }
  return counts;
}

export async function fetchUnreadForUser(userId: string): Promise<number> {
  if (!isFirebaseConfigured()) {
    return (mockByUser.get(userId) ?? []).filter(
      (msg) => !msg.read && msg.senderId !== userId,
    ).length;
  }
  const snap = await getDocs(
    query(
      collection(getDb(), col()),
      where("userId", "==", userId),
      where("read", "==", false),
    ),
  );
  return snap.docs.filter((d) => String(d.data().senderId ?? "") !== userId)
    .length;
}

export type DirectThread = {
  userId: string;
  lastMessage: string;
  lastSenderId: string;
  lastAt: Date;
  unreadFromUser: number;
};

export async function fetchDirectThreads(): Promise<DirectThread[]> {
  if (!isFirebaseConfigured()) {
    return [...mockByUser.entries()].map(([userId, msgs]) => {
      const last = msgs[msgs.length - 1];
      return {
        userId,
        lastMessage: last?.message ?? "",
        lastSenderId: last?.senderId ?? "",
        lastAt: last?.createdAt ?? new Date(0),
        unreadFromUser: msgs.filter((m) => !m.read && m.senderId === userId).length,
      };
    });
  }

  const snap = await getDocs(
    query(collection(getDb(), col()), orderBy("createdAt", "desc"), limit(400)),
  );
  const byUser = new Map<string, DirectThread>();
  for (const docSnap of snap.docs) {
    const msg = parse(docSnap.id, docSnap.data() as Record<string, unknown>);
    const existing = byUser.get(msg.userId);
    if (!existing) {
      byUser.set(msg.userId, {
        userId: msg.userId,
        lastMessage: msg.message,
        lastSenderId: msg.senderId,
        lastAt: msg.createdAt,
        unreadFromUser: !msg.read && msg.senderId === msg.userId ? 1 : 0,
      });
    } else if (!msg.read && msg.senderId === msg.userId) {
      existing.unreadFromUser += 1;
    }
  }
  return [...byUser.values()].sort((a, b) => b.lastAt.getTime() - a.lastAt.getTime());
}
