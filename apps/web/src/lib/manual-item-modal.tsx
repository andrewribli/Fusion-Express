"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { ManualItemModal } from "@/components/ManualItemModal";

interface ManualItemModalContextValue {
  openManualItem: () => void;
}

const ManualItemModalContext = createContext<ManualItemModalContextValue | null>(
  null,
);

export function ManualItemModalProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const openManualItem = useCallback(() => setOpen(true), []);
  const value = useMemo(() => ({ openManualItem }), [openManualItem]);

  return (
    <ManualItemModalContext.Provider value={value}>
      {children}
      <ManualItemModal open={open} onClose={() => setOpen(false)} />
    </ManualItemModalContext.Provider>
  );
}

export function useManualItemModal(): ManualItemModalContextValue {
  const ctx = useContext(ManualItemModalContext);
  if (!ctx) {
    throw new Error("useManualItemModal must be used within ManualItemModalProvider");
  }
  return ctx;
}
