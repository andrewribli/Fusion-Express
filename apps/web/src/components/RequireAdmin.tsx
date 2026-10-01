"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { BootScreen } from "@/components/BootScreen";
import { RequireAuth } from "@/components/RequireAuth";
import { useUser } from "@/context/UserContext";
import { isAdminUser } from "@/lib/admins";

function AdminGate({ children }: { children: ReactNode }) {
  const { user } = useUser();
  const router = useRouter();
  const [allowed, setAllowed] = useState<boolean | null>(null);

  useEffect(() => {
    let cancelled = false;
    void isAdminUser({ uid: user?.uid, email: user?.email }).then((result) => {
      if (cancelled) return;
      setAllowed(result);
      if (!result) router.replace("/");
    });
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

/** Kept so accidental imports of the old denied UI still typecheck. */
export function AdminAccessDeniedLink() {
  return (
    <Link href="/" className="text-sm font-semibold text-[#ED1C24] underline">
      Back to home
    </Link>
  );
}
