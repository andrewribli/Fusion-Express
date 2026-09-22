/**
 * Seeds Firestore `canteens/{id}` + `canteens/{id}/items/{itemId}`
 * for the three new CUHK cafe/canteen entries.
 *
 * Usage (from apps/web):
 *   npx tsx scripts/seed-canteens.ts
 *
 * Or from repo root with service account at ./firebase-service-account.json.
 */

import { readFileSync } from "fs";
import { resolve } from "path";
import { initializeApp, cert, getApps } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

const PLACEHOLDER = "https://placehold.co/200x200/png";

type SeedItem = {
  id: string;
  name: string;
  description?: string;
  price: number;
  category: string;
  image: string;
  signature?: boolean;
  sortOrder: number;
};

type SeedRestaurant = {
  id: string;
  name: string;
  shortName: string;
  blurb: string;
  location: string;
  hoursLabel: string;
  deliveryFee: number;
  collegeId: string | null;
  menuReady: boolean;
  items: SeedItem[];
};

const RESTAURANTS: SeedRestaurant[] = [
  {
    id: "cu-cafe",
    name: "CU Cafe",
    shortName: "CU Cafe",
    blurb:
      "CU Cafe is a grab-and-go spot for sandwiches, salads, and premium coffee.",
    location: "Lee Shau Kee Building (LSK)",
    hoursLabel: "8:00 AM – 6:00 PM (Mon–Fri)",
    deliveryFee: 10,
    collegeId: null,
    menuReady: true,
    items: [
      {
        id: "turkey-breast-sandwich",
        name: "Turkey Breast Sandwich",
        description: "Turkey breast on fresh bread — grab-and-go.",
        price: 38,
        category: "mains",
        image: PLACEHOLDER,
        sortOrder: 1,
      },
      {
        id: "caesar-salad",
        name: "Caesar Salad",
        description: "Crisp romaine with classic Caesar dressing.",
        price: 42,
        category: "mains",
        image: PLACEHOLDER,
        sortOrder: 2,
      },
      {
        id: "house-brew-coffee",
        name: "House Brew Coffee",
        description: "Premium drip coffee.",
        price: 25,
        category: "drinks",
        image: PLACEHOLDER,
        sortOrder: 3,
      },
      {
        id: "matcha-latte",
        name: "Matcha Latte",
        description: "Smooth matcha with steamed milk.",
        price: 32,
        category: "drinks",
        image: PLACEHOLDER,
        sortOrder: 4,
      },
      {
        id: "chocolate-cake",
        name: "Chocolate Cake",
        description: "Rich chocolate slice.",
        price: 28,
        category: "dessert",
        image: PLACEHOLDER,
        sortOrder: 5,
      },
    ],
  },
  {
    id: "sh-ho-canteen",
    name: "S.H. Ho College Canteen",
    shortName: "S.H. Ho Canteen",
    blurb:
      "The S.H. Ho College canteen serves casual Chinese and Western meals.",
    location: "S.H. Ho College",
    hoursLabel: "8:00 AM – 9:00 PM (Mon–Sat)",
    deliveryFee: 10,
    collegeId: "SHHO",
    menuReady: true,
    items: [
      {
        id: "chicken-rice",
        name: "Chicken Rice",
        description: "Casual Chinese chicken rice.",
        price: 42,
        category: "mains",
        image: PLACEHOLDER,
        sortOrder: 1,
      },
      {
        id: "beef-noodles",
        name: "Beef Noodles",
        description: "Beef noodles in savory broth.",
        price: 45,
        category: "mains",
        image: PLACEHOLDER,
        sortOrder: 2,
      },
      {
        id: "club-sandwich",
        name: "Club Sandwich",
        description: "Western-style club sandwich.",
        price: 38,
        category: "mains",
        image: PLACEHOLDER,
        sortOrder: 3,
      },
      {
        id: "fried-rice",
        name: "Fried Rice",
        description: "Classic fried rice.",
        price: 40,
        category: "mains",
        image: PLACEHOLDER,
        sortOrder: 4,
      },
      {
        id: "iced-lemon-tea",
        name: "Iced Lemon Tea",
        description: "Refreshing iced lemon tea.",
        price: 15,
        category: "drinks",
        image: PLACEHOLDER,
        sortOrder: 5,
      },
    ],
  },
  {
    id: "paper-and-coffee",
    name: "Paper & Coffee",
    shortName: "Paper & Coffee",
    blurb:
      "Paper & Coffee is a popular spot for premium coffee and Japanese-style rice bowls. Famous for its signature House Brew and Fried Chicken.",
    location:
      'LG/F, William M.W. Mong Building (near the University Station / "foot of the hill")',
    hoursLabel: "8:00 AM – 5:00 PM (Mon–Fri)",
    deliveryFee: 10,
    collegeId: null,
    menuReady: true,
    items: [
      {
        id: "house-brew-coffee",
        name: "House Brew Coffee",
        description: "Signature house brew — a campus favorite.",
        price: 25,
        category: "drinks",
        image: PLACEHOLDER,
        signature: true,
        sortOrder: 1,
      },
      {
        id: "matcha-latte",
        name: "Matcha Latte",
        description: "Signature matcha latte.",
        price: 32,
        category: "drinks",
        image: PLACEHOLDER,
        signature: true,
        sortOrder: 2,
      },
      {
        id: "japanese-fried-chicken",
        name: "Japanese Fried Chicken",
        description: "Famous Japanese-style fried chicken.",
        price: 50,
        category: "mains",
        image: PLACEHOLDER,
        signature: true,
        sortOrder: 3,
      },
      {
        id: "chicken-rice-bowl",
        name: "Chicken Rice Bowl",
        description: "Japanese-style chicken rice bowl.",
        price: 52,
        category: "mains",
        image: PLACEHOLDER,
        sortOrder: 4,
      },
      {
        id: "dark-chocolate-cake",
        name: "Dark Chocolate Cake",
        description: "Dark chocolate cake slice.",
        price: 32,
        category: "dessert",
        image: PLACEHOLDER,
        sortOrder: 5,
      },
      {
        id: "tea-pickled-rice-fried-chicken",
        name: "Tea-Pickled Rice with Fried Chicken",
        description: "Tea-pickled rice topped with fried chicken.",
        price: 50,
        category: "mains",
        image: PLACEHOLDER,
        sortOrder: 6,
      },
    ],
  },
];

