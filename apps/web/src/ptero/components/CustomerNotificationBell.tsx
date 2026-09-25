"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useUser } from "@/ptero/context/AppState";
import {
  listNotifications,
  markNotificationRead,
  unreadNotificationCount,
} from "@/ptero/lib/canteen/notify";
import type { CustomerNotification } from "@/ptero/lib/types";

type Props = { className?: string; tone?: "light" | "dark" };

function accentClass(n: CustomerNotification): string {
  if (n.type === "discount_received" || n.accent === "gold" || n.accent === "green") {
    return "border-l-4 border-l-amber-400 bg-gradient-to-r from-amber-50 to-emerald-50";
  }
  return "border-l-4 border-l-[#ED1C24]/40 bg-white";
}

/**
 * Customer-facing notification bell (college discount + order events).
 * Prototype: localStorage notifications + email outbox mirror.
 */
export function CustomerNotificationBell({
  className = "",
  tone = "light",
}: Props) {
  const { user } = useUser();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [hoverCapable, setHoverCapable] = useState(false);
  const [notifications, setNotifications] = useState<CustomerNotification[]>([]);
  const [unread, setUnread] = useState(0);
  const rootRef = useRef<HTMLDivElement>(null);

  function refresh() {
    if (!user || user.isGuest) {
      setNotifications([]);
      setUnread(0);
      return;
    }
    setNotifications(listNotifications(user.uid));
    setUnread(unreadNotificationCount(user.uid));
  }

  useEffect(() => {
    refresh();
    const onSync = () => refresh();
    window.addEventListener("gracerun-cityu-sync", onSync);
    window.addEventListener("storage", onSync);
    return () => {
      window.removeEventListener("gracerun-cityu-sync", onSync);
      window.removeEventListener("storage", onSync);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.uid, user?.isGuest]);

  useEffect(() => {
    const mq = window.matchMedia("(hover: hover) and (pointer: fine)");
    const sync = () => setHoverCapable(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  useEffect(() => {
    if (!open || hoverCapable) return;
    function onPointerDown(event: MouseEvent | TouchEvent) {
      const root = rootRef.current;
      if (!root) return;
      if (event.target instanceof Node && !root.contains(event.target)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("touchstart", onPointerDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("touchstart", onPointerDown);
    };
  }, [open, hoverCapable]);

  const signedIn = Boolean(user && !user.isGuest);

  const label =
    unread <= 0
      ? "Notifications"
      : unread === 1
        ? "1 unread notification"
        : `${unread} unread notifications`;

  function openNotification(n: CustomerNotification) {
    setOpen(false);
    if (!n.read) markNotificationRead(n.id);
    refresh();
    if (n.href) router.push(n.href);
  }

  return (
    <div
      ref={rootRef}
      className="relative"
      onMouseEnter={() => {
        if (hoverCapable) setOpen(true);
      }}
      onMouseLeave={() => {
        if (hoverCapable) setOpen(false);
      }}
    >
      <button
        type="button"
        onClick={() => {
          if (!hoverCapable) setOpen((v) => !v);
        }}
        className={
          className ||
          (tone === "dark"
            ? "relative inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-white/15 bg-[#161616] text-white transition-colors hover:bg-[#1f1f1f]"
            : "relative inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-700 transition-colors hover:bg-gray-50 hover:text-[#ED1C24]")
        }
        aria-label={label}
        aria-expanded={open}
        title={label}
      >
        <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" aria-hidden>
          <path
            d="M6 9a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M10 19a2 2 0 0 0 4 0"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
          />
        </svg>
        {unread > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-amber-400 px-1 text-[9px] font-bold text-gray-900">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 z-[80] mt-2 w-80 overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-xl">
          <div className="border-b border-gray-100 px-3 py-2">
            <p className="text-xs font-bold text-gray-900">Notifications</p>
          </div>
          {!signedIn ? (
            <div className="space-y-2 px-3 py-4 text-center">
              <p className="text-xs text-gray-500">
                Sign in with your CityU email to get order updates and discount
                alerts.
              </p>
              <button
                type="button"
                onClick={() => {
                  setOpen(false);
                  router.push("/cityu/login");
                }}
                className="rounded-xl bg-[#ED1C24] px-3 py-2 text-xs font-bold text-white"
              >
                Sign in
              </button>
            </div>
          ) : (
            <ul className="max-h-80 overflow-y-auto">
              {notifications.length === 0 ? (
                <li className="px-3 py-6 text-center text-xs text-gray-500">
                  No notifications yet.
                </li>
              ) : (
                notifications.map((n) => (
                  <li key={n.id}>
                    <button
                      type="button"
                      onClick={() => openNotification(n)}
                      className={`w-full px-3 py-2.5 text-left ${accentClass(n)} ${
                        n.read ? "opacity-70" : ""
                      }`}
                    >
                      <p className="text-xs font-bold text-gray-900">{n.title}</p>
                      <p className="mt-0.5 text-[11px] leading-snug text-gray-600">
                        {n.body}
                      </p>
                      {n.emailTo && n.emailSubject ? (
                        <p className="mt-1 text-[10px] text-amber-700">
                          Email queued → {n.emailTo}: {n.emailSubject}
                        </p>
                      ) : null}
                    </button>
                  </li>
                ))
              )}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
