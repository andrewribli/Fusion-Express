"use client";

import { useEffect, useId, useState, type ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

export type MobileHeaderMenuLink = {
  href: string;
  label: string;
  onClick?: () => void;
};

type MobileAppHeaderProps = {
  /** Brand mark (logo component). Max height enforced at 32px. */
  logo: ReactNode;
  /** Wordmark shown next to the mark on ≥360px. */
  brandName: string;
  homeHref: string;
  cartHref: string;
  cartCount?: number;
  /** Available-orders bell (exactly one). */
  bell: ReactNode;
  /** Called when the search icon is tapped. */
  onSearchClick: () => void;
  /** Optional expanded search row under the icon bar. */
  searchOpen?: boolean;
  searchSlot?: ReactNode;
  /** Drawer title + body (categories / canteens / nav). */
  menuTitle?: string;
  menuBody?: ReactNode;
  /** Extra links always shown at the top of the hamburger drawer. */
  menuLinks?: MobileHeaderMenuLink[];
  tone?: "light" | "dark";
};

const iconBtn =
  "inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl transition-colors";

/**
 * One consistent mobile header for both campuses:
 * [☰] [logo] [search] [bell] [cart] — five elements, ≥8px gaps, ≥44×44 targets.
 */
export function MobileAppHeader({
  logo,
  brandName,
  homeHref,
  cartHref,
  cartCount = 0,
  bell,
  onSearchClick,
  searchOpen = false,
  searchSlot,
  menuTitle = "Menu",
  menuBody,
  menuLinks = [],
  tone = "light",
}: MobileAppHeaderProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const pathname = usePathname();
  const titleId = useId();

  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!menuOpen) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setMenuOpen(false);
    }
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [menuOpen]);

  const light = tone === "light";
  const barBg = light ? "bg-white border-gray-200" : "bg-[#0c0c0c] border-white/10";
  const iconTone = light
    ? "border border-gray-200 bg-white text-gray-800 hover:bg-gray-50"
    : "border border-white/15 bg-[#161616] text-white hover:bg-[#1f1f1f]";
  const brandTone = light ? "text-gray-900" : "text-white";

  return (
    <>
      <header className={`sticky top-0 z-50 border-b ${barBg}`}>
        <div className="mx-auto flex max-w-[1400px] items-center gap-2 px-3 py-2 sm:px-4">
          <button
            type="button"
            className={`${iconBtn} ${iconTone}`}
            aria-label="Open menu"
            aria-expanded={menuOpen}
            aria-controls={titleId}
            onClick={() => setMenuOpen(true)}
          >
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" aria-hidden>
              <path
                d="M4 7h16M4 12h16M4 17h16"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              />
            </svg>
          </button>

          <Link
            href={homeHref}
            className="flex min-w-0 items-center gap-2"
            aria-label={`${brandName} home`}
          >
            <span className="flex h-8 max-h-8 w-8 items-center justify-center overflow-hidden [&_img]:max-h-8 [&_img]:max-w-8 [&_span]:!h-8 [&_span]:!w-8">
              {logo}
            </span>
            <span
              className={`hidden truncate text-sm font-extrabold tracking-tight min-[360px]:inline ${brandTone}`}
            >
              {brandName}
            </span>
          </Link>

          <div className="ml-auto flex items-center gap-2">
            <button
              type="button"
              className={`${iconBtn} ${iconTone}`}
              aria-label="Search"
              aria-pressed={searchOpen}
              onClick={onSearchClick}
            >
              <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" aria-hidden>
                <circle cx="11" cy="11" r="6" stroke="currentColor" strokeWidth="2" />
                <path
                  d="m16 16 4 4"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
              </svg>
            </button>

            <div className="flex h-11 w-11 items-center justify-center [&_button]:h-11 [&_button]:w-11 [&_button]:rounded-xl [&_a]:h-11 [&_a]:w-11">
              {bell}
            </div>

            <Link
              href={cartHref}
              className={`relative ${iconBtn} ${iconTone}`}
              aria-label="Cart"
            >
              <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" aria-hidden>
                <path
                  d="M3 5h2l2.2 10.2a2 2 0 0 0 2 1.6h7.6a2 2 0 0 0 2-1.5L21 8H7"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
                <circle cx="10" cy="20" r="1.2" fill="currentColor" />
                <circle cx="17" cy="20" r="1.2" fill="currentColor" />
              </svg>
              {cartCount > 0 && (
                <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-[#ED1C24] px-1 text-[10px] font-bold text-white">
                  {cartCount > 99 ? "99+" : cartCount}
                </span>
              )}
            </Link>
          </div>
        </div>

        {searchOpen && searchSlot ? (
          <div className="border-t border-gray-100 px-3 py-2 sm:px-4">{searchSlot}</div>
        ) : null}
      </header>

      {menuOpen && (
        <div className="fixed inset-0 z-[70]">
          <button
            type="button"
            className="absolute inset-0 bg-black/40"
            aria-label="Close menu"
            onClick={() => setMenuOpen(false)}
          />
          <div
            id={titleId}
            className="absolute inset-y-0 left-0 flex w-[min(88vw,320px)] flex-col bg-white shadow-xl"
            role="dialog"
            aria-modal="true"
            aria-label={menuTitle}
          >
            <div className="flex items-center justify-between border-b border-gray-100 px-3 py-3">
              <p className="text-sm font-bold text-gray-900">{menuTitle}</p>
              <button
                type="button"
                onClick={() => setMenuOpen(false)}
                className="flex h-11 w-11 items-center justify-center rounded-xl text-sm font-semibold text-gray-500 hover:bg-gray-50"
              >
                Close
              </button>
            </div>
            {menuLinks.length > 0 && (
              <nav className="border-b border-gray-100 px-2 py-2">
                {menuLinks.map((link) => (
                  <Link
                    key={`${link.href}-${link.label}`}
                    href={link.href}
                    onClick={() => {
                      link.onClick?.();
                      setMenuOpen(false);
                    }}
                    className="flex min-h-11 items-center rounded-xl px-3 py-2 text-sm font-semibold text-gray-800 hover:bg-gray-50"
                  >
                    {link.label}
                  </Link>
                ))}
              </nav>
            )}
            <div
              className="flex-1 overflow-y-auto"
              onClick={() => setMenuOpen(false)}
            >
              {menuBody}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
