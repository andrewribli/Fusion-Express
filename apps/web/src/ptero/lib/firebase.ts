/**
 * CityU uses the same Firebase app and Auth instance as the rest of GraceRun
 * (`NEXT_PUBLIC_FIREBASE_*`). A second `getAuth()` here did not share the
 * signed-in user, so one client could look logged out and clear the session.
 */
export {
  getFirebaseApp,
  getAuthClient as getFirebaseAuth,
  getDb as getFirebaseDb,
} from "@fusion-express/shared/firebase";

export const FIREBASE_PROJECT_ID =
  process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ?? "ptero-cityu";
