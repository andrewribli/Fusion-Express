import { readFileSync, existsSync, writeFileSync } from "fs";
import { resolve } from "path";
import { initializeApp, cert, getApps } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

const saPath = resolve(
  process.cwd(),
  "../../fusion-express-6a438-firebase-adminsdk-fbsvc-817676b923.json",
);
const alt = resolve(
  process.cwd(),
  "../fusion-express-6a438-firebase-adminsdk-fbsvc-817676b923.json",
);
const path = existsSync(saPath) ? saPath : alt;
const sa = JSON.parse(readFileSync(path, "utf8"));
if (!getApps().length) initializeApp({ credential: cert(sa) });

function isGeneric(img: string): boolean {
  const u = img.toLowerCase();
  return (
    !img ||
    u.includes("unsplash.com") ||
    u.includes("placehold") ||
    u.includes("/images/aisles/") ||
    u.includes("aisle-dry") ||
    u.includes("aisle-refrigerated") ||
    u.includes("...")
  );
}

async function main() {
  const db = getFirestore();
  const snap = await db.collection("menu").get();
  const missing: { id: string; name: string; image: string; category: string }[] =
    [];
  let ok = 0;
  for (const doc of snap.docs) {
    const d = doc.data();
    const image = String(d.image || "");
    const name = String(d.name || doc.id);
    const category = String(d.category || "");
    if (isGeneric(image)) {
      missing.push({ id: doc.id, name, image, category });
    } else {
      ok++;
    }
  }
  console.log(
    JSON.stringify(
      {
        total: snap.size,
        ok,
        missing: missing.length,
        sample: missing.slice(0, 30),
      },
      null,
      2,
    ),
  );
  writeFileSync(
    resolve(process.cwd(), "scripts/.menu-missing-images.json"),
    JSON.stringify(missing, null, 2),
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
