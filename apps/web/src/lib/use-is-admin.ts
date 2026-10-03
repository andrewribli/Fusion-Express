"use client";

import { useEffect, useState } from "react";
import { isAdminUid } from "@/lib/admins";

/** Same `/admins/{uid}` check the admin pages use. */
export function useIsAdmin(uid: string | null | undefined): boolean {
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    let cancelled = false;
    if (!uid) {
      setIsAdmin(false);
      return;
    }
    void isAdminUid(uid).then((allowed) => {
      if (!cancelled) setIsAdmin(allowed);
    });
    return () => {
      cancelled = true;
    };
  }, [uid]);

  return isAdmin;
}
