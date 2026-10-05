import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  ADMIN_ORDERING_NOTE,
  immediateOrderDecision,
  resolveDeliveryTiming,
  scheduledOrderDecision,
} from "./order-window";

const ebeneezers = { kind: "cuhk-canteen" as const, id: "ebeneezers" };
const comingSoon = { kind: "cuhk-canteen" as const, id: "orchid-lodge" };
const cityuEbeneezers = { kind: "cityu-canteen" as const, id: "ebeneezers-5380" };
const fusion = { kind: "fusion" as const };

/** Thursday 1 Oct 2026 is an HK public holiday. */
const holidayLunch = new Date("2026-10-01T12:00:00+08:00");
/** Sunday 4 Oct 2026. */
const sundayLunch = new Date("2026-10-04T12:00:00+08:00");
/** Monday 5 Oct 2026, inside the order window. */
const mondayOpen = new Date("2026-10-05T12:00:00+08:00");
/** Monday 5 Oct 2026, after the 19:45 order cutoff. */
const mondayAfterCutoff = new Date("2026-10-05T19:50:00+08:00");
/** Wednesday 30 Sep 2026 01:06, Fusion window is 20:00–01:00. */
const fusionClosed = new Date("2026-09-30T01:06:00+08:00");
const fusionOpen = new Date("2026-09-30T20:30:00+08:00");

describe("immediate orders when closed", () => {
  it("blocks a non-admin on an Ebeneezer's public holiday", () => {
    const decision = immediateOrderDecision(ebeneezers, {
      isAdmin: false,
      at: holidayLunch,
    });
    assert.equal(decision.allowed, false);
    assert.equal(decision.bypassable, true);
    assert.equal(decision.adminNote, null);
    assert.match(decision.message ?? "", /public holiday/i);
  });

  it("lets an admin order on that holiday without changing the closed message", () => {
    const decision = immediateOrderDecision(ebeneezers, {
      isAdmin: true,
      at: holidayLunch,
    });
    assert.equal(decision.allowed, true);
    assert.equal(decision.closed, true);
    assert.equal(decision.adminNote, ADMIN_ORDERING_NOTE);
  });

  it("blocks a non-admin in the last 15 minutes and lets an admin through", () => {
    const customer = immediateOrderDecision(ebeneezers, {
      isAdmin: false,
      at: mondayAfterCutoff,
    });
    const admin = immediateOrderDecision(ebeneezers, {
      isAdmin: true,
      at: mondayAfterCutoff,
    });
    assert.equal(customer.allowed, false);
    assert.equal(customer.bypassable, true);
    assert.equal(admin.allowed, true);
  });

  it("still blocks a coming-soon canteen for an admin", () => {
    const decision = immediateOrderDecision(comingSoon, {
      isAdmin: true,
      at: mondayOpen,
    });
    assert.equal(decision.allowed, false);
    assert.equal(decision.orderable, false);
    assert.equal(decision.bypassable, false);
    assert.equal(decision.adminNote, null);
  });

  it("blocks CityU Ebeneezer's on Sunday for a customer and not for an admin", () => {
    const customer = immediateOrderDecision(cityuEbeneezers, {
      isAdmin: false,
      at: sundayLunch,
    });
    const admin = immediateOrderDecision(cityuEbeneezers, {
      isAdmin: true,
      at: sundayLunch,
    });
    assert.equal(customer.allowed, false);
    assert.equal(admin.allowed, true);
    assert.equal(admin.adminNote, ADMIN_ORDERING_NOTE);
  });
});

describe("schedule one future delivery", () => {
  it("lets a customer schedule the next open slot while the shop is closed now", () => {
    const decision = scheduledOrderDecision(ebeneezers, mondayOpen, {
      isAdmin: false,
      now: holidayLunch,
    });
    assert.equal(decision.allowed, true);
    assert.equal(decision.adminNote, null);
  });

  it("rejects a customer time on a closed day and allows that time for an admin", () => {
    const customer = scheduledOrderDecision(ebeneezers, sundayLunch, {
      isAdmin: false,
      now: new Date("2026-10-03T12:00:00+08:00"),
    });
    const admin = scheduledOrderDecision(ebeneezers, sundayLunch, {
      isAdmin: true,
      now: new Date("2026-10-03T12:00:00+08:00"),
    });
    assert.equal(customer.allowed, false);
    assert.equal(customer.bypassable, true);
    assert.equal(admin.allowed, true);
  });

  it("rejects a past timestamp even for an admin", () => {
    const decision = scheduledOrderDecision(fusion, fusionClosed, {
      isAdmin: true,
      now: fusionOpen,
    });
    assert.equal(decision.allowed, false);
    assert.equal(decision.bypassable, false);
  });

  it("keeps Fusion deliver-now closed outside 8pm–1am and accepts a later open slot", () => {
    const now = immediateOrderDecision(fusion, { isAdmin: false, at: fusionClosed });
    const later = resolveDeliveryTiming({
      venue: fusion,
      isAdmin: false,
      mode: "schedule",
      date: "2026-09-30",
      time: "20:30",
      now: fusionClosed,
    });
    assert.equal(now.allowed, false);
    assert.equal(later.allowed, true);
    assert.equal(later.scheduledFor, new Date("2026-09-30T20:30:00+08:00").toISOString());
  });
});
