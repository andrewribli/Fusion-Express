/**
 * Fill missing / placeholder product images via Promas.
 *
 * Usage (from apps/web):
 *   npx tsx scripts/fill-missing-images.ts              # dry-run first 5
 *   npx tsx scripts/fill-missing-images.ts --dry-run 10
 *   npx tsx scripts/fill-missing-images.ts --apply      # write to Firestore
 *   npx tsx scripts/fill-missing-images.ts --apply --limit 50
 *   npx tsx scripts/fill-missing-images.ts --apply --from-report
 *     # apply previously scraped URLs from fill-images-report.json (no re-scrape)
 *   npx tsx scripts/fill-missing-images.ts --empty-only # only blank image fields
 *
 * Requires:
 *   - `promas` + Playwright Chromium on PATH
 *   - FIREBASE_SERVICE_ACCOUNT_JSON or FIREBASE_SERVICE_ACCOUNT_PATH for --apply
 *   - Reads can use the public Firestore REST API (products are world-readable)
 */

import { execFile } from "child_process";
import { writeFileSync, readFileSync, existsSync } from "fs";
import { resolve } from "path";
import { promisify } from "util";
import { initializeApp, cert, getApps, type App } from "firebase-admin/app";
import { getFirestore, type Firestore } from "firebase-admin/firestore";

const execFileAsync = promisify(execFile);

const PROJECT_ID = "fusion-express-6a438";
const COLLECTION = "products";
const MISSING_LOG = resolve(__dirname, "missing-images.txt");
const REPORT_LOG = resolve(__dirname, "fill-images-report.json");

const PLACEHOLDER_MARKERS = [
  "unsplash.com",
  "placehold.co",
  "/images/aisles/",
  "aisle-dry",
  "aisle-refrigerated",
];

type ProductRow = {
  id: string;
  name: string;
  image: string;
};

type PromasResult = {
  status?: string;
  images?: string[];
  error_message?: string | null;
};

type MatchResult = {
  id: string;
  name: string;
  before: string;
  after: string | null;
  query: string;
  ok: boolean;
  reason?: string;
};

function parseArgs(argv: string[]) {
  const apply = argv.includes("--apply");
  const emptyOnly = argv.includes("--empty-only");
  const fromReport = argv.includes("--from-report");
  const resume = argv.includes("--resume");
  const rescrapeBad = argv.includes("--rescrape-bad");
  let limit = apply || fromReport || resume || rescrapeBad ? Number.POSITIVE_INFINITY : 5;
  const limitIdx = argv.findIndex((a) => a === "--limit" || a === "--dry-run");
  if (limitIdx >= 0) {
    const flag = argv[limitIdx];
    const next = argv[limitIdx + 1];
    if (flag === "--dry-run" && next && /^\d+$/.test(next)) {
      limit = Number(next);
    } else if (flag === "--limit" && next && /^\d+$/.test(next)) {
      limit = Number(next);
    } else if (flag === "--dry-run") {
      limit = 5;
    }
  }
  if (
    !apply &&
    !fromReport &&
    !resume &&
    !rescrapeBad &&
    !argv.some((a) => a === "--dry-run" || a === "--limit")
  ) {
    limit = 5;
  }
  return { apply, dryRun: !apply, limit, emptyOnly, fromReport, resume, rescrapeBad };
}

function isBadImage(image: string | undefined | null): boolean {
  if (image == null) return true;
  const raw = String(image);
  const u = raw.trim().toLowerCase();
  if (!u) return true;
  if (raw.includes("…") || u.includes("...")) return true;
  return PLACEHOLDER_MARKERS.some((m) => u.includes(m));
}

const BLOCKED_HOST_FRAGMENTS = [
  "mercedes-amg",
  "mbusa.com",
  "mercedes-benz",
  "theaustralian.com.au",
  "wikipedia.org",
  "wikimedia.org",
  "facebook.com",
  "fbcdn.net",
  "instagram.com",
  "tiktok.com",
  "youtube.com",
  "twitter.com",
  "x.com",
  "investopedia.com",
  "dictionary.com",
  "britannica.com",
  "merriam-webster",
  "isu.pub",
  "issuu.com",
  "physiosupplies",
  "framerusercontent.com",
  "lumiere-a.akamaihd.net",
  "disney.com",
  "disneyplus",
  "skyassets.com",
  "goat.com",
  "image.goat.com",
];

