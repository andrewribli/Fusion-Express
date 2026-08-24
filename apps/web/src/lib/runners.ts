import type { Runner, RunnerRegistrationInput } from "@/lib/types";
import { getDb, isFirebaseConfigured } from "@/lib/firebase";
import { omitUndefined } from "@/lib/omit-undefined";
import {
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  updateDoc,
  Timestamp,
} from "firebase/firestore";

const RUNNERS_COLLECTION = "runners";
const mockRunners = new Map<string, Runner>();

function parseRunner(id: string, data: Record<string, unknown>): Runner {
  return {
    id,
    uid: data.uid ? String(data.uid) : undefined,
    fullName: String(data.fullName ?? ""),
    studentId: String(data.studentId ?? ""),
    phone: String(data.phone ?? ""),
    college: String(data.college ?? ""),
    hall: String(data.hall ?? ""),
    paymentMethod: data.paymentMethod as Runner["paymentMethod"],
    paymentId: String(data.paymentId ?? ""),
    termsAcceptedAt: data.termsAcceptedAt
      ? (data.termsAcceptedAt as Timestamp).toDate?.() ??
        new Date(String(data.termsAcceptedAt))
      : new Date(),
    active: data.active !== false,
    totalEarned: Number(data.totalEarned ?? 0),
    pendingPayout: Number(data.pendingPayout ?? 0),
    payoutHistory: (data.payoutHistory as Runner["payoutHistory"]) ?? [],
  };
}

export async function registerRunner(
  input: RunnerRegistrationInput,
): Promise<string> {
  const now = new Date();
  const payload = {
    ...input,
    termsAcceptedAt: now,
    active: true,
    totalEarned: 0,
    pendingPayout: 0,
    payoutHistory: [],
  };

  if (isFirebaseConfigured()) {
    const ref = await addDoc(collection(getDb(), RUNNERS_COLLECTION), {
      ...omitUndefined({ ...payload } as Record<string, unknown>),
      termsAcceptedAt: Timestamp.fromDate(now),
    });
    return ref.id;
  }

  const id = `runner-${crypto.randomUUID().slice(0, 8)}`;
  mockRunners.set(id, { id, ...payload, termsAcceptedAt: now });
  return id;
}

export async function fetchRunner(runnerId: string): Promise<Runner | null> {
  if (isFirebaseConfigured()) {
    try {
      const snap = await getDoc(doc(getDb(), RUNNERS_COLLECTION, runnerId));
      if (snap.exists()) {
        return parseRunner(snap.id, snap.data() as Record<string, unknown>);
      }
    } catch {
      // fallback
    }
  }

  return mockRunners.get(runnerId) ?? null;
}

export async function findRunnerForUser(opts: {
  uid?: string;
  studentId?: string;
}): Promise<Runner | null> {
  if (isFirebaseConfigured()) {
    try {
      const snap = await getDocs(collection(getDb(), RUNNERS_COLLECTION));
      const runners = snap.docs.map((d) =>
        parseRunner(d.id, d.data() as Record<string, unknown>),
      );
      return (
        runners.find((r) => opts.uid && r.uid === opts.uid) ??
        runners.find((r) => opts.studentId && r.studentId === opts.studentId) ??
        null
      );
    } catch {
      return null;
    }
  }

  return (
    [...mockRunners.values()].find((r) => opts.uid && r.uid === opts.uid) ??
    [...mockRunners.values()].find(
      (r) => opts.studentId && r.studentId === opts.studentId,
    ) ??
    null
  );
}

export async function addRunnerEarnings(
  runnerId: string,
  orderId: string,
  amount: number,
): Promise<void> {
  const runner = await fetchRunner(runnerId);
  if (!runner) return;

  const updated = {
    totalEarned: runner.totalEarned + amount,
    pendingPayout: runner.pendingPayout + amount,
    payoutHistory: [
      ...runner.payoutHistory,
      { orderId, amount, paidAt: new Date() },
    ],
  };

  if (isFirebaseConfigured()) {
    try {
      await updateDoc(doc(getDb(), RUNNERS_COLLECTION, runnerId), updated);
      return;
    } catch {
      // fallback
    }
  }

  mockRunners.set(runnerId, { ...runner, ...updated });
}
