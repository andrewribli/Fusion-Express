/**
 * Ebeneezer's Kebabs & Pizzeria (CUHK) — scraped from FoodPanda (c1zh).
 * Prices are FoodPanda HK$ (numeric). Do not invent missing prices.
 */
import type { SimpleMenuItem } from "@/data/canteen/simple-menu";
import { CANTEEN_PLACEHOLDER_IMAGE as img } from "@/data/canteen/simple-menu";

export const EBENEEZERS_MENU: SimpleMenuItem[] = [
  // Kebabs (mains)
  { id: "donar-kebab-lamb", name: "Donar Kebab (Lamb)", description: "Roasted tender lamb in Lebanese pita with salad and dressings", price: 47.7, category: "mains", image: img, signature: true },
  { id: "gyros-kebab-chicken", name: "Gyros Kebab (Chicken)", description: "Roasted chicken in Lebanese pita with salad and dressings", price: 45.6, category: "mains", image: img, signature: true },
  { id: "chicken-tikka-kebab", name: "Chicken Tikka Kebab", description: "Tandoori boneless chicken in Lebanese pita", price: 45.6, category: "mains", image: img },
  { id: "falafel-kebab", name: "Falafel Kebab", description: "Vegetarian falafel in Lebanese pita", price: 42.5, category: "mains", image: img },
  { id: "meatball-kebab", name: "Meatball Kebab", description: "Meatball in Lebanese pita with salad and dressings", price: 43.6, category: "mains", image: img },
  { id: "real-beef-kebab", name: "Real Beef Kebab", description: "Real beef in Lebanese pita", price: 49.8, category: "mains", image: img },
  { id: "chicken-shish-kebab", name: "Chicken Shish Kebab", description: "Chicken shish in Lebanese pita", price: 47.7, category: "mains", image: img },
  { id: "fish-kebab", name: "Fish Kebab", description: "Fish in Lebanese pita", price: 45.6, category: "mains", image: img },
  { id: "halloumi-kebab", name: "Halloumi Cheese Kebab", description: "Vegetarian halloumi in Lebanese pita", price: 46.7, category: "mains", image: img, signature: true },
  { id: "kofta-kebab", name: "Kofta Kebab", description: "Kofta in Lebanese pita", price: 44.6, category: "mains", image: img },
  // Biryani
  { id: "veg-biryani", name: "Vegetable Biryani", description: "Basmati rice with vegetables and spices", price: 39.5, category: "mains", image: img },
  { id: "chicken-tikka-biryani", name: "Chicken Tikka Biryani", description: "Basmati rice with tandoori chicken", price: 47, category: "mains", image: img },
  { id: "fish-biryani", name: "Fish Biryani", description: "Basmati rice with fish and spices", price: 39.5, category: "mains", image: img },
  { id: "meatball-biryani", name: "Meatball Biryani", description: "Basmati rice with meatball", price: 48, category: "mains", image: img },
  { id: "chicken-biryani", name: "Chicken Biryani", description: "Basmati rice with chicken", price: 44, category: "mains", image: img },
  // Salads
  { id: "garden-salad", name: "Garden Salad", description: "Lettuce, tomato, carrot, red cabbage, cucumber", price: 28, category: "mains", image: img },
  { id: "roast-chicken-salad", name: "Roast Chicken Salad", price: 36.4, category: "mains", image: img },
  { id: "roast-lamb-salad", name: "Roast Lamb Salad", price: 47.7, category: "mains", image: img },
  { id: "chicken-tikka-salad", name: "Chicken Tikka Salad", price: 41.5, category: "mains", image: img },
  { id: "real-beef-salad", name: "Real Beef Salad", price: 49.8, category: "mains", image: img },
  { id: "halloumi-salad", name: "Halloumi Cheese Salad", price: 46.7, category: "mains", image: img },
  // Plates
  { id: "roast-chicken-plate", name: "Roast Chicken", description: "Served with rice or chips", price: 39.4, category: "mains", image: img },
  { id: "roast-lamb-plate", name: "Roast Lamb", description: "Served with rice or chips", price: 47.7, category: "mains", image: img },
  { id: "chicken-tikka-plate", name: "Chicken Tikka", description: "Served with rice or chips", price: 40.4, category: "mains", image: img },
  { id: "real-beef-plate", name: "Real Beef", description: "Served with rice or chips", price: 49.8, category: "mains", image: img },
  // Curry
  { id: "chicken-curry-rice", name: "Chicken Curry With Rice", price: 38.4, category: "mains", image: img },
  { id: "veg-curry-rice", name: "Vegetable Curry With Rice", price: 39.4, category: "mains", image: img },
  { id: "fish-curry-rice", name: "Fish Curry With Rice", price: 39.4, category: "mains", image: img },
  { id: "meatball-curry-rice", name: "Meatball Curry With Rice", price: 42.5, category: "mains", image: img },
  { id: "chana-masala-rice", name: "Chana Masala With Rice", price: 41, category: "mains", image: img },
  { id: "dal-makhani-rice", name: "Dal Makhani With Rice", price: 41, category: "mains", image: img },
  // Pizza
  { id: "margherita-pizza", name: "Margherita Pizza", description: "Plain cheese", price: 65, category: "mains", image: img },
  { id: "pepperoni-pizza", name: "Pepperoni Pizza", description: "Beef pepperoni and cheese", price: 69.5, category: "mains", image: img },
  { id: "supreme-pizza", name: "Supreme Pizza", price: 75, category: "mains", image: img },
  { id: "chicken-tikka-pizza", name: "Chicken Tikka Pizza", price: 75, category: "mains", image: img },
  { id: "vegetarian-pizza", name: "Vegetarian Pizza", price: 69.5, category: "mains", image: img },
  { id: "hawaiian-pizza", name: "Hawaiian Pizza", price: 69.5, category: "mains", image: img },
  { id: "chicken-express-pizza", name: "Chicken Express Pizza", price: 75, category: "mains", image: img },
  { id: "ham-mushroom-pizza", name: "Turkey-Based Ham And Mushroom Pizza", price: 69.5, category: "mains", image: img },
  // Sides / snacks
  { id: "chips", name: "Chips", price: 31.1, category: "snacks", image: img },
  { id: "samosas", name: "Samosas (2 Pcs)", price: 19.2, category: "snacks", image: img },
  { id: "falafels", name: "Falafels (3 Pcs)", price: 20.7, category: "snacks", image: img },
  { id: "spring-rolls", name: "Spring Rolls (4 Pcs)", price: 20.7, category: "snacks", image: img },
  { id: "hummus-pita", name: "Hummus And Pita Bread (1 Pc)", price: 28, category: "snacks", image: img },
  // Drinks
  { id: "pepsi", name: "Pepsi", price: 8.8, category: "drinks", image: img },
  { id: "pepsi-light", name: "Pepsi Light", price: 8.8, category: "drinks", image: img },
  { id: "7up", name: "7 Up", price: 8.8, category: "drinks", image: img },
  { id: "7up-light", name: "7 Up Light", price: 8.8, category: "drinks", image: img },
  { id: "mirinda", name: "Mirinda Orange", price: 8.8, category: "drinks", image: img },
  { id: "delta-mango", name: "Delta Mango", price: 13, category: "drinks", image: img },
  { id: "delta-chocolate", name: "Delta Chocolate", price: 13, category: "drinks", image: img },
  { id: "delta-banana", name: "Delta Banana", price: 13, category: "drinks", image: img },
];