/** Path fragments that are almost never grocery product photos. */
const BLOCKED_PATH_FRAGMENTS = [
  "/thmb/",
  "pv-target-images",
  "/logo",
  "/banner",
  "/icon",
  "favicon",
  "sprite",
  "avatar",
  "head.jpg",
  "menu-book",
  "book-tecnica",
  "frozenanniversary",
  "lifestyle",
  "football",
  "digital ecomm",
  "digitalecomm",
  "watchpagehero",
];

const PREFERRED_HOST_FRAGMENTS = [
  "medias.pns.hk",
  "pns.hk",
  "parkndshop",
  "park'n",
  "foodpanda",
  "dhmedia.io",
  "deliveryhero",
  "citysuper.com",
  "wellcome.com",
  "coldstorage",
  "7-eleven.com.hk",
  "watsons.com",
  "mannings.com.hk",
  "aussiemeat.hk",
  "foodcraft.hk",
  "meatkrafters",
];

function isValidImageUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    if (!/^https?:$/i.test(parsed.protocol)) return false;
    const host = parsed.hostname.toLowerCase();
    if (BLOCKED_HOST_FRAGMENTS.some((b) => host.includes(b))) return false;
    const path = parsed.pathname.toLowerCase();
    const full = `${host}${path}${parsed.search}`.toLowerCase();
    if (BLOCKED_PATH_FRAGMENTS.some((b) => full.includes(b))) return false;
    // Reject webp-only CDN rewrites when the real asset isn't jpg/png.
    if (/\.webp(\b|$)/i.test(path) && !/\.(jpe?g|png)\b/i.test(path)) return false;
    // Allow .jpg/.png before optional CDN suffixes or query strings.
    return /\.(jpe?g|png)(\b|$)/i.test(path);
  } catch {
    return false;
  }
}

function hostScore(url: string): number {
  try {
    const host = new URL(url).hostname.toLowerCase();
    const idx = PREFERRED_HOST_FRAGMENTS.findIndex((p) => host.includes(p));
    if (idx >= 0) return 1000 - idx;
    if (host.includes("amazon") || host.includes("media-amazon")) return 5;
    return 10;
  } catch {
    return 0;
  }
}

function pickBestImage(images: string[] | undefined): string | null {
  if (!images?.length) return null;
  const valid = images.filter(isValidImageUrl);
  if (!valid.length) return null;
  valid.sort((a, b) => hostScore(b) - hostScore(a));
  return valid[0] ?? null;
}

/** Normalize product names so scrapers don't latch onto unrelated brands (e.g. AMG cars). */
function normalizeSearchName(name: string): string {
  let n = name
    .replace(/\bAMG\b/gi, "Australian Meat Garden")
    // "CIF" alone matches Cost-Insurance-Freight finance pages.
    .replace(/\bCIF\b/g, "CIF cream cleaner Unilever")
    .replace(/\bC&S\b/gi, "C&S Clean Soft tissue")
    .replace(/\s+/g, " ")
    .trim();
  return n;
}

function extractJson(stdout: string): PromasResult | null {
  const start = stdout.indexOf("{");
  const end = stdout.lastIndexOf("}");
  if (start < 0 || end <= start) return null;
  try {
    return JSON.parse(stdout.slice(start, end + 1)) as PromasResult;
  } catch {
    return null;
  }
}

async function runPromas(query: string, site?: string): Promise<string | null> {
  const args = [query, "--max-images", "5"];
  if (site) args.push("--site", site);
  try {
    const { stdout, stderr } = await execFileAsync("promas", args, {
      maxBuffer: 12 * 1024 * 1024,
      // Keep short — hung browser scrapes otherwise stall the whole batch.
      timeout: 75_000,
      killSignal: "SIGKILL",
      env: process.env,
    });
    const parsed = extractJson(stdout) ?? extractJson(stderr);
    if (!parsed || parsed.status === "error") return null;
    return pickBestImage(parsed.images);
  } catch (err) {
    console.warn(`  promas failed for "${query}":`, err instanceof Error ? err.message : err);
    return null;
  }
}

async function scrapeImageForName(name: string): Promise<{ url: string | null; query: string }> {
  const cleaned = normalizeSearchName(name);
  const attempts: { query: string; site?: string }[] = [
    { query: `${cleaned} ParknShop`, site: "pns.hk" },
    { query: `${cleaned} ParknShop Hong Kong` },
    { query: `${cleaned} Hong Kong supermarket product` },
  ];

  for (const attempt of attempts) {
    const url = await runPromas(attempt.query, attempt.site);
    if (url) {
      const label = attempt.site
        ? `${attempt.query} (site:${attempt.site})`
        : attempt.query;
      return { url, query: label };
    }
  }
  return { url: null, query: cleaned };
}

