"use client";

import { MenuItemCard } from "@/components/MenuItemCard";
import { MENU_ITEMS } from "@/data/menu-items";
import {
  CATEGORY_LABELS,
  MENU_CATEGORIES,
  type MenuCategory,
  type MenuItem,
} from "@/lib/types";

interface MenuGridProps {
  items: MenuItem[];
  grouped?: boolean;
}

export function MenuGrid({ items, grouped = false }: MenuGridProps) {
  if (items.length === 0) {
    return (
      <p className="py-12 text-center text-sm text-gray-500">
        No items found. Try a different search or category.
      </p>
    );
  }

  if (!grouped) {
    return (
      <div className="grid grid-cols-2 gap-3">
        {items.map((item) => (
          <MenuItemCard key={item.id} item={item} />
        ))}
      </div>
    );
  }

  const categoriesWithItems = MENU_CATEGORIES.filter((cat) =>
    items.some((item) => item.category === cat),
  );

  return (
    <div className="space-y-8">
      {categoriesWithItems.map((cat) => {
        const catItems = items.filter((item) => item.category === cat);
        return (
          <section key={cat}>
            <h2 className="mb-3 text-base font-bold text-gray-900">
              {CATEGORY_LABELS[cat]}
              <span className="ml-2 text-xs font-normal text-gray-400">
                {catItems.length}
              </span>
            </h2>
            <div className="grid grid-cols-2 gap-3">
              {catItems.map((item) => (
                <MenuItemCard key={item.id} item={item} />
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}

export function filterMenuItems(
  category: MenuCategory | "all",
  search: string,
): MenuItem[] {
  const query = search.trim().toLowerCase();

  return MENU_ITEMS.filter((item) => {
    const matchesCategory = category === "all" || item.category === category;
    const matchesSearch =
      !query || item.name.toLowerCase().includes(query);
    return matchesCategory && matchesSearch && item.inStock;
  });
}
