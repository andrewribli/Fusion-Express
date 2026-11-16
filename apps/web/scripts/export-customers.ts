/**
 * Export CUHK customers + order stats to CSV at repo root.
 *
 * Usage (from apps/web):
 *   npx tsx scripts/export-customers.ts
 *
 * Writes: ../../master-customers.csv
 */

import { readFileSync, writeFileSync } from "fs";
import { resolve } from "path";
import { initializeApp, cert, getApps } from "firebase-admin/app";
import { getFirestore, Timestamp } from "firebase-admin/firestore";

const serviceAccountCandidates = [
  process.env.FIREBASE_SERVICE_ACCOUNT_PATH,
  "./firebase-service-account.json",
  "../firebase-service-account.json",
  "../../firebase-service-account.json",
  "../fusion-express-6a438-firebase-adminsdk-fbsvc-817676b923.json",
  "../../fusion-express-6a438-firebase-adminsdk-fbsvc-817676b923.json",
].filter(Boolean) as string[];

function loadServiceAccount(): object {
  for (const rel of serviceAccountCandidates) {
    try {
      return JSON.parse(readFileSync(resolve(process.cwd(), rel), "utf8"));
    } catch {
      // try next
    }
  }
  throw new Error(
    "No firebase service account JSON found. Set FIREBASE_SERVICE_ACCOUNT_PATH.",
  );
}

function toDate(raw: unknown): Date | null {
  if (raw == null) return null;
  if (raw instanceof Timestamp) return raw.toDate();
  if (
    typeof raw === "object" &&
    "toDate" in raw &&
    typeof (raw as { toDate: unknown }).toDate === "function"
  ) {
    try {
      return (raw as { toDate: () => Date }).toDate();
    } catch {
      return null;
    }
  }
  if (raw instanceof Date) return raw;
  if (typeof raw === "string" || typeof raw === "number") {
    const d = new Date(raw);
    return Number.isNaN(d.getTime()) ? null : d;
  }
  return null;
}

function formatDate(d: Date | null): string {
  if (!d) return "";
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function csvEscape(value: string): string {
  if (/[",\n\r]/.test(value)) {
    return `"${value.replaceAll('"', '""')}"`;
  }
  return value;
}

function normalizeCampus(raw: unknown): string {
  return String(raw ?? "")
    .trim()
    .toLowerCase();
}

/** CUHK email domains from packages/shared campus config. */
function isCuhkEmail(email: string): boolean {
  const domain = email.split("@")[1]?.toLowerCase() ?? "";
  return domain === "link.cuhk.edu.hk" || domain === "cuhk.edu.hk";
}

type OrderAgg = { count: number; lastAt: Date | null };

if (!getApps().length) {
  initializeApp({ credential: cert(loadServiceAccount() as never) });
}

const db = getFirestore();

async function main() {
  console.log("Loading orders…");
  const ordersSnap = await db.collection("orders").get();
  const byCustomer = new Map<string, OrderAgg>();

  for (const docSnap of ordersSnap.docs) {
    const data = docSnap.data() as Record<string, unknown>;
    const customerId = String(data.customerId ?? data.sessionId ?? "").trim();
    if (!customerId) continue;
    const createdAt = toDate(data.createdAt);
    const prev = byCustomer.get(customerId) ?? { count: 0, lastAt: null };
    prev.count += 1;
    if (
      createdAt &&
      (!prev.lastAt || createdAt.getTime() > prev.lastAt.getTime())
    ) {
      prev.lastAt = createdAt;
    }
    byCustomer.set(customerId, prev);
  }
  console.log(
    `Orders: ${ordersSnap.size} docs, ${byCustomer.size} unique customerIds`,
  );

  console.log("Loading users…");
  const usersSnap = await db.collection("users").get();

  type Row = {
    name: string;
    email: string;
    signup: string;
    totalOrders: number;
    lastOrder: string;
    campus: string;
  };

  const allRows: Row[] = [];
  const campusCounts = new Map<string, number>();

  for (const docSnap of usersSnap.docs) {
    const uid = docSnap.id;
    const data = docSnap.data() as Record<string, unknown>;
    const campus = normalizeCampus(data.campus);
    campusCounts.set(campus || "(empty)", (campusCounts.get(campus || "(empty)") ?? 0) + 1);

    const email = String(data.email ?? data.cuhkEmail ?? "")
      .trim()
      .toLowerCase();
    const name =
      String(data.fullName ?? "").trim() ||
      String(data.displayName ?? "").trim() ||
      String(data.username ?? "").trim() ||
      "";

    const signup = formatDate(toDate(data.createdAt));
    const agg = byCustomer.get(uid) ?? { count: 0, lastAt: null };

    allRows.push({
      name,
      email,
      signup,
      totalOrders: agg.count,
      lastOrder: formatDate(agg.lastAt),
      campus: campus || "",
    });
  }

  console.log(`Users: ${usersSnap.size}`);
  console.log("Campus distribution:");
  for (const [k, v] of [...campusCounts.entries()].sort((a, b) => b[1] - a[1])) {
    console.log(`  ${k}: ${v}`);
  }

  // Prefer explicit campus === "cuhk". Also include legacy users with empty
  // campus (app default is cuhk) unless they have a CityU email / cityu campus.
  let filtered = allRows.filter((r) => {
    if (r.campus === "cuhk") return true;
    if (r.campus === "cityu") return false;
    // empty / unknown campus: treat as CUHK unless clearly CityU email
    if (!r.campus) {
      if (r.email.includes("@") && !isCuhkEmail(r.email)) {
        // Unknown campus + non-CUHK email — still include in CUHK fallback
        // only when empty-campus is the legacy default; CityU emails without
        // campus are rare. Keep them out of CUHK if email looks CityU-ish.
        const domain = r.email.split("@")[1] ?? "";
        if (domain.includes("cityu")) return false;
      }
      return true;
    }
    return false;
  });

  let filterNote =
    'campus === "cuhk" (case-insensitive), plus empty campus (legacy default), excluding cityu';
  let includeCampusColumn = false;

  if (filtered.length === 0) {
    console.warn(
      "Campus filter yielded 0 rows — falling back to ALL users with Campus column.",
    );
    filtered = allRows;
    filterNote = "NONE matched campus filter; exported ALL users + Campus column";
    includeCampusColumn = true;
  }

  // Sort: most orders first, then name
  filtered.sort((a, b) => {
    if (b.totalOrders !== a.totalOrders) return b.totalOrders - a.totalOrders;
    return a.name.localeCompare(b.name) || a.email.localeCompare(b.email);
  });

  const headers = includeCampusColumn
    ? ["Name", "Email", "Signup Date", "Total Orders", "Last Order Date", "Campus"]
    : ["Name", "Email", "Signup Date", "Total Orders", "Last Order Date"];

  const lines = [headers.join(",")];
  for (const r of filtered) {
    const cols = [
      csvEscape(r.name),
      csvEscape(r.email),
      csvEscape(r.signup),
      String(r.totalOrders),
      csvEscape(r.lastOrder),
    ];
    if (includeCampusColumn) cols.push(csvEscape(r.campus));
    lines.push(cols.join(","));
  }

  const outPath = resolve(process.cwd(), "../../master-customers.csv");
  writeFileSync(outPath, lines.join("\n") + "\n", "utf8");

  console.log(`\nWrote ${filtered.length} rows → ${outPath}`);
  console.log(`Filter: ${filterNote}`);
  console.log("\nFirst 3 data rows:");
  console.log(lines[0]);
  for (let i = 1; i <= Math.min(3, lines.length - 1); i++) {
    console.log(lines[i]);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
