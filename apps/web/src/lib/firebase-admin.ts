import "server-only";
import { existsSync, readFileSync } from "fs";
import { resolve } from "path";
import {
  cert,
  getApps,
  initializeApp,
  type App,
  type ServiceAccount,
} from "firebase-admin/app";
import { getAuth, type Auth } from "firebase-admin/auth";
import { getFirestore, type Firestore } from "firebase-admin/firestore";
import { collectionName } from "@/lib/constants";

function loadServiceAccount(): ServiceAccount | null {
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT_JSON?.trim();
  if (raw) {
    try {
      return JSON.parse(raw) as ServiceAccount;
    } catch (err) {
      console.error("FIREBASE_SERVICE_ACCOUNT_JSON is invalid JSON", err);
    }
  }

  // Prefer env JSON on Vercel. Local file path is for scripts only — avoid
  // dynamic fs tracing of the whole project in the Next server bundle.
  if (process.env.VERCEL || process.env.NODE_ENV === "production") {
    return null;
  }

  const path =
    process.env.FIREBASE_SERVICE_ACCOUNT_PATH ??
    process.env.GOOGLE_APPLICATION_CREDENTIALS ??
    "./firebase-service-account.json";
  try {
    const absolute = resolve(/*turbopackIgnore: true*/ process.cwd(), path);
    if (!existsSync(/*turbopackIgnore: true*/ absolute)) return null;
    return JSON.parse(
      readFileSync(/*turbopackIgnore: true*/ absolute, "utf8"),
    ) as ServiceAccount;
  } catch (err) {
    console.error("Could not read Firebase service account file", err);
    return null;
  }
}

function getAdminApp(): App | null {
  const existing = getApps()[0];
  if (existing) return existing;
  const account = loadServiceAccount();
  if (!account) return null;
  return initializeApp({ credential: cert(account) });
}

export function getAdminAuth(): Auth | null {
  const app = getAdminApp();
  return app ? getAuth(app) : null;
}

export function getAdminDb(): Firestore | null {
  const app = getAdminApp();
  return app ? getFirestore(app) : null;
}

export class AdminAuthError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = "AdminAuthError";
    this.status = status;
  }
}

export async function emailHasAuthAccount(
  email: string,
): Promise<boolean | null> {
  const auth = getAdminAuth();
  if (!auth) return null;
  try {
    await auth.getUserByEmail(email);
    return true;
  } catch (err) {
    const code =
      err && typeof err === "object" && "code" in err
        ? String((err as { code: string }).code)
        : "";
    if (code === "auth/user-not-found") return false;
    console.error("emailHasAuthAccount failed", err);
    return null;
  }
}

