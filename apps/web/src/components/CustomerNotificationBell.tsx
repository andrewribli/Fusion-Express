"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useUser, getUserAccountId } from "@/context/UserContext";
import {
  useCustomerNotifications,
  type CustomerNotification,
} from "@/lib/use-customer-notifications";

type CustomerNotificationBellProps = {
  className?: string;
};

function accentClass(n: CustomerNotification): string {
  if (n.type === "discount_received" || n.accent === "gold" || n.accent === "green") {
    return "border-l-4 border-l-amber-400 bg-gradient-to-r from-amber-50 to-emerald-50";
  }
  return "border-l-4 border-l-[#ED1C24]/40 bg-white";
}

/**
 * Customer-facing in-app notification bell (canteen pickup + college discount).
 */
export function CustomerNotificationBell({
  className = "",
}: CustomerNotificationBellProps) {
  const { user } = useUser();
  const router = useRouter();
  const userId = user ? getUserAccountId(user) : undefined;
  const { notifications, unreadCount, markRead } =
    useCustomerNotifications(userId);
  const [open, setOpen] = useState(false);
  const [hoverCapable, setHoverCapable] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

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

  if (!user) return null;

  const label =
    unreadCount <= 0
      ? "Notifications"
      : unreadCount === 1
        ? "1 unread notification"
        : `${unreadCount} unread notifications`;

  async function openNotification(n: CustomerNotification) {
    setOpen(false);
    if (!n.read) void markRead(n.id);
    const href =
      n.href ||
      (n.orderId ? `/track?orderId=${encodeURIComponent(n.orderId)}` : null);
    if (href) router.push(href);
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
        className={`relative inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-700 transition-colors hover:bg-gray-50 hover:text-[#ED1C24] ${className}`}
        aria-label={label}
        aria-expanded={open}
        aria-haspopup="true"
        title={label}
      >
        <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" aria-hidden>
          <path
            d="M6 9a6 6 0 1 1 12 0c0 3.2.8 4.6 1.5 5.5.3.4 0 1-.5 1H5c-.5 0-.8-.6-.5-1C5.2 13.6 6 12.2 6 9Z"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinejoin="round"
          />
          <path
            d="M10 19a2 2 0 0 0 4 0"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
          />
        </svg>
        {unreadCount > 0 && (
          <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-[#ED1C24] px-1 text-[10px] font-bold text-white">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 z-[80] mt-2 w-[min(92vw,340px)] overflow-hidden rounded-xl border border-gray-200 bg-white shadow-xl">
          <div className="border-b border-gray-100 px-3 py-2">
            <p className="text-xs font-bold uppercase tracking-wide text-gray-500">
              Notifications
            </p>
          </div>
          {notifications.length === 0 ? (
            <p className="px-3 py-6 text-center text-sm text-gray-500">
              No notifications yet.
            </p>
          ) : (
            <ul className="max-h-80 overflow-y-auto">
              {notifications.map((n) => (
                <li key={n.id}>
                  <button
                    type="button"
                    onClick={() => void openNotification(n)}
                    className={`flex w-full flex-col gap-1 px-3 py-3 text-left transition-colors hover:bg-gray-50 ${accentClass(n)} ${
                      n.read ? "opacity-70" : ""
                    }`}
                  >
                    {(n.type === "discount_received" ||
                      n.accent === "gold" ||
                      n.accent === "green") && (
                      <span className="text-[10px] font-bold uppercase tracking-wide text-amber-700">
                        College discount
                      </span>
                    )}
                    <span className="text-sm font-medium text-gray-900">
                      {n.message}
                    </span>
                    <span className="text-[11px] text-gray-500">
                      {n.createdAt.toLocaleString("en-HK", {
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
