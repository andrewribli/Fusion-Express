"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { CAMPUS } from "@/ptero/config/campus";
import { UserAvatar } from "@/components/UserAvatar";
import { useUser as useSharedUser } from "@/context/UserContext";
import {
  appUserFromSharedProfile,
  useAppState,
  useUser,
} from "@/ptero/context/AppState";

/** Account control — My Orders count, same avatar as GraceRun header. */
export function AccountMenu({
  tone = "light",
  placement = "down",
  avatarSize,
  label,
}: {
  tone?: "light" | "dark";
  /** Bottom nav opens above the icon so it stays on screen. */
  placement?: "down" | "up";
  avatarSize?: number;
  label?: string;
}) {
  const { user, signOut } = useUser();
  const shared = useSharedUser();
  // Shared Firebase session is what /login already trusts. Without this,
  // the menu still says Sign in and that link is sent straight back here.
  const session =
    user && !user.isGuest ? user : appUserFromSharedProfile(shared.user);
  const { orders } = useAppState();
  const [open, setOpen] = useState(false);
  /** Ignore the tap that opened the menu so it cannot land on Sign out. */
  const [actionsReady, setActionsReady] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const size = avatarSize ?? (tone === "dark" ? 44 : 40);

  const activeOrders = useMemo(() => {
    if (!session || session.isGuest) return 0;
    return orders.filter(
      (o) =>
        o.customerId === session.uid &&
        !["paid", "cancelled"].includes(o.status),
    ).length;
  }, [orders, session]);

  useEffect(() => {
    if (!open) {
      setActionsReady(false);
      return;
    }
    const arm = window.setTimeout(() => setActionsReady(true), 350);
    function onDown(event: MouseEvent | TouchEvent) {
      const root = rootRef.current;
      if (!root) return;
      if (event.target instanceof Node && !root.contains(event.target)) {
        setOpen(false);
      }
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onDown);
    document.addEventListener("touchstart", onDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      window.clearTimeout(arm);
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("touchstart", onDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  const panelClass =
    placement === "up"
      ? "absolute right-0 bottom-full z-[80] mb-2 w-60 overflow-hidden rounded-2xl border border-gray-100 bg-white py-1 text-sm shadow-lg"
      : "absolute right-0 top-full z-[80] mt-2 w-60 overflow-hidden rounded-2xl border border-gray-100 bg-white py-1 text-sm shadow-lg";

  return (
    <div
      ref={rootRef}
      className={label ? "relative flex flex-col items-center justify-center gap-0.5" : "relative"}
    >
      <button
        type="button"
        onClick={(event) => {
          event.preventDefault();
          event.stopPropagation();
          setOpen((v) => !v);
        }}
        className="rounded-full hover:opacity-90"
        aria-label="Account menu"
        aria-expanded={open}
        aria-haspopup="menu"
      >
        <UserAvatar
          user={shared.user}
          size={size}
          name={session && !session.isGuest ? session.name : null}
        />
      </button>
      {label ? (
        <span className="text-[11px] font-medium leading-tight text-gray-500">{label}</span>
      ) : null}
      {open && (
        <div className={`${panelClass}${actionsReady ? "" : " pointer-events-none"}`}>
          <p className="px-3 py-2 text-[11px] font-semibold uppercase tracking-wide text-gray-400">
            {CAMPUS.brandName}
          </p>
          {session && !session.isGuest ? (
            <>
              <p className="truncate px-3 pb-1 text-xs font-medium text-gray-800">
                {session.name}
              </p>
              <p className="truncate px-3 pb-2 text-xs text-gray-500">{session.email}</p>
              <Link
                href="/cityu/orders"
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
                href="/cityu/profile"
                onClick={() => setOpen(false)}
                className="block px-3 py-2 text-gray-800 hover:bg-gray-50"
              >
                Profile
              </Link>
              <button
                type="button"
                role="menuitem"
                onClick={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                  if (!actionsReady) return;
                  setOpen(false);
                  void (async () => {
                    await signOut();
                    // Guest after sign-out: marketing home, not the CityU shop.
                    window.location.href = "/";
                  })();
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
                Create account
              </Link>
            </>
          )}
        </div>
      )}
    </div>
  );
}
