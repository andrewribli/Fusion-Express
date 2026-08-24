"use client";

import type { MenuCategory } from "@/lib/types";
import { CATEGORY_LABELS, MENU_CATEGORIES } from "@/lib/types";

interface CategoryFilterProps {
  selected: MenuCategory | "all";
  onSelect: (category: MenuCategory | "all") => void;
}

export function CategoryFilter({ selected, onSelect }: CategoryFilterProps) {
  return (
    <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
      <button
        type="button"
        onClick={() => onSelect("all")}
        className={`shrink-0 rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors ${
          selected === "all"
            ? "bg-fusion-red text-white"
            : "bg-gray-100 text-gray-700 hover:bg-gray-200"
        }`}
      >
        All
      </button>
      {MENU_CATEGORIES.map((cat) => (
        <button
          key={cat}
          type="button"
          onClick={() => onSelect(cat)}
          className={`shrink-0 rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors ${
            selected === cat
              ? "bg-fusion-red text-white"
              : "bg-gray-100 text-gray-700 hover:bg-gray-200"
          }`}
        >
          {CATEGORY_LABELS[cat]}
        </button>
      ))}
    </div>
  );
}
