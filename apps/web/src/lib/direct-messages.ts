"use client";

import {
  addDoc,
  collection,
  doc,
  getDocs,
  limit,
  onSnapshot,
  orderBy,
  query,
  setDoc,
  Timestamp,
  where,
  writeBatch,
  type Unsubscribe,
} from "firebase/firestore";
import {
  assertUploadRateLimit,
  chatMediaPreviewText,
  markUploadRateLimit,
  uploadChatMediaFiles,
  type PendingChatMedia,
} from "@/lib/chat-media";
import { collectionName } from "@/lib/constants";
import { getAuthClient, getDb, isFirebaseConfigured } from "@/lib/firebase";
import type { ChatMessageType } from "@/lib/types";

export type DirectMessage = {
  id: string;
  userId: string;
  senderId: string;
  message: string;
  text?: string;
  type?: ChatMessageType;
  mediaUrl?: string;
  mediaUrls?: string[];
  mediaThumbnailUrl?: string;
  mediaWidth?: number;
  mediaHeight?: number;
  mediaSize?: number;
  createdAt: Date;
  read: boolean;
};

const mockByUser = new Map<string, DirectMessage[]>();

function col() {
  return collectionName("messages");
}

function parseType(raw: unknown): ChatMessageType {
  if (raw === "image" || raw === "video") return raw;
  return "text";
}

function parse(id: string, data: Record<string, unknown>): DirectMessage {
  const ts = data.createdAt;
  const type = parseType(data.type);
  const mediaUrls = Array.isArray(data.mediaUrls)
    ? data.mediaUrls.map((u) => String(u)).filter(Boolean)
    : undefined;
  const mediaUrl =
    typeof data.mediaUrl === "string" && data.mediaUrl
      ? data.mediaUrl
      : mediaUrls?.[0];
  const textRaw = String(data.text ?? data.message ?? "");
  const preview = chatMediaPreviewText(type, textRaw);
  return {
    id,
    userId: String(data.userId ?? ""),
    senderId: String(data.senderId ?? ""),
    message: preview,
    text: textRaw || preview,
    type,
    mediaUrl,
    mediaUrls,
    mediaThumbnailUrl:
      typeof data.mediaThumbnailUrl === "string"
        ? data.mediaThumbnailUrl
        : undefined,
    mediaWidth:
      typeof data.mediaWidth === "number" ? data.mediaWidth : undefined,
    mediaHeight:
      typeof data.mediaHeight === "number" ? data.mediaHeight : undefined,
    mediaSize:
      typeof data.mediaSize === "number" ? data.mediaSize : undefined,
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
    text: trimmed,
    type: "text",
    createdAt: now,
    read: false,
  };

  if (isFirebaseConfigured()) {
    const ref = await addDoc(collection(getDb(), col()), {
      userId: opts.userId,
      senderId: opts.senderId,
      message: trimmed,
      text: trimmed,
      type: "text",
      createdAt: Timestamp.fromDate(now),
      read: false,
    });
    return { ...row, id: ref.id };
  }

  const existing = mockByUser.get(opts.userId) ?? [];
  mockByUser.set(opts.userId, [...existing, row]);
  return row;
}

export async function sendDirectMediaMessage(opts: {
  userId: string;
  senderId: string;
  caption?: string;
  pending: PendingChatMedia[];
  signal?: AbortSignal;
  onProgress?: (ratio: number) => void;
}): Promise<DirectMessage> {
  if (!opts.pending.length) throw new Error("No photos to send.");
  assertUploadRateLimit(opts.senderId);

  const caption = (opts.caption ?? "").trim();
  const preview = chatMediaPreviewText("image", caption);
  const now = new Date();
  const messageId = crypto.randomUUID();

  const uploaded = await uploadChatMediaFiles({
    thread: "admin",
    threadId: opts.userId,
    messageId,
    files: opts.pending,
    signal: opts.signal,
    onProgress: opts.onProgress,
  });

  const row: DirectMessage = {
    id: messageId,
    userId: opts.userId,
    senderId: opts.senderId,
    message: preview,
    text: caption,
    type: "image",
    mediaUrl: uploaded.mediaUrl,
    mediaUrls: uploaded.mediaUrls,
    mediaWidth: uploaded.mediaWidth,
    mediaHeight: uploaded.mediaHeight,
    mediaSize: uploaded.mediaSize,
    createdAt: now,
    read: false,
  };

  if (isFirebaseConfigured()) {
    await setDoc(doc(getDb(), col(), messageId), {
      userId: opts.userId,
      senderId: opts.senderId,
      message: preview,
      text: caption,
      type: "image",
      mediaUrl: uploaded.mediaUrl,
      mediaUrls: uploaded.mediaUrls,
      mediaWidth: uploaded.mediaWidth ?? null,
      mediaHeight: uploaded.mediaHeight ?? null,
      mediaSize: uploaded.mediaSize,
      createdAt: Timestamp.fromDate(now),
      read: false,
    });
    markUploadRateLimit(opts.senderId);
    return row;
  }

  markUploadRateLimit(opts.senderId);
  const existing = mockByUser.get(opts.userId) ?? [];
  mockByUser.set(opts.userId, [...existing, row]);
  return row;
}

export async function emailDirectMessage(opts: {
  to: string;
  recipientName: string;
  message: string;
  hasPhoto?: boolean;
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
      hasPhoto: Boolean(opts.hasPhoto),
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
