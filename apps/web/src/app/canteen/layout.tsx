"use client";

import { ShopKindProvider } from "@/context/CartContext";

export default function CanteenLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <ShopKindProvider shopKind="canteen">{children}</ShopKindProvider>;
}
