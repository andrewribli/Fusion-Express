import AsyncStorage from "@react-native-async-storage/async-storage";
import type { ChatMessage, Order } from "@fusion-express/shared/types";
import { collectionName } from "@fusion-express/shared/app-env";
import { chatMediaStoragePath } from "@fusion-express/shared";
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
  user: { uid?: string; runnerId?: string; isAdmin?: boolean },
): boolean {
  if (user.isAdmin) return true;
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

/** Display name for the other party (header / button). */
export function orderChatPeerName(
  order: Order,
  uid: string | undefined,
): string {
  if (uid && order.customerId === uid) {
    const name = order.runnerName?.trim();
    return name || "Runner";
  }
  const name = order.customerName?.trim();
  return name || "Customer";
}

export function orderChatButtonLabel(
  order: Order,
  uid: string | undefined,
): string {
  return uid && order.customerId === uid
    ? "Message runner"
    : "Message customer";
}

export function orderChatSubtitle(order: Order): string {
  const shortId = order.id.length > 10 ? order.id.slice(0, 10) : order.id;
  const lobby = order.lobbyPoint?.trim();
  return lobby ? `${shortId} · ${lobby}` : shortId;
}

function chatReadKey(orderId: string, accountId: string): string {
  return `fusion_chat_read_${orderId}_${accountId}`;
}

export async function getChatLastReadAt(
  orderId: string,
  accountId: string,
): Promise<number> {
  if (!accountId) return 0;
  try {
    const raw = await AsyncStorage.getItem(chatReadKey(orderId, accountId));
    return raw ? Number(raw) || 0 : 0;
  } catch {
    return 0;
  }
}

export async function markChatRead(
  orderId: string,
  accountId: string,
  at = Date.now(),
): Promise<void> {
  if (!accountId) return;
  try {
    await AsyncStorage.setItem(chatReadKey(orderId, accountId), String(at));
  } catch {
    // Best-effort local unread badge only.
  }
}

export function countUnreadChatMessages(
  messages: ChatMessage[],
  uid: string | undefined,
  lastReadAt: number,
): number {
  if (!uid) return 0;
  return messages.filter(
    (msg) =>
      !isOwnChatMessage(msg, uid) &&
      msg.timestamp.getTime() > lastReadAt,
  ).length;
}
