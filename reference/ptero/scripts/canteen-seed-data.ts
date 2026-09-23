/**
 * Seed script for CityU canteens + menu subcollections.
 * Run: npx tsx scripts/seed-canteens.ts
 * Requires GOOGLE_APPLICATION_CREDENTIALS or uses Firebase client with open write
 * during seed — we use Admin via firebase-tools / REST with service account if set.
 *
 * Primary seed path for agents: Firestore MCP / Admin. This file documents the schema
 * and can be run with FIREBASE_SERVICE_ACCOUNT_JSON.
 */

export const PLACEHOLDER_IMAGE = "https://via.placeholder.com/200";

export type SeedCanteen = {
  id: string;
  name: string;
  location: string;
  hours: string;
  menu: { id: string; name: string; price: number; category: string }[];
};

export const SEED_CANTEENS: SeedCanteen[] = [
  {
    id: "city-express-ac1",
    name: "City Express",
    location: "5/F, Amenities Building",
    hours: "07:30 - 21:00",
    menu: [
      { id: "chicken-rice", name: "Chicken Rice", price: 38, category: "Mains" },
      { id: "fish-burger", name: "Fried Fish Burger", price: 42, category: "Mains" },
      { id: "milk-tea", name: "Milk Tea", price: 18, category: "Drinks" },
      { id: "fries", name: "French Fries", price: 22, category: "Sides" },
      { id: "toast-set", name: "Butter Toast Set", price: 28, category: "Breakfast" },
      { id: "lemon-tea", name: "Iced Lemon Tea", price: 16, category: "Drinks" },
    ],
  },
  {
    id: "ac2-canteen",
    name: "AC2 Canteen",
    location: "3/F, Li Dak Sum Yip Yio Chin Building",
    hours: "07:30 - 21:00",
    menu: [
      { id: "chicken-rice", name: "Chicken Rice", price: 36, category: "Mains" },
      { id: "fish-burger", name: "Fried Fish Burger", price: 40, category: "Mains" },
      { id: "congee", name: "Century Egg Congee", price: 26, category: "Breakfast" },
      { id: "milk-tea", name: "Milk Tea", price: 16, category: "Drinks" },
      { id: "spaghetti", name: "Tomato Meat Sauce Spaghetti", price: 44, category: "Mains" },
      { id: "ham-toast", name: "Ham & Egg Toast", price: 30, category: "Tea Time" },
    ],
  },
  {
    id: "ac3-cafe",
    name: "AC3 Cafe",
    location: "3/F, Lau Ming Wai Academic Building",
    hours: "07:30 - 21:00",
    menu: [
      { id: "latte", name: "Café Latte", price: 28, category: "Drinks" },
      { id: "milk-tea", name: "Milk Tea", price: 22, category: "Drinks" },
      { id: "fish-burger", name: "Fried Fish Burger", price: 55, category: "Mains" },
      { id: "caesar", name: "Chicken Caesar Salad", price: 46, category: "Mains" },
      { id: "eggs-benedict", name: "Eggs Benedict", price: 48, category: "Breakfast" },
      { id: "croissant", name: "Butter Croissant", price: 24, category: "Bakery" },
    ],
  },
  {
    id: "cmcafe",
    name: "CMCAFE",
    location: "3/F, Run Run Shaw Creative Media Centre",
    hours: "08:00 - 20:00",
    menu: [
      { id: "chicken-rice", name: "Chicken Rice", price: 40, category: "Mains" },
      { id: "fish-burger", name: "Fried Fish Burger", price: 45, category: "Mains" },
      { id: "milk-tea", name: "Milk Tea", price: 20, category: "Drinks" },
      { id: "americano", name: "Americano", price: 22, category: "Drinks" },
      { id: "club-sandwich", name: "Club Sandwich", price: 38, category: "Café" },
      { id: "brownie", name: "Chocolate Brownie", price: 26, category: "Dessert" },
    ],
  },
  {
    id: "hall-canteen-klnt",
    name: "Hall Canteen @KLNT",
    location: "Kowloon Tong Student Residence",
    hours: "08:00 - 22:00",
    menu: [
      { id: "chicken-rice", name: "Chicken Rice", price: 35, category: "Mains" },
      { id: "fish-burger", name: "Fried Fish Burger", price: 38, category: "Mains" },
      { id: "milk-tea", name: "Milk Tea", price: 16, category: "Drinks" },
      { id: "club-sandwich", name: "Club Sandwich", price: 32, category: "Café" },
      { id: "ramen", name: "Instant Ramen Set", price: 28, category: "Mains" },
      { id: "fries", name: "French Fries", price: 20, category: "Sides" },
    ],
  },
  {
    id: "hall-canteen-mos",
    name: "Hall Canteen @MOS",
    location: "Ma On Shan Student Residence",
    hours: "09:00 - 20:00",
    menu: [
      { id: "chicken-rice", name: "Chicken Rice", price: 35, category: "Mains" },
      { id: "fish-burger", name: "Fried Fish Burger", price: 38, category: "Mains" },
      { id: "milk-tea", name: "Milk Tea", price: 16, category: "Drinks" },
      { id: "pasta", name: "Creamy Pasta", price: 42, category: "Mains" },
      { id: "muffin", name: "Blueberry Muffin", price: 18, category: "Café" },
      { id: "lemon-tea", name: "Iced Lemon Tea", price: 15, category: "Drinks" },
    ],
  },
];
