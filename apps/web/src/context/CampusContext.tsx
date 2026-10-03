"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  campusConfig,
  getCampusConfig,
  type CampusConfig,
  type CampusId,
} from "@fusion-express/shared/campus";
import { useUser } from "@/context/UserContext";
import { accessCampusForUser } from "@/lib/campus-access";
import { campusFromPathname, clearStoredCampusPreference } from "@/lib/campus-routes";
import { usePathname } from "next/navigation";

interface CampusContextValue {
  /** Active campus for menus / chrome. Defaults to CUHK for guests. */
  campus: CampusId;
  config: CampusConfig;
  setCampus: (campus: CampusId) => void;
  clearCampus: () => void;
  isReady: boolean;
}

const CampusContext = createContext<CampusContextValue | null>(null);

export function CampusProvider({ children }: { children: ReactNode }) {
  const { user, isReady: userReady } = useUser();
  const pathname = usePathname();
  const [pickedCampus, setPickedCampus] = useState<CampusId | null>(null);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    // Wipe leftover last-used campus memory. Do not read it back.
    clearStoredCampusPreference();
    setHydrated(true);
  }, []);

  const setCampus = useCallback((next: CampusId) => {
    setPickedCampus(next);
  }, []);

  const clearCampus = useCallback(() => {
    setPickedCampus(null);
  }, []);

  const routeCampus = campusFromPathname(pathname);
  const emailCampus = accessCampusForUser(user);

  const campus: CampusId = routeCampus ?? emailCampus ?? pickedCampus ?? "cuhk";

  const value = useMemo<CampusContextValue>(
    () => ({
      campus,
      config: getCampusConfig(campus),
      setCampus,
      clearCampus,
      isReady: hydrated && userReady,
    }),
    [campus, clearCampus, hydrated, setCampus, userReady],
  );

  return (
    <CampusContext.Provider value={value}>{children}</CampusContext.Provider>
  );
}

export function useCampus(): CampusContextValue {
  const ctx = useContext(CampusContext);
  if (!ctx) {
    throw new Error("useCampus must be used within CampusProvider");
  }
  return ctx;
}

export { campusConfig };
