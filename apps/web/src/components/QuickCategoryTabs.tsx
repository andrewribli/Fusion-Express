"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { QUICK_CATEGORIES } from "@/data/quick-categories";

export function QuickCategoryTabs({ className = "" }: { className?: string }) {
  const pathname = usePathname();
  const activeRef = useRef<HTMLLIElement>(null);

  useEffect(() => {
    activeRef.current?.scrollIntoView({
      inline: "center",
      block: "nearest",
    });
  }, [pathname]);

  return (
    <nav aria-label="Shop by category" className={`relative ${className}`}>
      <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-8 bg-gradient-to-l from-gray-50 to-transparent" />
      <ul className="-mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {QUICK_CATEGORIES.map((category) => {
          const active = pathname === category.href;
          return (
            <li key={category.id} className="snap-start" ref={active ? activeRef : undefined}>
              <Link
                href={category.href}
                aria-current={active ? "page" : undefined}
                className="flex w-[76px] flex-col items-center gap-1.5 active:scale-[0.97]"
              >
                <span
                  className={`relative h-[68px] w-[68px] overflow-hidden rounded-2xl bg-gray-50 shadow-sm ${
                    active
                      ? "ring-2 ring-[#ED1C24] ring-offset-2"
                      : "border border-gray-100"
                  }`}
                >
                  <Image
                    src={category.image}
                    alt=""
                    fill
                    className="object-cover"
                    sizes="68px"
                  />
                </span>
                <span
                  className={`text-center text-[11px] font-semibold leading-tight ${
                    active ? "text-[#ED1C24]" : "text-gray-700"
                  }`}
                >
                  {category.label}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
