import { collectionName, storagePath } from "./app-env";
import { getDb, getFirebaseStorage, isFirebaseConfigured } from "./firebase";
import {
  addDoc,
  collection,
  doc,
  getDocs,
  onSnapshot,
  orderBy,
  query,
  setDoc,
  writeBatch,
  arrayUnion,
  increment,
  Timestamp,
} from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";

/**
 * Admin chat: private threads between GraceRun (the admin/owner) and each side
 * of an order. This is separate from the customer↔runner order chat. There is
 * one thread per (order, party): the customer talks to the admin about payment,
 * and the runner talks to the admin about the receipt total and reimbursement.
 */

export type AdminChatParty = "customer" | "runner";
export type AdminChatRole = "admin" | "customer" | "runner";

export const ADMIN_SENDER_ID = "admin";
export const ADMIN_SENDER_NAME = "GraceRun";

export interface AdminChatMessage {
  id: string;
  threadId: string;
  orderId: string;
  party: AdminChatParty;
  senderId: string;
  senderRole: AdminChatRole;
  senderName: string;
  message: string;
  imageUrl?: string;
  read: boolean;
  createdAt: Date;
}

export interface AdminChatThread {
  id: string;
  orderId: string;
  party: AdminChatParty;
  participants: string[];
  lastMessage: string;
  lastSenderRole: AdminChatRole;
  /** Messages from the party (customer/runner) the admin has not read yet. */
  adminUnread: number;
  updatedAt: Date;
}

export function adminThreadId(orderId: string, party: AdminChatParty): string {
  return `${orderId}__${party}`;
}

function adminChatsCollection(): string {
  return collectionName("adminChats");
}

// ---- Mock (dev / no-Firebase) in-memory store -------------------------------

const mockMessages = new Map<string, AdminChatMessage[]>();
const mockThreads = new Map<string, AdminChatThread>();

function bumpMockThread(
  threadId: string,
  orderId: string,
  party: AdminChatParty,
  msg: AdminChatMessage,
  participantIds: string[],
): void {
  const existing = mockThreads.get(threadId);
  const adminUnread =
    (existing?.adminUnread ?? 0) + (msg.senderRole === "admin" ? 0 : 1);
  const participants = Array.from(
    new Set([...(existing?.participants ?? []), ...participantIds, ADMIN_SENDER_ID]),
  );
  mockThreads.set(threadId, {
    id: threadId,
    orderId,
    party,
    participants,
    lastMessage: msg.imageUrl && !msg.message ? "📷 Photo" : msg.message,
    lastSenderRole: msg.senderRole,
    adminUnread,
    updatedAt: msg.createdAt,
  });
}

// ---- Types for callers ------------------------------------------------------

export interface SendAdminMessageInput {
  orderId: string;
  party: AdminChatParty;
  senderId: string;
  senderRole: AdminChatRole;
  senderName: string;
  message?: string;
  imageUrl?: string;
  /** Account id of the customer/runner on this thread (for participants). */
  partyUserId?: string;
}

function parseMessage(
  threadId: string,
  orderId: string,
  party: AdminChatParty,
  id: string,
  data: Record<string, unknown>,
): AdminChatMessage {
  const ts = data.createdAt;
  return {
    id,
    threadId,
    orderId,
    party,
    senderId: String(data.senderId ?? ""),
    senderRole: (data.senderRole as AdminChatRole) ?? "customer",
    senderName: String(data.senderName ?? ""),
    message: String(data.message ?? ""),
    imageUrl: data.imageUrl ? String(data.imageUrl) : undefined,
    read: Boolean(data.read),
    createdAt:
      ts && typeof ts === "object" && "toDate" in ts
        ? (ts as Timestamp).toDate()
        : new Date(String(ts ?? Date.now())),
  };
}

function parseThread(id: string, data: Record<string, unknown>): AdminChatThread {
  const ts = data.updatedAt;
  return {
    id,
    orderId: String(data.orderId ?? id.split("__")[0] ?? ""),
    party: (data.party as AdminChatParty) ?? "customer",
    participants: Array.isArray(data.participants)
      ? (data.participants as unknown[]).map(String)
      : [],
    lastMessage: String(data.lastMessage ?? ""),
    lastSenderRole: (data.lastSenderRole as AdminChatRole) ?? "customer",
    adminUnread: Number(data.adminUnread ?? 0),
    updatedAt:
      ts && typeof ts === "object" && "toDate" in ts
        ? (ts as Timestamp).toDate()
        : new Date(String(ts ?? Date.now())),
  };
}

