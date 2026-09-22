"use client";

import Link from "next/link";
import { useUser } from "@/context/UserContext";
import { runnerEntryHref } from "@/lib/nav";
import { usePendingRunnerOrderCount } from "@/lib/use-pending-runner-orders";

type RunnerQueueBellProps = {
  className?: string;
};

/**
 * Header bell for available runner deliveries. Always visible next to Runner;
 * red badge appears when the pending queue is non-empty.
 */
export function RunnerQueueBell({ className = "" }: RunnerQueueBellProps) {
  const { user, setMode, canRunnerMode } = useUser();
  const count = usePendingRunnerOrderCount();

  const href = runnerEntryHref({
    loggedIn: Boolean(user),
    canRunnerMode,
  });

  const label =
    count <= 0
      ? "Available deliveries — open runner view"
      : count === 1
        ? "1 available delivery — open runner view"
        : `${count} available deliveries — open runner view`;

  return (
    <Link
      href={href}
      onClick={() => {
        if (canRunnerMode) setMode("runner");
      }}
      className={`relative inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-700 transition-colors hover:bg-gray-50 hover:text-[#ED1C24] ${className}`}
      aria-label={label}
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
    </Link>
  );
}
