import { readFileSync } from "fs";
import { resolve } from "path";
import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";
import { DEMO_CUSTOMER_EMAIL } from "../packages/shared/src/demo-account";

export const DEMO_EMAIL = DEMO_CUSTOMER_EMAIL;
export const DEMO_PASSWORD = "Kx9#mR2v!pL7qW4n";
export const DEMO_FULL_NAME = "Demo Student";
export const DEMO_STUDENT_ID = "1155000099";
export const DEMO_CAMPUS = "cuhk" as const;

const candidates = [
  process.env.FIREBASE_SERVICE_ACCOUNT_PATH,
  "./firebase-service-account.json",
  "./apps/web/firebase-service-account.json",
].filter(Boolean) as string[];

function loadServiceAccount(): object {
  const envJson = process.env.FIREBASE_SERVICE_ACCOUNT_JSON?.trim();
  if (envJson) return JSON.parse(envJson) as object;
  for (const rel of candidates) {
    try {
      return JSON.parse(readFileSync(resolve(process.cwd(), rel), "utf8"));
    } catch {
      // try next
    }
  }
  throw new Error(
    "No firebase service account JSON found. Set FIREBASE_SERVICE_ACCOUNT_JSON or FIREBASE_SERVICE_ACCOUNT_PATH.",
  );
}

export function getDemoAdmin() {
  if (!getApps().length) {
    initializeApp({ credential: cert(loadServiceAccount() as never) });
  }
  return { auth: getAuth(), db: getFirestore() };
}

export async function getDemoUser() {
  const { auth, db } = getDemoAdmin();
  const user = await auth.getUserByEmail(DEMO_EMAIL);
  return { auth, db, uid: user.uid, user };
}