async function emailRegisteredViaRest(email: string): Promise<boolean | null> {
  const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
  if (!apiKey) return null;
  try {
    const res = await fetch(
      `https://identitytoolkit.googleapis.com/v1/accounts:createAuthUri?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          identifier: email,
          continueUri:
            process.env.NEXT_PUBLIC_APP_ORIGIN ?? "https://www.gracerun.fit",
        }),
      },
    );
    if (!res.ok) return null;
    const data = (await res.json()) as { registered?: boolean };
    return Boolean(data.registered);
  } catch (err) {
    console.error("emailRegisteredViaRest failed", err);
    return null;
  }
}

async function emailHasFirestoreProfile(email: string): Promise<boolean | null> {
  const db = getAdminDb();
  if (!db) return null;
  try {
    const users = collectionName("users");
    const byEmail = await db
      .collection(users)
      .where("email", "==", email)
      .limit(1)
      .get();
    if (!byEmail.empty) return true;
    const byCuhk = await db
      .collection(users)
      .where("cuhkEmail", "==", email)
      .limit(1)
      .get();
    if (!byCuhk.empty) return true;

    const usernames = collectionName("usernames");
    const byUsernameEmail = await db
      .collection(usernames)
      .where("email", "==", email)
      .limit(1)
      .get();
    return !byUsernameEmail.empty;
  } catch (err) {
    console.error("emailHasFirestoreProfile failed", err);
    return null;
  }
}

/** Prefer Auth; also treat Firestore profile / username maps as registered. */
export async function emailIsRegistered(
  email: string,
): Promise<boolean | null> {
  const authHit = await emailHasAuthAccount(email);
  if (authHit === true) return true;

  const profileHit = await emailHasFirestoreProfile(email);
  if (profileHit === true) return true;
  if (profileHit === false && authHit === false) return false;
  if (profileHit === false && authHit === null) {
    return emailRegisteredViaRest(email);
  }
  // profileHit null (no admin db) — fall through
  if (authHit === false) return false;
  return emailRegisteredViaRest(email);
}

/**
 * Resolve the Auth uid to update for a CUHK email.
 * Handles legacy accounts where Auth email was a synthetic username address
 * but the profile / usernames map stores the real CUHK email — and prefers
 * the newest username mapping when duplicates exist.
 */
export async function resolveAuthUidForEmail(
  email: string,
): Promise<string | null> {
  const auth = getAdminAuth();
  if (auth) {
    try {
      const user = await auth.getUserByEmail(email);
      return user.uid;
    } catch (err) {
      const code =
        err && typeof err === "object" && "code" in err
          ? String((err as { code: string }).code)
          : "";
      if (code !== "auth/user-not-found") {
        console.error("resolveAuthUidForEmail auth lookup failed", err);
      }
    }
  }

  const db = getAdminDb();
  if (!db) return null;

  const usernames = collectionName("usernames");
  try {
    const mapped = await db
      .collection(usernames)
      .where("email", "==", email)
      .get();
    if (!mapped.empty) {
      const sorted = [...mapped.docs].sort((a, b) => {
        const at = a.createTime?.toMillis?.() ?? 0;
        const bt = b.createTime?.toMillis?.() ?? 0;
        return bt - at;
      });
      if (sorted.length > 1) {
        console.warn(
          `Multiple username maps for ${email}; using newest (${sorted[0].id})`,
          sorted.map((d) => d.id),
        );
      }
      const uid = String(sorted[0].data().uid ?? "");
      if (uid) return uid;
    }
  } catch (err) {
    console.error("resolveAuthUidForEmail usernames query failed", err);
  }

  const users = collectionName("users");
  try {
    for (const field of ["email", "cuhkEmail"] as const) {
      const snap = await db
        .collection(users)
        .where(field, "==", email)
        .limit(5)
        .get();
      if (snap.empty) continue;
      const sorted = [...snap.docs].sort((a, b) => {
        const at = a.updateTime?.toMillis?.() ?? 0;
        const bt = b.updateTime?.toMillis?.() ?? 0;
        return bt - at;
      });
      return sorted[0].id;
    }
  } catch (err) {
    console.error("resolveAuthUidForEmail users query failed", err);
  }

  return null;
}

export type AlertRecipient = {
  email: string;
  isRunner: boolean;
};

export type BroadcastGroup = "everyone" | "new_users" | "runners" | "long_term";

export type BroadcastRecipient = {
  email: string;
  isRunner: boolean;
  createdAt: Date | null;
};

function createdAtFromData(data: Record<string, unknown>): Date | null {
  const raw = data.createdAt;
  if (raw == null) return null;
  if (
    typeof raw === "object" &&
    "toDate" in raw &&
    typeof (raw as { toDate: unknown }).toDate === "function"
  ) {
    try {
      return (raw as { toDate: () => Date }).toDate();
    } catch {
      return null;
    }
  }
  if (raw instanceof Date) return raw;
  if (typeof raw === "string" || typeof raw === "number") {
    const d = new Date(raw);
    return Number.isNaN(d.getTime()) ? null : d;
  }
  return null;
}

export async function listUserAlertRecipients(): Promise<AlertRecipient[]> {
  const recipients = await listBroadcastRecipients();
  return recipients.map(({ email, isRunner }) => ({ email, isRunner }));
}

export async function listBroadcastRecipients(
  idToken?: string,
): Promise<BroadcastRecipient[]> {
  if (idToken) {
    return listBroadcastRecipientsViaRest(idToken);
  }
  const db = getAdminDb();
  if (!db) return [];
  const snap = await db.collection(collectionName("users")).get();
  const out: BroadcastRecipient[] = [];
  const seen = new Set<string>();
  for (const docSnap of snap.docs) {
    const data = docSnap.data() as Record<string, unknown>;
    const email = String(data.email ?? data.cuhkEmail ?? "")
      .trim()
      .toLowerCase();
    if (!email.includes("@") || seen.has(email)) continue;
    seen.add(email);
    out.push({
      email,
      isRunner: Boolean(data.isRunner) || Boolean(data.runnerId),
      createdAt: createdAtFromData(data),
    });
  }
  return out;
}

function firestoreDocumentsUrl(): string {
  const project = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID?.trim();
  if (!project) {
    throw new AdminAuthError("NEXT_PUBLIC_FIREBASE_PROJECT_ID is not set.", 503);
  }
  return `https://firestore.googleapis.com/v1/projects/${project}/databases/(default)/documents`;
}

function restString(
  fields: Record<string, { stringValue?: string }> | undefined,
  key: string,
): string {
  return String(fields?.[key]?.stringValue ?? "").trim();
}

function restBool(
  fields:
    | Record<string, { booleanValue?: boolean; stringValue?: string }>
    | undefined,
  key: string,
): boolean {
  const f = fields?.[key];
  if (!f) return false;
  if (typeof f.booleanValue === "boolean") return f.booleanValue;
  return Boolean(f.stringValue);
}

function restTimestamp(
  fields: Record<string, { timestampValue?: string }> | undefined,
  key: string,
): Date | null {
  const raw = fields?.[key]?.timestampValue;
  if (!raw) return null;
  const d = new Date(raw);
  return Number.isNaN(d.getTime()) ? null : d;
}

async function listBroadcastRecipientsViaRest(
  idToken: string,
): Promise<BroadcastRecipient[]> {
  const base = firestoreDocumentsUrl();
  const collection = collectionName("users");
  const out: BroadcastRecipient[] = [];
  const seen = new Set<string>();
  let pageToken = "";

  for (let i = 0; i < 40; i++) {
    const url = new URL(`${base}/${collection}`);
    url.searchParams.set("pageSize", "300");
    if (pageToken) url.searchParams.set("pageToken", pageToken);
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${idToken}` },
    });
    if (!res.ok) {
      const text = await res.text();
      console.error("list users via REST failed", res.status, text.slice(0, 400));
      throw new AdminAuthError("Could not load users from Firestore.", 502);
    }
    const data = (await res.json()) as {
      documents?: {
        fields?: Record<
          string,
          {
            stringValue?: string;
            booleanValue?: boolean;
            timestampValue?: string;
          }
        >;
      }[];
      nextPageToken?: string;
    };
    for (const doc of data.documents ?? []) {
      const fields = doc.fields;
      const email = (
        restString(fields, "email") || restString(fields, "cuhkEmail")
      ).toLowerCase();
      if (!email.includes("@") || seen.has(email)) continue;
      seen.add(email);
      out.push({
        email,
        isRunner:
          restBool(fields, "isRunner") || Boolean(restString(fields, "runnerId")),
        createdAt: restTimestamp(fields, "createdAt"),
      });
    }
    if (!data.nextPageToken) break;
    pageToken = data.nextPageToken;
  }

  return out;
}

/**
 * Verify a Firebase ID token without loading Auth SDK path as the only option.
 * Prefer Admin SDK verifyIdToken; fall back to Identity Toolkit REST.
 */
async function verifyIdToken(
  idToken: string,
): Promise<{ uid: string; email: string | null } | null> {
  const auth = getAdminAuth();
  if (auth) {
    try {
      const decoded = await auth.verifyIdToken(idToken, true);
      return {
        uid: decoded.uid,
        email: decoded.email?.trim().toLowerCase() || null,
      };
    } catch (err) {
      console.error("verifyIdToken Admin SDK failed; trying REST", err);
    }
  }
  return verifyIdTokenViaRest(idToken);
}

/**
 * Verify a Firebase ID token via Identity Toolkit REST (backup path).
 */
async function verifyIdTokenViaRest(
  idToken: string,
): Promise<{ uid: string; email: string | null } | null> {
  const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY?.trim();
  if (!apiKey) {
    console.error("NEXT_PUBLIC_FIREBASE_API_KEY is not set");
    return null;
  }
  try {
    const res = await fetch(
      `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idToken }),
      },
    );
    if (!res.ok) return null;
    const data = (await res.json()) as {
      users?: { localId?: string; email?: string }[];
    };
    const user = data.users?.[0];
    const uid = user?.localId?.trim();
    if (!uid) return null;
    return {
      uid,
      email: user?.email?.trim().toLowerCase() || null,
    };
  } catch (err) {
    console.error("verifyIdTokenViaRest failed", err);
    return null;
  }
}

