import { CAMPUS_ID, type CampusId } from "@/config/campus";
import {
  CATEGORY_LABELS,
  PRODUCT_CATEGORIES,
  type ProductCategory,
} from "@/config/categories";
import type { MenuItem } from "@/lib/types";

export {
  CATEGORY_LABELS,
  PRODUCT_CATEGORIES,
  SIDEBAR_CATEGORIES,
  type ProductCategory,
  type SidebarCategoryId,
} from "@/config/categories";

const PLACEHOLDER_COLORS: Partial<Record<ProductCategory, string>> = {
  "instant-meal": "ED1C24",
  noodles: "c9171e",
  beverages: "2563eb",
  snacks: "d97706",
  chocolates: "92400e",
  fruits: "16a34a",
  vegetables: "15803d",
  "meat-seafood": "b91c1c",
  "dairy-eggs": "ca8a04",
  frozen: "0284c7",
  bakery: "a16207",
  "ice-cream": "db2777",
  "new-arrivals": "4b5563",
  offers: "ED1C24",
  "weekly-best": "ED1C24",
};

function img(label: string, category: ProductCategory): string {
  const bg = PLACEHOLDER_COLORS[category] ?? "6b7280";
  return `https://placehold.co/400x400/${bg}/ffffff/png?text=${encodeURIComponent(label)}`;
}

function item(
  partial: Omit<MenuItem, "campus" | "inStock" | "priceType" | "runnerInputsPrice"> & {
    campus?: CampusId;
    inStock?: boolean;
    salePrice?: number;
  },
): MenuItem {
  return {
    campus: CAMPUS_ID,
    inStock: true,
    priceType: "fixed",
    runnerInputsPrice: false,
    ...partial,
  };
}

