"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import { getItemImage } from "@/data/aisle-images";
import { useCart } from "@/context/CartContext";
import { loadAllProducts } from "@/lib/firestore";
import {
  compareAtPrice,
  defaultSelectedOptions,
  effectiveUnitPrice,
  resolveProductOptions,
} from "@/lib/product-options";
import { isFavorite, toggleFavorite } from "@/lib/favorites";
import { formatMenuPrice, type MenuItem } from "@/lib/types";

function priceLabel(item: MenuItem): string {
  const raw = formatMenuPrice(item);
  return raw.startsWith("HK") ? raw : `HK${raw}`;
}

function saveAmount(item: MenuItem): number | null {
  const compare = compareAtPrice(item);
  if (compare == null) return null;
  const save = compare - effectiveUnitPrice(item);
  return save > 0 ? Math.round(save * 100) / 100 : null;
}

export function ProductQuickAddModal({
  item,
  open,
  onClose,
  catalog,
}: {
  item: MenuItem;
  open: boolean;
  onClose: () => void;
  catalog?: MenuItem[];
}) {
  const { items, addItem, upsertItem } = useCart();
  const inCart = items.find((c) => c.item.id === item.id);
  const [qty, setQty] = useState(1);
  const [tab, setTab] = useState<"recommended" | "info">("recommended");
  const [liked, setLiked] = useState(false);
  const [selectedOptions, setSelectedOptions] = useState<
    Record<string, string | number>
  >({});
  const [pool, setPool] = useState<MenuItem[]>(catalog ?? []);

  const optionGroups = useMemo(() => resolveProductOptions(item), [item]);

  useEffect(() => {
    if (!open) return;
    setQty(Math.max(1, inCart?.quantity ?? 1));
    setTab("recommended");
    setLiked(isFavorite(item.id));
    setSelectedOptions(
      inCart?.selectedOptions && Object.keys(inCart.selectedOptions).length > 0
        ? { ...inCart.selectedOptions }
        : defaultSelectedOptions(item),
    );
  }, [open, item, inCart?.quantity, inCart?.selectedOptions]);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);

  useEffect(() => {
    if (!open || catalog) {
      if (catalog) setPool(catalog);
      return;
    }
    let cancelled = false;
    void loadAllProducts().then((all) => {
      if (!cancelled) setPool(all);
    });
    return () => {
      cancelled = true;
    };
  }, [open, catalog]);

  const similar = useMemo(
    () =>
      pool
        .filter((p) => p.id !== item.id && p.category === item.category && p.inStock)
        .slice(0, 12),
    [pool, item.id, item.category],
  );

  const frequentlyBought = useMemo(() => {
    const others = pool.filter((p) => p.id !== item.id && p.inStock);
    const sameSection = others.filter(
      (p) =>
        (p.storeSection ?? p.category) !== (item.storeSection ?? item.category) ||
        p.category !== item.category,
    );
    return (sameSection.length > 0 ? sameSection : others).slice(0, 12);
  }, [pool, item]);

  if (!open) return null;

  const image = getItemImage(item);
  const compare = compareAtPrice(item);
  const save = saveAmount(item);

  function handleAdd() {
    if (!item.inStock) return;
    const opts =
      Object.keys(selectedOptions).length > 0 ? selectedOptions : undefined;
    upsertItem(item, qty, opts);
    onClose();
  }

  return (
    <div
      className="fixed inset-0 z-[70] flex justify-center"
      style={{ backgroundColor: "rgba(0,0,0,0.45)" }}
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={item.name}
        className="relative flex h-full w-full max-w-lg flex-col overflow-hidden bg-white shadow-2xl sm:my-4 sm:h-[min(92vh,860px)] sm:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="relative h-[40vh] min-h-[200px] w-full shrink-0" style={{ backgroundColor: "#fafafa" }}>
          {image ? (
            <Image
              src={image}
              alt=""
              fill
              className="object-contain p-6"
              sizes="100vw"
              priority
            />
          ) : null}
          <button
            type="button"
            onClick={onClose}
            className="absolute left-3 top-3 flex h-11 w-11 items-center justify-center rounded-full text-xl font-light shadow-md"
            style={{ backgroundColor: "#ffffff", color: "#111111" }}
            aria-label="Close"
          >
            ×
          </button>
          <button
            type="button"
            onClick={() => setLiked(toggleFavorite(item.id))}
            className="absolute right-3 top-3 flex h-11 w-11 items-center justify-center rounded-full shadow-md"
            style={{ backgroundColor: "#ffffff", color: liked ? "#ED1C24" : "#111111" }}
            aria-label={liked ? "Remove from favorites" : "Save to favorites"}
            aria-pressed={liked}
          >
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill={liked ? "currentColor" : "none"} aria-hidden>
              <path
                d="M12 21s-6.5-4.35-9-8.5C1.5 9 3 5.5 6.5 5.5c2 0 3.5 1.2 4.5 2.6 1-1.4 2.5-2.6 4.5-2.6C19 5.5 20.5 9 19 12.5 16.5 16.65 12 21 12 21Z"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinejoin="round"
              />
            </svg>
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-4 pt-3">
          {optionGroups.length > 0 && (
            <div className="mb-3 space-y-2">
              {optionGroups.map((group) => (
                <div key={group.id}>
                  <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-gray-500">
                    {group.label}
                    {group.id === "ripeness" ? " (1 green → 6 ripe)" : ""}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {group.choices.map((choice) => {
                      const active = selectedOptions[group.id] === choice.value;
                      return (
                        <button
                          key={choice.id}
                          type="button"
                          onClick={() =>
                            setSelectedOptions((prev) => ({
                              ...prev,
                              [group.id]: choice.value,
                            }))
                          }
                          className="flex h-11 min-w-11 items-center justify-center rounded-full px-3 text-sm font-bold"
                          style={{
                            backgroundColor: active ? "#ED1C24" : "#f3f4f6",
                            color: active ? "#ffffff" : "#111111",
                          }}
                          aria-pressed={active}
                        >
                          {choice.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}

          <div
            className="mb-3 flex items-start gap-2 rounded-xl px-3 py-2.5 text-sm"
            style={{ backgroundColor: "#ecfdf5", color: "#065f46" }}
            role="note"
          >
            <span aria-hidden className="mt-0.5 text-base leading-none">
              ✓
            </span>
            <p>
              <span className="font-bold">Freshness guarantee</span>
              {" — "}
              If it&apos;s not fresh, message us and we&apos;ll make it right.
            </p>
          </div>

          <h3 className="text-xl font-bold leading-snug" style={{ color: "#111111" }}>
            {item.name}
          </h3>
          <p className="mt-1 text-sm" style={{ color: "#6b7280" }}>
            per {item.unit}
          </p>

          <div className="mt-2 flex flex-wrap items-center gap-2">
            <p className="text-2xl font-extrabold" style={{ color: "#ED1C24" }}>
              {priceLabel(item)}
            </p>
            {compare != null && (
              <p className="text-sm text-gray-400 line-through">HK${compare}</p>
            )}
            {save != null && (
              <span
                className="rounded-md px-2 py-0.5 text-xs font-bold text-white"
                style={{ backgroundColor: "#C8102E" }}
              >
                Save HK${save}
              </span>
            )}
          </div>

          <div className="mt-4 flex items-center gap-3">
            <div className="flex items-center gap-2 rounded-full px-1" style={{ backgroundColor: "#f3f4f6" }}>
              <button
                type="button"
                onClick={() => setQty((n) => Math.max(1, n - 1))}
                className="flex h-11 w-11 items-center justify-center text-xl font-bold"
                style={{ color: "#ED1C24" }}
                aria-label="Decrease quantity"
              >
                −
              </button>
              <span className="min-w-8 text-center text-lg font-bold" style={{ color: "#111111" }}>
                {qty}
              </span>
              <button
                type="button"
                onClick={() => setQty((n) => n + 1)}
                className="flex h-11 w-11 items-center justify-center rounded-full text-xl font-bold text-white"
                style={{ backgroundColor: "#ED1C24" }}
                aria-label="Increase quantity"
              >
                +
              </button>
            </div>
          </div>

          <div className="mt-5 flex border-b border-gray-200">
            {(
              [
                ["recommended", "Recommended"],
                ["info", "Product Info"],
              ] as const
            ).map(([id, label]) => (
              <button
                key={id}
                type="button"
                onClick={() => setTab(id)}
                className="relative min-h-11 flex-1 px-2 text-sm font-semibold"
                style={{ color: tab === id ? "#ED1C24" : "#6b7280" }}
                aria-selected={tab === id}
              >
                {label}
                {tab === id && (
                  <span
                    className="absolute inset-x-4 bottom-0 h-0.5 rounded-full"
                    style={{ backgroundColor: "#ED1C24" }}
                  />
                )}
              </button>
            ))}
          </div>

          {tab === "recommended" ? (
            <div className="mt-4 space-y-5">
              <CarouselRow title="Similar items" items={similar} />
              <CarouselRow title="Frequently bought together" items={frequentlyBought} />
            </div>
          ) : (
            <dl className="mt-4 space-y-3 text-sm">
              <InfoRow
                label="Description"
                value={
                  item.description ||
                  item.itemNote ||
                  `${item.name} from Fusion supermarket, delivered to your CUHK hall lobby.`
                }
              />
              <InfoRow
                label="Ingredients"
                value={item.ingredients || "See packaging for full ingredients."}
              />
              <InfoRow
                label="Storage"
                value={
                  item.storage ||
                  (item.storeSection === "refrigerated" ||
                  item.category.includes("fruit") ||
                  item.category.includes("meat") ||
                  item.category.includes("dairy")
                    ? "Keep refrigerated. Consume by the date on the pack."
                    : "Store in a cool, dry place.")
                }
              />
              <InfoRow label="Unit" value={item.unit} />
              <InfoRow label="Category" value={item.category.replace(/-/g, " ")} />
            </dl>
          )}
        </div>

        <div
          className="shrink-0 border-t border-gray-100 bg-white px-4 py-3"
          style={{ paddingBottom: "max(0.75rem, env(safe-area-inset-bottom))" }}
        >
          <button
            type="button"
            disabled={!item.inStock}
            onClick={handleAdd}
            className="flex h-[52px] w-full items-center justify-center rounded-full text-sm font-bold text-white disabled:opacity-50"
            style={{ backgroundColor: "#ED1C24" }}
          >
            {item.inStock
              ? `Add to cart · ${priceLabel(item)}${qty > 1 ? ` × ${qty}` : ""}`
              : "Out of stock"}
          </button>
        </div>
      </div>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs font-semibold uppercase tracking-wide text-gray-500">
        {label}
      </dt>
      <dd className="mt-0.5 text-gray-900">{value}</dd>
    </div>
  );
}

function CarouselRow({ title, items }: { title: string; items: MenuItem[] }) {
  const { addItem } = useCart();
  if (items.length === 0) {
    return (
      <section>
        <h4 className="text-sm font-bold text-gray-900">{title}</h4>
        <p className="mt-2 text-xs text-gray-500">More picks will show up here.</p>
      </section>
    );
  }
  return (
    <section>
      <h4 className="mb-2 text-sm font-bold text-gray-900">{title}</h4>
      <div className="scrollbar-hide flex gap-2.5 overflow-x-auto pb-1">
        {items.map((p) => {
          const img = getItemImage(p);
          return (
            <div
              key={p.id}
              className="w-[120px] shrink-0 overflow-hidden rounded-xl border border-gray-100 bg-white"
            >
              <div className="relative h-[88px] w-full bg-gray-50">
                {img ? (
                  <Image src={img} alt="" fill className="object-contain p-2" sizes="120px" />
                ) : null}
              </div>
              <div className="p-2">
                <p className="line-clamp-2 min-h-[2rem] text-[11px] font-semibold leading-snug text-gray-900">
                  {p.name}
                </p>
                <div className="mt-1 flex items-center justify-between gap-1">
                  <p className="text-xs font-extrabold text-[#ED1C24]">{priceLabel(p)}</p>
                  <button
                    type="button"
                    onClick={() => addItem(p)}
                    className="flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold text-white"
                    style={{ backgroundColor: "#ED1C24" }}
                    aria-label={`Add ${p.name}`}
                  >
                    +
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
