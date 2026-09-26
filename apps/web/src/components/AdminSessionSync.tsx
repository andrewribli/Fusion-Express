"use client";

import { useEffect, useRef } from "react";
import { useUser } from "@/context/UserContext";
import { isAdminAllowlistEmail } from "@/lib/admin-emails";
import { isAdminUser } from "@/lib/admins";
import { getAuthClient, isFirebaseConfigured } from "@/lib/firebase";

/**
 * Keeps the middleware admin cookie in sync with the signed-in allowlisted
 * admin. Non-admins never receive the cookie.
 */
export function AdminSessionSync() {
  const { user, isReady } = useUser();
  const lastKey = useRef<string>("");

  useEffect(() => {
    if (!isReady) return;
    const key = user?.uid ? `${user.uid}:${user.email ?? ""}` : "";
    if (key === lastKey.current) return;
    lastKey.current = key;

    let cancelled = false;
    void (async () => {
      if (!user?.uid || !isAdminAllowlistEmail(user.email)) {
        await fetch("/api/admin/session", { method: "DELETE" }).catch(
          () => undefined,
        );
        return;
      }
      const allowed = await isAdminUser({ uid: user.uid, email: user.email });
      if (cancelled) return;
      if (!allowed || !isFirebaseConfigured()) {
        await fetch("/api/admin/session", { method: "DELETE" }).catch(
          () => undefined,
        );
        return;
      }
      try {
        const token = await getAuthClient().currentUser?.getIdToken();
        if (!token || cancelled) return;
        await fetch("/api/admin/session", {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
        });
      } catch {
        /* ignore */
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [isReady, user?.uid, user?.email]);

  return null;
}
