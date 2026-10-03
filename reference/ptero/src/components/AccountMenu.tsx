"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CAMPUS } from "@/config/campus";
import { useAppState, useUser } from "@/context/AppState";

/** Account control — My Orders count, avatar initials, outside-click (gracerun.fit). */
export function AccountMenu() {
  const { user, signOut } = useUser();
  const { orders } = useAppState();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  const activeOrders = useMemo(() => {
    if (!user || user.isGuest) return 0;
    return orders.filter(
      (o) =>
        o.customerId === user.uid &&
        !["paid", "cancelled"].includes(o.status),
    ).length;
  }, [orders, user]);

  const initials = useMemo(() => {
    if (!user?.name) return "?";
    return user.name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((p) => p[0]?.toUpperCase() ?? "")
      .join("");
  }, [user?.name]);

  useEffect(() => {
    if (!open) return;
    function onDown(event: MouseEvent | TouchEvent) {
      const root = rootRef.current;
      if (!root) return;
      if (event.target instanceof Node && !root.contains(event.target)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onDown);
    document.addEventListener("touchstart", onDown);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("touchstart", onDown);
    };
  }, [open]);

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex h-10 w-10 items-center justify-center rounded-full border border-gray-200 bg-gray-50 text-xs font-bold text-gray-800 hover:bg-gray-100"
        aria-label="Account menu"
        aria-expanded={open}
      >
        {user && !user.isGuest ? (
          <span>{initials || "Me"}</span>
        ) : (
          <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" aria-hidden>
            <circle cx="12" cy="8" r="3.5" stroke="currentColor" strokeWidth="2" />
            <path
              d="M5 19.5c1.8-3.2 4.2-4.5 7-4.5s5.2 1.3 7 4.5"
              stroke="currentColor"
              strokeWidth="2"
            />
          </svg>
        )}
      </button>
      {open && (
        <div className="absolute right-0 z-50 mt-2 w-60 overflow-hidden rounded-2xl border border-gray-100 bg-white py-1 text-sm shadow-lg">
          <p className="px-3 py-2 text-[11px] font-semibold uppercase tracking-wide text-gray-400">
            {CAMPUS.brandName}
          </p>
          {user && !user.isGuest ? (
            <>
              <p className="truncate px-3 pb-1 text-xs font-medium text-gray-800">
                {user.name}
              </p>
              <p className="truncate px-3 pb-2 text-xs text-gray-500">{user.email}</p>
              <Link
                href="/orders"
                onClick={() => setOpen(false)}
                className="flex items-center justify-between px-3 py-2 text-gray-800 hover:bg-gray-50"
              >
                <span>My Orders</span>
                {activeOrders > 0 ? (
                  <span className="rounded-full bg-[#ED1C24] px-1.5 py-0.5 text-[10px] font-bold text-white">
                    {activeOrders}
                  </span>
                ) : null}
              </Link>
              <Link
                href="/profile"
                onClick={() => setOpen(false)}
                className="block px-3 py-2 text-gray-800 hover:bg-gray-50"
              >
                Profile
              </Link>
              <button
                type="button"
                onClick={() => {
                  signOut();
                  setOpen(false);
                  router.push("/");
                }}
                className="block w-full px-3 py-2 text-left text-gray-800 hover:bg-gray-50"
              >
                Sign out
              </button>
            </>
          ) : (
            <>
              <Link
                href="/login"
                onClick={() => setOpen(false)}
                className="block px-3 py-2 text-gray-800 hover:bg-gray-50"
              >
                Sign in
              </Link>
              <Link
                href="/login?mode=signup"
                onClick={() => setOpen(false)}
                className="block px-3 py-2 text-gray-800 hover:bg-gray-50"
              >
                Sign up with CityU email
              </Link>
            </>
          )}
        </div>
      )}
    </div>
  );
}
