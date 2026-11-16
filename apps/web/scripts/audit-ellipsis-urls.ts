import { readFileSync, existsSync } from "fs";
import { resolve } from "path";
import { initializeApp, cert, getApps } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

const saPath = resolve(
  process.cwd(),
  "../../fusion-express-6a438-firebase-adminsdk-fbsvc-817676b923.json",
);
const sa = JSON.parse(readFileSync(saPath, "utf8"));
if (!getApps().length) {
  initializeApp({ credential: cert(sa), projectId: sa.project_id });
}
const db = getFirestore();

async function main() {
  const snap = await db.collection("products").get();
  let ellipsis = 0;
  let dots = 0;
  let ok = 0;
  let empty = 0;
  const samples: string[] = [];
  for (const doc of snap.docs) {
    const img = String(doc.data().image || "");
    if (!img) {
      empty++;
      continue;
    }
    if (img.includes("…")) {
      ellipsis++;
      if (samples.length < 5) samples.push(img);
    } else if (img.includes("...")) {
      dots++;
      if (samples.length < 8) samples.push(img);
    } else {
      ok++;
    }
  }
  console.log(
    JSON.stringify(
      { total: snap.size, ok, empty, ellipsis, dots, samples },
      null,
      2,
    ),
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
