import "server-only";
import { createSign } from "crypto";
import { collectionName } from "@/lib/constants";

/**
 * Identity Toolkit + Firestore REST helpers for payment routes.
 * Deliberately avoids importing firebase-admin (jwks-rsa → jose ESM crash on Vercel).
 */

type ServiceAccount = {
  client_email?: string;
  private_key?: string;
  project_id?: string;
};

export class RestAuthError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = "RestAuthError";
    this.status = status;
  }
}

export type RestAuthed = {
  uid: string;
  email: string | null;
  idToken: string;
};

type FirestoreValue =
  | { stringValue: string }
  | { booleanValue: boolean }
  | { integerValue: string }
  | { doubleValue: number }
  | { timestampValue: string }
  | { nullValue: null }
  | { arrayValue: { values?: FirestoreValue[] } }
  | { mapValue: { fields?: Record<string, FirestoreValue> } };

function serviceAccount(): ServiceAccount | null {
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT_JSON?.trim();
  if (!raw) return null;
  try {
    return JSON.parse(raw) as ServiceAccount;
  } catch {
    return null;
  }
}

function projectIdOf(account: ServiceAccount | null): string | null {
  return (
    account?.project_id?.trim() ||
    process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID?.trim() ||
    null
  );
}

async function googleAccessToken(
  account: ServiceAccount,
  scopes: string[],
): Promise<string | null> {
  if (!account.client_email || !account.private_key) return null;
  const now = Math.floor(Date.now() / 1000);
  const header = Buffer.from(JSON.stringify({ alg: "RS256", typ: "JWT" })).toString(
    "base64url",
  );
  const claim = Buffer.from(
    JSON.stringify({
      iss: account.client_email,
      scope: scopes.join(" "),
      aud: "https://oauth2.googleapis.com/token",
      iat: now,
      exp: now + 3600,
    }),
  ).toString("base64url");
  const signer = createSign("RSA-SHA256");
  signer.update(`${header}.${claim}`);
  const jwt = `${header}.${claim}.${signer.sign(account.private_key, "base64url")}`;
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${jwt}`,
  });
  if (!res.ok) {
    console.error("google access token failed", res.status, await res.text());
    return null;
  }
  const data = (await res.json()) as { access_token?: string };
  return data.access_token ?? null;
}

export async function adminAccessToken(): Promise<{
  token: string;
  project: string;
} | null> {
  const account = serviceAccount();
  const project = projectIdOf(account);
  if (!account || !project) return null;
  const token = await googleAccessToken(account, [
    "https://www.googleapis.com/auth/datastore",
    "https://www.googleapis.com/auth/cloud-platform",
  ]);
  if (!token) return null;
  return { token, project };
}

function documentsUrl(project: string): string {
  return `https://firestore.googleapis.com/v1/projects/${project}/databases/(default)/documents`;
}

function decodeValue(value: FirestoreValue | undefined): unknown {
  if (!value) return undefined;
  if ("stringValue" in value) return value.stringValue;
  if ("booleanValue" in value) return value.booleanValue;
  if ("integerValue" in value) return Number(value.integerValue);
  if ("doubleValue" in value) return value.doubleValue;
  if ("timestampValue" in value) return new Date(value.timestampValue);
  if ("nullValue" in value) return null;
  if ("arrayValue" in value) {
    return (value.arrayValue.values ?? []).map((v) => decodeValue(v));
  }
  if ("mapValue" in value) {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value.mapValue.fields ?? {})) {
      out[k] = decodeValue(v);
    }
    return out;
  }
  return undefined;
}

function decodeFields(
  fields: Record<string, FirestoreValue> | undefined,
): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(fields ?? {})) {
    out[k] = decodeValue(v);
  }
  return out;
}

function encodeValue(value: unknown): FirestoreValue {
  if (value === null || value === undefined) return { nullValue: null };
  if (typeof value === "string") return { stringValue: value };
  if (typeof value === "boolean") return { booleanValue: value };
  if (typeof value === "number") {
    return Number.isInteger(value)
      ? { integerValue: String(value) }
      : { doubleValue: value };
  }
  if (value instanceof Date) return { timestampValue: value.toISOString() };
  if (Array.isArray(value)) {
    return { arrayValue: { values: value.map((v) => encodeValue(v)) } };
  }
  if (typeof value === "object") {
    const fields: Record<string, FirestoreValue> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      if (v === undefined) continue;
      fields[k] = encodeValue(v);
    }
    return { mapValue: { fields } };
  }
  return { stringValue: String(value) };
}

