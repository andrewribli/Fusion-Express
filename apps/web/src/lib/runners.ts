import type { Runner, RunnerRegistrationInput } from "@/lib/types";
import { collectionName, isDemoAuth } from "@/lib/constants";
import { getDb, isFirebaseConfigured } from "@/lib/firebase";
import { omitUndefined } from "@/lib/omit-undefined";
import {
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  query,
  updateDoc,
  where,
  Timestamp,
} from "firebase/firestore";

const RUNNERS_COLLECTION = collectionName("runners");
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

function pickRunnerForUser(
  runners: Runner[],
  opts: { uid?: string; studentId?: string },
): Runner | null {
  if (opts.uid) {
    const byUid = runners.find((r) => r.uid === opts.uid);
    if (byUid) return byUid;
  }
  if (opts.uid && opts.studentId) {
    const orphan = runners.find(
      (r) => r.studentId === opts.studentId && !r.uid,
    );
    if (orphan) return orphan;
  }
  return null;
}

export async function registerRunner(
  input: RunnerRegistrationInput,
): Promise<string> {
  const { validatePhone, normalizePhone } = await import("@/lib/auth");
  const phoneErr = validatePhone(input.phone);
  if (phoneErr) throw new Error(phoneErr);
  const phone = normalizePhone(input.phone);
  if (isDemoAuth()) {
    return `demo-runner-${Date.now()}`;
  }
  const existing = await findRunnerForUser({
    uid: input.uid,
    studentId: input.studentId,
  });
  if (existing) return existing.id;

  const now = new Date();
  const payload = {
    ...input,
    phone,
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

/**
 * Looks up the caller's own runner doc. Security rules only permit a query
 * filtered on the caller's uid, so this can no longer scan the collection —
 * a runner registered before uids were recorded is found through the runnerId
 * stored on their user profile instead.
 */
export async function findRunnerForUser(opts: {
  uid?: string;
  studentId?: string;
}): Promise<Runner | null> {
  if (!isFirebaseConfigured()) {
    return pickRunnerForUser([...mockRunners.values()], opts);
  }
  if (!opts.uid) return null;

  try {
    const snap = await getDocs(
      query(
        collection(getDb(), RUNNERS_COLLECTION),
        where("uid", "==", opts.uid),
        limit(1),
      ),
    );
    const found = snap.docs[0];
    return found
      ? parseRunner(found.id, found.data() as Record<string, unknown>)
      : null;
  } catch {
    return null;
  }
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
