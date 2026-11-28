import type { ChatMessage } from "@/lib/types";
import { chatMediaStoragePath, collectionName } from "@/lib/constants";
import { storagePath } from "@fusion-express/shared/app-env";
import { getDb, getFirebaseStorage, isFirebaseConfigured } from "@/lib/firebase";
import {
  addDoc,
  collection,
  getDocs,
  onSnapshot,
  orderBy,
  query,
  Timestamp,
} from "firebase/firestore";
import { getDownloadURL, ref, uploadBytes } from "firebase/storage";

const mockMessages = new Map<string, ChatMessage[]>();

function parseMessage(
  orderId: string,
  id: string,
  data: Record<string, unknown>,
): ChatMessage {
  const ts = data.timestamp;
  const imageUrl =
    typeof data.imageUrl === "string" && /^https?:\/\//i.test(data.imageUrl)
      ? data.imageUrl
      : undefined;
  const mediaType =
    data.mediaType === "video"
      ? "video"
      : data.mediaType === "image" || imageUrl
        ? "image"
        : undefined;
  return {
    id,
    orderId,
    senderId: String(data.senderId ?? ""),
    senderName: String(data.senderName ?? ""),
    message: String(data.message ?? ""),
    imageUrl,
    mediaType,
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
    const refDoc = await addDoc(
      collection(getDb(), collectionName("chats"), orderId, "messages"),
      {
        ...payload,
        timestamp: Timestamp.fromDate(now),
      },
    );
    return { id: refDoc.id, ...payload };
  }

  const chatMessage: ChatMessage = {
    id: crypto.randomUUID(),
    ...payload,
  };
  const existing = mockMessages.get(orderId) ?? [];
  mockMessages.set(orderId, [...existing, chatMessage]);
  return chatMessage;
}

export async function sendChatMedia(opts: {
  orderId: string;
  senderId: string;
  senderName: string;
  file: Blob;
  fileName: string;
  contentType: string;
  mediaType: "image" | "video";
}): Promise<void> {
  if (!isFirebaseConfigured()) throw new Error("Chat requires Firebase.");
  const storageRef = ref(
    getFirebaseStorage(),
    storagePath(chatMediaStoragePath(opts.orderId, opts.fileName)),
  );
  await uploadBytes(storageRef, opts.file, { contentType: opts.contentType });
  const imageUrl = await getDownloadURL(storageRef);
  const now = new Date();
  await addDoc(
    collection(getDb(), collectionName("chats"), opts.orderId, "messages"),
    {
      orderId: opts.orderId,
      senderId: opts.senderId,
      senderName: opts.senderName,
      message: opts.mediaType === "video" ? "Video" : "Photo",
      imageUrl,
      mediaType: opts.mediaType,
      timestamp: Timestamp.fromDate(now),
    },
  );
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
    isAdmin?: boolean;
  },
): boolean {
  if (user.isAdmin) return true;
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
