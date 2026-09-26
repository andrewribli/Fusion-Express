"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { resolveCampus, type CampusId } from "@fusion-express/shared/campus";
import { subscribeRunnerActiveOrders } from "@/lib/orders";
import { ORDER_STATUS_LABELS } from "@/lib/order-status";
import type { Order } from "@/lib/types";
import { useUser } from "@/context/UserContext";
import { campusFromPathname } from "@/lib/campus-routes";
import { formatDeliveryAddress } from "@/data/cuhk-locations";
import { requestRunnerBoardRefresh } from "@/lib/runner-board-refresh";
import { usePendingRunnerOrders } from "@/lib/use-pending-runner-orders";

type RunnerHeaderShortcutsProps = {
  className?: string;
  /** Dark hub circles match the existing header icons. */
  tone?: "light" | "dark";
  /** Customer hubs already have the available-orders bell. */
  ordersOnly?: boolean;
};

function headerCampus(pathname: string, profileCampus?: string | null): CampusId {
  return (
    campusFromPathname(pathname) ??
    (profileCampus ? resolveCampus(profileCampus) : "cuhk")
  );
}

function availableHref(campus: CampusId): string {
  return campus === "cityu" ? "/cityu/runner/dashboard" : "/runner/dashboard";
}

function chatHref(order: Order, campus: CampusId): string {
  const orderCampus = order.campus ?? campus;
  return orderCampus === "cityu"
    ? `/cityu/chat/${order.id}`
    : `/chat/${order.id}`;
}

function firstName(name: string | undefined): string {
  const part = (name ?? "").trim().split(/\s+/)[0];
  return part || "Customer";
}

function timeSince(date: Date, now: number): string {
  const minutes = Math.max(0, Math.floor((now - date.getTime()) / 60000));
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function iconButtonClass(className: string, tone: "light" | "dark"): string {
  const toneClass =
    tone === "dark"
      ? "border border-white/15 bg-[#161616] text-white transition-colors hover:bg-[#1f1f1f]"
      : "border border-gray-200 bg-white text-gray-700 transition-colors hover:bg-gray-50 hover:text-[#ED1C24]";
  return `relative inline-flex shrink-0 items-center justify-center ${toneClass} ${className}`;
}

export function RunnerHeaderShortcuts({
  className = "h-11 w-11 rounded-full",
  tone = "light",
  ordersOnly = false,
}: RunnerHeaderShortcutsProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, setMode, canRunnerMode } = useUser();
  const { count: pendingCount } = usePendingRunnerOrders();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  const rootRef = useRef<HTMLDivElement>(null);
  const campus = headerCampus(pathname, user?.campus);
  const visible = orders;
  const activeCount = visible.length;
  const hasCurrent = activeCount > 0;

  useEffect(() => {
    if (!user?.uid || !user.isRunner) {
      setOrders([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    return subscribeRunnerActiveOrders(
      user.uid,
      (next) => {
        setOrders(next);
        setLoading(false);
      },
      () => setLoading(false),
    );
  }, [user?.uid, user?.isRunner]);

  useEffect(() => {
    if (!open) return;
    setNow(Date.now());
    const id = window.setInterval(() => setNow(Date.now()), 30_000);
    return () => window.clearInterval(id);
  }, [open]);

  useEffect(() => {
    if (!open) return;

    function onPointerDown(event: MouseEvent | TouchEvent) {
      const root = rootRef.current;
      if (!root) return;
      if (event.target instanceof Node && !root.contains(event.target)) {
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
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("touchstart", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  function openAvailable() {
    if (canRunnerMode) setMode("runner");
    const href = availableHref(campus);
    if (pathname === href) {
      requestRunnerBoardRefresh();
      return;
    }
    router.push(href);
  }

  function openChat(order: Order) {
    setOpen(false);
    router.push(chatHref(order, campus));
  }

  const availableLabel =
    pendingCount <= 0
      ? "Available deliveries"
      : pendingCount === 1
        ? "1 available delivery"
        : `${pendingCount} available deliveries`;

  const currentLabel =
    activeCount <= 0
      ? "Current order"
      : activeCount === 1
        ? "1 current order"
        : `${activeCount} current orders`;

  return (
    <>
      {!ordersOnly && (
      <div className="group relative self-center">
        <button
          type="button"
          onClick={openAvailable}
          className={iconButtonClass(className, tone)}
          aria-label={availableLabel}
          title={hasCurrent ? "Finish your current delivery first." : availableLabel}
        >
          <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" aria-hidden>
            <path
              d="M6 9a6 6 0 1 1 12 0c0 3.2.8 4.6 1.5 5.5.3.4 0 1-.5 1H5c-.5 0-.8-.6-.5-1C5.2 13.6 6 12.2 6 9Z"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinejoin="round"
            />
            <path
              d="M10 18a2 2 0 0 0 4 0"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            />
          </svg>
          {pendingCount > 0 && (
            <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-[#ED1C24] px-1 text-[10px] font-bold text-white">
              {pendingCount > 99 ? "99+" : pendingCount}
            </span>
          )}
        </button>
        {hasCurrent && (
          <span className="pointer-events-none absolute right-0 top-full z-[70] mt-1 hidden w-max max-w-[12.5rem] rounded-lg bg-gray-900 px-2 py-1 text-left text-[11px] font-medium leading-snug text-white group-hover:block group-focus-within:block">
            Finish your current delivery first.
          </span>
        )}
      </div>
      )}

      <div ref={rootRef} className="relative self-center">
        <button
          type="button"
          onClick={() => setOpen((value) => !value)}
          className={iconButtonClass(className, tone)}
          aria-label={currentLabel}
          aria-expanded={open}
          aria-haspopup="menu"
        >
          <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" aria-hidden>
            <path
              d="M6.5 8h11l-1 12h-9l-1-12Z"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinejoin="round"
            />
            <path
              d="M9 8V7a3 3 0 0 1 6 0v1"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            />
          </svg>
          {activeCount > 0 && (
            <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-[#ED1C24] px-1 text-[10px] font-bold text-white">
              {activeCount > 99 ? "99+" : activeCount}
            </span>
          )}
        </button>

        {open && (
          <div
            className="absolute right-0 top-full z-[80] mt-2 w-[min(18rem,calc(100vw-1.5rem))] overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-xl"
            role="menu"
            aria-label="Current orders"
          >
            <div className="border-b border-gray-100 px-3 py-2.5">
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                Current order
              </p>
            </div>
            {loading && visible.length === 0 ? (
              <p className="px-3 py-4 text-sm text-gray-500">Loading…</p>
            ) : visible.length === 0 ? (
              <p className="px-3 py-4 text-sm text-gray-600">
                No active deliveries right now.
              </p>
            ) : (
              <ul className="max-h-72 overflow-y-auto py-1">
                {visible.map((order) => {
                  const dorm =
                    formatDeliveryAddress(order.college, order.hall) || "Dorm TBD";
                  return (
                    <li key={order.id}>
                      <button
                        type="button"
                        role="menuitem"
                        onClick={() => openChat(order)}
                        className="flex w-full items-start gap-2 px-3 py-2.5 text-left hover:bg-gray-50"
                      >
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-semibold text-gray-900">
                            {firstName(order.customerName)} · {dorm}
                          </span>
                          <span className="mt-0.5 block text-xs text-gray-500">
                            {timeSince(order.updatedAt, now)}
                          </span>
                        </span>
                        <span className="shrink-0 rounded-full bg-red-50 px-2 py-0.5 text-[11px] font-semibold text-[#ED1C24]">
                          {ORDER_STATUS_LABELS[order.status]}
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        )}
      </div>
    </>
  );
}
