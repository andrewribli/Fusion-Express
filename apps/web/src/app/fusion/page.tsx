"use client";

import { ShopHome } from "@/components/ShopHome";
import { ShopKindProvider } from "@/context/CartContext";

export default function FusionShopPage() {
  return (
    <ShopKindProvider shopKind="fusion">
      <ShopHome />
    </ShopKindProvider>
  );
}
