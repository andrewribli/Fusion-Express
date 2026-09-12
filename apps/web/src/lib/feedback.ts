import {
  addDoc,
  collection,
  getDocs,
  orderBy,
  query,
  Timestamp,
  updateDoc,
  doc,
} from "firebase/firestore";
import { collectionName } from "@/lib/constants";
import { getDb, isFirebaseConfigured } from "@/lib/firebase";

export type FeedbackStatus = "unread" | "read" | "resolved";

export type FeedbackItem = {
  id: string;
  userId: string;
  userName?: string;
  message: string;
  createdAt: Date;
  status: FeedbackStatus;
};

const COLLECTION = () => collectionName("feedback");

function parseStatus(value: unknown): FeedbackStatus {
  if (value === "read" || value === "resolved") return value;
  return "unread";
}

export async function submitFeedback(input: {
  userId: string;
  userName?: string;
  message: string;
}): Promise<void> {
  if (!isFirebaseConfigured()) {
    throw new Error("Firebase is not configured");
  }
  const message = input.message.trim();
  if (!message) throw new Error("Write a short message first.");
  await addDoc(collection(getDb(), COLLECTION()), {
    userId: input.userId,
    userName: input.userName?.trim() || "",
    message,
    createdAt: Timestamp.now(),
    status: "unread",
  });
}

export async function fetchAllFeedback(): Promise<FeedbackItem[]> {
  if (!isFirebaseConfigured()) return [];
  const snap = await getDocs(
    query(collection(getDb(), COLLECTION()), orderBy("createdAt", "desc")),
  );
  return snap.docs.map((d) => {
    const data = d.data();
    const createdAt =
      data.createdAt instanceof Timestamp
        ? data.createdAt.toDate()
        : new Date();
    return {
      id: d.id,
      userId: String(data.userId ?? ""),
      userName: data.userName ? String(data.userName) : undefined,
      message: String(data.message ?? ""),
      createdAt,
      status: parseStatus(data.status),
    };
  });
}

export async function updateFeedbackStatus(
  id: string,
  status: FeedbackStatus,
): Promise<void> {
  if (!isFirebaseConfigured()) return;
  await updateDoc(doc(getDb(), COLLECTION(), id), { status });
}