export type AuthedRequest = {
  uid: string;
  email: string | null;
  idToken: string;
};

/**
 * Verify Firebase ID token from Authorization: Bearer.
 * Prefer Admin SDK verifyIdToken; fall back to Identity Toolkit REST.
 */
export async function requireAuthFromRequest(
  request: Request,
): Promise<AuthedRequest> {
  const header = request.headers.get("authorization") ?? "";
  const match = /^Bearer\s+(.+)$/i.exec(header.trim());
  if (!match) {
    throw new AdminAuthError("Missing Authorization bearer token.", 401);
  }
  const idToken = match[1]!;

  const decoded = await verifyIdToken(idToken);
  if (!decoded) {
    throw new AdminAuthError("Invalid or expired auth token.", 401);
  }

  return {
    uid: decoded.uid,
    email: decoded.email,
    idToken,
  };
}

export async function callerIsAdmin(
  uid: string,
  idToken: string,
): Promise<boolean> {
  const res = await fetch(
    `${firestoreDocumentsUrl()}/admins/${encodeURIComponent(uid)}`,
    { headers: { Authorization: `Bearer ${idToken}` } },
  );
  if (res.status === 404 || res.status === 403) return false;
  if (!res.ok) {
    const text = await res.text();
    console.error("admin doc REST failed", res.status, text.slice(0, 400));
    throw new AdminAuthError("Could not verify admin access.", 502);
  }
  return true;
}

