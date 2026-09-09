import type { Runner, RunnerRegistrationInput } from "@/lib/types";
import { collectionName } from "@/lib/constants";
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

async function claimRunnerUid(runner: Runner, uid: string): Promise<Runner> {
  if (runner.uid === uid) return runner;
  if (isFirebaseConfigured()) {
    try {
      await updateDoc(doc(getDb(), RUNNERS_COLLECTION, runner.id), { uid });
    } catch {
      // still return claimed in memory for this session
    }
  } else {
    mockRunners.set(runner.id, { ...runner, uid });
  }
  return { ...runner, uid };
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
  const existing = await findRunnerForUser({
    uid: input.uid,
    studentId: input.studentId,
  });
  if (existing) return existing.id;

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
  const runners = isFirebaseConfigured()
    ? await (async () => {
        try {
          const snap = await getDocs(collection(getDb(), RUNNERS_COLLECTION));
          return snap.docs.map((d) =>
            parseRunner(d.id, d.data() as Record<string, unknown>),
          );
        } catch {
          return [] as Runner[];
        }
      })()
    : [...mockRunners.values()];

  const picked = pickRunnerForUser(runners, opts);
  if (!picked) return null;
  if (opts.uid && !picked.uid) {
    return claimRunnerUid(picked, opts.uid);
  }
  return picked;
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
