import "server-only";
import { Timestamp } from "firebase-admin/firestore";
import { isUniversityEmailForCampus } from "@fusion-express/shared/campus";
import { collectionName } from "@/lib/constants";
import { getAdminDb } from "@/lib/firebase-admin";
import { listAuthAccountsRest } from "@/lib/identity-toolkit-rest";
import { parseUserDoc, selectAdminDirectoryUsers } from "@/lib/user-directory";
import type { UserProfile } from "@/context/UserContext";

function asString(value: unknown): string {
  return String(value ?? "").trim();
}

async function namesFromCityUOrders(
  db: NonNullable<ReturnType<typeof getAdminDb>>,
): Promise<Map<string, string>> {
  const names = new Map<string, string>();
  const col = db.collection(collectionName("orders"));
  let snap;
  try {
    snap = await col.where("campus", "==", "cityu").get();
  } catch {
    snap = await col.get();
  }
  for (const doc of snap.docs) {
    const data = doc.data() as Record<string, unknown>;
    if (asString(data.campus) && asString(data.campus) !== "cityu") continue;
    const uid = asString(data.customerId);
    const name = asString(data.customerName);
    if (!uid || !name || names.has(uid)) continue;
    names.set(uid, name);
  }
  return names;
}

/**
 * Copy CityU Auth accounts into `users` (same collection as CUHK) and return them.
 * Fills fullName from Auth displayName or a CityU order when the profile is blank.
 */
export async function syncAndListCityUUsers(): Promise<{
  users: UserProfile[];
  hiddenOrphanCount: number;
  synced: number;
}> {
  const db = getAdminDb();
  if (!db) {
    throw new Error("CityU user sync is not configured on the server.");
  }

  const usersCol = db.collection(collectionName("users"));
  let authRows: Awaited<ReturnType<typeof listAuthAccountsRest>> = [];
  try {
    authRows = await listAuthAccountsRest();
  } catch (err) {
    console.error("CityU Auth list failed; showing Firestore profiles only", err);
  }

  const orderNames = await namesFromCityUOrders(db);
  const cityuAuth = authRows.filter((row) =>
    isUniversityEmailForCampus(row.email, "cityu"),
  );

  const now = Timestamp.now();
  for (const row of cityuAuth) {
    const ref = usersCol.doc(row.uid);
    const snap = await ref.get();
    const existing = (snap.data() ?? {}) as Record<string, unknown>;
    const existingName = asString(existing.fullName);
    const fullName =
      existingName || orderNames.get(row.uid) || row.displayName;
    const payload: Record<string, unknown> = {
      email: row.email,
      campus: "cityu",
      updatedAt: now,
    };
    if (fullName) payload.fullName = fullName;
    if (!existing.createdAt) payload.createdAt = now;
    if (!existing.cityuVerifiedAt) payload.cityuVerifiedAt = now;
    if (!existing.role) payload.role = "customer";
    await ref.set(payload, { merge: true });
  }

  const allSnap = await usersCol.get();
  const all = allSnap.docs.map((d) =>
    parseUserDoc(d.id, d.data() as Record<string, unknown>),
  );

  return {
    users: selectAdminDirectoryUsers("cityu", all),
    hiddenOrphanCount: 0,
    synced: cityuAuth.length,
  };
}
