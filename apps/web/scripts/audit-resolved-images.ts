import { readFileSync, writeFileSync, existsSync } from "fs";
import { resolve } from "path";
import { createRequire } from "module";
import { initializeApp, cert, getApps } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

// Use compiled-ish import via dynamic require of the shared package source through tsx
import { resolveProductImage } from "../../../packages/shared/src/resolve-image";
import { imageForItem } from "../../../packages/shared/src/product-images";

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

function isBad(img: string | undefined): boolean {
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
    raw: string;
    resolved: string;
    category: string;
  }[] = [];
  const reasons: Record<string, number> = {};

  for (const doc of snap.docs) {
    const d = doc.data();
    const id = String(d.id ?? doc.id);
    const name = String(d.name || id);
    const raw = String(d.image || "");
    const category = String(d.category || "");
    const resolved =
      resolveProductImage({ id, name, image: raw || undefined, category }) ??
      imageForItem(id, category) ??
      "";

    if (isBad(resolved)) {
      let reason = "empty";
      if (raw.startsWith("/images/catalog/")) reason = "catalog-stripped";
      else if (!raw) reason = "no-raw";
      else if (raw !== resolved && isBad(resolved)) reason = "resolve-fell-to-bad";
      else if (isBad(raw)) reason = "raw-generic";
      reasons[reason] = (reasons[reason] ?? 0) + 1;
      miss.push({
        id,
        name,
        raw: raw.slice(0, 120),
        resolved: String(resolved).slice(0, 120),
        category,
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
        reasons,
        sample: miss.slice(0, 60),
      },
      null,
      2,
    ),
  );
  writeFileSync(
    resolve(process.cwd(), "scripts/.products-resolved-missing.json"),
    JSON.stringify(miss, null, 2),
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
