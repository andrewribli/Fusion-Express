"use client";

import {
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
} from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { getItemImage } from "@/data/aisle-images";
import { ProductImage } from "@/components/ProductImage";
import { useCart } from "@/context/CartContext";
import { resolveOrderDeliveryFee } from "@/lib/order-delivery";
import { lineTotal } from "@/lib/pricing";
import { isOverOrderLimit } from "@/lib/constants";
import { getCanteenCheckoutGate, isCanteenCart } from "@/lib/canteen/cart";
import { useIsAdmin } from "@/lib/use-is-admin";
import { useUser } from "@/context/UserContext";
import { formatHkdAmount } from "@fusion-express/shared/delivery-pricing";

function cents(amount: number): number {
  return Number(Number(amount).toFixed(2));
}

function money(amount: number): string {
  return formatHkdAmount(cents(amount));
}

export function CartDropdown({
  channel = "fusion",
  orderingEnabled = true,
  browseHref = "/cuhk",
  cartHref = "/cart",
  checkoutHref = "/checkout",
  className = "",
}: {
  channel?: "fusion" | "canteen";
  orderingEnabled?: boolean;
  browseHref?: string;
  cartHref?: string;
  checkoutHref?: string;
  className?: string;
}) {
  const router = useRouter();
  const { user } = useUser();
  const isAdmin = useIsAdmin(user?.uid);
  const { items, itemCount, subtotal, setQuantity } = useCart();
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [isDesktop, setIsDesktop] = useState(false);
  const [anchor, setAnchor] = useState<{ top: number; right: number } | null>(
    null,
  );
  const buttonRef = useRef<HTMLButtonElement>(null);
  const dragStartY = useRef<number | null>(null);
  const [dragOffset, setDragOffset] = useState(0);
  const titleId = useId();

  useEffect(() => {
    setMounted(true);
    const mq = window.matchMedia("(min-width: 640px)");
    const sync = () => setIsDesktop(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  useLayoutEffect(() => {
    if (!open) return;
    function measure() {
      const rect = buttonRef.current?.getBoundingClientRect();
      if (!rect) return;
      setAnchor({
        top: rect.bottom + 8,
        right: Math.max(8, window.innerWidth - rect.right),
      });
    }
    measure();
    window.addEventListener("resize", measure);
    window.addEventListener("scroll", measure, true);
    return () => {
      window.removeEventListener("resize", measure);
      window.removeEventListener("scroll", measure, true);
    };
  }, [open]);

  const fee = resolveOrderDeliveryFee(items, "");
  const delivery = cents(fee.deliveryFee);
  const total = cents(subtotal + delivery);
  const overLimit = isOverOrderLimit(subtotal);
  const canteenGate = getCanteenCheckoutGate(items, { adminBypass: isAdmin });
  const canteenCheckoutBlocked =
    isCanteenCart(items) && !canteenGate.allowed && !canteenGate.hoursClosed;
  const checkoutBlocked =
    canteenCheckoutBlocked ||
    overLimit ||
    itemCount === 0 ||
    (!orderingEnabled && !isAdmin && !canteenGate.hoursClosed);

  const close = useCallback(() => {
    setOpen(false);
    setDragOffset(0);
    dragStartY.current = null;
  }, []);

  const toggle = useCallback(() => {
    setOpen((v) => !v);
    setDragOffset(0);
  }, []);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") close();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, close]);

  useEffect(() => {
    if (!open || isDesktop) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open, isDesktop]);

  function onTouchStart(e: React.TouchEvent) {
    if (isDesktop) return;
    dragStartY.current = e.touches[0]?.clientY ?? null;
  }

  function onTouchMove(e: React.TouchEvent) {
    if (isDesktop || dragStartY.current == null) return;
    const y = e.touches[0]?.clientY ?? dragStartY.current;
    setDragOffset(Math.max(0, y - dragStartY.current));
  }

  function onTouchEnd() {
    if (isDesktop) return;
    if (dragOffset > 80) close();
    else setDragOffset(0);
    dragStartY.current = null;
  }

  function goCheckout() {
    if (checkoutBlocked) return;
    close();
    router.push(checkoutHref);
  }

  const panelStyle: CSSProperties = {
    ...(dragOffset > 0 ? { transform: `translateY(${dragOffset}px)` } : null),
    ...(isDesktop && anchor
      ? { top: anchor.top, right: anchor.right, left: "auto", bottom: "auto" }
      : null),
  };

  const overlay =
    open && mounted
      ? createPortal(
          <>
            <button
              type="button"
              className="fixed inset-0 z-[100] bg-black/40"
              aria-label="Close cart"
              onClick={close}
            />
            <div
              id={titleId}
              role="dialog"
              aria-modal="true"
              aria-label="Your cart"
              style={panelStyle}
              onTouchStart={onTouchStart}
              onTouchMove={onTouchMove}
              onTouchEnd={onTouchEnd}
              className="fixed inset-x-0 bottom-0 z-[110] flex h-[min(92dvh,100%)] max-h-[100dvh] flex-col rounded-t-2xl bg-white shadow-2xl transition-transform sm:inset-x-auto sm:h-auto sm:max-h-[min(70vh,520px)] sm:w-[min(92vw,360px)] sm:rounded-2xl sm:border sm:border-gray-200 sm:shadow-xl"
            >
              <div className="mx-auto mt-2 h-1 w-10 shrink-0 rounded-full bg-gray-300 sm:hidden" />
              <div className="flex items-center justify-between gap-2 border-b border-gray-100 px-4 py-3">
                <h2 className="text-sm font-bold text-gray-900">Your cart</h2>
                <button
                  type="button"
                  onClick={close}
                  className="flex h-9 w-9 items-center justify-center rounded-lg text-gray-500 hover:bg-gray-50"
                  aria-label="Close"
                >
                  <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" aria-hidden>
                    <path
                      d="M6 6l12 12M18 6L6 18"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                    />
                  </svg>
                </button>
              </div>

              <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3">
                {items.length === 0 ? (
                  <div className="py-10 text-center">
                    <p className="text-sm text-gray-600">Your cart is empty</p>
                    <Link
                      href={browseHref}
                      onClick={close}
                      className="mt-4 inline-flex min-h-11 items-center justify-center rounded-xl bg-[#ED1C24] px-5 text-sm font-bold text-white"
                    >
                      Browse menu
                    </Link>
                  </div>
                ) : (
                  <ul className="space-y-3">
                    {items.map(({ item, quantity }) => {
                      const thumb = getItemImage(item);
                      return (
                        <li key={item.id} className="flex items-center gap-2.5">
                          <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-lg bg-gray-50 ring-1 ring-gray-100">
                            <ProductImage
                              src={thumb}
                              alt={item.name}
                              category={item.category}
                              className="object-contain p-0.5"
                              sizes="40px"
                              showLabel={false}
                            />
                          </div>
                          <p className="min-w-0 flex-1 truncate text-sm font-medium text-gray-900">
                            {item.name}
                          </p>
                          <div className="flex shrink-0 items-center gap-1">
                            <button
                              type="button"
                              onClick={() => setQuantity(item.id, quantity - 1)}
                              className="flex h-7 w-7 items-center justify-center rounded-md bg-gray-100 text-sm font-bold"
                              aria-label={`Decrease ${item.name}`}
                            >
                              −
                            </button>
                            <span className="min-w-5 text-center text-xs font-semibold">
                              {quantity}
                            </span>
                            <button
                              type="button"
                              onClick={() => setQuantity(item.id, quantity + 1)}
                              className="flex h-7 w-7 items-center justify-center rounded-md bg-gray-100 text-sm font-bold"
                              aria-label={`Increase ${item.name}`}
                            >
                              +
                            </button>
                          </div>
                          <span className="w-14 shrink-0 text-right text-sm font-semibold text-gray-900">
                            ${money(lineTotal(item, quantity))}
                          </span>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>

              {items.length > 0 ? (
                <div className="shrink-0 space-y-3 border-t border-gray-100 px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
                  <div className="space-y-1.5 text-sm">
                    <div className="flex justify-between text-gray-600">
                      <span>Subtotal</span>
                      <span
                        className={
                          overLimit ? "font-bold text-[#ED1C24]" : undefined
                        }
                      >
                        HK${money(subtotal)}
                      </span>
                    </div>
                    <div className="flex justify-between text-gray-600">
                      <span>Delivery</span>
                      <span>HK${money(delivery)}</span>
                    </div>
                    <div className="flex justify-between font-bold text-gray-900">
                      <span>Total</span>
                      <span>HK${money(total)}</span>
                    </div>
                  </div>
                  <Link
                    href={cartHref}
                    onClick={close}
                    className="flex min-h-11 w-full items-center justify-center rounded-xl border border-gray-300 bg-white text-sm font-bold text-gray-900"
                  >
                    View full cart
                  </Link>
                  <button
                    type="button"
                    disabled={checkoutBlocked}
                    onClick={goCheckout}
                    className="flex min-h-11 w-full items-center justify-center rounded-xl bg-[#ED1C24] text-sm font-bold text-white disabled:bg-gray-100 disabled:text-gray-400"
                  >
                    Continue to checkout
                  </button>
                  {channel === "canteen" && canteenCheckoutBlocked ? (
                    <p className="text-center text-xs text-amber-800">
                      {canteenGate.message ??
                        "Checkout is paused for this canteen."}
                    </p>
                  ) : null}
                </div>
              ) : null}
            </div>
          </>,
          document.body,
        )
      : null;

  return (
    <div className={`relative ${className}`}>
      <button
        ref={buttonRef}
        type="button"
        onClick={toggle}
        className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-gray-200 text-gray-700"
        aria-label="Cart"
        aria-expanded={open}
        aria-controls={titleId}
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
        {itemCount > 0 && (
          <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-[#ED1C24] px-1 text-[10px] font-bold text-white">
            {itemCount > 99 ? "99+" : itemCount}
          </span>
        )}
      </button>
      {overlay}
    </div>
  );
}