/** Verify Firebase ID token via Identity Toolkit (no Admin Auth SDK). */
export async function requireAuthRest(request: Request): Promise<RestAuthed> {
  const header = request.headers.get("authorization") ?? "";
  const match = /^Bearer\s+(.+)$/i.exec(header.trim());
  if (!match) {
    throw new RestAuthError("Missing Authorization bearer token.", 401);
  }
  const idToken = match[1]!;
  const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY?.trim();
  if (!apiKey) {
    throw new RestAuthError("Auth is not configured.", 503);
  }

  const res = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ idToken }),
    },
  );
  if (!res.ok) {
    throw new RestAuthError("Invalid or expired auth token.", 401);
  }
  const data = (await res.json()) as {
    users?: { localId?: string; email?: string }[];
  };
  const user = data.users?.[0];
  const uid = user?.localId?.trim();
  if (!uid) {
    throw new RestAuthError("Invalid or expired auth token.", 401);
  }
  return {
    uid,
    email: user?.email?.trim().toLowerCase() || null,
    idToken,
  };
}

export async function getOrderRest(
  orderId: string,
): Promise<Record<string, unknown> | null> {
  const ctx = await adminAccessToken();
  if (!ctx) throw new Error("Firestore unavailable (missing service account).");
  const col = collectionName("orders");
  const res = await fetch(
    `${documentsUrl(ctx.project)}/${col}/${encodeURIComponent(orderId)}`,
    { headers: { Authorization: `Bearer ${ctx.token}` } },
  );
  if (res.status === 404) return null;
  if (!res.ok) {
    const text = await res.text();
    console.error("getOrderRest failed", res.status, text.slice(0, 400));
    throw new Error("Could not load order.");
  }
  const data = (await res.json()) as {
    fields?: Record<string, FirestoreValue>;
  };
  return decodeFields(data.fields);
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

export function orderEmailFieldsFromData(
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

export async function fetchOrderForEmailRest(
  orderId: string,
): Promise<OrderEmailFields | null> {
  const safeId = orderId.trim();
  if (!safeId || safeId.length > 128) return null;
  const data = await getOrderRest(safeId);
  if (!data) return null;
  return orderEmailFieldsFromData(safeId, data);
}

export async function isAdminUidRest(uid: string): Promise<boolean> {
  const ctx = await adminAccessToken();
  if (!ctx) return false;
  const res = await fetch(
    `${documentsUrl(ctx.project)}/admins/${encodeURIComponent(uid)}`,
    { headers: { Authorization: `Bearer ${ctx.token}` } },
  );
  if (res.status === 404 || res.status === 403) return false;
  if (!res.ok) {
    const text = await res.text();
    console.error("isAdminUidRest failed", res.status, text.slice(0, 400));
    throw new RestAuthError("Could not verify admin access.", 502);
  }
  return true;
}

export async function patchOrderRest(
  orderId: string,
  updates: Record<string, unknown>,
): Promise<void> {
  const ctx = await adminAccessToken();
  if (!ctx) throw new Error("Firestore unavailable (missing service account).");
  const col = collectionName("orders");
  const fieldPaths = Object.keys(updates).filter((k) => updates[k] !== undefined);
  if (fieldPaths.length === 0) return;

  const fields: Record<string, FirestoreValue> = {};
  for (const key of fieldPaths) {
    fields[key] = encodeValue(updates[key]);
  }

  const url = new URL(
    `${documentsUrl(ctx.project)}/${col}/${encodeURIComponent(orderId)}`,
  );
  for (const path of fieldPaths) {
    url.searchParams.append("updateMask.fieldPaths", path);
  }

  const res = await fetch(url, {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${ctx.token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ fields }),
  });
  if (!res.ok) {
    const text = await res.text();
    console.error("patchOrderRest failed", res.status, text.slice(0, 400));
    throw new Error("Could not update order.");
  }
}

export type BroadcastGroup =
  | "everyone"
  | "new_users"
  | "runners"
  | "long_term";

export type BroadcastRecipient = {
  email: string;
  name: string;
  isRunner: boolean;
  createdAt: Date | null;
};

/** Verify the caller and that `/admins/{uid}` exists. No Admin SDK. */
export async function requireAdminRest(request: Request): Promise<RestAuthed> {
  const auth = await requireAuthRest(request);
  const ctx = await adminAccessToken();
  if (!ctx) {
    throw new RestAuthError("Could not verify admin access.", 503);
  }
  const res = await fetch(
    `${documentsUrl(ctx.project)}/admins/${encodeURIComponent(auth.uid)}`,
    { headers: { Authorization: `Bearer ${ctx.token}` } },
  );
  if (res.status === 404) {
    throw new RestAuthError("Admin access only.", 403);
  }
  if (!res.ok) {
    const text = await res.text();
    console.error("requireAdminRest failed", res.status, text.slice(0, 400));
    throw new RestAuthError("Could not verify admin access.", 502);
  }
  return auth;
}

export async function listBroadcastRecipientsRest(): Promise<
  BroadcastRecipient[]
> {
  const ctx = await adminAccessToken();
  if (!ctx) {
    throw new RestAuthError("Could not load users from Firestore.", 503);
  }
  const col = collectionName("users");
  const out: BroadcastRecipient[] = [];
  const seen = new Set<string>();
  let pageToken = "";

  for (let i = 0; i < 40; i++) {
    const url = new URL(`${documentsUrl(ctx.project)}/${col}`);
    url.searchParams.set("pageSize", "300");
    if (pageToken) url.searchParams.set("pageToken", pageToken);
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${ctx.token}` },
    });
    if (!res.ok) {
      const text = await res.text();
      console.error(
        "listBroadcastRecipientsRest failed",
        res.status,
        text.slice(0, 400),
      );
      throw new RestAuthError("Could not load users from Firestore.", 502);
    }
    const data = (await res.json()) as {
      documents?: { fields?: Record<string, FirestoreValue> }[];
      nextPageToken?: string;
    };
    for (const doc of data.documents ?? []) {
      const fields = decodeFields(doc.fields);
      const email = String(fields.email ?? fields.cuhkEmail ?? "")
        .trim()
        .toLowerCase();
      if (!email.includes("@") || seen.has(email)) continue;
      seen.add(email);
      const created = fields.createdAt;
      out.push({
        email,
        name: String(fields.fullName ?? fields.name ?? "").trim(),
        isRunner: Boolean(fields.isRunner) || Boolean(fields.runnerId),
        createdAt: created instanceof Date ? created : null,
      });
    }
    if (!data.nextPageToken) break;
    pageToken = data.nextPageToken;
  }

  return out;
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

export async function listUserAlertRecipientsRest(): Promise<
  { email: string; isRunner: boolean }[]
> {
  const ctx = await adminAccessToken();
  if (!ctx) return [];
  const col = collectionName("users");
  const out: { email: string; isRunner: boolean }[] = [];
  const seen = new Set<string>();
  let pageToken = "";

  for (let i = 0; i < 40; i++) {
    const url = new URL(`${documentsUrl(ctx.project)}/${col}`);
    url.searchParams.set("pageSize", "300");
    if (pageToken) url.searchParams.set("pageToken", pageToken);
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${ctx.token}` },
    });
    if (!res.ok) {
      console.error(
        "listUserAlertRecipientsRest failed",
        res.status,
        (await res.text()).slice(0, 400),
      );
      break;
    }
    const data = (await res.json()) as {
      documents?: { fields?: Record<string, FirestoreValue> }[];
      nextPageToken?: string;
    };
    for (const doc of data.documents ?? []) {
      const fields = decodeFields(doc.fields);
      const email = String(fields.email ?? fields.cuhkEmail ?? "")
        .trim()
        .toLowerCase();
      if (!email.includes("@") || seen.has(email)) continue;
      seen.add(email);
      out.push({
        email,
        isRunner: Boolean(fields.isRunner) || Boolean(fields.runnerId),
      });
    }
    if (!data.nextPageToken) break;
    pageToken = data.nextPageToken;
  }

  return out;
}
