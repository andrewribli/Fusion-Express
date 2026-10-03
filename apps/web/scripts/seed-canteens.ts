/**
 * Seeds Firestore `canteens/{id}` + `canteens/{id}/items/{itemId}`
 * for CUHK cafe/canteen entries (CU Cafe, S.H. Ho, Paper & Coffee, SoraZen).
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
import { RESTAURANTS } from "../src/data/canteen/restaurants";
import {
  getSimpleMenu,
  isSimpleMenuRestaurant,
} from "../src/data/canteen/simple-menu";

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
  const targets = RESTAURANTS.filter(
    (r) => r.menuReady && isSimpleMenuRestaurant(r.id),
  );
  console.log(`Seeding ${targets.length} canteens into Firestore…`);

  for (const r of targets) {
    const items = getSimpleMenu(r.id) ?? [];
    const ref = db.collection("canteens").doc(r.id);
    await ref.set({
      id: r.id,
      name: r.name,
      shortName: r.shortName,
      blurb: r.blurb,
      location: r.location ?? null,
      hoursLabel: r.hoursLabel,
      deliveryFee: r.deliveryFee,
      collegeId: r.collegeId,
      menuReady: r.menuReady,
      logoSrc: r.logoSrc ?? null,
      updatedAt: new Date().toISOString(),
    });
    console.log(`  wrote canteens/${r.id}`);

    // Clear stale items then rewrite (menus can shrink/rename).
    const existing = await ref.collection("items").listDocuments();
    for (let i = 0; i < existing.length; i += 400) {
      const batch = db.batch();
      for (const doc of existing.slice(i, i + 400)) batch.delete(doc);
      await batch.commit();
    }

    for (let i = 0; i < items.length; i += 400) {
      const batch = db.batch();
      const chunk = items.slice(i, i + 400);
      chunk.forEach((item, idx) => {
        const itemRef = ref.collection("items").doc(item.id);
        batch.set(itemRef, {
          id: item.id,
          name: item.name,
          description: item.description ?? null,
          price: item.price,
          category: item.category,
          image: item.image,
          signature: item.signature ?? false,
          sortOrder: i + idx + 1,
          restaurantId: r.id,
          cartItemId: `canteen:${r.id}:${item.id}`,
        });
      });
      await batch.commit();
    }
    console.log(`    wrote ${items.length} items under canteens/${r.id}/items`);
  }

  console.log("Done.");
}

seed().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
