import { readFileSync, existsSync } from "fs";
import { resolve } from "path";
import { initializeApp, cert, getApps } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

const candidates = [
  resolve(process.cwd(), "../../fusion-express-6a438-firebase-adminsdk-fbsvc-817676b923.json"),
  resolve(process.cwd(), "./firebase-service-account.json"),
  resolve(process.cwd(), "../../firebase-service-account.json"),
];
const path = candidates.find((p) => existsSync(p));
if (!path) {
  console.error("No service account found");
  process.exit(1);
}
console.log("Using SA", path);
const sa = JSON.parse(readFileSync(path, "utf8"));
console.log("project", sa.project_id);
if (!getApps().length) {
  initializeApp({ credential: cert(sa), projectId: sa.project_id });
}
const db = getFirestore();

async function main() {
  const cols = await db.listCollections();
  console.log(
    "collections",
    cols.map((c) => c.id).join(", "),
  );
  for (const name of ["menu", "menu_test", "products"]) {
    const snap = await db.collection(name).limit(5).get();
    console.log(name, "count_sample", snap.size, "empty", snap.empty);
    if (!snap.empty) {
      const d = snap.docs[0].data();
      console.log(" first", d.name || d.id, String(d.image || "").slice(0, 100));
    }
  }
  const full = await db.collection("menu").count().get();
  console.log("menu count", full.data().count);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
