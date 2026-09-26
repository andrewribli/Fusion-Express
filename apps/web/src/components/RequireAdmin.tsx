"use client";

import { useEffect, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { BootScreen } from "@/components/BootScreen";
import { RequireAuth } from "@/components/RequireAuth";
import { useUser } from "@/context/UserContext";
import { isAdminAllowlistEmail } from "@/lib/admin-emails";
import { isAdminUser } from "@/lib/admins";
import { getAuthClient, isFirebaseConfigured } from "@/lib/firebase";

function AdminGate({ children }: { children: ReactNode }) {
  const { user } = useUser();
  const router = useRouter();
  const [allowed, setAllowed] = useState<boolean | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      if (!user?.uid || !isAdminAllowlistEmail(user.email)) {
        await fetch("/api/admin/session", { method: "DELETE" }).catch(
          () => undefined,
        );
        if (!cancelled) {
          setAllowed(false);
          router.replace("/");
        }
        return;
      }
      const ok = await isAdminUser({ uid: user.uid, email: user.email });
      if (cancelled) return;
      if (!ok) {
        await fetch("/api/admin/session", { method: "DELETE" }).catch(
          () => undefined,
        );
        setAllowed(false);
        router.replace("/");
        return;
      }
      try {
        if (isFirebaseConfigured()) {
          const token = await getAuthClient().currentUser?.getIdToken();
          if (token) {
            await fetch("/api/admin/session", {
              method: "POST",
              headers: { Authorization: `Bearer ${token}` },
            });
          }
        }
      } catch {
        /* cookie optional once past gate */
      }
      if (!cancelled) setAllowed(true);
    })();
    return () => {
      cancelled = true;
    };
  }, [user?.uid, user?.email, router]);

  if (allowed === null) {
    return <BootScreen />;
  }

  if (!allowed) {
    return <BootScreen />;
  }

  return <>{children}</>;
}

export function RequireAdmin({ children }: { children: ReactNode }) {
  return (
    <RequireAuth>
      <AdminGate>{children}</AdminGate>
    </RequireAuth>
  );
}
