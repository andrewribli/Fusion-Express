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
  isCampusId,
  type CampusConfig,
  type CampusId,
} from "@fusion-express/shared/campus";
import { useUser } from "@/context/UserContext";

const CAMPUS_STORAGE_KEY = "gracerun_campus";

function loadStoredCampus(): CampusId | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(CAMPUS_STORAGE_KEY);
    return isCampusId(raw) ? raw : null;
  } catch {
    return null;
  }
}

function persistCampus(campus: CampusId | null) {
  if (typeof window === "undefined") return;
  try {
    if (campus) localStorage.setItem(CAMPUS_STORAGE_KEY, campus);
    else localStorage.removeItem(CAMPUS_STORAGE_KEY);
  } catch {
    // ignore
  }
}

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
  const [storedCampus, setStoredCampus] = useState<CampusId | null>(null);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const fromUser = isCampusId(user?.campus) ? user.campus : null;
    const fromStore = loadStoredCampus();
    // Profile campus always wins for signed-in users.
    setStoredCampus(fromUser ?? fromStore);
    if (fromUser) persistCampus(fromUser);
    setHydrated(true);
  }, [user?.campus]);

  const setCampus = useCallback((next: CampusId) => {
    setStoredCampus(next);
    persistCampus(next);
  }, []);

  const clearCampus = useCallback(() => {
    // Guests may clear a checkout pick; signed-in users keep profile campus.
    if (isCampusId(user?.campus)) {
      setStoredCampus(user.campus);
      persistCampus(user.campus);
      return;
    }
    setStoredCampus(null);
    persistCampus(null);
  }, [user?.campus]);

  const campus: CampusId =
    (isCampusId(user?.campus) ? user.campus : null) ??
    storedCampus ??
    "cuhk";

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
