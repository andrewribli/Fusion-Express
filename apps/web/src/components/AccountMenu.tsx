"use client";

import { ChangePasswordModal } from "@/components/ChangePasswordModal";
import { useUser, type UserProfile } from "@/context/UserContext";
import { useActiveCustomerOrders } from "@/lib/use-active-orders";
import { isAdminAllowlistEmail } from "@/lib/admin-emails";
import { isAdminUser } from "@/lib/admins";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";

function initials(user: UserProfile): string {
  const parts = user.fullName.trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return `${parts[0][0] ?? ""}${parts[1][0] ?? ""}`.toUpperCase();
  }
  if (parts.length === 1 && parts[0].length >= 2) {
    return parts[0].slice(0, 2).toUpperCase();
  }
  const handle = (user.email || "").replace(/[^a-zA-Z0-9]/g, "");
  if (handle.length >= 2) return handle.slice(0, 2).toUpperCase();
  if (handle.length === 1) return handle.toUpperCase();
  return "";
}

function DefaultUserIcon({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden>
      <path d="M12 12a4 4 0 1 0-4-4 4 4 0 0 0 4 4Zm0 2c-4.42 0-8 2.24-8 5v1h16v-1c0-2.76-3.58-5-8-5Z" />
    </svg>
  );
}

function HeaderAvatar({
  user,
}: {
  user: UserProfile | null;
}) {
  const [imageFailed, setImageFailed] = useState(false);
  const letters = user ? initials(user) : "";
  const photoURL = user?.photoURL?.trim();
  const showPhoto = Boolean(photoURL) && !imageFailed;

  if (!user) {
    return (
      <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[#2a2a2a] text-gray-300">
        <DefaultUserIcon className="h-4 w-4" />
      </span>
    );
  }

  if (showPhoto) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={photoURL}
        alt=""
        className="h-9 w-9 rounded-full object-cover"
        onError={() => setImageFailed(true)}
      />
    );
  }

  return (
    <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[#ED1C24] text-[11px] font-bold text-white">
      {letters || <DefaultUserIcon className="h-4 w-4 text-white" />}
    </span>
  );
}

export function AccountMenu({
  hideThemeChip: _hideThemeChip = false,
}: {
  /** Unused — colorways are unified to the homepage. */
  hideThemeChip?: boolean;
}) {
  const { user, logout } = useUser();
  const { href: trackHref, count: activeCount } = useActiveCustomerOrders();
  const [open, setOpen] = useState(false);
  const [passwordOpen, setPasswordOpen] = useState(false);
  const [showAdmin, setShowAdmin] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;
    if (!user?.uid || !isAdminAllowlistEmail(user.email)) {
      setShowAdmin(false);
      return;
    }
    void isAdminUser({ uid: user.uid, email: user.email }).then((ok) => {
      if (!cancelled) setShowAdmin(ok);
    });
    return () => {
      cancelled = true;
    };
  }, [user?.uid, user?.email]);

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
      <div className="flex items-center gap-1.5">
        <Link
          href="/login"
          aria-label="Sign in"
          className="flex h-9 w-9 items-center justify-center rounded-full hover:opacity-90"
        >
          <HeaderAvatar user={null} />
        </Link>
      </div>
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
        className="rounded-full shadow-sm hover:opacity-90"
      >
        <HeaderAvatar user={user} />
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 z-50 mt-2 w-56 overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-xl"
        >
          <MenuLink href={trackHref} onClick={() => setOpen(false)}>
            My Orders{activeCount > 0 ? ` (${activeCount})` : ""}
          </MenuLink>
          <MenuLink href="/profile" onClick={() => setOpen(false)}>
            Profile Settings
          </MenuLink>
          {showAdmin ? (
            <>
              <AdminMenuLink href="/admin/broadcast" onClick={() => setOpen(false)}>
                Admin broadcast
              </AdminMenuLink>
              <AdminMenuLink href="/admin/chats" onClick={() => setOpen(false)}>
                Admin chats
              </AdminMenuLink>
              <AdminMenuLink href="/admin/users" onClick={() => setOpen(false)}>
                Admin users
              </AdminMenuLink>
            </>
          ) : null}
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

function AdminMenuLink({
  href,
  onClick,
  children,
}: {
  href: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      role="menuitem"
      className="block w-full px-4 py-2.5 text-left text-sm text-gray-700 hover:bg-gray-50"
      onClick={() => {
        onClick();
        void (async () => {
          try {
            const { getAuthClient } = await import("@/lib/firebase");
            const token = await getAuthClient().currentUser?.getIdToken();
            if (token) {
              await fetch("/api/admin/session", {
                method: "POST",
                headers: { Authorization: `Bearer ${token}` },
              });
            }
          } catch {
            /* ignore */
          }
          window.location.href = href;
        })();
      }}
    >
      {children}
    </button>
  );
}
