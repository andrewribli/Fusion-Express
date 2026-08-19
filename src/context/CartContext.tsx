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

const CART_STORAGE_KEY = "fusion_cart";
const SESSION_STORAGE_KEY = "fusion_customer_session";

interface CartContextValue {
  items: CartItem[];
  sessionId: string;
  itemCount: number;
  subtotal: number;
  addItem: (item: MenuItem) => void;
  removeItem: (itemId: string) => void;
  setQuantity: (itemId: string, quantity: number) => void;
  clearCart: () => void;
  replaceCart: (entries: { item: MenuItem; quantity: number }[]) => void;
}

const CartContext = createContext<CartContextValue | null>(null);

function loadSessionId(): string {
  if (typeof window === "undefined") return "";
  let id = localStorage.getItem(SESSION_STORAGE_KEY);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(SESSION_STORAGE_KEY, id);
  }
  return id;
}

function loadCart(): CartItem[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(CART_STORAGE_KEY);
    return raw ? (JSON.parse(raw) as CartItem[]) : [];
  } catch {
    return [];
  }
}

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [sessionId, setSessionId] = useState("");

  useEffect(() => {
    setSessionId(loadSessionId());
    setItems(loadCart());
  }, []);

  useEffect(() => {
    if (sessionId) {
      localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(items));
    }
  }, [items, sessionId]);

  const addItem = useCallback((item: MenuItem) => {
    setItems((prev) => {
      const existing = prev.find((c) => c.item.id === item.id);
      if (existing) {
        return prev.map((c) =>
          c.item.id === item.id ? { ...c, quantity: c.quantity + 1 } : c,
        );
      }
      return [...prev, { item, quantity: 1 }];
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

  const replaceCart = useCallback(
    (entries: { item: MenuItem; quantity: number }[]) => {
      setItems(entries.map(({ item, quantity }) => ({ item, quantity })));
    },
    [],
  );

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
      replaceCart,
    }),
    [
      items,
      sessionId,
      itemCount,
      subtotal,
      addItem,
      removeItem,
      setQuantity,
      clearCart,
      replaceCart,
    ],
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used within CartProvider");
  return ctx;
}
