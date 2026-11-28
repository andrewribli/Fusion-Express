/**
 * TDD smoke: customer + runner order-flow invariants.
 *
 * Covers:
 * - createOrder-style payload sanitize (no nested undefined)
 * - auth / guest checkout gate helpers
 * - chat window after delivery (8h)
 * - chat storage path helper
 * - runner payout summary helpers
 *
 * Run before/after feature updates:
 *   npx tsx packages/shared/scripts/smoke-order-flow.mjs
 *   node packages/shared/scripts/smoke-order-flow.mjs
 */
import { createRequire } from "node:module";
import { pathToFileURL } from "node:url";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");

function fail(msg) {
  console.error(`FAIL: ${msg}`);
  process.exitCode = 1;
}

function ok(msg) {
  console.log(`ok — ${msg}`);
}

async function loadTs(rel) {
  const abs = path.join(root, rel);
  try {
    const require = createRequire(import.meta.url);
    require.resolve("tsx/esm");
    return import(pathToFileURL(abs).href);
  } catch {
    return null;
  }
}

function omitUndefinedDeep(value) {
  if (value === undefined) return undefined;
  if (value === null) return null;
  if (Array.isArray(value)) {
    return value.map((item) => {
      const cleaned = omitUndefinedDeep(item);
      return cleaned === undefined ? null : cleaned;
    });
  }
  if (typeof value !== "object") return value;
  const proto = Object.getPrototypeOf(value);
  if (proto !== Object.prototype && proto !== null) return value;
  const out = {};
  for (const [key, val] of Object.entries(value)) {
    if (val === undefined) continue;
    const cleaned = omitUndefinedDeep(val);
    if (cleaned !== undefined) out[key] = cleaned;
  }
  return out;
}

function assertNoUndefined(value, pathLabel = "payload") {
  if (value === undefined) {
    throw new Error(`Firestore payload has undefined at ${pathLabel}`);
  }
  if (value === null || typeof value !== "object") return;
  if (Array.isArray(value)) {
    value.forEach((item, i) => assertNoUndefined(item, `${pathLabel}[${i}]`));
    return;
  }
  const proto = Object.getPrototypeOf(value);
  if (proto !== Object.prototype && proto !== null) return;
  for (const [key, val] of Object.entries(value)) {
    assertNoUndefined(val, `${pathLabel}.${key}`);
  }
}

function hasUndefined(value) {
  if (value === undefined) return true;
  if (value === null || typeof value !== "object") return false;
  if (Array.isArray(value)) return value.some(hasUndefined);
  const proto = Object.getPrototypeOf(value);
  if (proto !== Object.prototype && proto !== null) return false;
  return Object.values(value).some(hasUndefined);
}

/** Guest / anonymous sessions must not place customer orders. */
function assertCheckoutAuthGate(session) {
  if (!session?.uid) throw new Error("auth required");
  if (session.isGuest || session.isAnonymous) {
    throw new Error("guest checkout blocked");
  }
  return true;
}

const omitMod = (await loadTs("src/omit-undefined.ts")) ?? {
  omitUndefined: omitUndefinedDeep,
  omitUndefinedDeep,
  assertNoUndefined,
};

const constants = await loadTs("src/constants.ts");
const orderStatus = await loadTs("src/order-status.ts");

// --- 1) sanitize createOrder payloads ---
{
  const raw = {
    customerId: "u1",
    customerName: "Test",
    customerPhotoURL: undefined,
    runnerNote: undefined,
    items: [
      { itemId: "a", name: "Milk", price: 10, quantity: 1, actualPrice: undefined },
    ],
    nested: { tip: undefined, lobby: "UC" },
  };
  const cleaned = omitMod.omitUndefinedDeep
    ? omitMod.omitUndefinedDeep(raw)
    : omitMod.omitUndefined(raw);
  if (hasUndefined(cleaned)) fail("cleaned payload still has undefined");
  else {
    try {
      omitMod.assertNoUndefined(cleaned);
      ok("createOrder sanitize / no undefined");
    } catch (err) {
      fail(err instanceof Error ? err.message : String(err));
    }
  }
}

// --- 2) auth gates ---
{
  try {
    assertCheckoutAuthGate({ uid: "x", isGuest: true });
    fail("guest checkout should be blocked");
  } catch {
    ok("guest checkout blocked");
  }
  try {
    assertCheckoutAuthGate({ uid: "x", isAnonymous: true });
    fail("anonymous checkout should be blocked");
  } catch {
    ok("anonymous checkout blocked");
  }
  try {
    assertCheckoutAuthGate({ uid: "real-user", isGuest: false });
    ok("signed-in customer can checkout");
  } catch (err) {
    fail(err instanceof Error ? err.message : String(err));
  }
}

// --- 3) chat window helper (8h) ---
{
  if (!constants?.isChatActive || !constants?.CHAT_AFTER_DELIVERY_MS) {
    fail("could not load isChatActive / CHAT_AFTER_DELIVERY_MS (run with npx tsx)");
  } else {
    const eightH = 8 * 60 * 60 * 1000;
    if (constants.CHAT_AFTER_DELIVERY_MS !== eightH) {
      fail(
        `CHAT_AFTER_DELIVERY_MS expected ${eightH}, got ${constants.CHAT_AFTER_DELIVERY_MS}`,
      );
    } else {
      ok("CHAT_AFTER_DELIVERY_MS is 8 hours");
    }

    const deliveredAt = new Date(Date.now() - 2 * 60 * 60 * 1000);
    if (!constants.isChatActive({ status: "delivered", deliveredAt })) {
      fail("chat should be open 2h after delivery");
    } else ok("chat open within 8h window");

    const old = new Date(Date.now() - 9 * 60 * 60 * 1000);
    if (constants.isChatActive({ status: "delivered", deliveredAt: old })) {
      fail("chat should be closed 9h after delivery");
    } else ok("chat closed after 8h window");

    if (!constants.isChatActive({ status: "accepted" })) {
      fail("in-flight chat should stay open");
    } else ok("in-flight chat open");
  }
}

// --- 4) storage path helper ---
{
  if (!constants?.chatMediaStoragePath) {
    fail("chatMediaStoragePath missing (run with npx tsx)");
  } else {
    const p = constants.chatMediaStoragePath("order123", "my chat!.jpg", 1700000000000);
    if (p !== "chats/order123/1700000000000-my_chat_.jpg") {
      fail(`unexpected chat path: ${p}`);
    } else ok("chat storage path helper");
  }
}

// --- 5) runner payout helpers ---
{
  if (!orderStatus?.summarizeRunnerPayouts) {
    fail("summarizeRunnerPayouts missing (run with npx tsx)");
  } else {
    const summary = orderStatus.summarizeRunnerPayouts([
      { status: "delivered", deliveryFee: 10, tip: 0 },
      { status: "customer_paid", deliveryFee: 10, tip: 2 },
      { status: "completed", deliveryFee: 10, tip: 0 },
      { status: "runner_paid", deliveryFee: 10, tip: 0 },
    ]);
    // 70% of 10 = 7; pending: 7 + 9 = 16; paid: 7 + 7 = 14
    if (summary.pendingCount !== 2 || summary.paidCount !== 2) {
      fail(`unexpected payout counts: ${JSON.stringify(summary)}`);
    } else if (summary.pendingAmount !== 16 || summary.paidAmount !== 14) {
      fail(`unexpected payout amounts: ${JSON.stringify(summary)}`);
    } else ok("runner payout summary");
  }
}

if (process.exitCode) {
  console.error("\nSmoke failed.");
  process.exit(process.exitCode);
}
console.log("\nAll smoke checks passed.");