export type OrderEmailFields = {
  id: string;
  customerId: string;
  customerEmail: string;
  customerName: string;
  runnerUid: string;
  runnerId: string;
  runnerEmail: string;
  runnerName: string;
  runnerPaymentMethod: string;
  runnerPaymentId: string;
  status: string;
  total: number;
  finalTotal: number;
  amountPaidByRunner: number;
  deliveryLocation: string;
  items: { name: string; quantity: number; price: number }[];
};

function restNumber(
  fields: Record<string, { integerValue?: string; doubleValue?: number }> | undefined,
  key: string,
): number {
  const f = fields?.[key];
  if (!f) return 0;
  if (typeof f.doubleValue === "number") return f.doubleValue;
  if (f.integerValue != null) return Number(f.integerValue) || 0;
  return 0;
}

function orderFieldsFromAdminData(
  id: string,
  data: Record<string, unknown>,
): OrderEmailFields {
  const itemsRaw = Array.isArray(data.items) ? data.items : [];
  const items = itemsRaw.map((row) => {
    const item = (row ?? {}) as Record<string, unknown>;
    return {
      name: String(item.name ?? ""),
      quantity: Number(item.quantity ?? 0) || 0,
      price: Number(item.price ?? 0) || 0,
    };
  });
  const college = String(data.college ?? "");
  const hall = String(data.hall ?? "");
  const lobby = String(data.lobbyPoint ?? "");
  return {
    id,
    customerId: String(data.customerId ?? data.sessionId ?? ""),
    customerEmail: String(data.customerEmail ?? "")
      .trim()
      .toLowerCase(),
    customerName: String(data.customerName ?? ""),
    runnerUid: String(data.runnerUid ?? ""),
    runnerId: String(data.runnerId ?? ""),
    runnerEmail: String(data.runnerEmail ?? "")
      .trim()
      .toLowerCase(),
    runnerName: String(data.runnerName ?? ""),
    runnerPaymentMethod: String(data.runnerPaymentMethod ?? ""),
    runnerPaymentId: String(data.runnerPaymentId ?? ""),
    status: String(data.status ?? ""),
    total: Number(data.total ?? 0) || 0,
    finalTotal: Number(data.finalTotal ?? 0) || 0,
    amountPaidByRunner: Number(data.amountPaidByRunner ?? 0) || 0,
    deliveryLocation: [college, hall, lobby].filter(Boolean).join(" · "),
    items,
  };
}

