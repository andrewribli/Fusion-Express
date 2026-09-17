import "server-only";
import { getApps } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getAdminDb } from "@/lib/firebase-admin";

/** Isolated so messaging/OTP routes do not load firebase-admin/auth (jose ESM crash on Vercel). */
export async function updateAuthPassword(
  email: string,
  newPassword: string,
): Promise<void> {
  if (!getAdminDb()) {
    throw new Error("Password reset is not configured on the server.");
  }
  const app = getApps()[0];
  if (!app) {
    throw new Error("Password reset is not configured on the server.");
  }
  const auth = getAuth(app);
  const user = await auth.getUserByEmail(email);
  await auth.updateUser(user.uid, { password: newPassword });
}
