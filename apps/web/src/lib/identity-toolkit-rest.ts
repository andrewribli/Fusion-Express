import "server-only";
import { createSign } from "crypto";

/**
 * Admin Auth helpers via Identity Toolkit + Firestore REST.
 * Avoids importing `firebase-admin/auth` (jwks-rsa → jose ESM crash on Vercel).
 */

type ServiceAccount = {
  client_email?: string;
  private_key?: string;
  project_id?: string;
};

function serviceAccount(): ServiceAccount | null {
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT_JSON?.trim();
  if (!raw) return null;
  try {
    return JSON.parse(raw) as ServiceAccount;
  } catch {
    return null;
  }
}

function projectId(account: ServiceAccount | null): string | null {
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

async function adminAccessToken(): Promise<{
  token: string;
  project: string;
} | null> {
  const account = serviceAccount();
  const project = projectId(account);
  if (!account || !project) return null;
  const token = await googleAccessToken(account, [
    "https://www.googleapis.com/auth/identitytoolkit",
    "https://www.googleapis.com/auth/datastore",
    "https://www.googleapis.com/auth/cloud-platform",
  ]);
  if (!token) return null;
  return { token, project };
}

/** Verify a Firebase ID token and confirm /admins/{uid} exists. */
export async function verifyAdminIdTokenRest(
  idToken: string | null | undefined,
): Promise<{ uid: string } | null> {
  if (!idToken?.trim()) return null;
  const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY?.trim();
  if (!apiKey) return null;

  try {
    const lookup = await fetch(
      `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idToken }),
      },
    );
    if (!lookup.ok) return null;
    const data = (await lookup.json()) as {
      users?: Array<{ localId?: string }>;
    };
    const uid = data.users?.[0]?.localId?.trim();
    if (!uid) return null;

    const ctx = await adminAccessToken();
    if (!ctx) return null;
    const adminDoc = await fetch(
      `https://firestore.googleapis.com/v1/projects/${ctx.project}/databases/(default)/documents/admins/${encodeURIComponent(uid)}`,
      { headers: { Authorization: `Bearer ${ctx.token}` } },
    );
    if (adminDoc.status === 404) return null;
    if (!adminDoc.ok) {
      console.error("admins doc lookup failed", adminDoc.status);
      return null;
    }
    return { uid };
  } catch (err) {
    console.error("verifyAdminIdTokenRest failed", err);
    return null;
  }
}

function firestoreString(fields: Record<string, unknown> | undefined, key: string): string {
  const v = fields?.[key] as { stringValue?: string } | undefined;
  return String(v?.stringValue ?? "").trim();
}

async function readUserProfileEmail(
  project: string,
  token: string,
  uid: string,
): Promise<{ email: string; username?: string }> {
  const res = await fetch(
    `https://firestore.googleapis.com/v1/projects/${project}/databases/(default)/documents/users/${encodeURIComponent(uid)}`,
    { headers: { Authorization: `Bearer ${token}` } },
  );
  if (!res.ok) return { email: "" };
  const data = (await res.json()) as {
    fields?: Record<string, unknown>;
  };
  const email = firestoreString(data.fields, "email").toLowerCase()
    || firestoreString(data.fields, "cuhkEmail").toLowerCase();
  const username = firestoreString(data.fields, "username") || undefined;
  return { email, username };
}

async function readUsernameMapEmail(
  project: string,
  token: string,
  uid: string,
): Promise<{ email: string; username?: string }> {
  // RunQuery: usernames where uid == uid limit 1
  const res = await fetch(
    `https://firestore.googleapis.com/v1/projects/${project}/databases/(default)/documents:runQuery`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        structuredQuery: {
          from: [{ collectionId: "usernames" }],
          where: {
            fieldFilter: {
              field: { fieldPath: "uid" },
              op: "EQUAL",
              value: { stringValue: uid },
            },
          },
          limit: 1,
        },
      }),
    },
  );
  if (!res.ok) return { email: "" };
  const rows = (await res.json()) as Array<{
    document?: { name?: string; fields?: Record<string, unknown> };
  }>;
  const doc = rows.find((r) => r.document)?.document;
  if (!doc) return { email: "" };
  const username = doc.name?.split("/").pop();
  const email = firestoreString(doc.fields, "email").toLowerCase();
  return { email, username };
}

async function lookupAuthUser(
  project: string,
  token: string,
  uid: string,
): Promise<{ email?: string } | null> {
  const res = await fetch(
    `https://identitytoolkit.googleapis.com/v1/projects/${project}/accounts:lookup`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ localId: [uid] }),
    },
  );
  if (res.status === 200) {
    const data = (await res.json()) as {
      users?: Array<{ email?: string }>;
    };
    const user = data.users?.[0];
    return user ? { email: user.email } : null;
  }
  if (res.status === 404) return null;
  const text = await res.text();
  throw new Error(`Auth lookup failed (${res.status}): ${text.slice(0, 200)}`);
}

/**
 * Point Firebase Auth at the CUHK email on the username/profile map.
 */
export async function repairAuthEmailForUidRest(uid: string): Promise<{
  uid: string;
  email: string;
  username?: string;
  previousAuthEmail?: string;
}> {
  const ctx = await adminAccessToken();
  if (!ctx) {
    throw new Error("Admin repair is not configured on the server.");
  }

  const trimmedUid = uid.trim();
  if (!trimmedUid) throw new Error("Missing uid");

  let { email, username } = await readUsernameMapEmail(
    ctx.project,
    ctx.token,
    trimmedUid,
  );
  if (!email.includes("@")) {
    const profile = await readUserProfileEmail(ctx.project, ctx.token, trimmedUid);
    email = profile.email;
    if (!username) username = profile.username;
  }

  if (!email.includes("@")) {
    throw new Error("No CUHK email found on this account to repair.");
  }

  const existing = await lookupAuthUser(ctx.project, ctx.token, trimmedUid);
  if (!existing) {
    throw new Error(
      "Auth user is missing for this profile. Ask them to create a new account.",
    );
  }
  const previousAuthEmail = existing.email;

  if (previousAuthEmail?.toLowerCase() !== email) {
    const update = await fetch(
      `https://identitytoolkit.googleapis.com/v1/projects/${ctx.project}/accounts:update`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${ctx.token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          localId: trimmedUid,
          email,
          emailVerified: true,
        }),
      },
    );
    if (!update.ok) {
      const text = await update.text();
      if (text.includes("EMAIL_EXISTS") || text.includes("email-already-exists")) {
        throw new Error(
          `Cannot repair: ${email} is already used by another Auth account.`,
        );
      }
      throw new Error(`Auth update failed (${update.status}): ${text.slice(0, 200)}`);
    }
  }

  return { uid: trimmedUid, email, username, previousAuthEmail };
}
