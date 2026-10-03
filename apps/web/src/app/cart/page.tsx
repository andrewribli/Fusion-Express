"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { useCart } from "@/context/CartContext";
import {
  ESTIMATED_DELIVERY_MINUTES,
  formatEta,
  getEstimatedDeliveryTime,
  isOverOrderLimit,
} from "@/lib/constants";
import { OrderLimitNotice } from "@/components/OrderLimitNotice";
import { lineTotal } from "@/lib/pricing";
import { formatMenuPrice, type MenuItem } from "@/lib/types";
import { getItemImage } from "@/data/aisle-images";
import { loadAllProducts } from "@/lib/firestore";
import { resolveHomePopularItems } from "@/lib/home-popular";
import {
  computeCartFees,
  SMALL_ORDER_THRESHOLD,
  type FulfillmentMode,
} from "@/lib/cart-fees";

const VOUCHER_SESSION_KEY = "gracerun-cart-voucher";

export default function CartPage() {
  const router = useRouter();
  const { items, subtotal, setQuantity, removeItem, addItem, itemCount } =
    useCart();
  const [fulfillment, setFulfillment] = useState<FulfillmentMode>("delivery");
  const [voucherOpen, setVoucherOpen] = useState(false);
  const [voucherCode, setVoucherCode] = useState("");
  const [appliedVoucher, setAppliedVoucher] = useState<string | null>(null);
  const [upsells, setUpsells] = useState<MenuItem[]>([]);
  const eta = getEstimatedDeliveryTime();

  useEffect(() => {
    try {
      const saved = sessionStorage.getItem(VOUCHER_SESSION_KEY);
      if (saved) setAppliedVoucher(saved);
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    void loadAllProducts().then((all) => {
      if (cancelled) return;
      const inCart = new Set(items.map((l) => l.item.id));
      const popular = resolveHomePopularItems(all).filter((p) => !inCart.has(p.id));
      const rest = all.filter((p) => p.inStock && !inCart.has(p.id));
      setUpsells((popular.length >= 3 ? popular : [...popular, ...rest]).slice(0, 3));
    });
    return () => {
      cancelled = true;
    };
  }, [items]);

  const discount = appliedVoucher ? 5 : 0;
  const fees = computeCartFees({
    items,
    subtotal,
    fulfillment,
    discount,
  });
  const overLimit = isOverOrderLimit(subtotal);
  function applyVoucher() {
    const code = voucherCode.trim();
    if (!code) return;
    setAppliedVoucher(code);
    try {
      sessionStorage.setItem(VOUCHER_SESSION_KEY, code);
    } catch {
      /* ignore */
    }
    setVoucherOpen(false);
  }

  return (
    <AppShell hideNav>
      <div className="fixed inset-0 z-[60] flex flex-col bg-white md:static md:z-auto md:min-h-screen">
        <header className="shrink-0 border-b border-gray-100 bg-white px-3 py-2.5">
          <div className="mx-auto flex max-w-lg items-center gap-2">
            <button
              type="button"
              onClick={() => router.push("/fusion")}
              className="flex h-11 w-11 items-center justify-center rounded-full text-2xl font-light text-gray-800 hover:bg-gray-50"
              aria-label="Close cart"
            >
              ×
            </button>
            <div className="min-w-0 flex-1">
              <p className="text-base font-extrabold text-gray-900">Cart</p>
              <p className="truncate text-xs text-gray-500">Fusion@CUHK</p>
            </div>
            <ol className="flex items-center gap-1.5" aria-label="Checkout progress">
              {["Cart", "Checkout", "Done"].map((label, i) => (
                <li key={label} className="flex items-center gap-1.5">
                  <span
                    className="flex h-2.5 w-2.5 rounded-full"
                    style={{ backgroundColor: i === 0 ? "#ED1C24" : "#d1d5db" }}
                    aria-current={i === 0 ? "step" : undefined}
                    title={label}
                  />
                  {i < 2 && <span className="h-px w-3 bg-gray-200" aria-hidden />}
                </li>
              ))}
            </ol>
          </div>
        </header>

        <main className="mx-auto min-h-0 w-full max-w-lg flex-1 overflow-y-auto px-3 pb-28 pt-3">
          {items.length === 0 ? (
            <div className="rounded-2xl border border-gray-100 px-6 py-12 text-center">
              <p className="text-4xl" aria-hidden>
                🛒
              </p>
              <p className="mt-3 text-sm text-gray-600">Your cart is empty.</p>
              <Link
                href="/fusion"
                className="mt-4 inline-flex h-12 items-center rounded-full bg-[#ED1C24] px-6 text-sm font-bold text-white"
              >
                Add items
              </Link>
            </div>
          ) : (
            <>
              <div
                className="flex rounded-full p-1"
                style={{ backgroundColor: "#f3f4f6" }}
                role="tablist"
                aria-label="Fulfillment mode"
              >
                {(
                  [
                    ["delivery", "Delivery"],
                    ["pickup", "Pickup"],
                  ] as const
                ).map(([id, label]) => (
                  <button
                    key={id}
                    type="button"
                    role="tab"
                    aria-selected={fulfillment === id}
                    onClick={() => setFulfillment(id)}
                    className="min-h-11 flex-1 rounded-full text-sm font-bold"
                    style={{
                      backgroundColor: fulfillment === id ? "#ffffff" : "transparent",
                      color: fulfillment === id ? "#ED1C24" : "#6b7280",
                      boxShadow:
                        fulfillment === id ? "0 1px 4px rgba(0,0,0,0.08)" : "none",
                    }}
                  >
                    {label}
                  </button>
                ))}
              </div>

              <div className="mt-3 flex items-center justify-between gap-2 rounded-xl border border-gray-100 px-3 py-3">
                <div>
                  <p className="text-sm font-semibold text-gray-900">
                    {fulfillment === "delivery" ? "Delivery ETA" : "Pickup ready"}
                  </p>
                  <p className="text-xs text-gray-500">
                    ~{ESTIMATED_DELIVERY_MINUTES} min · by {formatEta(eta)}
                  </p>
                </div>
                <Link
                  href="/checkout"
                  className="flex h-11 items-center rounded-full px-3 text-sm font-bold text-[#ED1C24]"
                >
                  Change
                </Link>
              </div>

              <ul className="mt-4 space-y-2">
                {items.map((line) => (
                  <SwipeCartRow
                    key={line.item.id}
                    item={line.item}
                    quantity={line.quantity}
                    selectedOptions={line.selectedOptions}
                    onRemove={() => removeItem(line.item.id)}
                    onDecrease={() => setQuantity(line.item.id, line.quantity - 1)}
                    onIncrease={() => setQuantity(line.item.id, line.quantity + 1)}
                  />
                ))}
              </ul>

              <Link
                href="/fusion"
                className="mt-3 flex min-h-11 items-center justify-center gap-1 text-sm font-bold text-[#ED1C24]"
              >
                + Add more items
              </Link>

              {fees.smallOrderFee > 0 && (
                <div
                  className="mt-4 rounded-xl px-3 py-3"
                  style={{ backgroundColor: "rgba(200,16,46,0.08)" }}
                >
                  <div className="flex items-center justify-between gap-2 text-sm">
                    <p className="font-semibold text-gray-900">Small-order fee</p>
                    <p className="font-bold text-[#ED1C24]">HK${fees.smallOrderFee}</p>
                  </div>
                  <p className="mt-1 text-xs text-gray-600">
                    Add HK${fees.smallOrderRemaining.toFixed(0)} more to reach HK$
                    {SMALL_ORDER_THRESHOLD} and skip this fee.
                  </p>
                  <div className="mt-2 h-2 overflow-hidden rounded-full bg-white">
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${Math.round(fees.smallOrderProgress * 100)}%`,
                        backgroundColor: "#ED1C24",
                      }}
                    />
                  </div>
                  {upsells.length > 0 && (
                    <div className="scrollbar-hide mt-3 flex gap-2 overflow-x-auto pb-1">
                      {upsells.map((p) => {
                        const img = getItemImage(p);
                        return (
                          <button
                            key={p.id}
                            type="button"
                            onClick={() => addItem(p)}
                            className="w-[112px] shrink-0 rounded-xl bg-white p-2 text-left shadow-sm"
                          >
                            <div className="relative mb-1 h-16 w-full rounded-lg bg-gray-50">
                              {img ? (
                                <Image
                                  src={img}
                                  alt=""
                                  fill
                                  className="object-contain p-1"
                                  sizes="112px"
                                />
                              ) : null}
                            </div>
                            <p className="line-clamp-2 text-[11px] font-semibold text-gray-900">
                              {p.name}
                            </p>
                            <p className="mt-0.5 text-xs font-bold text-[#ED1C24]">
                              {formatMenuPrice(p)}
                            </p>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              <section className="mt-4 space-y-1.5 rounded-xl border border-gray-100 px-3 py-3 text-sm text-gray-700">
                <FeeRow label="Subtotal" value={subtotal} />
                <FeeRow
                  label={fulfillment === "pickup" ? "Delivery (pickup)" : "Delivery"}
                  value={fees.deliveryFee}
                />
                {fees.discount > 0 && (
                  <FeeRow label="Discounts" value={-fees.discount} accent />
                )}
                {fees.smallOrderFee > 0 && (
                  <FeeRow label="Small order fee" value={fees.smallOrderFee} />
                )}
                <FeeRow label="Packaging" value={fees.packagingFee} />
                <FeeRow label="Platform fee" value={fees.platformFee} />
                <div className="flex justify-between border-t border-gray-100 pt-2 text-base font-extrabold text-gray-900">
                  <span>Total</span>
                  <span>HK${fees.total}</span>
                </div>
              </section>

              <div className="mt-3">
                {appliedVoucher ? (
                  <div className="flex items-center justify-between rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-3 text-sm">
                    <span className="font-semibold text-emerald-800">
                      Voucher {appliedVoucher} · −HK$5
                    </span>
                    <button
                      type="button"
                      className="min-h-11 px-2 font-bold text-emerald-800"
                      onClick={() => {
                        setAppliedVoucher(null);
                        try {
                          sessionStorage.removeItem(VOUCHER_SESSION_KEY);
                        } catch {
                          /* ignore */
                        }
                      }}
                    >
                      Remove
                    </button>
                  </div>
                ) : voucherOpen ? (
                  <div className="flex gap-2">
                    <input
                      value={voucherCode}
                      onChange={(e) => setVoucherCode(e.target.value)}
                      placeholder="Voucher code"
                      className="min-h-11 flex-1 rounded-xl border border-gray-200 px-3 text-sm outline-none focus:border-[#ED1C24]"
                    />
                    <button
                      type="button"
                      onClick={applyVoucher}
                      className="h-11 rounded-xl bg-[#ED1C24] px-4 text-sm font-bold text-white"
                    >
                      Apply
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setVoucherOpen(true)}
                    className="flex min-h-11 w-full items-center justify-between rounded-xl border border-dashed border-gray-300 px-3 text-sm font-semibold text-gray-800"
                  >
                    <span>Apply voucher</span>
                    <span className="text-[#ED1C24]">Add</span>
                  </button>
                )}
              </div>

              <div className="mt-3">
                <OrderLimitNotice subtotal={subtotal} />
              </div>
            </>
          )}
        </main>

        {itemCount > 0 && (
          <div
            className="shrink-0 border-t border-gray-100 bg-white px-3 py-3"
            style={{ paddingBottom: "max(0.75rem, env(safe-area-inset-bottom))" }}
          >
            <div className="mx-auto flex max-w-lg items-center gap-3">
              <div className="min-w-0">
                <p className="text-xs text-gray-500">Total</p>
                <p className="text-lg font-extrabold text-gray-900">HK${fees.total}</p>
              </div>
              <button
                type="button"
                disabled={overLimit}
                onClick={() => router.push("/checkout")}
                className="flex h-12 flex-1 items-center justify-center rounded-full text-sm font-bold text-white disabled:opacity-50"
                style={{ backgroundColor: "#ED1C24", height: 48 }}
              >
                Go to Checkout
              </button>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}

function FeeRow({
  label,
  value,
  accent,
}: {
  label: string;
  value: number;
  accent?: boolean;
}) {
  const negative = value < 0;
  return (
    <div className="flex justify-between">
      <span>{label}</span>
      <span
        className={accent || negative ? "font-semibold text-[#ED1C24]" : undefined}
      >
        {negative ? `−HK$${Math.abs(value)}` : `HK$${value}`}
      </span>
    </div>
  );
}

function SwipeCartRow({
  item,
  quantity,
  selectedOptions,
  onRemove,
  onDecrease,
  onIncrease,
}: {
  item: MenuItem;
  quantity: number;
  selectedOptions?: Record<string, string | number>;
  onRemove: () => void;
  onDecrease: () => void;
  onIncrease: () => void;
}) {
  const startX = useRef<number | null>(null);
  const [offset, setOffset] = useState(0);
  const img = getItemImage(item);
  const optionLabel = useMemo(() => {
    if (!selectedOptions) return null;
    return Object.entries(selectedOptions)
      .map(([k, v]) => `${k}: ${v}`)
      .join(" · ");
  }, [selectedOptions]);

  return (
    <li className="relative overflow-hidden rounded-xl">
      <div
        className="absolute inset-y-0 right-0 flex w-24 items-center justify-center bg-[#ED1C24] text-sm font-bold text-white"
        aria-hidden
      >
        Delete
      </div>
      <div
        className="relative flex items-center gap-3 bg-white px-2 py-2"
        style={{
          transform: `translateX(${offset}px)`,
          transition: startX.current == null ? "transform 0.2s ease" : "none",
        }}
        onTouchStart={(e) => {
          startX.current = e.touches[0]?.clientX ?? null;
        }}
        onTouchMove={(e) => {
          if (startX.current == null) return;
          const dx = (e.touches[0]?.clientX ?? startX.current) - startX.current;
          setOffset(Math.max(-96, Math.min(0, dx)));
        }}
        onTouchEnd={() => {
          if (offset < -56) onRemove();
          setOffset(0);
          startX.current = null;
        }}
      >
        <div className="relative h-[60px] w-[60px] shrink-0 overflow-hidden rounded-xl bg-gray-50">
          {img ? (
            <Image src={img} alt="" fill className="object-contain p-1" sizes="60px" />
          ) : null}
        </div>
        <div className="min-w-0 flex-1">
          <p className="line-clamp-2 text-sm font-semibold text-gray-900">{item.name}</p>
          {optionLabel && (
            <p className="text-[11px] capitalize text-gray-500">{optionLabel}</p>
          )}
          <p className="text-sm font-bold text-[#ED1C24]">
            HK${lineTotal(item, quantity)}
          </p>
        </div>
        <div
          className="flex items-center rounded-full"
          style={{ backgroundColor: "#f3f4f6" }}
        >
          <button
            type="button"
            onClick={onDecrease}
            className="flex h-11 w-11 items-center justify-center font-bold text-[#ED1C24]"
            aria-label="Decrease quantity"
          >
            −
          </button>
          <span className="min-w-5 text-center text-sm font-extrabold tabular-nums">
            {quantity}
          </span>
          <button
            type="button"
            onClick={onIncrease}
            className="flex h-11 w-11 items-center justify-center rounded-full font-bold text-white"
            style={{ backgroundColor: "#ED1C24" }}
            aria-label="Increase quantity"
          >
            +
          </button>
        </div>
      </div>
    </li>
  );
}
