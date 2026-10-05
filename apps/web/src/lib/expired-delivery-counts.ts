import {
  Timestamp,
  collection,
  getDocs,
  limit,
  query,
  where,
} from "firebase/firestore";
import { collectionName } from "@/lib/constants";
import { getDb, isFirebaseConfigured } from "@/lib/firebase";

/** Count of orders stamped expired, keyed by the runner's Auth uid. */
export async function fetchExpiredDeliveryCounts(): Promise<Record<string, number>> {
  if (!isFirebaseConfigured()) return {};
  const snap = await getDocs(
    query(
      collection(getDb(), collectionName("orders")),
      where("runnerExpiredAt", ">", Timestamp.fromDate(new Date(0))),
      limit(500),
    ),
  );
  const counts: Record<string, number> = {};
  for (const row of snap.docs) {
    const uid = String(row.get("runnerUid") ?? "").trim();
    if (!uid) continue;
    counts[uid] = (counts[uid] ?? 0) + 1;
  }
  return counts;
}