/** Load an order for email routes via Admin SDK, else Firestore REST with the caller token. */
export async function fetchOrderForEmail(
  orderId: string,
  idToken: string,
): Promise<OrderEmailFields | null> {
  const safeId = orderId.trim();
  if (!safeId || safeId.length > 128) return null;

  const db = getAdminDb();
  if (db) {
    try {
      const snap = await db
        .collection(collectionName("orders"))
        .doc(safeId)
        .get();
      if (!snap.exists) return null;
      return orderFieldsFromAdminData(
        snap.id,
        snap.data() as Record<string, unknown>,
      );
    } catch (err) {
      console.error("fetchOrderForEmail admin failed", err);
    }
  }

  const collection = collectionName("orders");
  const res = await fetch(
    `${firestoreDocumentsUrl()}/${collection}/${encodeURIComponent(safeId)}`,
    { headers: { Authorization: `Bearer ${idToken}` } },
  );
  if (res.status === 404) return null;
  if (!res.ok) {
    const text = await res.text();
    console.error("fetchOrderForEmail REST failed", res.status, text.slice(0, 400));
    throw new AdminAuthError("Could not load order.", 502);
  }
  const data = (await res.json()) as {
    fields?: Record<
      string,
      {
        stringValue?: string;
        integerValue?: string;
        doubleValue?: number;
        arrayValue?: {
          values?: {
            mapValue?: {
              fields?: Record<
                string,
                {
                  stringValue?: string;
                  integerValue?: string;
                  doubleValue?: number;
                }
              >;
            };
          }[];
        };
      }
    >;
  };
  const fields = data.fields;
  const itemValues = fields?.items?.arrayValue?.values ?? [];
  const items = itemValues.map((v) => {
    const f = v.mapValue?.fields;
    return {
      name: restString(f, "name"),
      quantity: restNumber(f, "quantity"),
      price: restNumber(f, "price"),
    };
  });
  const college = restString(fields, "college");
  const hall = restString(fields, "hall");
  const lobby = restString(fields, "lobbyPoint");
  return {
    id: safeId,
    customerId:
      restString(fields, "customerId") || restString(fields, "sessionId"),
    customerEmail: restString(fields, "customerEmail").toLowerCase(),
    customerName: restString(fields, "customerName"),
    runnerUid: restString(fields, "runnerUid"),
    runnerId: restString(fields, "runnerId"),
    runnerEmail: restString(fields, "runnerEmail").toLowerCase(),
    runnerName: restString(fields, "runnerName"),
    runnerPaymentMethod: restString(fields, "runnerPaymentMethod"),
    runnerPaymentId: restString(fields, "runnerPaymentId"),
    status: restString(fields, "status"),
    total: restNumber(fields, "total"),
    finalTotal: restNumber(fields, "finalTotal"),
    amountPaidByRunner: restNumber(fields, "amountPaidByRunner"),
    deliveryLocation: [college, hall, lobby].filter(Boolean).join(" · "),
    items,
  };
}

export function paymentInfoFromOrder(order: OrderEmailFields): string {
  const method = order.runnerPaymentMethod.trim();
  const id = order.runnerPaymentId.trim();
  if (method && id) return `${method} ${id}`;
  return "";
}

export async function assertOrderPartyOrAdmin(
  auth: AuthedRequest,
  order: OrderEmailFields,
): Promise<void> {
  if (order.customerId && order.customerId === auth.uid) return;
  if (order.runnerUid && order.runnerUid === auth.uid) return;
  if (await callerIsAdmin(auth.uid, auth.idToken)) return;
  throw new AdminAuthError("Not allowed for this order.", 403);
}

