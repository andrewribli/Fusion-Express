import {
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  onSnapshot,
  orderBy,
  query,
  Timestamp,
  updateDoc,
  where,
  type Unsubscribe,
} from "firebase/firestore";
import { collectionName } from "@fusion-express/shared/app-env";
import { getDb, isFirebaseConfigured } from "@fusion-express/shared/firebase";
import { notifySupportMessage } from "./notify-push";

export type SupportMessage = {
  id: string;
  userId: string;
  senderId: string;
  message: string;
  createdAt: Date;
  read: boolean;
};

export type SupportThread = {
  userId: string;
  lastMessage: string;
  lastSenderId: string;
  lastAt: Date;
  unreadFromUser: number;
};

function col() {
  return collectionName("messages");
}

function parse(id: string, data: Record<string, unknown>): SupportMessage {
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

/** Customer → admin support thread (same collection as web /admin/support). */
export async function sendSupportMessage(opts: {
  userId: string;
  senderId: string;
  message: string;
}): Promise<void> {
  const trimmed = opts.message.trim();
  if (!trimmed) throw new Error("Message cannot be empty");
  if (!isFirebaseConfigured()) throw new Error("Firebase is not configured");
  await addDoc(collection(getDb(), col()), {
    userId: opts.userId,
    senderId: opts.senderId,
    message: trimmed,
    createdAt: Timestamp.now(),
    read: false,
  });
  notifySupportMessage(opts.userId, trimmed);
}

export function subscribeSupportMessages(
  userId: string,
  onMessages: (messages: SupportMessage[]) => void,
): Unsubscribe {
  if (!isFirebaseConfigured()) {
    onMessages([]);
    return () => undefined;
  }
  const q = query(
    collection(getDb(), col()),
    where("userId", "==", userId),
    orderBy("createdAt", "asc"),
    limit(200),
  );
  return onSnapshot(
    q,
    (snap) => {
      onMessages(
        snap.docs.map((d) => parse(d.id, d.data() as Record<string, unknown>)),
      );
    },
    () => onMessages([]),
  );
}

export async function markSupportRead(opts: {
  userId: string;
  readerId: string;
}): Promise<void> {
  if (!isFirebaseConfigured()) return;
  const q = query(
    collection(getDb(), col()),
    where("userId", "==", opts.userId),
    where("read", "==", false),
    limit(100),
  );
  const snap = await getDocs(q);
  await Promise.all(
    snap.docs
      .filter((d) => {
        const data = d.data() as Record<string, unknown>;
        // Mark admin replies as read when the customer opens the thread.
        return String(data.senderId ?? "") !== opts.readerId;
      })
      .map((d) => updateDoc(d.ref, { read: true })),
  );
}

/** Admin inbox: recent support threads (same query as web /admin/support). */
export async function fetchSupportThreads(): Promise<SupportThread[]> {
  if (!isFirebaseConfigured()) return [];
  const snap = await getDocs(
    query(collection(getDb(), col()), orderBy("createdAt", "desc"), limit(400)),
  );
  const byUser = new Map<string, SupportThread>();
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
  return [...byUser.values()].sort(
    (a, b) => b.lastAt.getTime() - a.lastAt.getTime(),
  );
}

/** Best-effort display names for admin inbox (admins may get /users/{uid}). */
export async function fetchUserDisplayNames(
  uids: string[],
): Promise<Record<string, string>> {
  const names: Record<string, string> = {};
  if (!isFirebaseConfigured() || uids.length === 0) return names;
  const unique = [...new Set(uids.filter(Boolean))];
  await Promise.all(
    unique.slice(0, 80).map(async (uid) => {
      try {
        const snap = await getDoc(doc(getDb(), collectionName("users"), uid));
        if (!snap.exists()) return;
        const data = snap.data() as Record<string, unknown>;
        names[uid] =
          (data.fullName ? String(data.fullName) : "") ||
          (data.email ? String(data.email) : "") ||
          uid;
      } catch {
        /* ignore per-user failures */
      }
    }),
  );
  return names;
}
