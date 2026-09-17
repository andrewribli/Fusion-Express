import "server-only";

/**
 * Thin re-exports so password-reset (and any other) routes that import Auth
 * helpers from this module stay compatible. Canonical implementations live in
 * `firebase-admin.ts`.
 */
export {
  updateAuthPassword,
  getAdminAuth,
  emailHasAuthAccount,
  resolveAuthUidForEmail,
  repairAuthEmailForUid,
  deleteUserAccount,
  verifyAdminIdToken,
} from "@/lib/firebase-admin";
