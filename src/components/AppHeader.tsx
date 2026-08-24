"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { AccountMenu } from "@/components/AccountMenu";
import { AppLogo } from "@/components/AppLogo";
import { useCart } from "@/context/CartContext";
import { useUser } from "@/context/UserContext";

interface AppHeaderProps {
  showBack?: boolean;
  backHref?: string;
  title?: string;
}

export function AppHeader({ showBack, backHref = "/home", title }: AppHeaderProps) {
  const { itemCount } = useCart();
  const { user } = useUser();
  const pathname = usePathname();

  const isHome = pathname === "/home" || (pathname === "/" && Boolean(user));
  const onRunnerPages = pathname.startsWith("/runner");
  const wide =
    pathname.startsWith("/menu") ||
    pathname.startsWith("/browse") ||
    pathname.startsWith("/cart") ||
    pathname.startsWith("/checkout");

  return (
    <header
      className={`sticky top-0 z-50 overflow-visible border-b shadow-sm backdrop-blur ${
        isHome
          ? "border-gray-100 bg-white/95"
          : "border-lakers-gold/40 bg-lakers-navy/95"
      }`}
    >
      <div
        className={`mx-auto flex items-center justify-between gap-2 px-4 py-3 ${
          wide ? "max-w-7xl" : "max-w-[480px]"
        }`}
      >
        <div className="flex min-w-0 items-center gap-2">
          {showBack && (
            <Link
              href={backHref}
              className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${
                isHome ? "bg-gray-100 text-gray-700" : "bg-white/15 text-lakers-gold"
              }`}
              aria-label="Go back"
            >
              ←
            </Link>
          )}
          <Link href="/home" className="shrink-0" aria-label="Fusion Express home">
            <AppLogo size={32} className="h-8 w-8" />
          </Link>
          <div className="min-w-0">
            <p
              className={`truncate text-sm font-bold ${
                isHome ? "text-gray-900" : "text-lakers-gold"
              }`}
            >
              {title ?? "Fusion Express"}
            </p>
          </div>
        </div>

        <nav className="flex shrink-0 items-center gap-1.5">
          {!onRunnerPages && (
            <Link
              href="/runner"
              className={
                isHome
                  ? "hidden rounded-full bg-red-50 px-2.5 py-1.5 text-xs font-semibold text-fusion-red sm:inline"
                  : "hidden rounded-full bg-lakers-gold px-2.5 py-1.5 text-xs font-semibold text-lakers-navy sm:inline"
              }
            >
              Pick up an order
            </Link>
          )}
          <Link
            href="/home"
            className={`hidden rounded-full px-2 py-1.5 text-xs font-medium md:inline ${
              isHome ? "text-gray-600 hover:text-fusion-red" : "text-white/80 hover:text-lakers-gold"
            }`}
          >
            Home
          </Link>
          {user?.isRunner && (
            <Link
              href="/runner/dashboard"
              className={`hidden rounded-full px-2 py-1.5 text-xs font-medium md:inline ${
                isHome ? "text-gray-600 hover:text-fusion-red" : "text-white/80 hover:text-lakers-gold"
              }`}
            >
              Runner
            </Link>
          )}
          <Link
            href="/orders"
            className={`hidden rounded-full px-2 py-1.5 text-xs font-medium md:inline ${
              isHome ? "text-gray-600 hover:text-fusion-red" : "text-white/80 hover:text-lakers-gold"
            }`}
          >
            Orders
          </Link>
          <Link
            href="/cart"
            className={`relative flex h-10 w-10 items-center justify-center rounded-full shadow-sm ${
              isHome ? "bg-fusion-red text-white" : "bg-lakers-gold text-lakers-navy"
            }`}
            aria-label="Cart"
          >
            🛒
            {itemCount > 0 && (
              <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-gray-900 px-1 text-[10px] font-bold">
                {itemCount > 99 ? "99+" : itemCount}
              </span>
            )}
          </Link>
          <AccountMenu />
        </nav>
      </div>

      {!onRunnerPages && (
        <div
          className={`border-t px-4 py-2 sm:hidden ${
            isHome ? "border-gray-50" : "border-lakers-gold/30"
          }`}
        >
          <Link
            href="/runner"
            className={`block text-center text-xs font-semibold ${
              isHome ? "text-fusion-red" : "text-lakers-gold"
            }`}
          >
            Pick up an order →
          </Link>
        </div>
      )}
    </header>
  );
}
