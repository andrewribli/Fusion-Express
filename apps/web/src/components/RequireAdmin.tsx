"use client";

import Link from "next/link";
import { useEffect, useState, type ReactNode } from "react";
import { AppHeader } from "@/components/AppHeader";
import { AppShell } from "@/components/AppShell";
import { BootScreen } from "@/components/BootScreen";
import { LakersWallpaper } from "@/components/LakersWallpaper";
import { RequireAuth } from "@/components/RequireAuth";
import { useUser } from "@/context/UserContext";
import { isAdminUid } from "@/lib/admins";

function AdminGate({ children }: { children: ReactNode }) {
  const { user } = useUser();
  const [allowed, setAllowed] = useState<boolean | null>(null);

  useEffect(() => {
    let cancelled = false;
    void isAdminUid(user?.uid).then((result) => {
      if (!cancelled) setAllowed(result);
    });
    return () => {
      cancelled = true;
    };
  }, [user?.uid]);

  if (allowed === null) {
    return <BootScreen />;
  }

  if (!allowed) {
    return (
      <AppShell hideNav>
        <LakersWallpaper>
          <AppHeader showBack backHref="/" title="Admin" />
          <main className="mx-auto max-w-md px-4 py-16 text-center">
            <div className="rounded-2xl bg-white/95 p-6 shadow-sm">
              <h1 className="text-lg font-bold text-gray-900">
                Admin access only
              </h1>
              <p className="mt-2 text-sm text-gray-600">
                This page is limited to GraceRun admins. If you need access, ask
                for your account to be added.
              </p>
              <Link
                href="/"
                className="mt-5 inline-block rounded-xl bg-[#ED1C24] px-5 py-2.5 text-sm font-semibold text-white"
              >
                Back to home
              </Link>
            </div>
          </main>
        </LakersWallpaper>
      </AppShell>
    );
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
