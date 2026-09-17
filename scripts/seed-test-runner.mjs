/**
 * One-time / idempotent seed for the dummy runner used in local testing.
 *
 * Login (GraceRun requires a CUHK email, so this is not @example.com):
 *   email:    testrunner@link.cuhk.edu.hk
 *   username: testrunner
 *   password: password123
 *
 * Usage:
 *   FIREBASE_WEB_API_KEY=... node scripts/seed-test-runner.mjs
 *
 * The live account was already created in Firebase Auth + Firestore.
 * Re-running only reports whether the Auth user still exists.
 */

const email = "testrunner@link.cuhk.edu.hk";
const password = "password123";

const apiKey = process.env.FIREBASE_WEB_API_KEY || process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
if (!apiKey) {
  console.error("Set FIREBASE_WEB_API_KEY or NEXT_PUBLIC_FIREBASE_API_KEY");
  process.exit(1);
}

const res = await fetch(
  `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${apiKey}`,
  {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password, returnSecureToken: true }),
  },
);
const body = await res.json();
if (!res.ok) {
  console.error("Sign-in failed. Create the user first or check the password.", body);
  process.exit(1);
}

console.log("Test runner is ready.");
console.log(`  uid:      ${body.localId}`);
console.log(`  email:    ${email}`);
console.log(`  username: testrunner`);
console.log(`  password: ${password}`);
console.log("  role:     both / isRunner=true / runnerId=testrunner");
