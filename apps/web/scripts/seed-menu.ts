/**
 * Seeds the Firestore `menu` collection from src/data/menu.json.
 *
 * Usage:
 *   1. Download service account JSON from Firebase Console
 *   2. Save as firebase-service-account.json (gitignored)
 *   3. npm run seed
 */

import { readFileSync } from "fs";
import { resolve } from "path";
import { initializeApp, cert, getApps } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { MENU_ITEMS, toFirestoreMenuDoc } from "../src/data/menu-items";

const serviceAccountPath =
  process.env.FIREBASE_SERVICE_ACCOUNT_PATH ??
  "./firebase-service-account.json";

const absolutePath = resolve(process.cwd(), serviceAccountPath);
const serviceAccount = JSON.parse(readFileSync(absolutePath, "utf8"));

if (!getApps().length) {
  initializeApp({ credential: cert(serviceAccount) });
}

const db = getFirestore();
const BATCH_SIZE = 450;

async function seed() {
  console.log(`Seeding ${MENU_ITEMS.length} items into Firestore collection "menu"…`);

  for (let i = 0; i < MENU_ITEMS.length; i += BATCH_SIZE) {
    const batch = db.batch();
    const chunk = MENU_ITEMS.slice(i, i + BATCH_SIZE);

    for (const item of chunk) {
      const ref = db.collection("menu").doc(item.id);
      batch.set(ref, toFirestoreMenuDoc(item));
    }

    await batch.commit();
    console.log(`  Wrote ${Math.min(i + BATCH_SIZE, MENU_ITEMS.length)} / ${MENU_ITEMS.length}`);
  }

  console.log("Done! Firestore collection `menu` populated.");
}

seed().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
