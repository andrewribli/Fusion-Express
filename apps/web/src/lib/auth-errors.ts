/**
 * Map Firebase Auth / Firestore errors to short user-facing copy.
 * Never surface raw `Firebase: Error (auth/...)` strings in the UI.
 */

function errorCode(err: unknown): string {
  if (err && typeof err === "object" && "code" in err) {
    return String((err as { code: string }).code);
  }
  const message = err instanceof Error ? err.message : String(err ?? "");
  const match = message.match(/\((auth\/[a-z0-9-]+)\)/i);
  return match?.[1]?.toLowerCase() ?? "";
}

function rawMessage(err: unknown): string {
  return err instanceof Error ? err.message : String(err ?? "");
}

export function friendlyAuthError(
  err: unknown,
  fallback = "Something went wrong. Try again.",
): string {
  const code = errorCode(err);
  const raw = rawMessage(err);

  switch (code) {
    case "auth/invalid-credential":
    case "auth/wrong-password":
    case "auth/user-not-found":
    case "auth/invalid-email":
      return "Wrong email or password";
    case "auth/email-already-in-use":
      return "Account already exists";
    case "auth/weak-password":
      return "Password must be at least 6 characters";
    case "auth/too-many-requests":
      return "Too many attempts. Wait a moment and try again.";
    case "auth/network-request-failed":
      return "Network issue — check your connection and try again.";
    case "auth/user-disabled":
      return "This account has been disabled.";
    case "auth/operation-not-allowed":
      return "Email sign-in is not enabled. Contact support.";
    default:
      break;
  }

  if (/email-already-in-use|already exists|already in use/i.test(raw)) {
    return "Account already exists";
  }
  if (/invalid-credential|wrong-password|user-not-found/i.test(raw)) {
    return "Wrong email or password";
  }
  if (/Firebase:\s*Error\s*\(auth\//i.test(raw) || /^auth\//i.test(raw)) {
    return fallback;
  }
  if (raw && !/Firebase:/i.test(raw)) return raw;
  return fallback;
}

export function friendlyPlaceOrderError(err: unknown): string {
  const code = errorCode(err);
  const raw = rawMessage(err);

  if (
    code === "permission-denied" ||
    /permission-denied|missing or insufficient permissions/i.test(raw)
  ) {
    return "Could not place your order. Sign in again or try guest checkout.";
  }
  if (
    code === "failed-precondition" ||
    /requires an index|failed-precondition|The query requires an index/i.test(raw)
  ) {
    return "Orders are temporarily unavailable. Please try again shortly.";
  }
  if (code === "unavailable" || /network|offline/i.test(raw)) {
    return "Network issue — check your connection and try again.";
  }
  if (/Firebase:\s*Error/i.test(raw) || /^[a-z]+\/[a-z0-9-]+$/i.test(raw)) {
    return "Could not place order. Try again.";
  }
  return raw || "Could not place order. Try again.";
}
