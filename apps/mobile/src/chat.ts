import type { ChatMessage, Order } from "@fusion-express/shared/types";
import { collectionName } from "@fusion-express/shared/app-env";
import { storagePath } from "@fusion-express/shared/app-env";
import {
  getDb,
  getFirebaseStorage,
  isFirebaseConfigured,
} from "@fusion-express/shared/firebase";
import {
  addDoc,
  collection,
  onSnapshot,
  orderBy,
  query,
  Timestamp,
} from "firebase/firestore";
import { getDownloadURL, ref, uploadBytes } from "firebase/storage";

function messageTime(value: unknown): Date {
  if (value instanceof Date && !Number.isNaN(value.getTime())) return value;
  if (value && typeof value === "object") {
    const stamp = value as {
      toDate?: () => Date;
      seconds?: number;
      _seconds?: number;
    };
    if (typeof stamp.toDate === "function") {
      try {
        const date = stamp.toDate();
        if (date instanceof Date && !Number.isNaN(date.getTime())) return date;
      } catch {
        // Fall through to seconds or now.
      }
    }
    const seconds =
      typeof stamp.seconds === "number"
        ? stamp.seconds
        : typeof stamp._seconds === "number"
          ? stamp._seconds
          : null;
    if (seconds != null) return new Date(seconds * 1000);
  }
  if (typeof value === "number" && Number.isFinite(value)) return new Date(value);
  if (typeof value === "string") {
    const parsed = new Date(value);
    if (!Number.isNaN(parsed.getTime())) return parsed;
  }
  return new Date();
}

function parseMessage(
  orderId: string,
  id: string,
  data: Record<string, unknown> | null | undefined,
): ChatMessage {
  const row = data ?? {};
  const imageUrl =
    typeof row.imageUrl === "string" && /^https?:\/\//i.test(row.imageUrl)
      ? row.imageUrl
      : undefined;
  const mediaType =
    row.mediaType === "video"
      ? "video"
      : row.mediaType === "image" || imageUrl
        ? "image"
        : undefined;
  const rawText = row.message ?? row.text;
  return {
    id: id || `msg-${Date.now()}`,
    orderId,
    senderId: String(row.senderId ?? ""),
    senderName: String(row.senderName ?? ""),
    message: typeof rawText === "string" ? rawText : "",
    imageUrl,
    mediaType,
    timestamp: messageTime(row.timestamp ?? row.createdAt),
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
  if (!isFirebaseConfigured()) {
    throw new Error("Chat requires Firebase.");
  }
  const now = new Date();
  const payload = {
    orderId,
    senderId,
    senderName,
    message: trimmed,
    timestamp: now,
  };
  const ref = await addDoc(
    collection(getDb(), collectionName("chats"), orderId, "messages"),
    { ...payload, timestamp: Timestamp.fromDate(now) },
  );
  return { id: ref.id, ...payload };
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
  const safeName = opts.fileName.replace(/[^\w.-]+/g, "_") || "media";
  const storageRef = ref(
    getFirebaseStorage(),
    storagePath(`chats/${opts.orderId}/${Date.now()}-${safeName}`),
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

export function subscribeChatMessages(
  orderId: string,
  onMessages: (messages: ChatMessage[]) => void,
): () => void {
  if (!isFirebaseConfigured()) {
    onMessages([]);
    return () => undefined;
  }
  const q = query(
    collection(getDb(), collectionName("chats"), orderId, "messages"),
    orderBy("timestamp", "asc"),
  );
  return onSnapshot(
    q,
    (snap) => {
      try {
        const docs = Array.isArray(snap?.docs) ? snap.docs : [];
        onMessages(
          docs.map((d) =>
            parseMessage(orderId, d.id, d.data() as Record<string, unknown>),
          ),
        );
      } catch (err) {
        console.warn("[chat] could not read messages", err);
        onMessages([]);
      }
    },
    (err) => {
      console.warn("[chat] listener failed", err);
      onMessages([]);
    },
  );
}

export function canAccessOrderChat(
  order: { customerId: string; runnerId?: string; runnerUid?: string },
  user: { uid?: string; runnerId?: string },
): boolean {
  if (user.uid && order.customerId === user.uid) return true;
  if (order.runnerUid && user.uid && order.runnerUid === user.uid) return true;
  if (order.runnerId && user.runnerId && order.runnerId === user.runnerId) {
    return true;
  }
  return false;
}

export function isOwnChatMessage(
  message: ChatMessage,
  uid: string | undefined,
): boolean {
  return Boolean(uid && message.senderId === uid);
}

export function orderChatPeerLabel(order: Order, uid: string | undefined): string {
  if (uid && order.customerId === uid) return "runner";
  return "customer";
}