/** Verify Firebase ID token and that `/admins/{uid}` exists. */
export async function requireAdminFromRequest(
  request: Request,
): Promise<AuthedRequest> {
  const header = request.headers.get("authorization") ?? "";
  const match = /^Bearer\s+(.+)$/i.exec(header.trim());
  if (!match) {
    throw new AdminAuthError("Missing Authorization bearer token.", 401);
  }
  const idToken = match[1]!;

  const decoded = await verifyIdToken(idToken);
  if (!decoded) {
    throw new AdminAuthError("Invalid or expired auth token.", 401);
  }

  const db = getAdminDb();
  if (db) {
    try {
      const adminSnap = await db.collection("admins").doc(decoded.uid).get();
      if (!adminSnap.exists) {
        throw new AdminAuthError("Admin access only.", 403);
      }
      return {
        uid: decoded.uid,
        email: decoded.email,
        idToken,
      };
    } catch (err) {
      if (err instanceof AdminAuthError) throw err;
      console.error("requireAdminFromRequest admin doc failed", err);
    }
  }

  const res = await fetch(
    `${firestoreDocumentsUrl()}/admins/${encodeURIComponent(decoded.uid)}`,
    { headers: { Authorization: `Bearer ${idToken}` } },
  );
  if (res.status === 404 || res.status === 403) {
    throw new AdminAuthError("Admin access only.", 403);
  }
  if (!res.ok) {
    const text = await res.text();
    console.error("admin doc REST failed", res.status, text.slice(0, 400));
    throw new AdminAuthError("Could not verify admin access.", 502);
  }

  return {
    uid: decoded.uid,
    email: decoded.email,
    idToken,
  };
}

export function filterBroadcastRecipients(
  recipients: BroadcastRecipient[],
  group: BroadcastGroup,
  now = new Date(),
): BroadcastRecipient[] {
  const msDay = 24 * 60 * 60 * 1000;
  if (group === "everyone") {
    return recipients.filter((r) => !r.email.endsWith("@fusion-express.app"));
  }
  if (group === "runners") {
    return recipients.filter((r) => r.isRunner);
  }
  if (group === "new_users") {
    const cutoff = now.getTime() - 7 * msDay;
    return recipients.filter(
      (r) => r.createdAt != null && r.createdAt.getTime() >= cutoff,
    );
  }
  const cutoff = now.getTime() - 30 * msDay;
  return recipients.filter(
    (r) => r.createdAt != null && r.createdAt.getTime() < cutoff,
  );
}

export async function updateAuthPassword(
  email: string,
  newPassword: string,
): Promise<void> {
  const auth = getAdminAuth();
  if (!auth) {
    throw new Error("Password reset is not configured on the server.");
  }
  const uid = await resolveAuthUidForEmail(email);
  if (!uid) {
    throw new Error("No account found with this email.");
  }

  // Always set the password on the resolved uid. Also sync the Auth email to
  // the CUHK address from the username/profile map — legacy accounts often
  // Auth as username@fusion-express.app while the map stores the real email,
  // which breaks both login and reset until Auth is updated.
  try {
    await auth.updateUser(uid, {
      password: newPassword,
      email,
      emailVerified: true,
    });
  } catch (err) {
    const code =
      err && typeof err === "object" && "code" in err
        ? String((err as { code: string }).code)
        : "";
    if (code.includes("email-already-exists")) {
      // Another Auth user already owns this email — still reset password on
      // the mapped uid so username login can work after a synthetic-email fall back.
      await auth.updateUser(uid, { password: newPassword });
      return;
    }
    throw err;
  }
}

/**
 * Point Firebase Auth at the CUHK email stored on the username/profile map.
 * Used by admins to repair accounts that can no longer sign in or reset.
 */
