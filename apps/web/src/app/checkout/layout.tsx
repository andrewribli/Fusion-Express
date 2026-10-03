"use client";

import { ShopKindProvider } from "@/context/CartContext";

export default function CheckoutLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <ShopKindProvider shopKind="fusion">{children}</ShopKindProvider>;
}
