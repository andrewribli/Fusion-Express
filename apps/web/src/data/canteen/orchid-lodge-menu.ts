/**
 * Orchid Lodge (Chung Chi / Sha Tin) — prices only where confirmed
 * (OpenRice reviews). Unconfirmed signature dishes use priceOnRequest.
 */
import type { SimpleMenuItem } from "@/data/canteen/simple-menu";

export const ORCHID_LODGE_MENU: SimpleMenuItem[] = [
  {
    id: "five-layer-french-toast",
    name: "Super Five-Layer French Toast",
    description: "巨型五層厚西多士 — Review-confirmed HK$39",
    price: 39,
    category: "mains",
    image: "/canteen/food/five-layer-french-toast.jpg",
    signature: true,
  },
  {
    id: "cheese-bacon-egg-baked-potato",
    name: "Cheese Bacon Egg Baked Potato",
    description: "芝士煙肉碎蛋焗薯 — Review-confirmed HK$38",
    price: 38,
    category: "mains",
    image: "/canteen/food/cheese-bacon-egg-baked-potato.jpg",
    signature: true,
  },
  {
    id: "homemade-beef-burger",
    name: "Homemade Fresh Beef Burger",
    description: "自家製鮮牛肉漢堡包 — price not listed on OpenRice",
    price: 0,
    category: "mains",
    image: "/canteen/food/homemade-beef-burger.jpg",
    signature: true,
    priceOnRequest: true,
  },
  {
    id: "baked-potato-set",
    name: "Baked Potato Set",
    description: "焗薯餐 — price not listed on OpenRice",
    price: 0,
    category: "mains",
    image: "/canteen/food/baked-potato-set.jpg",
    priceOnRequest: true,
  },
  {
    id: "smoked-salmon-caesar",
    name: "Smoked Salmon Caesar Salad",
    description: "煙三文魚凱撒沙律 — price not listed on OpenRice",
    price: 0,
    category: "mains",
    image: "/canteen/food/smoked-salmon-caesar.jpg",
    priceOnRequest: true,
  },
  {
    id: "orchid-sandwich",
    name: "Orchid Lodge Sandwich",
    description: "蘭苑三文治 — price not listed on OpenRice",
    price: 0,
    category: "mains",
    image: "/canteen/food/orchid-sandwich.jpg",
    priceOnRequest: true,
  },
  {
    id: "lemon-mousse-pie",
    name: "Lemon Mousse Pie",
    description: "檸檬慕絲批 — price not listed on OpenRice",
    price: 0,
    category: "dessert",
    image: "/canteen/food/lemon-mousse-pie.jpg",
    signature: true,
    priceOnRequest: true,
  },
  {
    id: "ice-cream-scoop",
    name: "Ice Cream Scoop (add-on)",
    description: "Add to French toast — Review-confirmed HK$10",
    price: 10,
    category: "dessert",
    image: "/canteen/food/ice-cream-scoop.jpg",
  },
];
