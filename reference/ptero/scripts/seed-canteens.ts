/**
 * Seed CityU canteens + menu subcollections into Firestore (ptero-cityu).
 *
 * Usage:
 *   npx tsx scripts/seed-canteens.ts
 *
 * Uses the client SDK with the public web config. Temporarily allow writes via
 * Admin/MCP seed, or run while rules briefly allow authenticated admin writes.
 * Preferred path: Firebase MCP / Console import using canteen-seed-data.ts.
 */

import { initializeApp } from "firebase/app";
import { doc, setDoc, getFirestore } from "firebase/firestore";
import {
  PLACEHOLDER_IMAGE,
  SEED_CANTEENS,
} from "./canteen-seed-data";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ?? "ptero-cityu",
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

async function main() {
  if (!firebaseConfig.apiKey) {
    throw new Error("Set NEXT_PUBLIC_FIREBASE_* env vars before seeding.");
  }
  const app = initializeApp(firebaseConfig);
  const db = getFirestore(app);

  for (const canteen of SEED_CANTEENS) {
    const canteenRef = doc(db, "canteens", canteen.id);
    await setDoc(canteenRef, {
      name: canteen.name,
      location: canteen.location,
      hours: canteen.hours,
      campus: "cityu",
    });
    console.log(`Wrote canteen ${canteen.id}`);

    for (const menuItem of canteen.menu) {
      await setDoc(doc(canteenRef, "menu", menuItem.id), {
        name: menuItem.name,
        price: menuItem.price,
        imageUrl: PLACEHOLDER_IMAGE,
        category: menuItem.category,
      });
    }
    console.log(`  ${canteen.menu.length} menu items`);
  }

  console.log("Seed complete.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
