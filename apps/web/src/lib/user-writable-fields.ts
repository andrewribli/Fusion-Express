/**
 * Fields the browser may write on users/{uid}. Pseudonym + college lock are
 * server-only; anything else is dropped so a post-login merge cannot trip
 * rules with a leftover or locked key.
 */
const CLIENT_WRITABLE_USER_KEYS = new Set([
  "uid",
  "fullName",
  "email",
  "phone",
  "isGuest",
  "createdAt",
  "updatedAt",
  "username",
  "chineseName",
  "studentId",
  "college",
  "hall",
  "roomNumber",
  "role",
  "photoURL",
  "cuhkEmail",
  "cuhkVerifiedAt",
  "termsAcceptedAt",
  "runnerPaymentMethod",
  "runnerPaymentId",
  "isRunner",
  "runnerId",
  "displayName",
  "photoUrl",
  "isAnonymous",
  "favorites",
  "campus",
]);

/** Keep only keys Firestore rules allow the account owner to change. */
export function pickClientWritableUserFields(
  partial: Record<string, unknown>,
): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(partial)) {
    if (!CLIENT_WRITABLE_USER_KEYS.has(key)) continue;
    if (value === undefined) continue;
    out[key] = value;
  }
  // Nulls are rejected for these shape-checked fields.
  if (out.displayName == null) delete out.displayName;
  if (out.photoUrl == null) delete out.photoUrl;
  if (out.isAnonymous == null) delete out.isAnonymous;
  return out;
}
