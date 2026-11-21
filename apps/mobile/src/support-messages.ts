import {
  addDoc,
  collection,
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

export type SupportMessage = {
  id: string;
  userId: string;
  senderId: string;
  message: string;
  createdAt: Date;
  read: boolean;
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
