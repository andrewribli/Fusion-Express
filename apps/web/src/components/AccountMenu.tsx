"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ChangePasswordModal } from "@/components/ChangePasswordModal";
import { useUser, type UserProfile } from "@/context/UserContext";

function initials(user: UserProfile): string {
  const parts = user.fullName.trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return `${parts[0][0] ?? ""}${parts[1][0] ?? ""}`.toUpperCase();
  }
  if (parts.length === 1 && parts[0].length >= 2) {
    return parts[0].slice(0, 2).toUpperCase();
  }
  const handle = (user.username || user.studentId || "").replace(/[^a-zA-Z0-9]/g, "");
  if (handle.length >= 2) return handle.slice(0, 2).toUpperCase();
  if (handle.length === 1) return handle.toUpperCase();
  return "";
}

function DefaultUserIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor" aria-hidden>
      <path d="M12 12a4 4 0 1 0-4-4 4 4 0 0 0 4 4Zm0 2c-4.42 0-8 2.24-8 5v1h16v-1c0-2.76-3.58-5-8-5Z" />
    </svg>
  );
}

export function AccountMenu() {
  const { user, logout } = useUser();
  const [open, setOpen] = useState(false);
  const [passwordOpen, setPasswordOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const letters = user ? initials(user) : "";

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

  if (!user) {
    return (
      <Link
        href="/login"
        aria-label="Sign in"
        className="flex h-10 w-10 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-600 hover:border-[#ED1C24] hover:text-[#ED1C24]"
      >
        <DefaultUserIcon />
      </Link>
    );
  }

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
        aria-label="Account menu"
        className="flex h-10 w-10 items-center justify-center rounded-full bg-[#ED1C24] text-[12px] font-bold text-white shadow-sm hover:bg-[#d11920]"
      >
        {letters || <DefaultUserIcon />}
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 z-50 mt-2 w-56 overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-xl"
        >
          <MenuLink href="/track" onClick={() => setOpen(false)}>
            My Orders
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
              onClick={signOut}
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
