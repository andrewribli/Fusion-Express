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
    <header className="sticky top-0 z-40 overflow-visible border-b border-white/10 bg-[#0c0c0c]/95 backdrop-blur">
      <div className="mx-auto flex max-w-lg items-center justify-between gap-2 px-3 py-3 sm:px-4">
        <div className="min-w-0">
          <Link href="/cuhk" className="flex min-w-0 items-center gap-2" aria-label="CUHK home">
            <AppLogo size={36} className="hidden h-9 w-9 sm:block" />
            <div className="min-w-0">
              <p className="hidden max-h-5 truncate text-[13px] font-extrabold leading-5 tracking-tight text-white min-[361px]:block">
                GraceRun
              </p>
              {subtitle ? (
                <p className="hidden truncate text-[11px] text-zinc-500 sm:block">
                  {subtitle}
                </p>
              ) : null}
            </div>
          </Link>
          <Link
            href={backHref}
            className="mt-1 hidden h-11 items-center text-xs text-zinc-400 hover:text-white min-[361px]:inline-flex"
          >
            ← {backLabel}
          </Link>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <RunnerQueueBell className="h-11 w-11 rounded-full border border-white/15 bg-[#161616] text-white hover:bg-[#1f1f1f]" />
          <Link
            href="/cart"
            className="relative flex h-11 items-center rounded-full border border-white/15 px-3 text-xs font-semibold text-white hover:bg-white/5"
          >
            Cart
            {itemCount > 0 ? (
              <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-[#ED1C24] px-1 text-[10px] font-bold">
                {itemCount > 99 ? "99+" : itemCount}
              </span>
            ) : null}
          </Link>
          <div className="flex h-11 w-11 items-center justify-center">
            <AccountMenu />
          </div>
        </div>
      </div>
    </header>
  );
}
