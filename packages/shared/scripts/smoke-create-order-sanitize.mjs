/**
 * Smoke: createOrder-style payloads must not retain nested undefined.
 * Run: node packages/shared/scripts/smoke-create-order-sanitize.mjs
 */
import { createRequire } from "node:module";
import { pathToFileURL } from "node:url";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const omitPath = path.join(__dirname, "../src/omit-undefined.ts");

// Load via tsx if available; otherwise inline the same logic for CI-less smoke.
async function loadOmit() {
  try {
    const require = createRequire(import.meta.url);
    require.resolve("tsx/esm");
    return import(pathToFileURL(omitPath).href);
  } catch {
    // Inline mirror of omitUndefinedDeep / assertNoUndefined for plain node.
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
    function assertNoUndefined(value, path = "payload") {
      if (value === undefined) {
        throw new Error(`Firestore payload has undefined at ${path}`);
      }
      if (value === null || typeof value !== "object") return;
      if (Array.isArray(value)) {
        value.forEach((item, i) => assertNoUndefined(item, `${path}[${i}]`));
        return;
      }
      const proto = Object.getPrototypeOf(value);
      if (proto !== Object.prototype && proto !== null) return;
      for (const [key, val] of Object.entries(value)) {
        assertNoUndefined(val, `${path}.${key}`);
      }
    }
    function omitUndefined(value) {
      return omitUndefinedDeep(value);
    }
    return { omitUndefined, omitUndefinedDeep, assertNoUndefined };
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

const { omitUndefined, assertNoUndefined } = await loadOmit();

const fusionRaw = {
  customerId: "u1",
  customerName: "Test",
  customerEmail: "a@link.cuhk.edu.hk",
  customerAvatarId: "sushi-cat",
  customerPhotoURL: undefined,
  campus: "cuhk",
  orderChannel: "fusion",
  canteenCollege: undefined,
  tip: undefined,
  scheduledFor: undefined,
  isScheduled: false,
  items: [
    {
      itemId: "sku-1",
      name: "Milk",
      price: 8,
      quantity: 1,
      weightKg: 0.5,
      isCustom: undefined,
    },
    {
      itemId: "custom-1",
      name: "Custom",
      price: 12,
      quantity: 1,
      weightKg: undefined,
      isCustom: true,
    },
  ],
};

const canteenRaw = {
  customerId: "u2",
  customerName: "Guest",
  customerEmail: undefined,
  customerPhotoURL: undefined,
  orderChannel: "canteen",
  canteenRestaurantId: "uc-canteen",
  canteenCollege: undefined,
  items: [
    {
      itemId: "canteen:uc:1",
      name: "Rice",
      price: 38.5,
      quantity: 1,
      weightKg: undefined,
      isCustom: undefined,
    },
  ],
};

for (const [label, raw] of [
  ["fusion", fusionRaw],
  ["canteen", canteenRaw],
]) {
  if (!hasUndefined(raw)) {
    console.error(`FAIL: ${label} fixture expected nested undefined before sanitize`);
    process.exit(1);
  }
  const cleaned = omitUndefined(raw);
  try {
    assertNoUndefined(cleaned, label);
  } catch (err) {
    console.error(`FAIL: ${label} still has undefined after sanitize`, err);
    process.exit(1);
  }
  if (hasUndefined(cleaned)) {
    console.error(`FAIL: ${label} hasUndefined still true`, cleaned);
    process.exit(1);
  }
  if ("customerPhotoURL" in cleaned) {
    console.error(`FAIL: ${label} kept customerPhotoURL`);
    process.exit(1);
  }
  if (cleaned.items.some((item) => "isCustom" in item && item.isCustom !== true)) {
    console.error(`FAIL: ${label} kept falsey isCustom`);
    process.exit(1);
  }
  console.log(`OK ${label}: sanitized, no undefined`);
}

/** Mirror createOrder allowlist + item sanitize (regression for checkout P0). */
function buildCreateOrderPayload(order) {
  const items = (order.items ?? []).map((item) =>
    omitUndefined({
      itemId: item.itemId,
      name: item.name,
      price: item.price,
      quantity: item.quantity,
      weightKg: item.weightKg,
      actualPrice: item.actualPrice,
      isCustom: item.isCustom === true ? true : undefined,
    }),
  );
  return omitUndefined({
    sessionId: order.sessionId ?? "s1",
    customerId: order.customerId,
    customerName: order.customerName,
    customerEmail: order.customerEmail,
    customerAvatarId: order.customerAvatarId,
    customerPhotoURL: order.customerPhotoURL,
    campus: order.campus,
    orderChannel: order.orderChannel,
    canteenRestaurantId: order.canteenRestaurantId,
    canteenCollege: order.canteenCollege,
    items,
    status: "pending",
    college: "Shaw College",
    hall: "Kuo Mou Hall",
    lobbyPoint: "Kuo Mou Hall lobby",
    zone: 2,
    totalWeight: 1,
    customerNote: "None for now",
    subtotal: 26,
    deliveryFee: 8,
    tip: order.tip,
    total: 34,
    paymentReceived: false,
    fusionPaidByPlatform: true,
    estimatedSubtotal: 26,
    isScheduled: order.isScheduled === true ? true : undefined,
    scheduledFor: undefined,
  });
}

const allowlisted = buildCreateOrderPayload({
  ...fusionRaw,
  // Noise fields that must never reach Firestore as undefined via spread:
  paymentMethod: undefined,
  runnerId: undefined,
  roomNumber: undefined,
  heavyBagSurcharge: undefined,
});
assertNoUndefined(allowlisted, "allowlist");
if (hasUndefined(allowlisted)) {
  console.error("FAIL: allowlist payload still has undefined", allowlisted);
  process.exit(1);
}
for (const leak of [
  "paymentMethod",
  "runnerId",
  "roomNumber",
  "heavyBagSurcharge",
  "customerPhotoURL",
  "tip",
  "scheduledFor",
  "isScheduled",
]) {
  if (leak in allowlisted) {
    console.error(`FAIL: allowlist leaked ${leak}`);
    process.exit(1);
  }
}
console.log("OK allowlist: createOrder-shaped payload has no undefined leaks");

console.log("smoke-create-order-sanitize: all passed");
