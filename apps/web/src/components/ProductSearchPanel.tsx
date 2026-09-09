"use client";

import { useEffect, useState } from "react";
import { ItemListRow } from "@/components/ItemListRow";
import { MenuSearch } from "@/components/MenuSearch";
import { useCart } from "@/context/CartContext";
import { loadAllProducts } from "@/lib/firestore";
import { searchItems } from "@/lib/menu";
import type { MenuItem } from "@/lib/types";

/**
 * Catalog search. Custom ("not on the menu") items are deliberately not here —
 * they live on the cart and checkout pages via CustomItemCard.
 */
export function ProductSearchPanel({
  items,
  placeholder = "Search items…",
  label,
  tone = "dark",
  className = "",
}: {
  items?: MenuItem[];
  placeholder?: string;
  label?: string;
  /** "dark" for navy/photo backgrounds, "light" for white pages. */
  tone?: "dark" | "light";
  className?: string;
}) {
  const { addItem } = useCart();
  const [search, setSearch] = useState("");
  const [loaded, setLoaded] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(!items);

  useEffect(() => {
    if (items) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    void loadAllProducts()
      .then((all) => {
        if (!cancelled) {
          setLoaded(all);
          setLoading(false);
        }
      })
      .catch(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [items]);

  const pool = items ?? loaded;
  const matches = search.trim() ? searchItems(pool, search) : [];

  return (
    <div className={className}>
      {label && (
        <label
          className={`mb-1.5 block text-sm font-semibold ${
            tone === "dark" ? "text-white" : "text-gray-700"
          }`}
        >
          {label}
        </label>
      )}
      <MenuSearch
        items={pool}
        value={search}
        onChange={setSearch}
        onSelectItem={(item) => {
          addItem(item);
          setSearch("");
        }}
        placeholder={loading ? "Loading products…" : placeholder}
      />
      {search.trim() ? (
        matches.length === 0 ? (
          <p
            className={`mt-2 text-sm ${
              tone === "dark" ? "text-white/80" : "text-gray-500"
            }`}
          >
            No items match. You can add it as a custom item in your cart.
          </p>
        ) : (
          <ul className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3">
            {matches.slice(0, 24).map((item) => (
              <ItemListRow key={item.id} item={item} />
            ))}
          </ul>
        )
      ) : null}
    </div>
  );
}
