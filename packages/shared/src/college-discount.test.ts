import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  MIN_CANTEEN_DISCOUNT,
  NO_MATCHING_RUNNER_MESSAGE,
  assertRunnerCollegeWrite,
  canteenDiscountCatalog,
  canteenDiscountConfig,
  collegeDiscountCreateFields,
  collegeDiscountOnCancel,
  customerCollegeSavingsView,
  discountSplitForAmount,
  previewCustomerSavings,
  runnerCollegeBonus,
  settleCollegeDiscountOnAccept,
  sortOrdersForRunner,
  type StoredCollegeOrder,
} from "./college-discount.ts";

function eligibleOrder(partial: Partial<StoredCollegeOrder> = {}): StoredCollegeOrder {
  return {
    campus: "cuhk",
    orderChannel: "canteen",
    canteenRestaurantId: "uc-canteen",
    discountCollege: "united",
    discountAmount: 5,
    discountSplit: { customer: 2, runner: 2, platform: 1 },
    discountApplied: false,
    platformDiscountFee: 0,
    collegeDiscountStatus: "pending",
    estimatedSubtotal: 35,
    subtotal: 33,
    deliveryFee: 5,
    tip: 0,
    platformFee: 1.5,
    total: 39.5,
    status: "pending",
    ...partial,
  };
}

describe("canteen discount config", () => {
  it("enables only UC at HK$5 with a 2/2/1 split", () => {
    const uc = canteenDiscountConfig("uc-canteen");
    assert.deepEqual(uc, {
      discountCollege: "united",
      discountAmount: 5,
      discountSplit: { customer: 2, runner: 2, platform: 1 },
    });
    const enabled = canteenDiscountCatalog().filter((row) => row.enabled);
    assert.deepEqual(enabled.map((row) => row.id), ["uc-canteen"]);
  });

  it("leaves unconfirmed college canteens at 0", () => {
    for (const id of ["sh-ho-canteen", "na-canteen", "na-webbites", "cc-canteen", "chung-chi-tang", "shaw-canteen", "wys", "lws", "orchid-lodge"]) {
      const config = canteenDiscountConfig(id);
      assert.equal(config.discountAmount, 0, id);
      assert.equal(config.discountSplit, null, id);
    }
  });

  it("disables the feature below HK$5", () => {
    assert.equal(discountSplitForAmount(0), null);
    assert.equal(discountSplitForAmount(MIN_CANTEEN_DISCOUNT - 1), null);
    assert.equal(discountSplitForAmount(4.99), null);
    assert.deepEqual(discountSplitForAmount(5), { customer: 2, runner: 2, platform: 1 });
  });

  it("does not apply to CityU", () => {
    assert.equal(previewCustomerSavings({ campus: "cityu", restaurantId: "uc-canteen" }), 0);
    assert.equal(
      collegeDiscountCreateFields({
        campus: "cityu",
        orderChannel: "canteen",
        restaurantId: "uc-canteen",
        foodSubtotal: 35,
        currentTotal: 41.5,
      }),
      null,
    );
  });
});

describe("order creation", () => {
  it("quotes HK$2 off and stores the split from canteen config", () => {
    const fields = collegeDiscountCreateFields({
      campus: "cuhk",
      orderChannel: "canteen",
      restaurantId: "uc-canteen",
      foodSubtotal: 35,
      currentTotal: 35 + 5 + 1.5,
    });
    assert.ok(fields);
    assert.equal(fields.discountAmount, 5);
    assert.deepEqual(fields.discountSplit, { customer: 2, runner: 2, platform: 1 });
    assert.equal(fields.subtotal, 33);
    assert.equal(fields.total, 39.5);
    assert.equal(fields.platformDiscountFee, 0);
    assert.equal(fields.discountApplied, false);
  });

  it("does not invent a discount for a canteen left at 0", () => {
    assert.equal(
      collegeDiscountCreateFields({
        campus: "cuhk",
        orderChannel: "canteen",
        restaurantId: "sh-ho-canteen",
        foodSubtotal: 35,
        currentTotal: 41.5,
      }),
      null,
    );
  });
});

