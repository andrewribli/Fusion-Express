import { readFileSync, writeFileSync, existsSync } from "fs";
import { resolve } from "path";
import { initializeApp, cert, getApps } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

const saPath = resolve(
  process.cwd(),
  "../../fusion-express-6a438-firebase-adminsdk-fbsvc-817676b923.json",
);
if (!existsSync(saPath)) {
  console.error("missing SA");
  process.exit(1);
}
const sa = JSON.parse(readFileSync(saPath, "utf8"));
if (!getApps().length) {
  initializeApp({ credential: cert(sa), projectId: sa.project_id });
}
const db = getFirestore();

function isGeneric(img: string): boolean {
  if (!img) return true;
  const u = img.toLowerCase();
  return (
    u.includes("unsplash") ||
    u.includes("placehold") ||
    u.includes("/images/aisles/") ||
    u.includes("aisle-dry") ||
    u.includes("aisle-refrigerated") ||
    u.includes("...") ||
    u.startsWith("/images/catalog/")
  );
}

async function main() {
  const snap = await db.collection("products").get();
  let ok = 0;
  const miss: {
    id: string;
    name: string;
    image: string;
    category: string;
    subcategory: string;
  }[] = [];
  for (const doc of snap.docs) {
    const d = doc.data();
    const image = String(d.image || d.imageUrl || "");
    const name = String(d.name || doc.id);
    if (isGeneric(image)) {
      miss.push({
        id: doc.id,
        name,
        image: image.slice(0, 160),
        category: String(d.category || ""),
        subcategory: String(d.subcategory || ""),
      });
    } else {
      ok++;
    }
  }
  console.log(
    JSON.stringify(
      {
        total: snap.size,
        ok,
        missing: miss.length,
        sample: miss.slice(0, 40),
      },
      null,
      2,
    ),
  );
  writeFileSync(
    resolve(process.cwd(), "scripts/.products-missing-images.json"),
    JSON.stringify(miss, null, 2),
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
