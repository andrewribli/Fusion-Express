/**
 * Ops: recover a legacy guest_* Auth account so they can log in / pay.
 *
 *   npx tsx scripts/recover-guest.ts <uid> [--password 'TempPass1!'] [--username alias]
 *   npx tsx scripts/recover-guest.ts cl50sNXOTWXBk8C8eFSLPz8TBS13 --password 'PayAdam60!' --username adamschall-guest
 *
 * Prints login credentials + optional one-click /auth/session URL.
 * Do not commit passwords into the repo.
 */
import { readFileSync, existsSync } from "fs";
import { resolve } from "path";
import { createSign } from "crypto";
import { initializeApp, cert, getApps } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore, FieldValue } from "firebase-admin/firestore";

const SERVICE_ACCOUNT_CANDIDATES = [
  resolve(process.cwd(), "fusion-express-6a438-firebase-adminsdk-fbsvc-817676b923.json"),
  resolve(process.cwd(), "../fusion-express-6a438-firebase-adminsdk-fbsvc-817676b923.json"),
  resolve(process.cwd(), "../../fusion-express-6a438-firebase-adminsdk-fbsvc-817676b923.json"),
];

function loadServiceAccount() {
  for (const path of SERVICE_ACCOUNT_CANDIDATES) {
    if (existsSync(path)) {
      return JSON.parse(readFileSync(path, "utf8")) as {
        client_email: string;
        private_key: string;
        project_id: string;
      };
    }
  }
  throw new Error("Firebase admin SDK JSON not found");
}

function parseArgs(argv: string[]) {
  const uid = argv[2]?.trim();
  if (!uid) {
    console.error(
      "Usage: npx tsx scripts/recover-guest.ts <uid> [--password '..'] [--username alias] [--next /track?orderId=...]",
    );
    process.exit(1);
  }
  let password = "";
  let username = "";
  let next = "/";
  for (let i = 3; i < argv.length; i++) {
    if (argv[i] === "--password") password = argv[++i] ?? "";
    else if (argv[i] === "--username") username = argv[++i] ?? "";
    else if (argv[i] === "--next") next = argv[++i] ?? "/";
  }
  if (!password || password.length < 6) {
    const bytes = new Uint8Array(9);
    crypto.getRandomValues(bytes);
    password = `Gr!${Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("")}`;
  }
  return { uid, password, username, next };
}

function mintCustomToken(
  account: { client_email: string; private_key: string },
  uid: string,
): string {
  const now = Math.floor(Date.now() / 1000);
  const header = Buffer.from(JSON.stringify({ alg: "RS256", typ: "JWT" })).toString(
    "base64url",
  );
  const claim = Buffer.from(
    JSON.stringify({
      iss: account.client_email,
      sub: account.client_email,
      aud: "https://identitytoolkit.googleapis.com/google.identity.identitytoolkit.v1.IdentityToolkit",
      iat: now,
      exp: now + 3600,
      uid,
    }),
  ).toString("base64url");
  const signer = createSign("RSA-SHA256");
  signer.update(`${header}.${claim}`);
  return `${header}.${claim}.${signer.sign(account.private_key, "base64url")}`;
}

async function main() {
  const { uid, password, username, next } = parseArgs(process.argv);
  const sa = loadServiceAccount();
  if (!getApps().length) {
    initializeApp({ credential: cert(sa as Parameters<typeof cert>[0]) });
  }
  const auth = getAuth();
  const db = getFirestore();

  const user = await auth.getUser(uid);
  const email = (user.email ?? "").toLowerCase();
  await auth.updateUser(uid, { password, disabled: false });

  if (username) {
    await db.collection("usernames").doc(username.toLowerCase()).set(
      {
        username: username.toLowerCase(),
        email,
        uid,
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true },
    );
  }

  const customToken = mintCustomToken(sa, uid);
  const sessionPath = `/auth/session?token=${encodeURIComponent(customToken)}&next=${encodeURIComponent(next)}`;

  console.log("--- Guest recovery ---");
  console.log(`UID:      ${uid}`);
  console.log(`Email:    ${email}`);
  if (username) console.log(`Username: ${username.toLowerCase()}`);
  console.log(`Password: ${password}`);
  console.log(`Login:    https://gracerun.fit/login`);
  console.log(`Magic:    https://gracerun.fit${sessionPath}`);
  console.log("(Magic link expires in ~1 hour)");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
