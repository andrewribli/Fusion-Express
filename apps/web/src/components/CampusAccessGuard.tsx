"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useUser } from "@/context/UserContext";
import { isAdminUid } from "@/lib/admins";
import { cityuBetaRedirect } from "@/lib/betaAccess";
import {
  accessCampusForUser,
  bypassesCampusIsolation,
  campusAccessRedirect,
} from "@/lib/campus-access";

/**
 * Keeps signed-in CUHK and CityU accounts on their campus routes.
 * CityU is also gated by `canAccessCityU` — guests and everyone
 * else on `/cityu` go home. Allowlisted CUHK emails may still open CityU.
 * Admins and the owner login (see packages/shared campus allowlist) may cross.
 */
export function CampusAccessGuard({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, isReady } = useUser();
  const [isAdmin, setIsAdmin] = useState(false);
  const [adminChecked, setAdminChecked] = useState(false);

  useEffect(() => {
    let cancelled = false;
    if (!user?.uid) {
      setIsAdmin(false);
      setAdminChecked(true);
      return;
    }
    setAdminChecked(false);
    void isAdminUid(user.uid).then((allowed) => {
      if (!cancelled) {
        setIsAdmin(allowed);
        setAdminChecked(true);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [user?.uid]);

  useEffect(() => {
    if (!isReady) return;
    const betaHome = cityuBetaRedirect(pathname, user?.email);
    if (betaHome && betaHome !== pathname) {
      router.replace(betaHome);
      return;
    }
    if (!adminChecked) return;
    const campus = accessCampusForUser(user);
    if (!campus) return;
    const bypass = bypassesCampusIsolation(user, isAdmin);
    const dest = campusAccessRedirect(pathname, campus, bypass, user?.email);
    if (dest && dest !== pathname) {
      router.replace(dest);
    }
  }, [adminChecked, isAdmin, isReady, pathname, router, user]);

  return <>{children}</>;
}
