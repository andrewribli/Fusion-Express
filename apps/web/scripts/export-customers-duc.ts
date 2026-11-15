/**
 * Export cleaned customer list for business advisor (Duc).
 *
 * - All users (no campus filter)
 * - Exclude demo / andrew.demo emails
 * - Advisor columns: Status, Acquisition Channel, Notes
 *
 * Usage (from apps/web):
 *   npx tsx scripts/export-customers-duc.ts
 *
 * Writes: ../../master-customers-duc.csv
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

function isDemoEmail(email: string): boolean {
  const lower = email.toLowerCase();
  return lower.includes("demo") || lower.includes("andrew.demo");
}

function cleanName(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed || trimmed.toLowerCase() === "name not given") {
    return "Anonymous";
  }
  return trimmed;
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
    // Schema uses customerId (legacy sessionId fallback) — not userId
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
    nationality: string;
    status: string;
    acquisitionChannel: string;
    notes: string;
  };

  const rows: Row[] = [];
  let demoFiltered = 0;

  for (const docSnap of usersSnap.docs) {
    const uid = docSnap.id;
    const data = docSnap.data() as Record<string, unknown>;

    const email = String(data.email ?? data.cuhkEmail ?? "")
      .trim()
      .toLowerCase();

    if (isDemoEmail(email)) {
      demoFiltered += 1;
      continue;
    }

    const rawName =
      String(data.fullName ?? "").trim() ||
      String(data.displayName ?? "").trim() ||
      String(data.username ?? "").trim() ||
      "";
    const name = cleanName(rawName);

    const nationality = String(data.country ?? data.nationality ?? "").trim();

    const signup = formatDate(toDate(data.createdAt));
    const agg = byCustomer.get(uid) ?? { count: 0, lastAt: null };
    const totalOrders = agg.count;
    const lastOrder = totalOrders > 0 ? formatDate(agg.lastAt) : "";
    const status = totalOrders > 0 ? "Active/Churned" : "Ghost";

    rows.push({
      name,
      email,
      signup,
      totalOrders,
      lastOrder,
      nationality,
      status,
      acquisitionChannel: "Unknown",
      notes: "",
    });
  }

  rows.sort((a, b) => {
    if (b.totalOrders !== a.totalOrders) return b.totalOrders - a.totalOrders;
    return a.name.localeCompare(b.name) || a.email.localeCompare(b.email);
  });

  const headers = [
    "Name",
    "Email",
    "Signup Date",
    "Total Orders",
    "Last Order Date",
    "Nationality",
    "Status",
    "Acquisition Channel",
    "Notes",
  ];

  const lines = [headers.join(",")];
  for (const r of rows) {
    lines.push(
      [
        csvEscape(r.name),
        csvEscape(r.email),
        csvEscape(r.signup),
        String(r.totalOrders),
        csvEscape(r.lastOrder),
        csvEscape(r.nationality),
        csvEscape(r.status),
        csvEscape(r.acquisitionChannel),
        csvEscape(r.notes),
      ].join(","),
    );
  }

  const outPath = resolve(process.cwd(), "../../master-customers-duc.csv");
  writeFileSync(outPath, lines.join("\n") + "\n", "utf8");

  console.log(`\nUsers total: ${usersSnap.size}`);
  console.log(`Demo filtered out: ${demoFiltered}`);
  console.log(`Wrote ${rows.length} rows → ${outPath}`);
  console.log("\nFirst 5 data rows:");
  console.log(lines[0]);
  for (let i = 1; i <= Math.min(5, lines.length - 1); i++) {
    console.log(lines[i]);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
