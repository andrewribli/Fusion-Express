"use client";

import { useMemo, useState } from "react";
import type { MenuItem } from "@/lib/types";

interface MenuSearchProps {
  items: MenuItem[];
  value: string;
  onChange: (value: string) => void;
  onSelectItem?: (item: MenuItem) => void;
  placeholder?: string;
}

export function MenuSearch({
  items,
  value,
  onChange,
  onSelectItem,
  placeholder = "Search items…",
}: MenuSearchProps) {
  const [focused, setFocused] = useState(false);

  const suggestions = useMemo(() => {
    const q = value.trim().toLowerCase();
    if (!q || q.length < 1) return [];
    return items
      .filter((item) => item.name.toLowerCase().includes(q))
      .slice(0, 6);
  }, [items, value]);

  return (
    <div className="relative">
      <input
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={() => setFocused(true)}
        onBlur={() => setTimeout(() => setFocused(false), 150)}
        placeholder={placeholder}
        className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm focus:border-fusion-red focus:outline-none focus:ring-2 focus:ring-fusion-red/20"
        autoComplete="off"
      />
      {focused && suggestions.length > 0 && (
        <ul className="absolute z-20 mt-1 max-h-48 w-full overflow-y-auto rounded-xl border border-gray-200 bg-white py-1 shadow-lg">
          {suggestions.map((item) => (
            <li key={item.id}>
              <button
                type="button"
                className="flex w-full items-center justify-between px-4 py-2.5 text-left text-sm hover:bg-red-50"
                onMouseDown={(e) => {
                  e.preventDefault();
                  onChange(item.name);
                  onSelectItem?.(item);
                  setFocused(false);
                }}
              >
                <span>{item.name}</span>
                <span className="text-xs text-gray-400">${item.price}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