function fieldsToPlain(fields: Record<string, { stringValue?: string; nullValue?: null }> | undefined) {
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(fields ?? {})) {
    if (v && "stringValue" in v && v.stringValue != null) out[k] = v.stringValue;
  }
  return out;
}

/** Public REST read — products allow list: if true */
async function listProductsViaRest(): Promise<ProductRow[]> {
  const base = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents/${COLLECTION}`;
  const rows: ProductRow[] = [];
  let token: string | undefined;
  do {
    const url = new URL(base);
    url.searchParams.set("pageSize", "300");
    if (token) url.searchParams.set("pageToken", token);
    const res = await fetch(url);
    if (!res.ok) throw new Error(`REST list failed: ${res.status} ${await res.text()}`);
    const data = (await res.json()) as {
      documents?: { name: string; fields?: Record<string, { stringValue?: string }> }[];
      nextPageToken?: string;
    };
    for (const doc of data.documents ?? []) {
      const id = doc.name.split("/").pop() ?? "";
      const plain = fieldsToPlain(doc.fields);
      rows.push({ id, name: plain.name ?? id, image: plain.image ?? "" });
    }
    token = data.nextPageToken;
  } while (token);
  return rows;
}

function loadServiceAccount(): Record<string, unknown> | null {
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT_JSON?.trim();
  if (raw) {
    try {
      return JSON.parse(raw) as Record<string, unknown>;
    } catch {
      console.error("FIREBASE_SERVICE_ACCOUNT_JSON is invalid JSON");
      return null;
    }
  }
  const path =
    process.env.FIREBASE_SERVICE_ACCOUNT_PATH ??
    resolve(process.cwd(), "firebase-service-account.json");
  if (!existsSync(path)) return null;
  return JSON.parse(readFileSync(path, "utf8")) as Record<string, unknown>;
}

function initAdmin(): Firestore | null {
  const account = loadServiceAccount();
  if (!account) return null;
  let app: App;
  if (!getApps().length) {
    app = initializeApp({ credential: cert(account as Parameters<typeof cert>[0]) });
  } else {
    app = getApps()[0]!;
  }
  return getFirestore(app);
}

function writeReport(apply: boolean, results: MatchResult[]) {
  const failed = results.filter((r) => !r.ok);
  const missingLines = [
    `# Missing images — ${new Date().toISOString()}`,
    `# ${failed.length} item(s) Promas could not resolve`,
    ...failed.map((f) => `${f.id}\t${f.name}\t${f.before || "(empty)"}`),
    "",
  ];
  writeFileSync(MISSING_LOG, missingLines.join("\n"), "utf8");
  writeFileSync(REPORT_LOG, JSON.stringify({ apply, results }, null, 2), "utf8");
}

function printReport(apply: boolean, results: MatchResult[]) {
  const updated = results.filter((r) => r.ok);
  const failed = results.filter((r) => !r.ok);
  console.log("\n======== REPORT ========");
  console.log(`Successfully matched: ${updated.length}`);
  console.log(`Failed (logged):      ${failed.length} → ${MISSING_LOG}`);
  console.log(`Wrote:                ${apply ? "Firestore updates applied" : "dry-run only (no writes)"}`);
  console.log("\nSample before/after (up to 3):");
  for (const sample of updated.slice(0, 3)) {
    console.log(`- ${sample.name}`);
    console.log(`    before: ${sample.before || "(empty)"}`);
    console.log(`    after:  ${sample.after}`);
  }
  if (updated.length === 0) {
    console.log("(no successful matches in this run)");
  }
}

async function applyFromReport(db: Firestore, limit: number): Promise<MatchResult[]> {
  if (!existsSync(REPORT_LOG)) {
    throw new Error(`No report at ${REPORT_LOG}. Run a scrape first.`);
  }
  const saved = JSON.parse(readFileSync(REPORT_LOG, "utf8")) as {
    results: MatchResult[];
  };
  const ready = saved.results.filter((r) => r.ok && r.after).slice(0, limit);
  console.log(`Applying ${ready.length} URL(s) from report…\n`);
  const results: MatchResult[] = [];
  for (let i = 0; i < ready.length; i++) {
    const row = ready[i]!;
    console.log(`[${i + 1}/${ready.length}] ${row.name}`);
    await db.collection(COLLECTION).doc(row.id).update({ image: row.after });
    console.log(`  → Firestore updated ← ${row.after}`);
    results.push({ ...row, ok: true });
  }
  // Keep failed entries from the original report for the missing log.
  const failed = saved.results.filter((r) => !r.ok);
  return [...results, ...failed];
}

