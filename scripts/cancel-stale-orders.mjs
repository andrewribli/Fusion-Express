/**
 * List (and optionally cancel) stale in-flight orders that lock runners /
 * customer flows: status in assigned|accepted|purchased with updatedAt
 * older than N days (default 14).
 *
 * Dry-run by default. Pass --apply to write status=cancelled.
 * Do NOT run --apply from cloud agents against production.
 *
 * Usage:
 *   FIREBASE_SERVICE_ACCOUNT_PATH=./firebase-service-account.json \
 *     node scripts/cancel-stale-orders.mjs
 *   ... node scripts/cancel-stale-orders.mjs --apply
 *   ... node scripts/cancel-stale-orders.mjs --days=21 --collection=orders_test
 *
 * Env:
 *   FIREBASE_SERVICE_ACCOUNT_PATH or GOOGLE_APPLICATION_CREDENTIALS
 *   FIREBASE_SERVICE_ACCOUNT_JSON (inline JSON, alternative)
 */

import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);

function parseArgs(argv) {
  const out = {
    apply: false,
    days: 14,
    collection: process.env.ORDERS_COLLECTION || "orders",
  };
  for (const arg of argv) {
    if (arg === "--apply") out.apply = true;
    else if (arg.startsWith("--days=")) {
      out.days = Number(arg.slice("--days=".length));
    } else if (arg.startsWith("--collection=")) {
      out.collection = arg.slice("--collection=".length);
    } else if (arg === "--help" || arg === "-h") {
      out.help = true;
    }
  }
  return out;
}

function loadServiceAccount() {
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT_JSON?.trim();
  if (raw) return JSON.parse(raw);

  const path =
    process.env.FIREBASE_SERVICE_ACCOUNT_PATH ||
    process.env.GOOGLE_APPLICATION_CREDENTIALS ||
    "./firebase-service-account.json";
  const absolute = resolve(process.cwd(), path);
  if (!existsSync(absolute)) {
    throw new Error(
      `Service account not found at ${absolute}. Set FIREBASE_SERVICE_ACCOUNT_PATH or FIREBASE_SERVICE_ACCOUNT_JSON.`,
    );
  }
  return JSON.parse(readFileSync(absolute, "utf8"));
}

function asDate(value) {
  if (!value) return null;
  if (typeof value.toDate === "function") return value.toDate();
  if (value instanceof Date) return value;
  if (typeof value === "string" || typeof value === "number") {
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? null : d;
  }
  if (typeof value.seconds === "number") {
    return new Date(value.seconds * 1000);
  }
  return null;
}

/** Align with packages/shared normalizeOrderStatus for listing filters. */
function normalizeStatus(status) {
  switch (String(status || "")) {
    case "runner_assigned":
    case "assigned":
      return "accepted";
    case "picked_up":
    case "picked":
      return "purchased";
    default:
      return String(status || "");
  }
}

const STALE_STATUSES = new Set(["assigned", "accepted", "purchased", "picked"]);

async function main() {
  const opts = parseArgs(process.argv.slice(2));
  if (opts.help) {
    console.log(`Usage: node scripts/cancel-stale-orders.mjs [--days=14] [--collection=orders] [--apply]
Dry-run lists matching docs. --apply sets status=cancelled (admin-safe; does not delete).`);
    process.exit(0);
  }
  if (!Number.isFinite(opts.days) || opts.days <= 0) {
    console.error("--days must be a positive number");
    process.exit(1);
  }

  let admin;
  try {
    admin = require("firebase-admin");
  } catch {
    // Prefer workspace web package where firebase-admin is a dep.
    admin = require(
      resolve(process.cwd(), "apps/web/node_modules/firebase-admin"),
    );
  }

  const account = loadServiceAccount();
  if (!admin.apps.length) {
    admin.initializeApp({ credential: admin.credential.cert(account) });
  }
  const db = admin.firestore();

  const cutoff = new Date(Date.now() - opts.days * 24 * 60 * 60 * 1000);
  console.log(
    `Scanning ${opts.collection} for assigned|accepted|purchased with updatedAt < ${cutoff.toISOString()}`,
  );
  console.log(opts.apply ? "MODE: --apply (will cancel)" : "MODE: dry-run (no writes)");

  const snap = await db.collection(opts.collection).get();
  const matches = [];
  for (const doc of snap.docs) {
    const data = doc.data();
    const rawStatus = String(data.status ?? "");
    if (!STALE_STATUSES.has(rawStatus) && !STALE_STATUSES.has(normalizeStatus(rawStatus))) {
      continue;
    }
    const normalized = normalizeStatus(rawStatus);
    if (normalized !== "accepted" && normalized !== "purchased") continue;

    const updatedAt = asDate(data.updatedAt) || asDate(data.createdAt);
    if (!updatedAt || updatedAt >= cutoff) continue;

    matches.push({
      id: doc.id,
      status: rawStatus,
      normalized,
      updatedAt: updatedAt.toISOString(),
      customerId: data.customerId ?? null,
      runnerUid: data.runnerUid ?? null,
      paymentReceived: data.paymentReceived ?? null,
    });
  }

  matches.sort((a, b) => a.updatedAt.localeCompare(b.updatedAt));
  console.log(`Found ${matches.length} stale order(s).`);
  for (const row of matches) {
    console.log(
      `  ${row.id}  status=${row.status}  updatedAt=${row.updatedAt}  customer=${row.customerId ?? "-"}  runner=${row.runnerUid ?? "-"}`,
    );
  }

  if (!opts.apply) {
    console.log("Dry-run complete. Re-run with --apply to cancel these orders.");
    return;
  }

  let cancelled = 0;
  const now = admin.firestore.Timestamp.now();
  for (const row of matches) {
    await db.collection(opts.collection).doc(row.id).update({
      status: "cancelled",
      cancelReason: `stale_admin_cancel>${opts.days}d`,
      cancelledAt: now,
      updatedAt: now,
    });
    cancelled += 1;
    console.log(`  cancelled ${row.id}`);
  }
  console.log(`Done. Cancelled ${cancelled} order(s).`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
