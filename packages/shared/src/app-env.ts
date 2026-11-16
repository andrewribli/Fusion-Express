/**
 * Staging vs production. Defaults to production so a missing env var never
 * points the live site at test collections.
 *
 * Set NEXT_PUBLIC_APP_ENV=staging on the Vercel Preview environment (and the
 * staging git branch) so test deploys use *_test Firestore collections.
 */
export function isStagingEnvVar(): boolean {
  const value = (
    process.env.NEXT_PUBLIC_APP_ENV ??
    process.env.EXPO_PUBLIC_APP_ENV ??
    ""
  )
    .trim()
    .toLowerCase();
  return value === "staging" || value === "test";
}

function stagingHostname(): string | null {
  // RN defines `window` but often not `window.location` — never touch hostname
  // unless the full chain exists, or native aborts before first paint.
  try {
    if (typeof window === "undefined") return null;
    if (typeof window.location === "undefined" || window.location == null) {
      return null;
    }
    const host = window.location.hostname;
    if (typeof host !== "string") return null;
    return host.toLowerCase();
  } catch {
    return null;
  }
}

export function isStagingApp(): boolean {
  if (isStagingEnvVar()) return true;
  const host = stagingHostname();
  if (!host) return false;
  return (
    host === "staging-servecart.vercel.app" || host.includes("staging")
  );
}

/** Staging demo login: session-only, no Auth/Firestore user writes. */
export function isDemoAuth(): boolean {
  return isStagingApp();
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