/** Dummy Taste (Festival Walk) catalog for the CityU prototype. */
export const TASTE_PRODUCTS: MenuItem[] = [
  item({
    id: "nissin-cup-seafood",
    name: "Nissin Cup Noodles Seafood",
    category: "instant-meal",
    price: 10.5,
    salePrice: 8.5,
    unit: "cup",
    image: img("Cup noodle", "instant-meal"),
    sortOrder: 1,
    weightKg: 0.08,
  }),
  item({
    id: "nissin-demae-sesame",
    name: "Nissin Demae Sesame Oil",
    category: "noodles",
    price: 8.9,
    unit: "pack",
    image: img("Demae", "noodles"),
    sortOrder: 2,
    weightKg: 0.1,
  }),
  item({
    id: "shin-ramyun",
    name: "Nongshim Shin Ramyun",
    category: "instant-meal",
    price: 11.5,
    salePrice: 9.5,
    unit: "pack",
    image: img("Shin", "instant-meal"),
    sortOrder: 3,
    weightKg: 0.12,
  }),
  item({
    id: "indomie-goreng",
    name: "Indomie Mi Goreng",
    category: "noodles",
    price: 6.9,
    unit: "pack",
    image: img("Indomie", "noodles"),
    sortOrder: 4,
    weightKg: 0.08,
  }),
  item({
    id: "doll-bowl",
    name: "Doll Bowl Noodles Spicy",
    category: "instant-meal",
    price: 12.5,
    unit: "bowl",
    image: img("Doll bowl", "instant-meal"),
    sortOrder: 5,
    weightKg: 0.12,
  }),
  item({
    id: "samyang-hot-chicken",
    name: "Samyang Hot Chicken Ramen",
    category: "instant-meal",
    price: 13.9,
    unit: "pack",
    image: img("Samyang", "instant-meal"),
    sortOrder: 6,
    weightKg: 0.14,
  }),
  item({
    id: "coke-330",
    name: "Coca-Cola 330ml",
    category: "beverages",
    price: 7.5,
    salePrice: 6.5,
    unit: "can",
    image: img("Coke", "beverages"),
    sortOrder: 10,
    weightKg: 0.35,
  }),
  item({
    id: "vitasoy-original",
    name: "Vitasoy Original 250ml",
    category: "beverages",
    price: 5.9,
    unit: "pack",
    image: img("Vitasoy", "beverages"),
    sortOrder: 11,
    weightKg: 0.26,
  }),
  item({
    id: "pocari-500",
    name: "Pocari Sweat 500ml",
    category: "beverages",
    price: 12.9,
    unit: "bottle",
    image: img("Pocari", "beverages"),
    sortOrder: 12,
    weightKg: 0.52,
  }),
  item({
    id: "vita-lemon-tea",
    name: "Vita Lemon Tea 250ml",
    category: "beverages",
    price: 5.5,
    unit: "pack",
    image: img("Lemon tea", "beverages"),
    sortOrder: 13,
    weightKg: 0.26,
  }),
  item({
    id: "watsons-water",
    name: "Watsons Distilled Water 600ml",
    category: "beverages",
    price: 6.0,
    unit: "bottle",
    image: img("Water", "beverages"),
    sortOrder: 14,
    weightKg: 0.62,
  }),
  item({
    id: "oatly-1l",
    name: "Oatly Oat Drink 1L",
    category: "dairy-eggs",
    price: 28.9,
    unit: "carton",
    image: img("Oatly", "dairy-eggs"),
    sortOrder: 15,
    weightKg: 1.05,
  }),
  item({
    id: "lays-classic",
    name: "Lay's Classic 70g",
    category: "snacks",
    price: 14.9,
    salePrice: 12.9,
    unit: "bag",
    image: img("Lays", "snacks"),
    sortOrder: 20,
    weightKg: 0.07,
  }),
  item({
    id: "calbee-jagarico",
    name: "Calbee Jagarico Salad",
    category: "snacks",
    price: 15.9,
    unit: "cup",
    image: img("Jagarico", "snacks"),
    sortOrder: 21,
    weightKg: 0.06,
  }),
  item({
    id: "oreo-original",
    name: "Oreo Original 137g",
    category: "chocolates",
    price: 16.5,
    unit: "pack",
    image: img("Oreo", "chocolates"),
    sortOrder: 22,
    weightKg: 0.14,
  }),
  item({
    id: "pocky-chocolate",
    name: "Pocky Chocolate",
    category: "chocolates",
    price: 13.9,
    unit: "box",
    image: img("Pocky", "chocolates"),
    sortOrder: 23,
    weightKg: 0.05,
  }),
  item({
    id: "hello-panda",
    name: "Meiji Hello Panda Chocolate",
    category: "chocolates",
    price: 14.5,
    unit: "pack",
    image: img("Panda", "chocolates"),
    sortOrder: 24,
    weightKg: 0.05,
  }),
  item({
    id: "pringles-original",
    name: "Pringles Original 149g",
    category: "snacks",
    price: 22.9,
    unit: "tube",
    image: img("Pringles", "snacks"),
    sortOrder: 25,
    weightKg: 0.16,
  }),
  item({
    id: "kleenex-tissues",
    name: "Kleenex Facial Tissues 5-pack",
    category: "new-arrivals",
    price: 18.9,
    unit: "pack",
    image: img("Tissues", "new-arrivals"),
    sortOrder: 30,
    weightKg: 0.35,
  }),
  item({
    id: "colgate-toothpaste",
    name: "Colgate Toothpaste 160g",
    category: "new-arrivals",
    price: 24.9,
    unit: "tube",
    image: img("Colgate", "new-arrivals"),
    sortOrder: 31,
    weightKg: 0.18,
  }),
  item({
    id: "bananas",
    name: "Bananas (bunch)",
    category: "fruits",
    price: 18.9,
    salePrice: 16.9,
    unit: "bunch",
    image: img("Bananas", "fruits"),
    sortOrder: 40,
    weightKg: 0.8,
  }),
  item({
    id: "cherry-tomatoes",
    name: "Cherry Tomatoes 250g",
    category: "vegetables",
    price: 18.5,
    unit: "punnet",
    image: img("Tomatoes", "vegetables"),
    sortOrder: 41,
    weightKg: 0.25,
  }),
  item({
    id: "eggs-10",
    name: "Fresh Eggs 10s",
    category: "dairy-eggs",
    price: 28.9,
    unit: "tray",
    image: img("Eggs", "dairy-eggs"),
    sortOrder: 42,
    weightKg: 0.6,
  }),
  item({
    id: "meiji-milk",
    name: "Meiji Fresh Milk 1L",
    category: "dairy-eggs",
    price: 26.9,
    unit: "carton",
    image: img("Milk", "dairy-eggs"),
    sortOrder: 43,
    weightKg: 1.05,
  }),
  item({
    id: "cucumber",
    name: "Cucumber",
    category: "vegetables",
    price: 8.9,
    unit: "each",
    image: img("Cucumber", "vegetables"),
    sortOrder: 44,
    weightKg: 0.25,
  }),
  item({
    id: "chicken-breast",
    name: "Chicken Breast 300g",
    category: "meat-seafood",
    price: 38.9,
    unit: "pack",
    image: img("Chicken", "meat-seafood"),
    sortOrder: 45,
    weightKg: 0.3,
  }),
  item({
    id: "haagen-vanilla",
    name: "Häagen-Dazs Vanilla Mini Cup",
    category: "ice-cream",
    price: 32.9,
    salePrice: 28.9,
    unit: "cup",
    image: img("Ice cream", "ice-cream"),
    sortOrder: 50,
    weightKg: 0.1,
  }),
  item({
    id: "white-bread",
    name: "Garden Soft White Bread",
    category: "bakery",
    price: 15.9,
    unit: "loaf",
    image: img("Bread", "bakery"),
    sortOrder: 51,
    weightKg: 0.4,
  }),
  item({
    id: "frozen-dumplings",
    name: "CJ Mandu Pork Dumplings",
    category: "frozen",
    price: 42.9,
    unit: "pack",
    image: img("Dumplings", "frozen"),
    sortOrder: 52,
    weightKg: 0.5,
  }),
  item({
    id: "weekly-snack-box",
    name: "Weekly Best Buy Snack Mix",
    category: "weekly-best",
    price: 39.9,
    salePrice: 29.9,
    unit: "box",
    image: img("Best buy", "weekly-best"),
    sortOrder: 60,
    weightKg: 0.35,
  }),
  item({
    id: "offer-coke-pack",
    name: "Coca-Cola 6-pack Offer",
    category: "offers",
    price: 42.0,
    salePrice: 34.9,
    unit: "pack",
    image: img("Coke 6pk", "offers"),
    sortOrder: 61,
    weightKg: 2.1,
  }),
];

export function getProduct(id: string): MenuItem | undefined {
  return TASTE_PRODUCTS.find((p) => p.id === id);
}

export function productsByCategory(category: string): MenuItem[] {
  return TASTE_PRODUCTS.filter((p) => p.category === category);
}

export function searchProducts(query: string): MenuItem[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  return TASTE_PRODUCTS.filter((p) => p.name.toLowerCase().includes(q));
}

export function recommendedProducts(): MenuItem[] {
  return TASTE_PRODUCTS.slice(0, 12);
}
