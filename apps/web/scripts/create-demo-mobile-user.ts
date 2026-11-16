/**
 * Create a CUHK demo login for the mobile app (two-device demos).
 *
 *   npx tsx scripts/create-demo-mobile-user.ts
 */
import { readFileSync, existsSync } from "fs";
import { resolve } from "path";
import { initializeApp, cert, getApps } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore, FieldValue } from "firebase-admin/firestore";

const EMAIL = "1155000099@link.cuhk.edu.hk";
const PASSWORD = "demo1234";
const FULL_NAME = "Demo Mobile Customer";

const SERVICE_ACCOUNT_CANDIDATES = [
  resolve(process.cwd(), "fusion-express-6a438-firebase-adminsdk-fbsvc-817676b923.json"),
  resolve(process.cwd(), "../fusion-express-6a438-firebase-adminsdk-fbsvc-817676b923.json"),
  resolve(process.cwd(), "../../fusion-express-6a438-firebase-adminsdk-fbsvc-817676b923.json"),
];

function loadServiceAccount() {
  for (const path of SERVICE_ACCOUNT_CANDIDATES) {
    if (existsSync(path)) {
      return JSON.parse(readFileSync(path, "utf8")) as Record<string, string>;
    }
  }
  throw new Error("Firebase admin SDK JSON not found");
}

async function main() {
  if (!getApps().length) {
    initializeApp({ credential: cert(loadServiceAccount()) });
  }
  const auth = getAuth();
  const db = getFirestore();

  let user;
  try {
    user = await auth.getUserByEmail(EMAIL);
    await auth.updateUser(user.uid, {
      password: PASSWORD,
      displayName: FULL_NAME,
      emailVerified: true,
      disabled: false,
    });
    console.log(`Updated existing Auth user ${user.uid}`);
  } catch {
    user = await auth.createUser({
      email: EMAIL,
      password: PASSWORD,
      displayName: FULL_NAME,
      emailVerified: true,
      disabled: false,
    });
    console.log(`Created Auth user ${user.uid}`);
  }

  await db.collection("users").doc(user.uid).set(
    {
      uid: user.uid,
      email: EMAIL,
      cuhkEmail: EMAIL,
      fullName: FULL_NAME,
      displayName: FULL_NAME,
      studentId: "1155000099",
      campus: "cuhk",
      college: "United College",
      hall: "Adam Schall Residence",
      role: "customer",
      isRunner: false,
      isGuest: false,
      isAnonymous: false,
      updatedAt: FieldValue.serverTimestamp(),
      createdAt: FieldValue.serverTimestamp(),
    },
    { merge: true },
  );

  console.log("Firestore profile ready.");
  console.log("");
  console.log("Mobile demo login");
  console.log(`  Email:    ${EMAIL}`);
  console.log(`  Password: ${PASSWORD}`);
  console.log(`  Role:     customer (pair with 1155233599 as runner)`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
