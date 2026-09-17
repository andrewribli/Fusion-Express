"use client";

import type { ChatMessage } from "@/lib/types";
import { collectionName } from "@/lib/constants";
import { getDb, isFirebaseConfigured } from "@/lib/firebase";
import {
  addDoc,
  collection,
  doc,
  getDocs,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  Timestamp,
  updateDoc,
} from "firebase/firestore";

export interface SupportThread {
  userId: string;
  userName: string;
  lastMessage: string;
  lastMessageAt: Date;
  lastSenderId: string;
}

const mockThreads = new Map<string, ChatMessage[]>();

function parseMessage(
  threadId: string,
  id: string,
  data: Record<string, unknown>,
): ChatMessage {
  const ts = data.timestamp;
  return {
    id,
    orderId: threadId,
    senderId: String(data.senderId ?? ""),
    senderName: String(data.senderName ?? ""),
    message: String(data.message ?? ""),
    timestamp:
      ts && typeof ts === "object" && "toDate" in ts
        ? (ts as Timestamp).toDate()
        : new Date(String(ts ?? Date.now())),
  };
}

function threadCollection() {
  return collectionName("supportChats");
}

export async function sendSupportMessage(opts: {
  userId: string;
  userName: string;
  senderId: string;
  senderName: string;
  message: string;
  asAdmin?: boolean;
}): Promise<ChatMessage> {
  const trimmed = opts.message.trim();
  if (!trimmed) throw new Error("Message cannot be empty");

  const now = new Date();
  const payload = {
    orderId: opts.userId,
    senderId: opts.senderId,
    senderName: opts.senderName,
    message: trimmed,
    timestamp: now,
  };

  if (isFirebaseConfigured()) {
    const db = getDb();
    const threadRef = doc(db, threadCollection(), opts.userId);
    await setDoc(
      threadRef,
      {
        userId: opts.userId,
        userName: opts.userName,
        lastMessage: trimmed,
        lastMessageAt: Timestamp.fromDate(now),
        lastSenderId: opts.senderId,
        updatedAt: serverTimestamp(),
      },
      { merge: true },
    );
    const ref = await addDoc(collection(threadRef, "messages"), {
      senderId: opts.senderId,
      senderName: opts.senderName,
      message: trimmed,
      timestamp: Timestamp.fromDate(now),
      asAdmin: Boolean(opts.asAdmin),
    });
    return { id: ref.id, ...payload };
  }

  const chatMessage: ChatMessage = { id: crypto.randomUUID(), ...payload };
  const existing = mockThreads.get(opts.userId) ?? [];
  mockThreads.set(opts.userId, [...existing, chatMessage]);
  return chatMessage;
}

export function subscribeSupportMessages(
  userId: string,
  onMessages: (messages: ChatMessage[]) => void,
): () => void {
  if (isFirebaseConfigured()) {
    try {
      const q = query(
        collection(getDb(), threadCollection(), userId, "messages"),
        orderBy("timestamp", "asc"),
      );
      return onSnapshot(q, (snap) => {
        onMessages(
          snap.docs.map((d) =>
            parseMessage(userId, d.id, d.data() as Record<string, unknown>),
          ),
        );
      });
    } catch {
      // fallback
    }
  }

  onMessages(mockThreads.get(userId) ?? []);
  const interval = setInterval(() => {
    onMessages(mockThreads.get(userId) ?? []);
  }, 3000);
  return () => clearInterval(interval);
}

export async function fetchSupportThreads(): Promise<SupportThread[]> {
  if (!isFirebaseConfigured()) {
    return [...mockThreads.entries()].map(([userId, msgs]) => {
      const last = msgs[msgs.length - 1];
      return {
        userId,
        userName: last?.senderName ?? userId,
        lastMessage: last?.message ?? "",
        lastMessageAt: last?.timestamp ?? new Date(),
        lastSenderId: last?.senderId ?? "",
      };
    });
  }

  const snap = await getDocs(collection(getDb(), threadCollection()));
  return snap.docs
    .map((d) => {
      const data = d.data() as Record<string, unknown>;
      const ts = data.lastMessageAt;
      return {
        userId: String(data.userId ?? d.id),
        userName: String(data.userName ?? d.id),
        lastMessage: String(data.lastMessage ?? ""),
        lastMessageAt:
          ts && typeof ts === "object" && "toDate" in ts
            ? (ts as Timestamp).toDate()
            : new Date(0),
        lastSenderId: String(data.lastSenderId ?? ""),
      };
    })
    .sort((a, b) => b.lastMessageAt.getTime() - a.lastMessageAt.getTime());
}

export async function touchSupportThread(
  userId: string,
  patch: { userName?: string },
): Promise<void> {
  if (!isFirebaseConfigured()) return;
  await updateDoc(doc(getDb(), threadCollection(), userId), {
    ...patch,
    updatedAt: serverTimestamp(),
  }).catch(() => undefined);
}
