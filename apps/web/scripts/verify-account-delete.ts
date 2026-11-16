/**
 * Creates a throwaway Auth user + profile, deletes them through the same
 * REST helper the API route uses, then confirms both are gone.
 *
 * Usage (from apps/web):
 *   npx tsx scripts/verify-account-delete.ts
 */
import { readFileSync } from "fs";
import { resolve } from "path";
import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";
import { deleteOwnAccountRest } from "../src/lib/account-delete-rest";

function loadEnvFile(path: string) {
  const text = readFileSync(path, "utf8");
  for (const line of text.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq < 1) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (!process.env[key]) process.env[key] = value;
  }
}

loadEnvFile(resolve(process.cwd(), ".env.local"));

const saPath = resolve(process.cwd(), "../../firebase-service-account.json");
const serviceAccount = JSON.parse(readFileSync(saPath, "utf8"));
process.env.FIREBASE_SERVICE_ACCOUNT_JSON = JSON.stringify(serviceAccount);

if (!getApps().length) {
  initializeApp({ credential: cert(serviceAccount) });
}

const email = `delete-test-${Date.now()}@link.cuhk.edu.hk`;
const password = `Del${Date.now()}Aa1`;

async function main() {
  const user = await getAuth().createUser({
    email,
    password,
    emailVerified: true,
  });
  await getFirestore().collection("users").doc(user.uid).set({
    email,
    username: email.split("@")[0],
    isRunner: false,
    createdAt: new Date(),
  });
  await getFirestore().collection("usernames").doc(email.split("@")[0]).set({
    uid: user.uid,
    email,
  });
  console.log("created", user.uid, email);

  const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
  const signIn = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password, returnSecureToken: true }),
    },
  );
  if (!signIn.ok) {
    throw new Error(`sign-in failed ${signIn.status} ${(await signIn.text()).slice(0, 200)}`);
  }
  const { idToken, localId } = (await signIn.json()) as {
    idToken: string;
    localId: string;
  };
  if (localId !== user.uid) throw new Error("token uid mismatch");

  const live = process.argv.includes("--live");
  if (live) {
    const res = await fetch("https://www.gracerun.fit/api/account/delete", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${idToken}`,
        "Content-Type": "application/json",
      },
    });
    const text = await res.text();
    console.log("live status", res.status, text.slice(0, 400));
    if (!res.ok) throw new Error("live delete failed");
  } else {
    const result = await deleteOwnAccountRest(user.uid);
    console.log("delete result", result);
  }

  let authGone = false;
  try {
    await getAuth().getUser(user.uid);
  } catch (err) {
    authGone = (err as { code?: string }).code === "auth/user-not-found";
  }
  const profile = await getFirestore().collection("users").doc(user.uid).get();
  const username = await getFirestore()
    .collection("usernames")
    .doc(email.split("@")[0])
    .get();
  console.log("authGone", authGone, "profileExists", profile.exists, "usernameExists", username.exists);
  if (!authGone || profile.exists || username.exists) {
    process.exitCode = 1;
  }
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
