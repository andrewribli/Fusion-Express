"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { BootScreen } from "@/components/BootScreen";
import { useUser } from "@/context/UserContext";
import { roleAllowsCustomer, roleAllowsRunner } from "@/lib/roles";

function loginNext(pathname: string, search: string): string {
  const path = `${pathname}${search}`;
  if (pathname.startsWith("/cityu")) {
    if (pathname.startsWith("/cityu/login")) return "/cityu";
    return `/cityu/login?next=${encodeURIComponent(path)}`;
  }
  if (pathname === "/login") return "/";
  return `/login?next=${encodeURIComponent(path)}`;
}

export function RequireAuth({ children }: { children: React.ReactNode }) {
  const { user, isReady, bootError } = useUser();
  const router = useRouter();

  useEffect(() => {
    if (isReady && !user && !bootError) {
      router.replace(loginNext(window.location.pathname, window.location.search));
    }
  }, [user, isReady, bootError, router]);

  if (!isReady || (bootError && !user)) {
    return <BootScreen error={bootError} />;
  }

  if (!user) return null;

  return <>{children}</>;
}

/** Signed-in customer or dual-role account. Runner-only users are sent to runner home. */
export function RequireCustomer({ children }: { children: React.ReactNode }) {
  const { user, isReady, bootError, role, setMode } = useUser();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!isReady || bootError) return;
    if (!user) {
      router.replace(loginNext(window.location.pathname, window.location.search));
      return;
    }
    if (!roleAllowsCustomer(role)) {
      router.replace(
        pathname.startsWith("/cityu")
          ? "/cityu/runner/dashboard"
          : "/runner/dashboard",
      );
      return;
    }
    setMode("customer");
  }, [user, isReady, bootError, role, router, setMode, pathname]);

  if (!isReady || (bootError && !user)) {
    return <BootScreen error={bootError} />;
  }
  if (!user || !roleAllowsCustomer(role)) return null;
  return <>{children}</>;
}

/** Signed-in runner or dual-role account. Customers are sent to the shop. */
export function RequireRunner({ children }: { children: React.ReactNode }) {
  const { user, isReady, bootError, role, setMode } = useUser();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!isReady || bootError) return;
    if (!user) {
      router.replace(loginNext(window.location.pathname, window.location.search));
      return;
    }
    if (!roleAllowsRunner(role)) {
      router.replace(pathname.startsWith("/cityu") ? "/cityu/runner" : "/");
      return;
    }
    setMode("runner");
  }, [user, isReady, bootError, role, router, setMode, pathname]);

  if (!isReady || (bootError && !user)) {
    return <BootScreen error={bootError} />;
  }
  if (!user || !roleAllowsRunner(role)) return null;
  return <>{children}</>;
}
