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
import { getAuthClient, getDb, isFirebaseConfigured } from "@/lib/firebase";

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

export function feedbackErrorMessage(err: unknown): string {
  const code =
    typeof err === "object" && err && "code" in err
      ? String((err as { code: string }).code)
      : "";
  const raw = err instanceof Error ? err.message : "";
  if (code === "permission-denied" || /permission|insufficient/i.test(raw)) {
    return "Couldn't save that. Sign in and try again.";
  }
  if (code === "unavailable" || /network|offline/i.test(raw)) {
    return "Network issue — check your connection and try again.";
  }
  return raw || "Could not send feedback. Please try again.";
}

export async function submitFeedback(input: {
  userId?: string;
  userName?: string;
  message: string;
}): Promise<void> {
  if (!isFirebaseConfigured()) {
    throw new Error("Feedback isn't available right now. Please try again later.");
  }
  const authUid = getAuthClient().currentUser?.uid ?? input.userId?.trim();
  if (!authUid) {
    throw new Error("Sign in to send feedback.");
  }
  const message = input.message.trim();
  if (!message) throw new Error("Write a short message first.");

  const payload: {
    userId: string;
    message: string;
    createdAt: Timestamp;
    status: FeedbackStatus;
    userName?: string;
  } = {
    userId: authUid,
    message,
    createdAt: Timestamp.now(),
    status: "unread",
  };
  const userName = input.userName?.trim();
  if (userName) payload.userName = userName;

  try {
    await addDoc(collection(getDb(), COLLECTION()), payload);
  } catch (err) {
    throw new Error(feedbackErrorMessage(err));
  }
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
