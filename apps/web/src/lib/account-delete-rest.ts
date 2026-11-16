import { createSign } from "crypto";

/**
 * Delete a Firebase Auth user and their profile without firebase-admin/auth.
 * That SDK's jose import crashes this route on Vercel, which the app shows
 * as "Could not delete account."
 */

type ServiceAccount = {
  client_email?: string;
  private_key?: string;
  project_id?: string;
};

export type DeleteAccountResult = {
  deletedAuth: boolean;
  deletedProfile: boolean;
  deletedUsernames: string[];
  deletedRunners: string[];
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

function collectionId(base: string): string {
  const env = (process.env.NEXT_PUBLIC_APP_ENV ?? "").trim().toLowerCase();
  return env === "staging" || env === "test" ? `${base}_test` : base;
}

async function googleAccessToken(account: ServiceAccount): Promise<string | null> {
  if (!account.client_email || !account.private_key) return null;
  const now = Math.floor(Date.now() / 1000);
  const header = Buffer.from(
    JSON.stringify({ alg: "RS256", typ: "JWT" }),
  ).toString("base64url");
  const claim = Buffer.from(
    JSON.stringify({
      iss: account.client_email,
      scope: [
        "https://www.googleapis.com/auth/identitytoolkit",
        "https://www.googleapis.com/auth/datastore",
      ].join(" "),
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
    throw new Error(
      `Could not authorize account deletion (${res.status}).`,
    );
  }
  const data = (await res.json()) as { access_token?: string };
  return data.access_token ?? null;
}

async function lookupUid(
  idToken: string,
): Promise<{ uid: string; email: string | null }> {
  const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY?.trim();
  if (!apiKey) throw new Error("Account deletion is not configured.");
  const res = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ idToken }),
    },
  );
  if (!res.ok) throw new Error("Invalid or expired auth token.");
  const data = (await res.json()) as {
    users?: { localId?: string; email?: string }[];
  };
  const user = data.users?.[0];
  const uid = user?.localId?.trim();
  if (!uid) throw new Error("Invalid or expired auth token.");
  return { uid, email: user?.email?.trim().toLowerCase() || null };
}

async function deleteDoc(
  project: string,
  token: string,
  path: string,
): Promise<boolean> {
  const res = await fetch(
    `https://firestore.googleapis.com/v1/projects/${project}/databases/(default)/documents/${path}`,
    { method: "DELETE", headers: { Authorization: `Bearer ${token}` } },
  );
  if (res.status === 404 || res.status === 200) return res.status === 200;
  const text = await res.text();
  throw new Error(`Could not delete ${path} (${res.status}): ${text.slice(0, 180)}`);
}

async function queryIds(
  project: string,
  token: string,
  collection: string,
  uid: string,
): Promise<string[]> {
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
          from: [{ collectionId: collection }],
          where: {
            fieldFilter: {
              field: { fieldPath: "uid" },
              op: "EQUAL",
              value: { stringValue: uid },
            },
          },
          limit: 20,
        },
      }),
    },
  );
  if (!res.ok) return [];
  const rows = (await res.json()) as Array<{ document?: { name?: string } }>;
  return rows
    .map((row) => row.document?.name?.split("/").pop())
    .filter((id): id is string => Boolean(id));
}

export async function verifyBearerUid(request: Request): Promise<{
  uid: string;
  email: string | null;
}> {
  const header = request.headers.get("authorization") ?? "";
  const match = /^Bearer\s+(.+)$/i.exec(header.trim());
  if (!match?.[1]) throw new Error("Missing Authorization bearer token.");
  return lookupUid(match[1]);
}

export async function deleteOwnAccountRest(uid: string): Promise<DeleteAccountResult> {
  const account = serviceAccount();
  const project = projectId(account);
  if (!account || !project) {
    throw new Error("Account deletion is not configured on the server.");
  }
  const token = await googleAccessToken(account);
  if (!token) throw new Error("Account deletion is not configured on the server.");

  const trimmed = uid.trim();
  if (!trimmed) throw new Error("Missing uid");

  const deletedProfile = await deleteDoc(
    project,
    token,
    `${collectionId("users")}/${encodeURIComponent(trimmed)}`,
  );

  const deletedUsernames: string[] = [];
  for (const id of await queryIds(project, token, collectionId("usernames"), trimmed)) {
    await deleteDoc(
      project,
      token,
      `${collectionId("usernames")}/${encodeURIComponent(id)}`,
    );
    deletedUsernames.push(id);
  }

  const deletedRunners: string[] = [];
  for (const id of await queryIds(project, token, collectionId("runners"), trimmed)) {
    await deleteDoc(
      project,
      token,
      `${collectionId("runners")}/${encodeURIComponent(id)}`,
    );
    deletedRunners.push(id);
  }

  let deletedAuth = false;
  const authRes = await fetch(
    `https://identitytoolkit.googleapis.com/v1/projects/${project}/accounts:delete`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ localId: trimmed }),
    },
  );
  if (authRes.ok) {
    deletedAuth = true;
  } else {
    const text = await authRes.text();
    if (!text.includes("USER_NOT_FOUND")) {
      throw new Error(`Could not delete login (${authRes.status}): ${text.slice(0, 180)}`);
    }
  }

  return { deletedAuth, deletedProfile, deletedUsernames, deletedRunners };
}
