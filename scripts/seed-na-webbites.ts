/**
 * Upsert data/na-webbites.json into Firestore `products`.
 * Doc ids are `na-webbites_${id}` so other sources are left untouched.
 * Admin SDK uses firebase-service-account.json at the repo root.
 *
 *   npx tsx scripts/seed-na-webbites.ts
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const CATALOG = path.join(ROOT, "data", "na-webbites.json");

interface CatalogItem {
  id: string;
  name: string;
  nameZh?: string;
  price: number;
  category: string;
  sourceCategory: string;
  description?: string;
  image?: string;
  isAvailable: boolean;
  sourceId: "na-webbites";
}

async function main() {
  const raw = JSON.parse(readFileSync(CATALOG, "utf8")) as {
    items?: CatalogItem[];
  };
  const items = raw.items ?? [];
  if (items.length === 0) throw new Error(`No items in ${CATALOG}`);
  for (const item of items) {
    if (item.sourceId !== "na-webbites") {
      throw new Error(`Refusing to seed non na-webbites item ${item.id}`);
    }
  }

  if (getApps().length === 0) {
    const serviceAccount = JSON.parse(
      readFileSync(path.join(ROOT, "firebase-service-account.json"), "utf8"),
    ) as { project_id: string };
    initializeApp({
      credential: cert(path.join(ROOT, "firebase-service-account.json")),
      projectId: serviceAccount.project_id,
    });
  }

  const db = getFirestore();
  const col = db.collection("products");
  let written = 0;
  for (let i = 0; i < items.length; i += 400) {
    const batch = db.batch();
    for (const item of items.slice(i, i + 400)) {
      batch.set(
        col.doc(`na-webbites_${item.id}`),
        {
          ...item,
          sourceId: "na-webbites",
          campus: "cuhk",
        },
        { merge: true },
      );
    }
    await batch.commit();
    written += Math.min(400, items.length - i);
    console.log(`upserted ${written}/${items.length}`);
  }
  console.log(`seeded ${written} na-webbites products (campus cuhk)`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
