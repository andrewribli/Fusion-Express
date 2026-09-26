"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

/**
 * Deep-link from meal search: ?item=<id>&open=1
 * Scrolls to the dish, highlights it, and signals the page to open the detail modal.
 */
export function useFocusCanteenItem(): {
  focusItemId: string | null;
  detailOpen: boolean;
  clearFocus: () => void;
  closeDetail: () => void;
} {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const item = searchParams.get("item");
  const open = searchParams.get("open") === "1";
  const [detailOpen, setDetailOpen] = useState(false);
  const [focusItemId, setFocusItemId] = useState<string | null>(null);

  useEffect(() => {
    if (!item) {
      setFocusItemId(null);
      setDetailOpen(false);
      return;
    }
    setFocusItemId(item);
    setDetailOpen(open);

    const tryScroll = () => {
      const el = document.querySelector<HTMLElement>(
        `[data-menu-item-id="${CSS.escape(item)}"]`,
      );
      if (!el) return false;
      el.scrollIntoView({ behavior: "smooth", block: "center" });
      el.classList.add("ring-2", "ring-[#ED1C24]", "ring-offset-2");
      window.setTimeout(() => {
        el.classList.remove("ring-2", "ring-[#ED1C24]", "ring-offset-2");
      }, 2600);
      return true;
    };

    if (tryScroll()) return;
    const t0 = window.setTimeout(() => tryScroll(), 120);
    const t1 = window.setTimeout(() => tryScroll(), 400);
    const t2 = window.setTimeout(() => tryScroll(), 900);
    return () => {
      window.clearTimeout(t0);
      window.clearTimeout(t1);
      window.clearTimeout(t2);
    };
  }, [item, open]);

  function stripParams() {
    const next = new URLSearchParams(searchParams.toString());
    next.delete("item");
    next.delete("open");
    const q = next.toString();
    router.replace(q ? `${pathname}?${q}` : pathname, { scroll: false });
  }

  return {
    focusItemId,
    detailOpen,
    clearFocus: () => {
      setFocusItemId(null);
      setDetailOpen(false);
      stripParams();
    },
    closeDetail: () => {
      setDetailOpen(false);
      const next = new URLSearchParams(searchParams.toString());
      next.delete("open");
      const q = next.toString();
      router.replace(q ? `${pathname}?${q}` : pathname, { scroll: false });
    },
  };
}
