"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
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

  const showRunnerLink = !user?.isRunner && pathname !== "/runner/terms";

  return (
    <header className="sticky top-0 z-40 border-b border-gray-100 bg-white/95 shadow-sm backdrop-blur">
      <div className="mx-auto flex max-w-[480px] items-center justify-between gap-2 px-4 py-3">
        <div className="flex min-w-0 items-center gap-2">
          {showBack ? (
            <Link
              href={backHref}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gray-100 text-gray-700"
              aria-label="Go back"
            >
              ←
            </Link>
          ) : (
            <Link href="/home" className="shrink-0">
              <Image
                src="https://upload.wikimedia.org/wikipedia/commons/9/9a/Fusion_logo.svg"
                alt="Fusion"
                width={32}
                height={32}
                className="h-8 w-8 object-contain"
              />
            </Link>
          )}
          <div className="min-w-0">
            <p className="truncate text-sm font-bold text-gray-900">
              {title ?? "Fusion Express"}
            </p>
          </div>
        </div>

        <nav className="flex shrink-0 items-center gap-1.5">
          {showRunnerLink && (
            <Link
              href="/runner/terms"
              className="hidden rounded-full bg-red-50 px-2.5 py-1.5 text-xs font-semibold text-fusion-red sm:inline"
            >
              Become a Runner
            </Link>
          )}
          <Link
            href="/home"
            className="hidden rounded-full px-2 py-1.5 text-xs font-medium text-gray-600 hover:text-fusion-red md:inline"
          >
            Home
          </Link>
          {user?.isRunner && (
            <Link
              href="/runner/dashboard"
              className="hidden rounded-full px-2 py-1.5 text-xs font-medium text-gray-600 hover:text-fusion-red md:inline"
            >
              Runner
            </Link>
          )}
          <Link
            href="/orders"
            className="hidden rounded-full px-2 py-1.5 text-xs font-medium text-gray-600 hover:text-fusion-red md:inline"
          >
            Orders
          </Link>
          <Link
            href="/profile"
            className="hidden rounded-full px-2 py-1.5 text-xs font-medium text-gray-600 hover:text-fusion-red md:inline"
          >
            Profile
          </Link>
          <Link
            href="/cart"
            className="relative flex h-10 w-10 items-center justify-center rounded-full bg-fusion-red text-white shadow-sm"
            aria-label="Cart"
          >
            🛒
            {itemCount > 0 && (
              <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-gray-900 px-1 text-[10px] font-bold">
                {itemCount > 99 ? "99+" : itemCount}
              </span>
            )}
          </Link>
        </nav>
      </div>

      {showRunnerLink && (
        <div className="border-t border-gray-50 px-4 py-2 sm:hidden">
          <Link
            href="/runner/terms"
            className="block text-center text-xs font-semibold text-fusion-red"
          >
            Become a Runner →
          </Link>
        </div>
      )}
    </header>
  );
}
