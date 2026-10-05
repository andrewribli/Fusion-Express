"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ChangePasswordModal } from "@/components/ChangePasswordModal";
import { UserAvatar } from "@/components/UserAvatar";
import { useUser } from "@/context/UserContext";
import { getAuthClient, isFirebaseConfigured } from "@/lib/firebase";
import { useActiveCustomerOrders } from "@/lib/use-active-orders";

function firebaseSessionPresent(): boolean {
  if (!isFirebaseConfigured() || typeof window === "undefined") return false;
  try {
    return Boolean(getAuthClient().currentUser);
  } catch {
    return false;
  }
}

export function AccountMenu({
  hideThemeChip: _hideThemeChip = false,
  placement = "down",
  avatarSize = 36,
  label,
}: {
  /** Unused — colorways are unified to the homepage. */
  hideThemeChip?: boolean;
  /** Bottom nav opens above the icon so it stays on screen. */
  placement?: "down" | "up";
  avatarSize?: number;
  label?: string;
}) {
  const { user, logout, isReady } = useUser();
  const { href: trackHref, count: activeCount } = useActiveCustomerOrders();
  const [open, setOpen] = useState(false);
  const [passwordOpen, setPasswordOpen] = useState(false);
  /** Ignore the tap that opened the menu so it cannot land on Sign Out. */
  const [actionsReady, setActionsReady] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) {
      setActionsReady(false);
      return;
    }

    const arm = window.setTimeout(() => setActionsReady(true), 350);

    function onPointerDown(event: MouseEvent | TouchEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }

    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("touchstart", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      window.clearTimeout(arm);
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("touchstart", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  const labelClass = "text-[11px] font-medium leading-tight text-gray-500";

  // Auth still restoring, or Firebase has a user while React profile catches up:
  // never send the silhouette to /login — that was the bounce Andrew hit.
  if (!user) {
    const authPending = !isReady || firebaseSessionPresent();
    if (authPending) {
      return (
        <div
          className={
            label
              ? "flex flex-col items-center justify-center gap-0.5"
              : "flex items-center gap-1.5"
          }
        >
          <span
            aria-label="Account loading"
            aria-busy="true"
            className="flex items-center justify-center rounded-full opacity-70"
          >
            <UserAvatar user={null} size={avatarSize} />
          </span>
          {label ? <span className={labelClass}>{label}</span> : null}
        </div>
      );
    }
    return (
      <div className={label ? "flex flex-col items-center justify-center gap-0.5" : "flex items-center gap-1.5"}>
        <Link
          href="/login"
          aria-label="Sign in"
          className="flex items-center justify-center rounded-full hover:opacity-90"
        >
          <UserAvatar user={null} size={avatarSize} />
        </Link>
        {label ? <span className={labelClass}>{label}</span> : null}
      </div>
    );
  }

  async function signOut() {
    setOpen(false);
    await logout();
    window.location.href = "/";
  }

  const panelClass =
    placement === "up"
      ? "absolute right-0 bottom-full z-[80] mb-2 w-56 overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-xl"
      : "absolute right-0 top-full z-[80] mt-2 w-56 overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-xl";

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
          setOpen((prev) => !prev);
        }}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Account menu"
        className="rounded-full shadow-sm hover:opacity-90"
      >
        <UserAvatar user={user} size={avatarSize} />
      </button>
      {label ? <span className={labelClass}>{label}</span> : null}

      {open && (
        <div
          role="menu"
          className={`${panelClass}${actionsReady ? "" : " pointer-events-none"}`}
        >
          <MenuLink href="/cuhk" onClick={() => setOpen(false)}>
            CUHK home
          </MenuLink>
          <MenuLink href={trackHref} onClick={() => setOpen(false)}>
            My Orders{activeCount > 0 ? ` (${activeCount})` : ""}
          </MenuLink>
          <MenuLink href="/profile" onClick={() => setOpen(false)}>
            Profile Settings
          </MenuLink>
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              setOpen(false);
              setPasswordOpen(true);
            }}
            className="block w-full px-4 py-2.5 text-left text-sm text-gray-700 hover:bg-gray-50"
          >
            Change Password
          </button>
          <div className="border-t border-gray-100">
            <button
              type="button"
              role="menuitem"
              onClick={(event) => {
                event.preventDefault();
                event.stopPropagation();
                if (!actionsReady) return;
                void signOut();
              }}
              className="flex w-full px-4 py-2.5 text-left text-sm font-semibold text-[#ED1C24] hover:bg-red-50"
            >
              Sign Out
            </button>
          </div>
        </div>
      )}

      <ChangePasswordModal open={passwordOpen} onClose={() => setPasswordOpen(false)} />
    </div>
  );
}

function MenuLink({
  href,
  onClick,
  children,
}: {
  href: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      role="menuitem"
      onClick={onClick}
      className="block px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50"
    >
      {children}
    </Link>
  );
}
