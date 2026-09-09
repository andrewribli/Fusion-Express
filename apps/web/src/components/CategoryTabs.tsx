"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import type { Aisle, StoreSection } from "@/data/aisles";

/**
 * Horizontal aisle tabs for a store section. The current aisle is filled red
 * so it is obvious which category you are in, Foodpanda-style.
 */
export function CategoryTabs({
  section,
  aisles,
  activeAisleId,
}: {
  section: StoreSection;
  aisles: Aisle[];
  activeAisleId?: string;
}) {
  const activeRef = useRef<HTMLLIElement>(null);

  useEffect(() => {
    activeRef.current?.scrollIntoView({
      inline: "center",
      block: "nearest",
      behavior: "smooth",
    });
  }, [activeAisleId]);

  const allActive = !activeAisleId;

  return (
    <nav aria-label="Aisle categories" className="relative">
      <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-8 bg-gradient-to-l from-gray-50 to-transparent" />
      <ul className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-2 pt-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <li className="shrink-0">
          <Link
            href={`/browse/${section}`}
            className={`block rounded-full px-3.5 py-1.5 text-xs font-semibold whitespace-nowrap ${
              allActive
                ? "bg-[#ED1C24] text-white"
                : "border border-gray-200 bg-white text-gray-700"
            }`}
          >
            All
          </Link>
        </li>
        {aisles.map((aisle) => {
          const active = aisle.id === activeAisleId;
          return (
            <li
              key={aisle.id}
              ref={active ? activeRef : undefined}
              className="shrink-0"
            >
              <Link
                href={`/browse/${section}/${aisle.id}`}
                aria-current={active ? "page" : undefined}
                className={`block rounded-full px-3.5 py-1.5 text-xs font-semibold whitespace-nowrap ${
                  active
                    ? "bg-[#ED1C24] text-white"
                    : "border border-gray-200 bg-white text-gray-700"
                }`}
              >
                {aisle.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
