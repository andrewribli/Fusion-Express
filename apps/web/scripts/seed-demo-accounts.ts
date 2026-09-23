/**
 * Seeds Firebase Auth + Firestore profiles for CityU demo accounts on gracerun.fit.
 *
 * Usage (from apps/web):
 *   npx tsx scripts/seed-demo-accounts.ts
 *
 * Or from repo root with service account at ./firebase-service-account.json.
 */

import { readFileSync } from "fs";
import { resolve } from "path";
import { initializeApp, cert, getApps } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import {
  DEMO_CITYU_CUSTOMER,
  DEMO_CITYU_RUNNER,
} from "../src/config/demo";

const candidates = [
  process.env.FIREBASE_SERVICE_ACCOUNT_PATH,
  "./firebase-service-account.json",
  "../firebase-service-account.json",
  "../../firebase-service-account.json",
  "../fusion-express-6a438-firebase-adminsdk-fbsvc-817676b923.json",
  "../../fusion-express-6a438-firebase-adminsdk-fbsvc-817676b923.json",
].filter(Boolean) as string[];

function loadServiceAccount(): object {
  for (const rel of candidates) {
    try {
      const absolutePath = resolve(process.cwd(), rel);
      return JSON.parse(readFileSync(absolutePath, "utf8"));
    } catch {
      // try next
    }
  }
  throw new Error(
    "No firebase service account JSON found. Set FIREBASE_SERVICE_ACCOUNT_PATH.",
  );
}

if (!getApps().length) {
  initializeApp({ credential: cert(loadServiceAccount() as never) });
}

const auth = getAuth();
const db = getFirestore();

async function ensureAuthUser(opts: {
  email: string;
  password: string;
  displayName: string;
}): Promise<string> {
  const email = opts.email.trim().toLowerCase();
  try {
    const existing = await auth.getUserByEmail(email);
    await auth.updateUser(existing.uid, {
      password: opts.password,
      displayName: opts.displayName,
      emailVerified: true,
      disabled: false,
    });
    console.log(`  auth updated ${email} (${existing.uid})`);
    return existing.uid;
  } catch (err) {
    const code =
      err && typeof err === "object" && "code" in err
        ? String((err as { code: string }).code)
        : "";
    if (code !== "auth/user-not-found") throw err;
  }

  const created = await auth.createUser({
    email,
    password: opts.password,
    displayName: opts.displayName,
    emailVerified: true,
  });
  console.log(`  auth created ${email} (${created.uid})`);
  return created.uid;
}

async function seed() {
  console.log("Seeding CityU demo accounts on GraceRun Firebase…");

  const customerUid = await ensureAuthUser({
    email: DEMO_CITYU_CUSTOMER.email,
    password: DEMO_CITYU_CUSTOMER.password,
    displayName: DEMO_CITYU_CUSTOMER.name,
  });
  await db
    .collection("users")
    .doc(customerUid)
    .set(
      {
        uid: customerUid,
        email: DEMO_CITYU_CUSTOMER.email,
        fullName: DEMO_CITYU_CUSTOMER.name,
        campus: DEMO_CITYU_CUSTOMER.campus,
        isGuest: false,
        isRunner: false,
        role: "customer",
        cuhkEmail: DEMO_CITYU_CUSTOMER.email,
        cuhkVerifiedAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
        createdAt: FieldValue.serverTimestamp(),
      },
      { merge: true },
    );
  console.log(`  users/${customerUid} (customer)`);

  const runnerUid = await ensureAuthUser({
    email: DEMO_CITYU_RUNNER.email,
    password: DEMO_CITYU_RUNNER.password,
    displayName: DEMO_CITYU_RUNNER.name,
  });

  const runnersSnap = await db
    .collection("runners")
    .where("uid", "==", runnerUid)
    .limit(1)
    .get();

  let runnerId: string;
  if (!runnersSnap.empty) {
    runnerId = runnersSnap.docs[0].id;
    await runnersSnap.docs[0].ref.set(
      {
        fullName: DEMO_CITYU_RUNNER.name,
        phone: DEMO_CITYU_RUNNER.phone,
        college: DEMO_CITYU_RUNNER.college,
        hall: "Ma On Shan Student Residence",
        paymentMethod: "FPS",
        paymentId: "51234567",
        active: true,
        campus: DEMO_CITYU_RUNNER.campus,
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true },
    );
    console.log(`  runners/${runnerId} updated`);
  } else {
    const ref = await db.collection("runners").add({
      uid: runnerUid,
      fullName: DEMO_CITYU_RUNNER.name,
      studentId: "demo-cityu-runner",
      phone: DEMO_CITYU_RUNNER.phone,
      college: DEMO_CITYU_RUNNER.college,
      hall: "Ma On Shan Student Residence",
      paymentMethod: "FPS",
      paymentId: "51234567",
      termsAcceptedAt: FieldValue.serverTimestamp(),
      active: true,
      totalEarned: 0,
      pendingPayout: 0,
      payoutHistory: [],
      campus: DEMO_CITYU_RUNNER.campus,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });
    runnerId = ref.id;
    console.log(`  runners/${runnerId} created`);
  }

  await db
    .collection("users")
    .doc(runnerUid)
    .set(
      {
        uid: runnerUid,
        email: DEMO_CITYU_RUNNER.email,
        fullName: DEMO_CITYU_RUNNER.name,
        phone: DEMO_CITYU_RUNNER.phone,
        campus: DEMO_CITYU_RUNNER.campus,
        college: DEMO_CITYU_RUNNER.college,
        isGuest: false,
        isRunner: true,
        role: "runner",
        runnerId,
        runnerPaymentMethod: "FPS",
        runnerPaymentId: "51234567",
        cuhkEmail: DEMO_CITYU_RUNNER.email,
        cuhkVerifiedAt: FieldValue.serverTimestamp(),
        termsAcceptedAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
        createdAt: FieldValue.serverTimestamp(),
      },
      { merge: true },
    );
  console.log(`  users/${runnerUid} (runner)`);

  console.log("Done.");
  console.log(`  Customer: ${DEMO_CITYU_CUSTOMER.email} / ${DEMO_CITYU_CUSTOMER.password}`);
  console.log(`  Runner:   ${DEMO_CITYU_RUNNER.email} / ${DEMO_CITYU_RUNNER.password}`);
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
