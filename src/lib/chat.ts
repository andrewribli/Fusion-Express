import type { ChatMessage } from "@/lib/types";
import { getDb, isFirebaseConfigured } from "@/lib/firebase";
import {
  addDoc,
  collection,
  getDocs,
  onSnapshot,
  orderBy,
  query,
  Timestamp,
} from "firebase/firestore";

const mockMessages = new Map<string, ChatMessage[]>();

function parseMessage(
  orderId: string,
  id: string,
  data: Record<string, unknown>,
): ChatMessage {
  const ts = data.timestamp;
  return {
    id,
    orderId,
    senderId: String(data.senderId ?? ""),
    senderName: String(data.senderName ?? ""),
    message: String(data.message ?? ""),
    timestamp:
      ts && typeof ts === "object" && "toDate" in ts
        ? (ts as Timestamp).toDate()
        : new Date(String(ts ?? Date.now())),
  };
}

export async function sendChatMessage(
  orderId: string,
  senderId: string,
  senderName: string,
  message: string,
): Promise<ChatMessage> {
  const trimmed = message.trim();
  if (!trimmed) throw new Error("Message cannot be empty");

  const now = new Date();
  const payload = {
    orderId,
    senderId,
    senderName,
    message: trimmed,
    timestamp: now,
  };

  if (isFirebaseConfigured()) {
    const ref = await addDoc(
      collection(getDb(), "chats", orderId, "messages"),
      {
        ...payload,
        timestamp: Timestamp.fromDate(now),
      },
    );
    return { id: ref.id, ...payload };
  }

  const chatMessage: ChatMessage = {
    id: crypto.randomUUID(),
    ...payload,
  };
  const existing = mockMessages.get(orderId) ?? [];
  mockMessages.set(orderId, [...existing, chatMessage]);
  return chatMessage;
}

export async function fetchChatMessages(
  orderId: string,
): Promise<ChatMessage[]> {
  if (isFirebaseConfigured()) {
    try {
      const q = query(
        collection(getDb(), "chats", orderId, "messages"),
        orderBy("timestamp", "asc"),
      );
      const snap = await getDocs(q);
      return snap.docs.map((d) =>
        parseMessage(orderId, d.id, d.data() as Record<string, unknown>),
      );
    } catch {
      // fallback
    }
  }

  return mockMessages.get(orderId) ?? [];
}

export function subscribeChatMessages(
  orderId: string,
  onMessages: (messages: ChatMessage[]) => void,
): () => void {
  if (isFirebaseConfigured()) {
    try {
      const q = query(
        collection(getDb(), "chats", orderId, "messages"),
        orderBy("timestamp", "asc"),
      );
      return onSnapshot(q, (snap) => {
        const messages = snap.docs.map((d) =>
          parseMessage(orderId, d.id, d.data() as Record<string, unknown>),
        );
        onMessages(messages);
      });
    } catch {
      // fallback
    }
  }

  onMessages(mockMessages.get(orderId) ?? []);
  const interval = setInterval(async () => {
    onMessages(mockMessages.get(orderId) ?? []);
  }, 3000);

  return () => clearInterval(interval);
}

export function isOwnChatMessage(
  message: ChatMessage,
  user: {
    uid?: string;
    studentId: string;
    runnerId?: string;
  },
): boolean {
  const ids = [user.uid, user.studentId, user.runnerId].filter(
    (id): id is string => Boolean(id),
  );
  return ids.includes(message.senderId);
}

export function canAccessOrderChat(
  order: { customerId: string; runnerId?: string },
  user: {
    uid?: string;
    studentId: string;
    runnerId?: string;
    isRunner?: boolean;
  },
): boolean {
  const customerMatch =
    (user.uid && order.customerId === user.uid) ||
    order.customerId === user.studentId;
  if (customerMatch) return true;
  if (user.isRunner) return true;
  if (order.runnerId && user.runnerId && order.runnerId === user.runnerId) {
    return true;
  }
  return false;
}
