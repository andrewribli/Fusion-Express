"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { useUser } from "@/context/UserContext";

/** Keep customer/runner mode aligned with the current route. */
export function useModeSync(): void {
  const pathname = usePathname();
  const { setMode } = useUser();

  useEffect(() => {
    if (pathname.startsWith("/runner")) {
      setMode("runner");
    } else if (
      pathname === "/" ||
      pathname.startsWith("/browse") ||
      pathname.startsWith("/cart") ||
      pathname.startsWith("/checkout") ||
      pathname.startsWith("/track") ||
      pathname.startsWith("/orders")
    ) {
      setMode("customer");
    }
  }, [pathname, setMode]);
}
