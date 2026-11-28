/**
 * Smoke: customer/runner order-flow invariants (status gates, chat window,
 * tips in earnings, rating readiness). No Firebase — pure shared helpers.
 *
 * Run: node packages/shared/scripts/smoke-order-flow-invariants.mjs
 */
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function loadShared() {
  try {
    const require = createRequire(import.meta.url);
    require.resolve("tsx/esm");
    const status = await import(
      pathToFileURL(path.join(__dirname, "../src/order-status.ts")).href
    );
    const constants = await import(
      pathToFileURL(path.join(__dirname, "../src/constants.ts")).href
    );
    return { ...status, ...constants };
  } catch {
    // Minimal inline mirrors when tsx is unavailable.
    const RUNNER_EARNINGS_RATE = 0.7;
    const CHAT_AFTER_DELIVERY_MS = 8 * 60 * 60 * 1000;
    function orderTipTotal(order) {
      return (
        Math.max(0, Number(order.tip ?? 0)) +
        Math.max(0, Number(order.tipAmount ?? 0))
      );
    }
    function runnerEarningsForOrder(deliveryFee, heavy = 0, tip = 0) {
      const fee = Number(deliveryFee ?? 0) + Number(heavy ?? 0);
      return Math.round((fee * RUNNER_EARNINGS_RATE + Math.max(0, tip)) * 100) / 100;
    }
    function runnerEarningsFromOrder(order) {
      return runnerEarningsForOrder(
        order.deliveryFee,
        order.heavyBagSurcharge,
        orderTipTotal(order),
      );
    }
    function normalizeChatStatus(status) {
      switch (status) {
        case "runner_assigned":
        case "assigned":
          return "accepted";
        case "picked_up":
        case "picked":
          return "purchased";
        case "completed":
          return "runner_paid";
        case "paid":
          return "customer_paid";
        default:
          return status;
      }
    }
    function isChatActive(statusOrOrder) {
      const order =
        typeof statusOrOrder === "string"
          ? { status: statusOrOrder }
          : statusOrOrder;
      const normalized = normalizeChatStatus(order.status);
      if (
        normalized === "pending" ||
        normalized === "accepted" ||
        normalized === "purchased"
      ) {
        return true;
      }
      const post =
        normalized === "delivered" ||
        normalized === "customer_paid" ||
        normalized === "runner_paid";
      if (!post) return false;
      const anchor = order.deliveredAt || order.updatedAt;
      if (!anchor) return true;
      return Date.now() <= new Date(anchor).getTime() + CHAT_AFTER_DELIVERY_MS;
    }
    function canCustomerCancelOrder(order) {
      return order.status === "pending" || order.status === "accepted";
    }
    function isClaimableOrderStatus(status) {
      return status === "pending";
    }
    function isCustomerPaymentOpen(status, order) {
      if (status !== "delivered" && status !== "runner_paid") return false;
      if (order?.paymentReceived) return false;
      return true;
    }
    function runnerPayoutPending(status) {
      return (
        status === "delivered" ||
        status === "customer_paid" ||
        status === "paid"
      );
    }
    function runnerPayoutPaid(status) {
      return status === "runner_paid" || status === "completed";
    }
    return {
      CHAT_AFTER_DELIVERY_MS,
      orderTipTotal,
      runnerEarningsForOrder,
      runnerEarningsFromOrder,
      isChatActive,
      canCustomerCancelOrder,
      isClaimableOrderStatus,
      isCustomerPaymentOpen,
      runnerPayoutPending,
      runnerPayoutPaid,
    };
  }
}

const {
  CHAT_AFTER_DELIVERY_MS,
  orderTipTotal,
  runnerEarningsFromOrder,
  isChatActive,
  canCustomerCancelOrder,
  isClaimableOrderStatus,
  isCustomerPaymentOpen,
  runnerPayoutPending,
  runnerPayoutPaid,
} = await loadShared();

assert.equal(CHAT_AFTER_DELIVERY_MS, 8 * 60 * 60 * 1000, "chat window is 8h");

assert.equal(isClaimableOrderStatus("pending"), true);
assert.equal(isClaimableOrderStatus("accepted"), false);

assert.equal(canCustomerCancelOrder({ status: "pending" }), true);
assert.equal(canCustomerCancelOrder({ status: "accepted" }), true);
assert.equal(canCustomerCancelOrder({ status: "purchased" }), false);
assert.equal(canCustomerCancelOrder({ status: "delivered" }), false);

assert.equal(isChatActive("accepted"), true);
assert.equal(isChatActive("purchased"), true);
assert.equal(
  isChatActive({
    status: "delivered",
    deliveredAt: new Date(Date.now() - 60 * 60 * 1000),
  }),
  true,
  "chat open 1h after delivery",
);
assert.equal(
  isChatActive({
    status: "delivered",
    deliveredAt: new Date(Date.now() - 9 * 60 * 60 * 1000),
  }),
  false,
  "chat closed after 8h",
);

assert.equal(
  isCustomerPaymentOpen("delivered", {
    paymentReceived: false,
    orderChannel: "canteen",
  }),
  true,
  "canteen delivered + unpaid is open",
);
assert.equal(
  isCustomerPaymentOpen("delivered", {
    paymentReceived: false,
    amountPaidByRunner: 80,
  }),
  true,
  "grocery with runner total is open",
);
assert.equal(
  isCustomerPaymentOpen("delivered", { paymentReceived: true }),
  false,
);
assert.equal(
  isCustomerPaymentOpen("delivered", { paymentReceived: false }),
  false,
  "grocery without confirmed total stays closed",
);

assert.equal(runnerPayoutPending("delivered"), true);
assert.equal(runnerPayoutPending("customer_paid"), true);
assert.equal(runnerPayoutPaid("runner_paid"), true);
assert.equal(runnerPayoutPaid("completed"), true);

assert.equal(orderTipTotal({ tip: 5, tipAmount: 10 }), 15);
assert.equal(
  runnerEarningsFromOrder({
    deliveryFee: 20,
    heavyBagSurcharge: 0,
    tip: 5,
    tipAmount: 10,
  }),
  Math.round((20 * 0.7 + 15) * 100) / 100,
  "earnings include checkout + after-delivery tips",
);

console.log("smoke-order-flow-invariants: ok");
