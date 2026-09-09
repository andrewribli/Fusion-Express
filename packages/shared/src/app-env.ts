/**
 * Staging vs production. Defaults to production so a missing env var never
 * points the live site at test collections.
 *
 * Set NEXT_PUBLIC_APP_ENV=staging on the Vercel Preview environment (and the
 * staging git branch) so test deploys use *_test Firestore collections.
 */
export function isStagingApp(): boolean {
  const value = (
    process.env.NEXT_PUBLIC_APP_ENV ??
    process.env.EXPO_PUBLIC_APP_ENV ??
    ""
  )
    .trim()
    .toLowerCase();
  return value === "staging" || value === "test";
}

const TEST_SUFFIX = "_test";

/** Firestore collection name for the current app environment. */
export function collectionName(base: string): string {
  return isStagingApp() ? `${base}${TEST_SUFFIX}` : base;
}

/** Storage object path; staging writes under test/ so proofs stay separate. */
export function storagePath(path: string): string {
  const trimmed = path.replace(/^\/+/, "");
  return isStagingApp() ? `test/${trimmed}` : trimmed;
}
