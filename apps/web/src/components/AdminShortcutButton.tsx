"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useUser } from "@/context/UserContext";
import { isAdminUser } from "@/lib/admins";

/** Header shortcut — only rendered for allowlisted /admins users. */
export function AdminShortcutButton({
  className = "",
  dark = false,
}: {
  className?: string;
  /** Light text for red shop header. */
  dark?: boolean;
}) {
  const { user } = useUser();
  const [show, setShow] = useState(false);

  useEffect(() => {
    let cancelled = false;
    if (!user?.uid && !user?.email) {
      setShow(false);
      return;
    }
    void isAdminUser({ uid: user?.uid, email: user?.email }).then((ok) => {
      if (!cancelled) setShow(ok);
    });
    return () => {
      cancelled = true;
    };
  }, [user?.uid, user?.email]);

  if (!show) return null;

  return (
    <Link
      href="/admin"
      className={
        className ||
        (dark
          ? "inline-flex h-10 items-center gap-1 rounded-full bg-white/20 px-2.5 text-xs font-bold text-white hover:bg-white/30"
          : "inline-flex h-11 items-center gap-1 rounded-full border border-amber-300 bg-amber-50 px-2.5 text-xs font-bold text-amber-900 hover:bg-amber-100")
      }
      aria-label="Admin portal"
    >
      <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" aria-hidden>
        <path
          d="M12 3l7 3v5c0 5-3.5 8.5-7 10-3.5-1.5-7-5-7-10V6l7-3z"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinejoin="round"
        />
      </svg>
      <span className="hidden sm:inline">Admin</span>
    </Link>
  );
}
