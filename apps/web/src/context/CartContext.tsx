"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { CartItem, MenuItem } from "@/lib/types";
import { cartSubtotal } from "@/lib/pricing";
import {
  SHOP_CART_STORAGE_KEY,
  type ShopKind,
} from "@fusion-express/shared/shop-kind";

const SESSION_STORAGE_KEY = "fusion_customer_session";

interface ShopCartBucket {
  items: CartItem[];
  itemCount: number;
  subtotal: number;
  addItem: (item: MenuItem, quantity?: number) => void;
  removeItem: (itemId: string) => void;
  setQuantity: (itemId: string, quantity: number) => void;
  clearCart: () => void;
  replaceCart: (entries: { item: MenuItem; quantity: number }[]) => void;
}

interface CartContextValue {
  sessionId: string;
  fusion: ShopCartBucket;
  canteen: ShopCartBucket;
  /** Active shop for this subtree (defaults to fusion). */
  shopKind: ShopKind;
}

const CartContext = createContext<CartContextValue | null>(null);
const ShopKindContext = createContext<ShopKind>("fusion");

function loadSessionId(): string {
  if (typeof window === "undefined") return "";
  let id = localStorage.getItem(SESSION_STORAGE_KEY);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(SESSION_STORAGE_KEY, id);
  }
  return id;
}

function loadCart(kind: ShopKind): CartItem[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(SHOP_CART_STORAGE_KEY[kind]);
    const parsed = raw ? (JSON.parse(raw) as CartItem[]) : [];
    // Hard filter: never let the wrong shop's SKUs live in this bucket.
    return parsed.filter((line) => {
      const id = line.item?.id ?? "";
      const isCanteen = id.startsWith("canteen:");
      return kind === "canteen" ? isCanteen : !isCanteen;
    });
  } catch {
    return [];
  }
}

function useShopCartState(kind: ShopKind, sessionId: string): ShopCartBucket {
  const [items, setItems] = useState<CartItem[]>([]);

  useEffect(() => {
    setItems(loadCart(kind));
  }, [kind]);

  useEffect(() => {
    if (!sessionId) return;
    localStorage.setItem(SHOP_CART_STORAGE_KEY[kind], JSON.stringify(items));
  }, [items, kind, sessionId]);

  const addItem = useCallback((item: MenuItem, quantity = 1) => {
    const isCanteen = item.id.startsWith("canteen:");
    if (kind === "canteen" ? !isCanteen : isCanteen) {
      console.warn(
        `[cart] refused to add ${item.id} to ${kind} cart — shop kinds must stay separate`,
      );
      return;
    }
    const addBy = Math.max(1, quantity);
    setItems((prev) => {
      const existing = prev.find((c) => c.item.id === item.id);
      if (existing) {
        return prev.map((c) =>
          c.item.id === item.id
            ? { ...c, quantity: c.quantity + addBy }
            : c,
        );
      }
      return [...prev, { item, quantity: addBy }];
    });
  }, [kind]);

  const removeItem = useCallback((itemId: string) => {
    setItems((prev) => prev.filter((c) => c.item.id !== itemId));
  }, []);

  const setQuantity = useCallback((itemId: string, quantity: number) => {
    if (quantity <= 0) {
      setItems((prev) => prev.filter((c) => c.item.id !== itemId));
      return;
    }
    setItems((prev) =>
      prev.map((c) => (c.item.id === itemId ? { ...c, quantity } : c)),
    );
  }, []);

  const clearCart = useCallback(() => setItems([]), []);

  const replaceCart = useCallback(
    (entries: { item: MenuItem; quantity: number }[]) => {
      setItems(
        entries
          .filter(({ item }) => {
            const isCanteen = item.id.startsWith("canteen:");
            return kind === "canteen" ? isCanteen : !isCanteen;
          })
          .map(({ item, quantity }) => ({ item, quantity })),
      );
    },
    [kind],
  );

  const itemCount = useMemo(
    () => items.reduce((sum, c) => sum + c.quantity, 0),
    [items],
  );
  const subtotal = useMemo(() => cartSubtotal(items), [items]);

  return useMemo(
    () => ({
      items,
      itemCount,
      subtotal,
      addItem,
      removeItem,
      setQuantity,
      clearCart,
      replaceCart,
    }),
    [
      items,
      itemCount,
      subtotal,
      addItem,
      removeItem,
      setQuantity,
      clearCart,
      replaceCart,
    ],
  );
}

export function CartProvider({ children }: { children: ReactNode }) {
  const [sessionId, setSessionId] = useState("");
  useEffect(() => {
    setSessionId(loadSessionId());
  }, []);

  const fusion = useShopCartState("fusion", sessionId);
  const canteen = useShopCartState("canteen", sessionId);

  const value = useMemo(
    () => ({
      sessionId,
      fusion,
      canteen,
      shopKind: "fusion" as ShopKind,
    }),
    [sessionId, fusion, canteen],
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

/** Scopes useCart() to Fusion or Canteen so the two never share a basket. */
export function ShopKindProvider({
  shopKind,
  children,
}: {
  shopKind: ShopKind;
  children: ReactNode;
}) {
  return (
    <ShopKindContext.Provider value={shopKind}>
      {children}
    </ShopKindContext.Provider>
  );
}

export function useShopKind(): ShopKind {
  return useContext(ShopKindContext);
}

/**
 * Cart for the active shop kind (from ShopKindProvider, else fusion).
 * Fusion grocery and canteen food never share this basket.
 */
export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used within CartProvider");
  const shopKind = useContext(ShopKindContext);
  const bucket = shopKind === "canteen" ? ctx.canteen : ctx.fusion;
  return {
    ...bucket,
    sessionId: ctx.sessionId,
    shopKind,
  };
}

/** Explicit access when a screen needs both counts (e.g. home chooser). */
export function useBothCarts() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useBothCarts must be used within CartProvider");
  return ctx;
}