export async function repairAuthEmailForUid(uid: string): Promise<{
  uid: string;
  email: string;
  username?: string;
  previousAuthEmail?: string;
}> {
  const auth = getAdminAuth();
  const db = getAdminDb();
  if (!auth || !db) {
    throw new Error("Admin repair is not configured on the server.");
  }

  const trimmedUid = uid.trim();
  if (!trimmedUid) throw new Error("Missing uid");

  let email = "";
  let username: string | undefined;

  const usernamesCol = collectionName("usernames");
  const mapped = await db
    .collection(usernamesCol)
    .where("uid", "==", trimmedUid)
    .limit(5)
    .get();
  if (!mapped.empty) {
    const doc = mapped.docs[0];
    username = doc.id;
    email = String(doc.data().email ?? "")
      .trim()
      .toLowerCase();
  }

  if (!email.includes("@")) {
    const profile = await db
      .collection(collectionName("users"))
      .doc(trimmedUid)
      .get();
    if (profile.exists) {
      const data = profile.data() ?? {};
      email = String(data.email ?? data.cuhkEmail ?? "")
        .trim()
        .toLowerCase();
      if (!username && data.username) username = String(data.username);
    }
  }

  if (!email.includes("@")) {
    throw new Error("No CUHK email found on this account to repair.");
  }

  let previousAuthEmail: string | undefined;
  try {
    const existing = await auth.getUser(trimmedUid);
    previousAuthEmail = existing.email ?? undefined;
  } catch (err) {
    const code =
      err && typeof err === "object" && "code" in err
        ? String((err as { code: string }).code)
        : "";
    if (code === "auth/user-not-found") {
      throw new Error(
        "Auth user is missing for this profile. Ask them to create a new account.",
      );
    }
    throw err;
  }

  if (previousAuthEmail?.toLowerCase() !== email) {
    await auth.updateUser(trimmedUid, {
      email,
      emailVerified: true,
    });
  }

  return { uid: trimmedUid, email, username, previousAuthEmail };
}

/** Verify a browser ID token belongs to an /admins/{uid} document. */
export async function verifyAdminIdToken(
  idToken: string | null | undefined,
): Promise<{ uid: string } | null> {
  if (!idToken) return null;
  const auth = getAdminAuth();
  const db = getAdminDb();
  if (!auth || !db) return null;
  try {
    const decoded = await auth.verifyIdToken(idToken, true);
    const adminSnap = await db.collection("admins").doc(decoded.uid).get();
    if (!adminSnap.exists) return null;
    return { uid: decoded.uid };
  } catch (err) {
    console.error("verifyAdminIdToken failed", err);
    return null;
  }
}

/**
 * Permanently remove an account: Auth user, users/{uid}, and any username
 * maps pointing at that uid (and exact username doc when provided).
 */
export async function deleteUserAccount(opts: {
  uid: string;
  username?: string;
}): Promise<{
  deletedAuth: boolean;
  deletedProfile: boolean;
  deletedUsernames: string[];
}> {
  const auth = getAdminAuth();
  const db = getAdminDb();
  if (!auth || !db) {
    throw new Error("Admin delete is not configured on the server.");
  }

  const uid = opts.uid.trim();
  if (!uid) throw new Error("Missing uid");

  let deletedAuth = false;
  try {
    await auth.deleteUser(uid);
    deletedAuth = true;
  } catch (err) {
    const code =
      err && typeof err === "object" && "code" in err
        ? String((err as { code: string }).code)
        : "";
    if (code !== "auth/user-not-found") throw err;
  }

  const usersCol = collectionName("users");
  const profileRef = db.collection(usersCol).doc(uid);
  const profileSnap = await profileRef.get();
  let deletedProfile = false;
  if (profileSnap.exists) {
    await profileRef.delete();
    deletedProfile = true;
  }

  const usernamesCol = collectionName("usernames");
  const deletedUsernames: string[] = [];
  const username = opts.username?.trim().toLowerCase();
  if (username) {
    const ref = db.collection(usernamesCol).doc(username);
    const snap = await ref.get();
    if (snap.exists) {
      await ref.delete();
      deletedUsernames.push(username);
    }
  }

  // Clean any other username maps that still point at this uid.
  const mapped = await db.collection(usernamesCol).where("uid", "==", uid).get();
  for (const doc of mapped.docs) {
    if (deletedUsernames.includes(doc.id)) continue;
    await doc.ref.delete();
    deletedUsernames.push(doc.id);
  }

  return { deletedAuth, deletedProfile, deletedUsernames };
}
