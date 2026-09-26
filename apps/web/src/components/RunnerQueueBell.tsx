"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useUser } from "@/context/UserContext";
import { runnerEntryHref } from "@/lib/nav";
import {
  usePendingRunnerOrders,
  type PendingQueueItem,
} from "@/lib/use-pending-runner-orders";

type RunnerQueueBellProps = {
  className?: string;
};

function shortOrderId(id: string): string {
  if (id.length <= 10) return id;
  return `${id.slice(0, 6)}…${id.slice(-4)}`;
}

/**
 * Header bell for available runner deliveries.
 * Hover (desktop) or tap (mobile) opens a dark dropdown of pending jobs.
 */
export function RunnerQueueBell({ className = "" }: RunnerQueueBellProps) {
  const { user, setMode, canRunnerMode } = useUser();
  const { count, orders } = usePendingRunnerOrders();
  const [open, setOpen] = useState(false);
  const [hoverCapable, setHoverCapable] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  const href = runnerEntryHref({
    loggedIn: Boolean(user),
    canRunnerMode,
  });

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

  const label =
    count <= 0
      ? "Available deliveries"
      : count === 1
        ? "1 available delivery"
        : `${count} available deliveries`;

  function goRunner() {
    if (canRunnerMode) setMode("runner");
    setOpen(false);
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
        className={`relative inline-flex shrink-0 items-center justify-center ${
          className ||
          "h-10 w-10 rounded-lg border border-gray-200 bg-white text-gray-700 transition-colors hover:bg-gray-50 hover:text-[#ED1C24]"
        }`}
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
            d="M10 18a2 2 0 0 0 4 0"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
          />
        </svg>
        {count > 0 && (
          <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-[#ED1C24] px-1 text-[10px] font-bold text-white">
            {count > 99 ? "99+" : count}
          </span>
        )}
      </button>

      {open && (
        <div
          className="absolute right-0 z-[60] mt-2 w-72 overflow-hidden rounded-2xl border border-white/10 bg-[#1a1a1a] shadow-xl shadow-black/40"
          role="menu"
          aria-label="Available deliveries"
        >
          <div className="border-b border-white/10 px-3 py-2.5">
            <p className="text-xs font-semibold uppercase tracking-wide text-white/60">
              Available deliveries
            </p>
          </div>

          {orders.length === 0 ? (
            <p className="px-3 py-4 text-sm text-white/70">
              No available deliveries right now.
            </p>
          ) : (
            <ul className="max-h-72 overflow-y-auto py-1">
              {orders.map((order) => (
                <QueueRow
                  key={order.id}
                  order={order}
                  href={href}
                  onView={goRunner}
                />
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

function QueueRow({
  order,
  href,
  onView,
}: {
  order: PendingQueueItem;
  href: string;
  onView: () => void;
}) {
  return (
    <li className="flex items-center gap-2 border-b border-white/5 px-3 py-2.5 last:border-b-0">
      <div className="min-w-0 flex-1">
        <p className="truncate font-mono text-xs font-semibold text-white">
          {shortOrderId(order.id)}
        </p>
        <p className="truncate text-xs text-white/60">{order.dorm}</p>
      </div>
      <Link
        href={href}
        role="menuitem"
        onClick={onView}
        className="shrink-0 rounded-lg bg-[#ED1C24] px-2.5 py-1.5 text-xs font-bold text-white hover:bg-[#c9171e]"
      >
        View
      </Link>
    </li>
  );
}
