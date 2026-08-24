"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useUser, type UserProfile } from "@/context/UserContext";

function accountHandle(user: UserProfile): string {
  return user.username || user.studentId || user.fullName;
}

function initials(user: UserProfile): string {
  const handle = accountHandle(user).replace(/[^a-zA-Z0-9]/g, "");
  if (handle.length >= 2) return handle.slice(0, 2).toUpperCase();
  if (handle.length === 1) return handle.toUpperCase();
  const parts = user.fullName.trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return `${parts[0][0] ?? ""}${parts[1][0] ?? ""}`.toUpperCase();
  }
  return "FE";
}

function avatarHue(seed: string): string {
  let hash = 0;
  for (const ch of seed) hash = (hash * 31 + ch.charCodeAt(0)) | 0;
  const hues = [354, 14, 199, 162, 271, 32];
  return `hsl(${hues[Math.abs(hash) % hues.length]} 72% 42%)`;
}

export function AccountMenu() {
  const { user, logout } = useUser();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    function onPointerDown(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }

    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  if (!user) return null;

  const handle = accountHandle(user);
  const hue = avatarHue(handle);

  async function signOut() {
    setOpen(false);
    await logout();
    window.location.href = "/";
  }

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={`Account menu for ${handle}`}
        className="flex max-w-[9.5rem] items-center gap-1.5 rounded-full border border-gray-200 bg-white py-1 pl-1 pr-2.5 text-left hover:border-gray-300 hover:bg-gray-50 sm:max-w-[12rem]"
      >
        <span
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[11px] font-bold text-white"
          style={{ backgroundColor: hue }}
        >
          {initials(user)}
        </span>
        <span className="min-w-0">
          <span className="block truncate text-[11px] font-semibold leading-tight text-gray-900">
            {handle}
          </span>
          <span className="block truncate text-[10px] leading-tight text-gray-500">
            {user.isRunner ? "Runner" : "Customer"}
          </span>
        </span>
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 z-50 mt-2 w-64 overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-xl"
        >
          <div className="border-b border-gray-100 px-4 py-3">
            <p className="text-[11px] font-medium uppercase tracking-wide text-gray-400">
              Signed in as
            </p>
            <p className="mt-1 truncate text-sm font-bold text-gray-900">
              @{handle}
            </p>
            {user.fullName && (
              <p className="truncate text-xs text-gray-600">{user.fullName}</p>
            )}
            {(user.hall || user.college) && (
              <p className="mt-1 truncate text-xs text-gray-500">
                {[user.hall, user.college].filter(Boolean).join(" · ")}
              </p>
            )}
          </div>

          <div className="py-1">
            <MenuLink href="/profile" onClick={() => setOpen(false)}>
              Profile &amp; address
            </MenuLink>
            <MenuLink href="/orders" onClick={() => setOpen(false)}>
              My orders
            </MenuLink>
            <MenuLink href="/track" onClick={() => setOpen(false)}>
              Track an order
            </MenuLink>
            <MenuLink href="/menu" onClick={() => setOpen(false)}>
              Create an order
            </MenuLink>
            <MenuLink href="/runner" onClick={() => setOpen(false)}>
              {user.isRunner ? "Runner dashboard" : "Pick up an order"}
            </MenuLink>
          </div>

          <div className="border-t border-gray-100 py-1">
            <button
              type="button"
              role="menuitem"
              onClick={signOut}
              className="flex w-full px-4 py-2.5 text-left text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Switch account
            </button>
            <button
              type="button"
              role="menuitem"
              onClick={signOut}
              className="flex w-full px-4 py-2.5 text-left text-sm font-semibold text-fusion-red hover:bg-red-50"
            >
              Sign out
            </button>
          </div>
        </div>
      )}
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
