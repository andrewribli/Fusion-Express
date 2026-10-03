"use client";

import { ShopKindProvider } from "@/context/CartContext";

export default function FusionLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <ShopKindProvider shopKind="fusion">{children}</ShopKindProvider>;
}