const candidates = [
  process.env.FIREBASE_SERVICE_ACCOUNT_PATH,
  "./firebase-service-account.json",
  "../firebase-service-account.json",
  "../../firebase-service-account.json",
  "../fusion-express-6a438-firebase-adminsdk-fbsvc-817676b923.json",
  "../../fusion-express-6a438-firebase-adminsdk-fbsvc-817676b923.json",
].filter(Boolean) as string[];

function loadServiceAccount(): object {
  for (const rel of candidates) {
    try {
      const absolutePath = resolve(process.cwd(), rel);
      return JSON.parse(readFileSync(absolutePath, "utf8"));
    } catch {
      // try next
    }
  }
  throw new Error(
    "No firebase service account JSON found. Set FIREBASE_SERVICE_ACCOUNT_PATH.",
  );
}

if (!getApps().length) {
  initializeApp({ credential: cert(loadServiceAccount() as never) });
}

const db = getFirestore();

async function seed() {
  console.log(`Seeding ${RESTAURANTS.length} canteens into Firestore…`);

  for (const r of RESTAURANTS) {
    const { items, ...meta } = r;
    const ref = db.collection("canteens").doc(r.id);
    await ref.set({
      ...meta,
      updatedAt: new Date().toISOString(),
    });
    console.log(`  wrote canteens/${r.id}`);

    const batch = db.batch();
    for (const item of items) {
      const itemRef = ref.collection("items").doc(item.id);
      batch.set(itemRef, {
        ...item,
        restaurantId: r.id,
        cartItemId: `canteen:${r.id}:${item.id}`,
      });
    }
    await batch.commit();
    console.log(`    wrote ${items.length} items under canteens/${r.id}/items`);
  }

  console.log("Done.");
}

seed().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
