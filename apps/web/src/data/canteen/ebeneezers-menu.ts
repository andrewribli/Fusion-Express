/**
 * Ebeneezer's Kebabs & Pizzeria (CUHK) — scraped from FoodPanda (c1zh).
 * Prices are FoodPanda HK$ (numeric). Do not invent missing prices.
 */
import type { SimpleMenuItem } from "@/data/canteen/simple-menu";

export const EBENEEZERS_MENU: SimpleMenuItem[] = [
  // Kebabs (mains)
  { id: "donar-kebab-lamb", name: "Donar Kebab (Lamb)", description: "Roasted tender lamb in Lebanese pita with salad and dressings", price: 47.7, category: "mains", image: "/canteen/food/donar-kebab-lamb.jpg", signature: true },
  { id: "gyros-kebab-chicken", name: "Gyros Kebab (Chicken)", description: "Roasted chicken in Lebanese pita with salad and dressings", price: 45.6, category: "mains", image: "/canteen/food/gyros-kebab-chicken.jpg", signature: true },
  { id: "chicken-tikka-kebab", name: "Chicken Tikka Kebab", description: "Tandoori boneless chicken in Lebanese pita", price: 45.6, category: "mains", image: "/canteen/food/gyros-kebab-chicken.jpg" },
  { id: "falafel-kebab", name: "Falafel Kebab", description: "Vegetarian falafel in Lebanese pita", price: 42.5, category: "mains", image: "/canteen/food/falafels.jpg" },
  { id: "meatball-kebab", name: "Meatball Kebab", description: "Meatball in Lebanese pita with salad and dressings", price: 43.6, category: "mains", image: "/canteen/food/donar-kebab-lamb.jpg" },
  { id: "real-beef-kebab", name: "Real Beef Kebab", description: "Real beef in Lebanese pita", price: 49.8, category: "mains", image: "/canteen/food/real-beef-kebab.jpg" },
  { id: "chicken-shish-kebab", name: "Chicken Shish Kebab", description: "Chicken shish in Lebanese pita", price: 47.7, category: "mains", image: "/canteen/food/chicken-shish-kebab.jpg" },
  { id: "fish-kebab", name: "Fish Kebab", description: "Fish in Lebanese pita", price: 45.6, category: "mains", image: "/canteen/food/fish-kebab.jpg" },
  { id: "halloumi-kebab", name: "Halloumi Cheese Kebab", description: "Vegetarian halloumi in Lebanese pita", price: 46.7, category: "mains", image: "/canteen/food/halloumi-salad.jpg", signature: true },
  { id: "kofta-kebab", name: "Kofta Kebab", description: "Kofta in Lebanese pita", price: 44.6, category: "mains", image: "/canteen/food/real-beef-kebab.jpg" },
  // Biryani
  { id: "veg-biryani", name: "Vegetable Biryani", description: "Basmati rice with vegetables and spices", price: 39.5, category: "mains", image: "/canteen/food/veg-biryani.jpg" },
  { id: "chicken-tikka-biryani", name: "Chicken Tikka Biryani", description: "Basmati rice with tandoori chicken", price: 47, category: "mains", image: "/canteen/food/chicken-tikka-biryani.jpg" },
  { id: "fish-biryani", name: "Fish Biryani", description: "Basmati rice with fish and spices", price: 39.5, category: "mains", image: "/canteen/food/fish-biryani.jpg" },
  { id: "meatball-biryani", name: "Meatball Biryani", description: "Basmati rice with meatball", price: 48, category: "mains", image: "/canteen/food/chicken-biryani.jpg" },
  { id: "chicken-biryani", name: "Chicken Biryani", description: "Basmati rice with chicken", price: 44, category: "mains", image: "/canteen/food/chicken-biryani.jpg" },
  // Salads
  { id: "garden-salad", name: "Garden Salad", description: "Lettuce, tomato, carrot, red cabbage, cucumber", price: 28, category: "snacks", image: "/canteen/food/garden-salad.jpg" },
  { id: "roast-chicken-salad", name: "Roast Chicken Salad", price: 36.4, category: "snacks", image: "/canteen/food/roast-chicken-salad.jpg" },
  { id: "roast-lamb-salad", name: "Roast Lamb Salad", price: 47.7, category: "snacks", image: "/canteen/food/roast-lamb-salad.jpg" },
  { id: "chicken-tikka-salad", name: "Chicken Tikka Salad", price: 41.5, category: "snacks", image: "/canteen/food/chicken-tikka-salad.jpg" },
  { id: "real-beef-salad", name: "Real Beef Salad", price: 49.8, category: "snacks", image: "/canteen/food/real-beef-salad.jpg" },
  { id: "halloumi-salad", name: "Halloumi Cheese Salad", price: 46.7, category: "snacks", image: "/canteen/food/halloumi-salad.jpg" },
  // Plates
  { id: "roast-chicken-plate", name: "Roast Chicken", description: "Served with rice or chips", price: 39.4, category: "mains", image: "/canteen/food/roast-chicken-plate.jpg" },
  { id: "roast-lamb-plate", name: "Roast Lamb", description: "Served with rice or chips", price: 47.7, category: "mains", image: "/canteen/food/roast-lamb-plate.jpg" },
  { id: "chicken-tikka-plate", name: "Chicken Tikka", description: "Served with rice or chips", price: 40.4, category: "mains", image: "/canteen/food/chicken-tikka-plate.jpg" },
  { id: "real-beef-plate", name: "Real Beef", description: "Served with rice or chips", price: 49.8, category: "mains", image: "/canteen/food/real-beef-plate.jpg" },
  // Curry
  { id: "chicken-curry-rice", name: "Chicken Curry With Rice", price: 38.4, category: "mains", image: "/canteen/food/chicken-curry-rice.jpg" },
  { id: "veg-curry-rice", name: "Vegetable Curry With Rice", price: 39.4, category: "mains", image: "/canteen/food/veg-curry-rice.jpg" },
  { id: "fish-curry-rice", name: "Fish Curry With Rice", price: 39.4, category: "mains", image: "/canteen/food/fish-curry-rice.jpg" },
  { id: "meatball-curry-rice", name: "Meatball Curry With Rice", price: 42.5, category: "mains", image: "/canteen/food/meatball-curry-rice.jpg" },
  { id: "chana-masala-rice", name: "Chana Masala With Rice", price: 41, category: "mains", image: "/canteen/food/chana-masala-rice.jpg" },
  { id: "dal-makhani-rice", name: "Dal Makhani With Rice", price: 41, category: "mains", image: "/canteen/food/dal-makhani-rice.jpg" },
  // Pizza
  { id: "margherita-pizza", name: "Margherita Pizza", description: "Plain cheese", price: 65, category: "mains", image: "/canteen/food/margherita-pizza.jpg" },
  { id: "pepperoni-pizza", name: "Pepperoni Pizza", description: "Beef pepperoni and cheese", price: 69.5, category: "mains", image: "/canteen/food/pepperoni-pizza.jpg" },
  { id: "supreme-pizza", name: "Supreme Pizza", price: 75, category: "mains", image: "/canteen/food/supreme-pizza.jpg" },
  { id: "chicken-tikka-pizza", name: "Chicken Tikka Pizza", price: 75, category: "mains", image: "/canteen/food/chicken-tikka-pizza.jpg" },
  { id: "vegetarian-pizza", name: "Vegetarian Pizza", price: 69.5, category: "mains", image: "/canteen/food/vegetarian-pizza.jpg" },
  { id: "hawaiian-pizza", name: "Hawaiian Pizza", price: 69.5, category: "mains", image: "/canteen/food/hawaiian-pizza.jpg" },
  { id: "chicken-express-pizza", name: "Chicken Express Pizza", price: 75, category: "mains", image: "/canteen/food/chicken-express-pizza.jpg" },
  { id: "ham-mushroom-pizza", name: "Turkey-Based Ham And Mushroom Pizza", price: 69.5, category: "mains", image: "/canteen/food/ham-mushroom-pizza.jpg" },
  // Sides / snacks
  { id: "chips", name: "Chips", price: 31.1, category: "snacks", image: "/canteen/food/chips.jpg" },
  { id: "samosas", name: "Samosas (2 Pcs)", price: 19.2, category: "snacks", image: "/canteen/food/samosas.jpg" },
  { id: "falafels", name: "Falafels (3 Pcs)", price: 20.7, category: "snacks", image: "/canteen/food/falafels.jpg" },
  { id: "spring-rolls", name: "Spring Rolls (4 Pcs)", price: 20.7, category: "snacks", image: "/canteen/food/ebeneezers-spring-rolls.jpg" },
  { id: "hummus-pita", name: "Hummus And Pita Bread (1 Pc)", price: 28, category: "snacks", image: "/canteen/food/hummus-pita.jpg" },
  // Drinks
  { id: "pepsi", name: "Pepsi", price: 8.8, category: "drinks", image: "/canteen/food/pepsi.jpg" },
  { id: "pepsi-light", name: "Pepsi Light", price: 8.8, category: "drinks", image: "/canteen/food/pepsi-light.jpg" },
  { id: "7up", name: "7 Up", price: 8.8, category: "drinks", image: "/canteen/food/7up.jpg" },
  { id: "7up-light", name: "7 Up Light", price: 8.8, category: "drinks", image: "/canteen/food/7up-light.jpg" },
  { id: "mirinda", name: "Mirinda Orange", price: 8.8, category: "drinks", image: "/canteen/food/mirinda.jpg" },
  { id: "delta-mango", name: "Delta Mango", price: 13, category: "drinks", image: "/canteen/food/delta-mango.jpg" },
  { id: "delta-chocolate", name: "Delta Chocolate", price: 13, category: "drinks", image: "/canteen/food/delta-chocolate.jpg" },
  { id: "delta-banana", name: "Delta Banana", price: 13, category: "drinks", image: "/canteen/food/delta-banana.jpg" },
];
