/**
 * Create / refresh the Andrew Demo login (admin).
 *
 *   npx tsx scripts/seed-andrew-demo.ts
 *
 * Password: set ANDREW_DEMO_PASSWORD, or reuse DEMO_PASSWORD from demo-account-shared.
 * Do not commit passwords or the service account JSON.
 */
import { FieldValue } from "firebase-admin/firestore";
import { ANDREW_DEMO_EMAIL } from "../packages/shared/src/demo-account";
import {
  DEMO_CAMPUS,
  DEMO_PASSWORD,
  getDemoAdmin,
} from "./demo-account-shared";

const EMAIL = ANDREW_DEMO_EMAIL;
const FULL_NAME = "Andrew Demo";
const STUDENT_ID = "1155000100";
const PASSWORD = process.env.ANDREW_DEMO_PASSWORD?.trim() || DEMO_PASSWORD;

async function main() {
  const { auth, db } = getDemoAdmin();
  let uid: string;
  try {
    const existing = await auth.getUserByEmail(EMAIL);
    uid = existing.uid;
    await auth.updateUser(uid, {
      password: PASSWORD,
      displayName: FULL_NAME,
      emailVerified: true,
      disabled: false,
    });
    console.log(`Auth updated ${EMAIL} (${uid})`);
  } catch (err) {
    const code =
      err && typeof err === "object" && "code" in err
        ? String((err as { code: string }).code)
        : "";
    if (code !== "auth/user-not-found") throw err;
    const created = await auth.createUser({
      email: EMAIL,
      password: PASSWORD,
      displayName: FULL_NAME,
      emailVerified: true,
    });
    uid = created.uid;
    console.log(`Auth created ${EMAIL} (${uid})`);
  }

  const adminRef = db.collection("admins").doc(uid);
  await adminRef.set(
    {
      email: EMAIL,
      note: "Andrew Demo — admin demo login",
      grantedBy: "seed-andrew-demo",
      grantedAt: new Date().toISOString(),
    },
    { merge: true },
  );
  console.log(`admins/${uid} written`);

  const ref = db.collection("users").doc(uid);
  const existingDoc = await ref.get();
  await ref.set(
    {
      uid,
      email: EMAIL,
      fullName: FULL_NAME,
      displayName: FULL_NAME,
      campus: DEMO_CAMPUS,
      role: "customer",
      isRunner: false,
      isGuest: false,
      isAnonymous: false,
      studentId: STUDENT_ID,
      updatedAt: FieldValue.serverTimestamp(),
      ...(existingDoc.exists ? {} : { createdAt: FieldValue.serverTimestamp() }),
    },
    { merge: true },
  );

  const userDoc = await ref.get();
  const adminDoc = await adminRef.get();
  const data = userDoc.data() ?? {};
  console.log("Firestore users/" + uid, {
    email: data.email,
    fullName: data.fullName,
    displayName: data.displayName,
    campus: data.campus,
    role: data.role,
    isRunner: data.isRunner,
    studentId: data.studentId,
    isAnonymous: data.isAnonymous,
    hasIsDemoField: Object.prototype.hasOwnProperty.call(data, "isDemo"),
  });
  console.log("Firestore admins/" + uid, adminDoc.exists ? adminDoc.data() : null);
  console.log("");
  console.log("Andrew Demo login");
  console.log(`  Email:    ${EMAIL}`);
  console.log(`  Password: ${PASSWORD}`);
  console.log(`  Name:     ${FULL_NAME}`);
  console.log(`  Campus:   CUHK`);
  console.log(`  Role:     customer profile + admins/{uid} (admin)`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
