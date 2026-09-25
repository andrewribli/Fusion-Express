"use client";

import { collection, getDocs, query, where } from "firebase/firestore";
import { CAMPUS_ID } from "@/ptero/config/campus";
import type { MenuItem } from "@/ptero/lib/types";
import { getDb } from "@/lib/firebase";

/** Load the Wellcome aisle only. Taste stays in the local catalog. */
export async function loadWellcomeMenu(): Promise<MenuItem[]> {
  const snap = await getDocs(
    query(collection(getDb(), "products"), where("source", "==", "wellcome")),
  );
  return snap.docs.map((doc, index) => {
    const row = doc.data() as {
      id?: string;
      name?: string;
      price?: number;
      originalPrice?: number;
      category?: string;
      image?: string;
      inStock?: boolean;
    };
    const price = Number(row.price);
    const original = Number(row.originalPrice);
    const onSale = Number.isFinite(original) && original > price && price > 0;
    return {
      id: `wellcome:${row.id ?? doc.id}`,
      campus: CAMPUS_ID,
      name: row.name || "Wellcome item",
      category: row.category || "Other",
      price: onSale ? original : Number.isFinite(price) ? price : 0,
      salePrice: onSale ? price : undefined,
      unit: "item",
      image: row.image || undefined,
      priceType: "fixed",
      runnerInputsPrice: false,
      inStock: row.inStock !== false && Number.isFinite(price) && price > 0,
      sortOrder: index + 1,
      weightKg: 0.4,
      grocerySource: "wellcome",
    };
  });
}