function loadPriorResults(): MatchResult[] {
  if (!existsSync(REPORT_LOG)) return [];
  try {
    const saved = JSON.parse(readFileSync(REPORT_LOG, "utf8")) as { results?: MatchResult[] };
    return saved.results ?? [];
  } catch {
    return [];
  }
}

async function main() {
  const { apply, limit, emptyOnly, fromReport, resume, rescrapeBad } = parseArgs(
    process.argv.slice(2),
  );
  console.log(
    `Mode: ${apply ? "APPLY (write Firestore)" : "DRY-RUN"} · limit=${Number.isFinite(limit) ? limit : "all"}${emptyOnly ? " · empty-only" : ""}${fromReport ? " · from-report" : ""}${resume ? " · resume" : ""}${rescrapeBad ? " · rescrape-bad" : ""}`,
  );

  const db = initAdmin();
  if (apply && !db) {
    console.error(
      "Cannot --apply without FIREBASE_SERVICE_ACCOUNT_JSON or firebase-service-account.json",
    );
    process.exit(1);
  }

  if (fromReport) {
    if (!apply || !db) {
      console.error("--from-report requires --apply and a service account");
      process.exit(1);
    }
    const results = await applyFromReport(db, limit);
    writeReport(true, results);
    printReport(true, results);
    return;
  }

  console.log("Loading products…");
  const all = db
    ? (await db.collection(COLLECTION).get()).docs.map((doc) => {
        const data = doc.data();
        return {
          id: doc.id,
          name: String(data.name ?? doc.id),
          image: data.image != null ? String(data.image) : "",
        } satisfies ProductRow;
      })
    : await listProductsViaRest();

  const missing = all.filter((p) =>
    emptyOnly ? !String(p.image ?? "").trim() : isBadImage(p.image),
  );
  console.log(
    `Products: ${all.length} · candidates: ${missing.length}${emptyOnly ? " (empty image only)" : " (missing/placeholder)"}`,
  );

  const prior = loadPriorResults();
  const priorById = new Map(prior.map((r) => [r.id, r]));

  let targets: ProductRow[];
  let results: MatchResult[];

  if (rescrapeBad) {
    const badIds = new Set(
      prior.filter((r) => !r.ok || looksSuspicious(r.after)).map((r) => r.id),
    );
    targets = missing.filter((p) => badIds.has(p.id)).slice(0, limit);
    results = prior.filter((r) => !badIds.has(r.id));
    console.log(`Rescraping ${targets.length} suspicious/failed prior match(es)…\n`);
  } else if (resume) {
    const doneIds = new Set(prior.map((r) => r.id));
    targets = missing.filter((p) => !doneIds.has(p.id)).slice(0, limit);
    results = [...prior];
    console.log(`Resuming — ${prior.length} done, ${targets.length} remaining…\n`);
  } else {
    targets = missing.slice(0, limit);
    results = [];
    console.log(`Processing ${targets.length} item(s)…\n`);
  }

  for (let i = 0; i < targets.length; i++) {
    const item = targets[i]!;
    console.log(`[${i + 1}/${targets.length}] ${item.name}`);
    const { url, query } = await scrapeImageForName(item.name);
    // Drop any prior row for this id (rescrape replaces it).
    const idx = results.findIndex((r) => r.id === item.id);
    if (idx >= 0) results.splice(idx, 1);

    if (!url) {
      console.log("  → no image found");
      results.push({
        id: item.id,
        name: item.name,
        before: item.image || priorById.get(item.id)?.before || "",
        after: null,
        query,
        ok: false,
        reason: "promas_no_result",
      });
    } else {
      console.log(`  → ${url}`);
      results.push({
        id: item.id,
        name: item.name,
        before: item.image || priorById.get(item.id)?.before || "",
        after: url,
        query,
        ok: true,
      });

      if (apply && db) {
        await db.collection(COLLECTION).doc(item.id).update({ image: url });
        console.log("  → Firestore updated");
      }
    }

    // Checkpoint after every item so long runs survive interruption.
    writeReport(apply, results);
  }

  printReport(apply, results);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