describe("acceptance", () => {
  it("matching runner saves the customer HK$2, earns HK$2, and records HK$1", () => {
    const settled = settleCollegeDiscountOnAccept(eligibleOrder(), "united");
    assert.equal(settled.matching, true);
    assert.equal(settled.customerSavings, 2);
    assert.equal(settled.runnerBonus, 2);
    assert.equal(settled.platformDiscountFee, 1);
    assert.equal(settled.subtotal, 33);
    assert.equal(settled.total, 39.5);
    assert.equal(settled.collegeDiscountStatus, "applied");
    assert.equal(settled.notifyCustomer, null);
    const legacyAlias = settleCollegeDiscountOnAccept(eligibleOrder(), "UC");
    assert.equal(legacyAlias.matching, true);
    assert.equal(legacyAlias.platformDiscountFee, 1);
  });

  it("non-matching runner removes the customer discount and records no fee", () => {
    const settled = settleCollegeDiscountOnAccept(eligibleOrder(), "shaw");
    assert.equal(settled.matching, false);
    assert.equal(settled.customerSavings, 0);
    assert.equal(settled.runnerBonus, 0);
    assert.equal(settled.platformDiscountFee, 0);
    assert.equal(settled.subtotal, 35);
    assert.equal(settled.total, 41.5);
    assert.equal(settled.notifyCustomer, NO_MATCHING_RUNNER_MESSAGE);
    assert.equal(settled.collegeDiscountStatus, "void");
  });

  it("a missing college does not match", () => {
    const settled = settleCollegeDiscountOnAccept(eligibleOrder(), null);
    assert.equal(settled.matching, false);
    assert.equal(settled.platformDiscountFee, 0);
    assert.equal(settled.subtotal, 35);
  });

  it("does not apply a CityU order even if fields were copied", () => {
    const settled = settleCollegeDiscountOnAccept(
      eligibleOrder({ campus: "cityu" }),
      "united",
    );
    assert.equal(settled.eligible, false);
    assert.equal(settled.platformDiscountFee, 0);
    assert.equal(settled.subtotal, 33);
  });

  it("keeps the split stored on the order when config would differ", () => {
    const historical = eligibleOrder({
      discountSplit: { customer: 2, runner: 2, platform: 1 },
      discountAmount: 5,
      discountCollege: "united",
    });
    const settled = settleCollegeDiscountOnAccept(historical, "united");
    assert.equal(settled.customerSavings, 2);
    assert.equal(settled.runnerBonus, 2);
    assert.equal(settled.platformDiscountFee, 1);
  });
});

describe("cancel and earnings", () => {
  it("clears the platform fee and withholds the runner bonus after cancel", () => {
    const cleared = collegeDiscountOnCancel(
      eligibleOrder({
        status: "cancelled",
        discountApplied: true,
        platformDiscountFee: 1,
        collegeDiscountStatus: "applied",
      }),
    );
    assert.equal(cleared.platformDiscountFee, 0);
    assert.equal(cleared.runnerBonus, 0);
    assert.equal(cleared.clearFee, true);
    assert.equal(
      runnerCollegeBonus({
        status: "cancelled",
        discountApplied: true,
        platformDiscountFee: 1,
        discountSplit: { customer: 2, runner: 2, platform: 1 },
      }),
      0,
    );
  });

  it("counts the HK$2 bonus only after a matching accept", () => {
    assert.equal(
      runnerCollegeBonus({
        status: "delivered",
        discountApplied: true,
        platformDiscountFee: 1,
        discountSplit: { runner: 2 },
      }),
      2,
    );
    assert.equal(
      runnerCollegeBonus({
        status: "delivered",
        discountApplied: false,
        platformDiscountFee: 0,
        discountSplit: { runner: 2 },
      }),
      0,
    );
  });
});

describe("locked college", () => {
  it("rejects a client change once locked", () => {
    const denied = assertRunnerCollegeWrite({
      currentCollege: "united",
      locked: true,
      nextCollege: "shaw",
      viaAdminApproval: false,
    });
    assert.equal(denied.ok, false);
  });

  it("allows the first write and an admin approval", () => {
    const first = assertRunnerCollegeWrite({
      currentCollege: null,
      locked: false,
      nextCollege: "united",
      viaAdminApproval: false,
    });
    assert.equal(first.ok, true);
    if (first.ok) assert.equal(first.college, "united");
    const approved = assertRunnerCollegeWrite({
      currentCollege: "united",
      locked: true,
      nextCollege: "shaw",
      viaAdminApproval: true,
    });
    assert.equal(approved.ok, true);
    if (approved.ok) assert.equal(approved.college, "shaw");
  });
});

describe("runner ordering and customer view", () => {
  it("lists matching-college orders before the rest", () => {
    const rows = sortOrdersForRunner(
      [
        { id: "a", campus: "cuhk", discountCollege: "shaw", discountAmount: 5, discountSplit: { customer: 2 }, createdAt: new Date("2026-09-01") },
        { id: "b", campus: "cuhk", discountCollege: "united", discountAmount: 5, discountSplit: { customer: 2 }, createdAt: new Date("2026-09-02") },
      ],
      "united",
    );
    assert.equal(rows[0]?.id, "b");
    assert.equal(rows[1]?.id, "a");
  });

  it("shows a pending HK$2 customer saving and hides it after a void", () => {
    const pending = customerCollegeSavingsView(eligibleOrder());
    assert.deepEqual(pending, { show: true, amount: 2, pending: true });
    const applied = customerCollegeSavingsView(
      eligibleOrder({ discountApplied: true, collegeDiscountStatus: "applied" }),
    );
    assert.deepEqual(applied, { show: true, amount: 2, pending: false });
    const voided = customerCollegeSavingsView(
      eligibleOrder({
        discountApplied: false,
        collegeDiscountStatus: "void",
        subtotal: 35,
        total: 41.5,
      }),
    );
    assert.equal(voided.show, false);
  });
});
