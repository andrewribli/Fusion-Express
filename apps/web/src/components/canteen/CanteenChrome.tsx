"use client";

import Link from "next/link";
import { AppLogo } from "@/components/AppLogo";
import { RunnerQueueBell } from "@/components/RunnerQueueBell";
import { AccountMenu } from "@/components/AccountMenu";
import { useCart } from "@/context/CartContext";

export function CanteenChrome({
  subtitle,
  backHref = "/canteen",
  backLabel = "Canteens",
}: {
  subtitle?: string;
  backHref?: string;
  backLabel?: string;
}) {
  const { itemCount } = useCart();

  return (
    <header className="sticky top-0 z-40 border-b border-white/10 bg-[#0c0c0c]/95 backdrop-blur">
      <div className="mx-auto flex max-w-lg items-center justify-between gap-2 px-4 py-3">
        <div className="min-w-0">
          <Link href="/" className="flex items-center gap-2" aria-label="GraceRun home">
            <AppLogo size={36} className="h-9 w-9" />
            <div className="min-w-0">
              <p className="truncate text-sm font-bold text-white">GraceRun</p>
              {subtitle ? (
                <p className="truncate text-[11px] text-zinc-500">{subtitle}</p>
              ) : null}
            </div>
          </Link>
          <Link
            href={backHref}
            className="mt-1 inline-block text-xs text-zinc-400 hover:text-white"
          >
            ← {backLabel}
          </Link>
        </div>
        <div className="flex items-center gap-2">
          <RunnerQueueBell className="h-10 w-10 rounded-full border-white/15 bg-[#161616] text-white hover:bg-[#1f1f1f]" />
          <Link
            href="/cart"
            className="relative rounded-full border border-white/15 px-3 py-2 text-xs font-semibold text-white hover:bg-white/5"
          >
            Cart
            {itemCount > 0 ? (
              <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-[#ED1C24] px-1 text-[10px] font-bold">
                {itemCount > 99 ? "99+" : itemCount}
              </span>
            ) : null}
          </Link>
          <AccountMenu />
        </div>
      </div>
    </header>
  );
}
