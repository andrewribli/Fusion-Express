import type { ChatMessage, ChatMessageType } from "@/lib/types";
import {
  assertUploadRateLimit,
  chatMediaPreviewText,
  markUploadRateLimit,
  MAX_MEDIA_BYTES_PER_ORDER,
  MAX_MESSAGES_PER_USER_PER_ORDER,
  uploadChatMediaFiles,
  type PendingChatMedia,
} from "@/lib/chat-media";
import { collectionName } from "@/lib/constants";
import { getDb, isFirebaseConfigured } from "@/lib/firebase";
import {
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  increment,
  onSnapshot,
  orderBy,
  query,
  setDoc,
  Timestamp,
  updateDoc,
  where,
} from "firebase/firestore";

const mockMessages = new Map<string, ChatMessage[]>();
const mockMediaBytes = new Map<string, number>();

function parseType(raw: unknown): ChatMessageType {
  if (raw === "image" || raw === "video") return raw;
  return "text";
}

function parseMessage(
  orderId: string,
  id: string,
  data: Record<string, unknown>,
): ChatMessage {
  const ts = data.timestamp;
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
    orderId,
    senderId: String(data.senderId ?? ""),
    senderName: String(data.senderName ?? ""),
    message: preview,
    text: textRaw || preview,
    type,
    mediaUrl,
    mediaUrls,
    mediaThumbnailUrl:
      typeof data.mediaThumbnailUrl === "string"
        ? data.mediaThumbnailUrl
        : undefined,
    mediaDuration:
      typeof data.mediaDuration === "number" ? data.mediaDuration : undefined,
    mediaWidth:
      typeof data.mediaWidth === "number" ? data.mediaWidth : undefined,
    mediaHeight:
      typeof data.mediaHeight === "number" ? data.mediaHeight : undefined,
    mediaSize:
      typeof data.mediaSize === "number" ? data.mediaSize : undefined,
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

async function countUserMessages(
  orderId: string,
  senderId: string,
): Promise<number> {
  if (!isFirebaseConfigured()) {
    return (mockMessages.get(orderId) ?? []).filter(
      (m) => m.senderId === senderId,
    ).length;
  }
  const snap = await getDocs(
    query(
      collection(getDb(), collectionName("chats"), orderId, "messages"),
      where("senderId", "==", senderId),
    ),
  );
  return snap.size;
}

async function getOrderMediaBytes(orderId: string): Promise<number> {
  if (!isFirebaseConfigured()) return mockMediaBytes.get(orderId) ?? 0;
  try {
    const snap = await getDoc(doc(getDb(), collectionName("chats"), orderId));
    const n = snap.data()?.mediaBytesUsed;
    return typeof n === "number" ? n : 0;
  } catch {
    // Parent chat meta doc may be denied until rules deploy — don't block send.
    return 0;
  }
}

async function bumpOrderMediaBytes(
  orderId: string,
  bytes: number,
): Promise<void> {
  if (!isFirebaseConfigured()) {
    mockMediaBytes.set(
      orderId,
      (mockMediaBytes.get(orderId) ?? 0) + bytes,
    );
    return;
  }
  const ref = doc(getDb(), collectionName("chats"), orderId);
  await setDoc(
    ref,
    { mediaBytesUsed: increment(bytes), updatedAt: Timestamp.now() },
    { merge: true },
  );
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

  const count = await countUserMessages(orderId, senderId);
  if (count >= MAX_MESSAGES_PER_USER_PER_ORDER) {
    throw new Error(
      `You've hit the ${MAX_MESSAGES_PER_USER_PER_ORDER}-message limit for this order.`,
    );
  }

  const now = new Date();
  const payload = {
    orderId,
    senderId,
    senderName,
    senderRole,
    type: "text" as const,
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

export async function sendChatMediaMessage(opts: {
  orderId: string;
  senderId: string;
  senderName: string;
  senderRole?: "customer" | "runner" | "admin";
  caption?: string;
  pending: PendingChatMedia[];
  signal?: AbortSignal;
  onProgress?: (ratio: number) => void;
}): Promise<ChatMessage> {
  const role = opts.senderRole ?? "customer";
  if (!opts.pending.length) throw new Error("No photos to send.");

  assertUploadRateLimit(opts.senderId);

  const count = await countUserMessages(opts.orderId, opts.senderId);
  if (count >= MAX_MESSAGES_PER_USER_PER_ORDER) {
    throw new Error(
      `You've hit the ${MAX_MESSAGES_PER_USER_PER_ORDER}-message limit for this order.`,
    );
  }

  const addBytes = opts.pending.reduce((n, p) => n + p.file.size, 0);
  const used = await getOrderMediaBytes(opts.orderId);
  if (used + addBytes > MAX_MEDIA_BYTES_PER_ORDER) {
    throw new Error(
      "This order has reached its media limit (~100MB). Try a text message instead.",
    );
  }

  const caption = (opts.caption ?? "").trim();
  const preview = chatMediaPreviewText("image", caption);
  const now = new Date();
  const messageId = crypto.randomUUID();

  const uploaded = await uploadChatMediaFiles({
    thread: "order",
    threadId: opts.orderId,
    messageId,
    files: opts.pending,
    signal: opts.signal,
    onProgress: opts.onProgress,
  });

  const payload: Omit<ChatMessage, "id"> = {
    orderId: opts.orderId,
    senderId: opts.senderId,
    senderName: opts.senderName,
    senderRole: role,
    type: "image",
    message: preview,
    text: caption,
    mediaUrl: uploaded.mediaUrl,
    mediaUrls: uploaded.mediaUrls,
    mediaWidth: uploaded.mediaWidth,
    mediaHeight: uploaded.mediaHeight,
    mediaSize: uploaded.mediaSize,
    seen: false,
    timestamp: now,
  };

  if (isFirebaseConfigured()) {
    const ref = doc(
      getDb(),
      collectionName("chats"),
      opts.orderId,
      "messages",
      messageId,
    );
    await setDoc(ref, {
      orderId: opts.orderId,
      senderId: opts.senderId,
      senderName: opts.senderName,
      senderRole: role,
      type: "image",
      message: preview,
      text: caption,
      mediaUrl: uploaded.mediaUrl,
      mediaUrls: uploaded.mediaUrls,
      mediaWidth: uploaded.mediaWidth ?? null,
      mediaHeight: uploaded.mediaHeight ?? null,
      mediaSize: uploaded.mediaSize,
      seen: false,
      timestamp: Timestamp.fromDate(now),
    });
    try {
      await bumpOrderMediaBytes(opts.orderId, uploaded.mediaSize);
    } catch (err) {
      console.warn("chat mediaBytesUsed bump failed", err);
    }
    markUploadRateLimit(opts.senderId);
    return { id: messageId, ...payload };
  }

  markUploadRateLimit(opts.senderId);
  try {
    await bumpOrderMediaBytes(opts.orderId, uploaded.mediaSize);
  } catch {
    // mock / offline — ignore
  }
  const chatMessage: ChatMessage = { id: messageId, ...payload };
  const existing = mockMessages.get(opts.orderId) ?? [];
  mockMessages.set(opts.orderId, [...existing, chatMessage]);
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
