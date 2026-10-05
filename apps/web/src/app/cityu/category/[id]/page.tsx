"use client";

import { use } from "react";
import { notFound } from "next/navigation";
import { AppHeader } from "@/ptero/components/AppHeader";
import { AppShell } from "@/ptero/components/AppShell";
import { MenuItemCard } from "@/ptero/components/MenuItemCard";
import { PrototypeBanner } from "@/ptero/components/PrototypeBanner";
import {
  CATEGORY_LABELS,
  PRODUCT_CATEGORIES,
  productsByCategory,
  type ProductCategory,
} from "@/ptero/config/products";

export default function CategoryPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  if (!PRODUCT_CATEGORIES.includes(id as ProductCategory)) notFound();
  const items = productsByCategory(id);

  return (
    <AppShell>
      <PrototypeBanner />
      <AppHeader showBack backHref="/cityu" title={CATEGORY_LABELS[id as ProductCategory]} />
      <main className="mx-auto max-w-7xl px-4 py-4 pb-28">
        <h1 className="text-lg font-bold text-gray-900">
          {CATEGORY_LABELS[id as ProductCategory]}
        </h1>
        <p className="mt-1 text-xs text-gray-500">Dummy Taste shelf — prototype catalog.</p>
        {items.length === 0 ? (
          <p className="mt-8 text-sm text-gray-500">No items in this category yet.</p>
        ) : (
          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {items.map((item) => (
              <MenuItemCard key={item.id} item={item} />
            ))}
          </div>
        )}
      </main>
    </AppShell>
  );
}
