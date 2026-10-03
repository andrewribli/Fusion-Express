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
import type { CartItem, MenuItem } from "@/ptero/lib/types";
import { isCanteenItemId } from "@/ptero/lib/canteen/cart";
import { cartSubtotal } from "@/ptero/lib/pricing";
import { readJson, STORAGE_KEYS, writeJson } from "@/ptero/lib/storage";

interface CartContextValue {
  items: CartItem[];
  sessionId: string;
  itemCount: number;
  subtotal: number;
  addItem: (item: MenuItem, quantity?: number) => void;
  removeItem: (itemId: string) => void;
  setQuantity: (itemId: string, quantity: number) => void;
  clearCart: () => void;
}

const CartContext = createContext<CartContextValue | null>(null);

function loadSessionId(): string {
  if (typeof window === "undefined") return "";
  let id = localStorage.getItem(STORAGE_KEYS.session);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(STORAGE_KEYS.session, id);
  }
  return id;
}

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [sessionId, setSessionId] = useState("");

  useEffect(() => {
    setSessionId(loadSessionId());
    setItems(readJson<CartItem[]>(STORAGE_KEYS.cart, []));
  }, []);

  useEffect(() => {
    if (sessionId) writeJson(STORAGE_KEYS.cart, items);
  }, [items, sessionId]);

  const addItem = useCallback((item: MenuItem, quantity = 1) => {
    const addBy = Math.max(1, quantity);
    const addingCanteen = isCanteenItemId(item.id);
    setItems((prev) => {
      // Don't mix Taste groceries with canteen food in one cart.
      const filtered = prev.filter((c) => isCanteenItemId(c.item.id) === addingCanteen);
      const existing = filtered.find((c) => c.item.id === item.id);
      if (existing) {
        return filtered.map((c) =>
          c.item.id === item.id ? { ...c, quantity: c.quantity + addBy } : c,
        );
      }
      return [...filtered, { item, quantity: addBy }];
    });
  }, []);

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

  const itemCount = useMemo(
    () => items.reduce((sum, c) => sum + c.quantity, 0),
    [items],
  );
  const subtotal = useMemo(() => cartSubtotal(items), [items]);

  const value = useMemo(
    () => ({
      items,
      sessionId,
      itemCount,
      subtotal,
      addItem,
      removeItem,
      setQuantity,
      clearCart,
    }),
    [items, sessionId, itemCount, subtotal, addItem, removeItem, setQuantity, clearCart],
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used within CartProvider");
  return ctx;
}
