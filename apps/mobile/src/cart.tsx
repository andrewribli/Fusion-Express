import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { CartItem, MenuItem } from "@fusion-express/shared/types";
import { cartSubtotal } from "@fusion-express/shared";

interface CartContextValue {
  items: CartItem[];
  sessionId: string;
  itemCount: number;
  subtotal: number;
  addItem: (item: MenuItem) => void;
  setQuantity: (itemId: string, quantity: number) => void;
  clearCart: () => void;
}

const CartContext = createContext<CartContextValue | null>(null);

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [sessionId] = useState(() => `mobile-${Date.now()}`);

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
      setQuantity,
      clearCart,
    }),
    [items, sessionId, itemCount, subtotal, addItem, setQuantity, clearCart],
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used within CartProvider");
  return ctx;
}
