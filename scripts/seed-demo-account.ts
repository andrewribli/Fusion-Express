/**
 * Create / refresh the regular-customer demo login.
 *
 *   npx tsx scripts/seed-demo-account.ts
 */
import { FieldValue } from "firebase-admin/firestore";
import {
  DEMO_CAMPUS,
  DEMO_EMAIL,
  DEMO_FULL_NAME,
  DEMO_PASSWORD,
  DEMO_STUDENT_ID,
  getDemoAdmin,
} from "./demo-account-shared";

async function main() {
  const { auth, db } = getDemoAdmin();
  let uid: string;
  try {
    const existing = await auth.getUserByEmail(DEMO_EMAIL);
    uid = existing.uid;
    await auth.updateUser(uid, {
      password: DEMO_PASSWORD,
      displayName: DEMO_FULL_NAME,
      emailVerified: true,
      disabled: false,
    });
    console.log(`Auth updated ${DEMO_EMAIL} (${uid})`);
  } catch (err) {
    const code =
      err && typeof err === "object" && "code" in err
        ? String((err as { code: string }).code)
        : "";
    if (code !== "auth/user-not-found") throw err;
    const created = await auth.createUser({
      email: DEMO_EMAIL,
      password: DEMO_PASSWORD,
      displayName: DEMO_FULL_NAME,
      emailVerified: true,
    });
    uid = created.uid;
    console.log(`Auth created ${DEMO_EMAIL} (${uid})`);
  }

  const adminSnap = await db.collection("admins").doc(uid).get();
  if (adminSnap.exists) {
    await adminSnap.ref.delete();
    console.log(`Removed stray admins/${uid}`);
  }

  const ref = db.collection("users").doc(uid);
  const existingDoc = await ref.get();
  await ref.set(
    {
      uid,
      email: DEMO_EMAIL,
      fullName: DEMO_FULL_NAME,
      displayName: DEMO_FULL_NAME,
      campus: DEMO_CAMPUS,
      role: "customer",
      isRunner: false,
      isGuest: false,
      isAnonymous: false,
      studentId: DEMO_STUDENT_ID,
      updatedAt: FieldValue.serverTimestamp(),
      ...(existingDoc.exists ? {} : { createdAt: FieldValue.serverTimestamp() }),
    },
    { merge: true },
  );

  const doc = await db.collection("users").doc(uid).get();
  const data = doc.data() ?? {};
  console.log("Firestore users/" + uid, {
    email: data.email,
    fullName: data.fullName,
    displayName: data.displayName,
    campus: data.campus,
    role: data.role,
    isRunner: data.isRunner,
    studentId: data.studentId,
    isAnonymous: data.isAnonymous,
  });
  console.log("");
  console.log("Demo login");
  console.log(`  Email:    ${DEMO_EMAIL}`);
  console.log(`  Password: ${DEMO_PASSWORD}`);
  console.log(`  Name:     ${DEMO_FULL_NAME}`);
  console.log(`  Campus:   CUHK`);
  console.log(`  Role:     customer (regular user — not admin, not runner)`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
