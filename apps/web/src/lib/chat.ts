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
  Timestamp,
  updateDoc,
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
    message: String(data.message ?? data.text ?? ""),
    text: String(data.text ?? data.message ?? ""),
    senderRole:
      data.senderRole === "runner" || data.senderRole === "admin"
        ? data.senderRole
        : "customer",
    seen: Boolean(data.seen),
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
  senderRole: "customer" | "runner" | "admin" = "customer",
): Promise<ChatMessage> {
  const trimmed = message.trim();
  if (!trimmed) throw new Error("Message cannot be empty");

  const now = new Date();
  const payload = {
    orderId,
    senderId,
    senderName,
    senderRole,
    message: trimmed,
    text: trimmed,
    seen: false,
    timestamp: now,
  };

  if (isFirebaseConfigured()) {
    const ref = await addDoc(
      collection(getDb(), collectionName("chats"), orderId, "messages"),
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
        collection(getDb(), collectionName("chats"), orderId, "messages"),
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
        collection(getDb(), collectionName("chats"), orderId, "messages"),
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

export async function markChatSeen(
  orderId: string,
  messages: ChatMessage[],
  viewerId: string,
): Promise<void> {
  const unseen = messages.filter((m) => m.senderId !== viewerId && !m.seen);
  if (!unseen.length || !isFirebaseConfigured()) return;
  await Promise.all(
    unseen.map((m) =>
      updateDoc(
        doc(getDb(), collectionName("chats"), orderId, "messages", m.id),
        { seen: true },
      ).catch(() => undefined),
    ),
  );
}

export function isOwnChatMessage(
  message: ChatMessage,
  user: {
    uid?: string;
    studentId?: string;
    runnerId?: string;
  },
): boolean {
  // New messages must use Auth uid. Keep legacy studentId/runnerId matches
  // so older bubbles still render as "own".
  if (user.uid && message.senderId === user.uid) return true;
  const legacy = [user.studentId, user.runnerId].filter(
    (id): id is string => Boolean(id),
  );
  return legacy.includes(message.senderId);
}

/**
 * Mirrors the chat security rules: the customer and the assigned runner only.
 * Any other runner used to pass this check, but the rules now reject their
 * reads, so the panel must not be offered to them.
 *
 * studentId remains a legacy customerId fallback for older orders only.
 */
export function canAccessOrderChat(
  order: { customerId: string; runnerId?: string; runnerUid?: string },
  user: {
    uid?: string;
    studentId?: string;
    runnerId?: string;
    isRunner?: boolean;
  },
): boolean {
  const customerMatch =
    (user.uid && order.customerId === user.uid) ||
    Boolean(user.studentId && order.customerId === user.studentId);
  if (customerMatch) return true;
  if (order.runnerUid && user.uid && order.runnerUid === user.uid) return true;
  if (order.runnerId && user.runnerId && order.runnerId === user.runnerId) {
    return true;
  }
  return false;
}