export async function sendAdminMessage(
  input: SendAdminMessageInput,
): Promise<AdminChatMessage> {
  const text = (input.message ?? "").trim();
  if (!text && !input.imageUrl) {
    throw new Error("Message cannot be empty");
  }
  const threadId = adminThreadId(input.orderId, input.party);
  const now = new Date();
  const base = {
    senderId: input.senderId,
    senderRole: input.senderRole,
    senderName: input.senderName,
    message: text,
    imageUrl: input.imageUrl,
    read: false,
  };
  const participantIds = [input.partyUserId, ADMIN_SENDER_ID].filter(
    (id): id is string => Boolean(id),
  );

  if (isFirebaseConfigured()) {
    const db = getDb();
    const messagesCol = collection(
      db,
      adminChatsCollection(),
      threadId,
      "messages",
    );
    const payload: Record<string, unknown> = {
      ...base,
      createdAt: Timestamp.fromDate(now),
    };
    if (input.imageUrl === undefined) delete payload.imageUrl;
    const refDoc = await addDoc(messagesCol, payload);

    const threadUpdate: Record<string, unknown> = {
      orderId: input.orderId,
      party: input.party,
      participants: arrayUnion(...participantIds),
      lastMessage: text || (input.imageUrl ? "📷 Photo" : ""),
      lastSenderRole: input.senderRole,
      updatedAt: Timestamp.fromDate(now),
    };
    if (input.senderRole !== "admin") {
      threadUpdate.adminUnread = increment(1);
    }
    await setDoc(
      doc(db, adminChatsCollection(), threadId),
      threadUpdate,
      { merge: true },
    );

    return {
      id: refDoc.id,
      threadId,
      orderId: input.orderId,
      party: input.party,
      ...base,
      createdAt: now,
    };
  }

  const message: AdminChatMessage = {
    id: crypto.randomUUID(),
    threadId,
    orderId: input.orderId,
    party: input.party,
    ...base,
    createdAt: now,
  };
  mockMessages.set(threadId, [...(mockMessages.get(threadId) ?? []), message]);
  bumpMockThread(threadId, input.orderId, input.party, message, participantIds);
  return message;
}

export function subscribeAdminMessages(
  orderId: string,
  party: AdminChatParty,
  onMessages: (messages: AdminChatMessage[]) => void,
): () => void {
  const threadId = adminThreadId(orderId, party);
  if (isFirebaseConfigured()) {
    try {
      const q = query(
        collection(getDb(), adminChatsCollection(), threadId, "messages"),
        orderBy("createdAt", "asc"),
      );
      return onSnapshot(q, (snap) => {
        onMessages(
          snap.docs.map((d) =>
            parseMessage(threadId, orderId, party, d.id, d.data() as Record<string, unknown>),
          ),
        );
      });
    } catch {
      // fall through to mock
    }
  }

  onMessages(mockMessages.get(threadId) ?? []);
  const interval = setInterval(() => {
    onMessages(mockMessages.get(threadId) ?? []);
  }, 2000);
  return () => clearInterval(interval);
}

export function subscribeAdminThreads(
  onThreads: (threads: AdminChatThread[]) => void,
): () => void {
  if (isFirebaseConfigured()) {
    try {
      const q = query(
        collection(getDb(), adminChatsCollection()),
        orderBy("updatedAt", "desc"),
      );
      return onSnapshot(q, (snap) => {
        onThreads(
          snap.docs.map((d) =>
            parseThread(d.id, d.data() as Record<string, unknown>),
          ),
        );
      });
    } catch {
      // fall through to mock
    }
  }

  const emit = () =>
    onThreads(
      [...mockThreads.values()].sort(
        (a, b) => b.updatedAt.getTime() - a.updatedAt.getTime(),
      ),
    );
  emit();
  const interval = setInterval(emit, 2000);
  return () => clearInterval(interval);
}

/**
 * Mark a thread read for the given viewer: clears the "read" flag on the
 * messages authored by the other side, and (for the admin) resets the
 * dashboard unread counter.
 */
export async function markAdminThreadRead(
  orderId: string,
  party: AdminChatParty,
  viewerRole: AdminChatRole,
): Promise<void> {
  const threadId = adminThreadId(orderId, party);

  if (isFirebaseConfigured()) {
    try {
      const db = getDb();
      const snap = await getDocs(
        collection(db, adminChatsCollection(), threadId, "messages"),
      );
      const batch = writeBatch(db);
      snap.docs.forEach((d) => {
        const data = d.data() as Record<string, unknown>;
        const senderRole = (data.senderRole as AdminChatRole) ?? "customer";
        if (senderRole !== viewerRole && data.read !== true) {
          batch.update(d.ref, { read: true });
        }
      });
      if (viewerRole === "admin") {
        batch.set(
          doc(db, adminChatsCollection(), threadId),
          { adminUnread: 0 },
          { merge: true },
        );
      }
      await batch.commit();
      return;
    } catch {
      // fall through to mock
    }
  }

  const msgs = mockMessages.get(threadId);
  if (msgs) {
    msgs.forEach((m) => {
      if (m.senderRole !== viewerRole) m.read = true;
    });
  }
  const thread = mockThreads.get(threadId);
  if (thread && viewerRole === "admin") thread.adminUnread = 0;
}

/** Count unread messages for a viewer within a message list. */
export function unreadForViewer(
  messages: AdminChatMessage[],
  viewerRole: AdminChatRole,
): number {
  return messages.filter((m) => m.senderRole !== viewerRole && !m.read).length;
}

function readFileAsDataUrl(file: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error ?? new Error("Read failed"));
    reader.readAsDataURL(file);
  });
}

/**
 * Upload a chat image (e.g. a receipt). In Firebase mode it goes to Storage and
 * returns the download URL; in dev/mock mode it returns a data URL so the image
 * still renders locally.
 */
export async function uploadAdminChatImage(
  orderId: string,
  party: AdminChatParty,
  file: Blob,
  filename = "receipt.jpg",
): Promise<string> {
  const threadId = adminThreadId(orderId, party);
  const name =
    "name" in file && typeof (file as { name?: string }).name === "string"
      ? (file as { name: string }).name
      : filename;

  if (isFirebaseConfigured()) {
    try {
      const storageRef = ref(
        getFirebaseStorage(),
        storagePath(`admin-chats/${threadId}/${Date.now()}-${name}`),
      );
      await uploadBytes(storageRef, file);
      return await getDownloadURL(storageRef);
    } catch {
      // fall back to a local data URL
    }
  }

  return readFileAsDataUrl(file);
}
