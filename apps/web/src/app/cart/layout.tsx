"use client";

import { ShopKindProvider } from "@/context/CartContext";

export default function CartLayout({ children }: { children: React.ReactNode }) {
  return <ShopKindProvider shopKind="fusion">{children}</ShopKindProvider>;
}
