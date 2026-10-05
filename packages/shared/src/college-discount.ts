/**
 * CUHK canteen college discount.
 *
 * A confirmed canteen discount of HK$5 or more is split three ways:
 * customer saves HK$2, matching runner earns HK$2, GraceRun records HK$1.
 * This HK$1 is a slice of the canteen discount (platformDiscountFee), not an
 * extra charge. The separate PLATFORM_FEE stays a checkout line of its own.
 *
 * CityU has no college system. This module never applies there.
 * Amounts below HK$5, or canteens with no documented discount, stay off.
 */

import { CUHK_COLLEGE_LABELS, type CuhkDeliveryCollegeId } from "./deliveryLocations";

export const RUNNER_COLLEGE_IDS = [
  "chung-chi",
  "new-asia",
  "united",
  "shaw",
  "morningside",
  "shho",
  "cw-chu",
  "wys",
  "lws",
  "pg",
] as const;

export type RunnerCollegeId = (typeof RUNNER_COLLEGE_IDS)[number];

export type DiscountSplit = {
  customer: number;
  runner: number;
  platform: number;
};

export type CollegeDiscountStatus = "pending" | "applied" | "void";

/** Fixed split used only when the canteen discount is HK$5 or more. */
export const COLLEGE_DISCOUNT_SPLIT: DiscountSplit = {
  customer: 2,
  runner: 2,
  platform: 1,
};

export const MIN_CANTEEN_DISCOUNT = 5;

export const NO_MATCHING_RUNNER_MESSAGE =
  "No matching-college runner was available. Discount not applied.";

/**
 * Documented canteen discounts. Only UC is confirmed at HK$5.
 * Every other CUHK canteen stays at 0 because this repo has no documented
 * college-card discount of HK$5 or more for them. Do not invent amounts.
 */
const CANTEEN_DISCOUNT_AMOUNTS: Record<
  string,
  { discountCollege: RunnerCollegeId; discountAmount: number }
> = {
  "uc-canteen": { discountCollege: "united", discountAmount: 5 },
};

/** Short names from the CUHK canteen catalog. Used on runner notes. */
const CANTEEN_SHORT_NAMES: Record<string, string> = {
  sorazen: "SoraZen",
  "paper-and-coffee": "Paper & Coffee",
  "uc-canteen": "UC Canteen",
  ebeneezers: "Ebeneezer's",
  "orchid-lodge": "Orchid Lodge",
  "benjamin-franklin": "Benjamin Franklin",
  "cu-cafe": "CU Cafe",
  "sh-ho-canteen": "S.H. Ho Canteen",
  "na-canteen": "NA Canteen",
  "na-webbites": "NA WebBites",
  "cc-canteen": "CC Canteen",
  "shaw-canteen": "Shaw Canteen",
  wys: "WYS",
  lws: "LWS",
  "chung-chi-tang": "Chung Chi Tang",
};

const KNOWN_CANTEEN_IDS = [
  "ebeneezers",
  "sorazen",
  "paper-and-coffee",
  "uc-canteen",
  "orchid-lodge",
  "benjamin-franklin",
  "cu-cafe",
  "sh-ho-canteen",
  "na-canteen",
  "na-webbites",
  "cc-canteen",
  "shaw-canteen",
  "wys",
  "lws",
  "chung-chi-tang",
] as const;

const LEGACY_COLLEGE_ALIASES: Record<string, RunnerCollegeId> = {
  united: "united",
  uc: "united",
  "united college": "united",
  "new-asia": "new-asia",
  na: "new-asia",
  "new asia": "new-asia",
  "new asia college": "new-asia",
  "chung-chi": "chung-chi",
  cc: "chung-chi",
  "chung chi": "chung-chi",
  "chung chi college": "chung-chi",
  shaw: "shaw",
  "shaw college": "shaw",
  morningside: "morningside",
  "morningside college": "morningside",
  shho: "shho",
  "s.h. ho": "shho",
  "s.h. ho college": "shho",
  "s.h. ho college (shho)": "shho",
  "cw-chu": "cw-chu",
  cwchu: "cw-chu",
  "c.w. chu": "cw-chu",
  "c.w. chu college": "cw-chu",
  wys: "wys",
  "wu yee sun": "wys",
  "wu yee sun college": "wys",
  "wu yee sun college (wys)": "wys",
  lws: "lws",
  "lee woo sing": "lws",
  "lee woo sing college": "lws",
  "lee woo sing college (lws)": "lws",
  pg: "pg",
  "postgraduate halls": "pg",
  "postgraduate halls (pgh)": "pg",
};

export type CanteenDiscountConfig = {
  discountCollege: RunnerCollegeId | null;
  discountAmount: number;
  discountSplit: DiscountSplit | null;
};

export function roundCollegeMoney(amount: number): number {
  return Math.round(amount * 100) / 100;
}

export function isRunnerCollegeId(value: string | null | undefined): value is RunnerCollegeId {
  return RUNNER_COLLEGE_IDS.includes(value as RunnerCollegeId);
}

export function normalizeRunnerCollegeId(
  value: string | null | undefined,
): RunnerCollegeId | null {
  if (!value) return null;
  const trimmed = value.trim().replace(/\s+/g, " ");
  if (!trimmed) return null;
  if (isRunnerCollegeId(trimmed)) return trimmed;
  const key = trimmed.toLowerCase();
  return LEGACY_COLLEGE_ALIASES[key] ?? null;
}

export function runnerCollegeLabel(id: string | null | undefined): string {
  const college = normalizeRunnerCollegeId(id);
  if (!college) return "";
  return CUHK_COLLEGE_LABELS[college as CuhkDeliveryCollegeId] ?? college;
}

export function runnerCollegeOptions(): { id: RunnerCollegeId; label: string }[] {
  return RUNNER_COLLEGE_IDS.map((id) => ({
    id,
    label: CUHK_COLLEGE_LABELS[id],
  }));
}

export function collegesMatch(
  a: string | null | undefined,
  b: string | null | undefined,
): boolean {
  const left = normalizeRunnerCollegeId(a);
  const right = normalizeRunnerCollegeId(b);
  return Boolean(left && right && left === right);
}

export function discountSplitForAmount(amount: number): DiscountSplit | null {
  if (!(Number(amount) >= MIN_CANTEEN_DISCOUNT)) return null;
  return { ...COLLEGE_DISCOUNT_SPLIT };
}

export function canteenDiscountConfig(
  restaurantId: string | null | undefined,
): CanteenDiscountConfig {
  const id = restaurantId?.trim() ?? "";
  const row = id ? CANTEEN_DISCOUNT_AMOUNTS[id] : undefined;
  if (!row) {
    return { discountCollege: null, discountAmount: 0, discountSplit: null };
  }
  const discountSplit = discountSplitForAmount(row.discountAmount);
  if (!discountSplit || !row.discountCollege) {
    return { discountCollege: null, discountAmount: 0, discountSplit: null };
  }
  return {
    discountCollege: row.discountCollege,
    discountAmount: row.discountAmount,
    discountSplit,
  };
}

export function canteenShortName(restaurantId: string | null | undefined): string {
  const id = restaurantId?.trim() ?? "";
  if (!id) return "the canteen";
  return CANTEEN_SHORT_NAMES[id] ?? id;
}

/** Every catalog canteen and whether the fixed split is enabled. */
export function canteenDiscountCatalog(): {
  id: string;
  enabled: boolean;
  discountCollege: RunnerCollegeId | null;
  discountAmount: number;
}[] {
  return KNOWN_CANTEEN_IDS.map((id) => {
    const config = canteenDiscountConfig(id);
    return {
      id,
      enabled: config.discountSplit != null,
      discountCollege: config.discountCollege,
      discountAmount: config.discountAmount,
    };
  });
}

export function previewCustomerSavings(opts: {
  campus?: string | null;
  restaurantId?: string | null;
}): number {
  if (opts.campus === "cityu") return 0;
  return canteenDiscountConfig(opts.restaurantId).discountSplit?.customer ?? 0;
}

export type CollegeDiscountOrderFields = {
  discountCollege: RunnerCollegeId;
  discountAmount: number;
  discountSplit: DiscountSplit;
  discountApplied: false;
  platformDiscountFee: number;
  collegeDiscountStatus: "pending";
  subtotal: number;
  total: number;
};

/**
 * Server-side snapshot at order creation. Client-submitted amounts are not
 * accepted — the only input is the canteen id and the priced food total.
 */
export function collegeDiscountCreateFields(opts: {
  campus?: string | null;
  orderChannel?: string | null;
  restaurantId?: string | null;
  foodSubtotal: number;
  currentTotal: number;
}): CollegeDiscountOrderFields | null {
  if (opts.campus === "cityu") return null;
  if (opts.orderChannel !== "canteen") return null;
  const config = canteenDiscountConfig(opts.restaurantId);
  if (!config.discountSplit || !config.discountCollege) return null;
  const savings = config.discountSplit.customer;
  const food = Math.max(0, Number(opts.foodSubtotal) || 0);
  return {
    discountCollege: config.discountCollege,
    discountAmount: config.discountAmount,
    discountSplit: config.discountSplit,
    discountApplied: false,
    platformDiscountFee: 0,
    collegeDiscountStatus: "pending",
    subtotal: roundCollegeMoney(Math.max(0, food - savings)),
    total: roundCollegeMoney(Math.max(0, Number(opts.currentTotal) - savings)),
  };
}

export type StoredCollegeOrder = {
  campus?: string | null;
  orderChannel?: string | null;
  canteenRestaurantId?: string | null;
  discountCollege?: string | null;
  discountAmount?: number | null;
  discountSplit?: Partial<DiscountSplit> | null;
  discountApplied?: boolean | null;
  platformDiscountFee?: number | null;
  collegeDiscountStatus?: string | null;
  subtotal: number;
  estimatedSubtotal?: number | null;
  deliveryFee: number;
  tip?: number | null;
  platformFee?: number | null;
  total: number;
  status?: string | null;
};

export type AcceptSettlement = {
  eligible: boolean;
  matching: boolean;
  discountApplied: boolean;
  customerSavings: number;
  runnerBonus: number;
  platformDiscountFee: number;
  subtotal: number;
  total: number;
  collegeDiscountStatus: CollegeDiscountStatus | null;
  runnerCollege: RunnerCollegeId | null;
  notifyCustomer: string | null;
};

function storedSplit(order: StoredCollegeOrder): DiscountSplit | null {
  const split = order.discountSplit;
  if (!split) return null;
  const customer = Number(split.customer);
  const runner = Number(split.runner);
  const platform = Number(split.platform);
  if (![customer, runner, platform].every((n) => Number.isFinite(n) && n >= 0)) {
    return null;
  }
  if (customer + runner + platform <= 0) return null;
  return { customer, runner, platform };
}

function orderIsEligible(order: StoredCollegeOrder): boolean {
  if (order.campus === "cityu") return false;
  const amount = Number(order.discountAmount ?? 0);
  if (!(amount >= MIN_CANTEEN_DISCOUNT)) return false;
  const split = storedSplit(order);
  if (!split) return false;
  if (!normalizeRunnerCollegeId(order.discountCollege)) return false;
  return true;
}

function fullFoodSubtotal(order: StoredCollegeOrder, split: DiscountSplit): number {
  if (order.estimatedSubtotal != null && order.estimatedSubtotal > 0) {
    return roundCollegeMoney(order.estimatedSubtotal);
  }
  const reduced =
    order.collegeDiscountStatus === "pending" ||
    order.collegeDiscountStatus === "applied" ||
    order.discountApplied === true;
  if (reduced) return roundCollegeMoney(order.subtotal + split.customer);
  return roundCollegeMoney(order.subtotal);
}

function totalFromFood(order: StoredCollegeOrder, food: number): number {
  return roundCollegeMoney(
    food +
      Number(order.deliveryFee || 0) +
      Number(order.tip || 0) +
      Number(order.platformFee || 0),
  );
}

/**
 * Apply or void the stored split when a runner accepts.
 * Uses the split saved on the order, never the client's numbers and never
 * a later change to canteen config.
 */
export function settleCollegeDiscountOnAccept(
  order: StoredCollegeOrder,
  runnerCollegeRaw: string | null | undefined,
): AcceptSettlement {
  const runnerCollege = normalizeRunnerCollegeId(runnerCollegeRaw);
  const split = storedSplit(order);
  const untouched: AcceptSettlement = {
    eligible: false,
    matching: false,
    discountApplied: Boolean(order.discountApplied),
    customerSavings: 0,
    runnerBonus: 0,
    platformDiscountFee: 0,
    subtotal: roundCollegeMoney(order.subtotal),
    total: roundCollegeMoney(order.total),
    collegeDiscountStatus: null,
    runnerCollege,
    notifyCustomer: null,
  };
  if (!orderIsEligible(order) || !split) return untouched;

  const matching = collegesMatch(order.discountCollege, runnerCollege);
  const food = fullFoodSubtotal(order, split);
  if (matching) {
    const subtotal = roundCollegeMoney(Math.max(0, food - split.customer));
    return {
      eligible: true,
      matching: true,
      discountApplied: true,
      customerSavings: split.customer,
      runnerBonus: split.runner,
      platformDiscountFee: split.platform,
      subtotal,
      total: totalFromFood(order, subtotal),
      collegeDiscountStatus: "applied",
      runnerCollege,
      notifyCustomer: null,
    };
  }

  return {
    eligible: true,
    matching: false,
    discountApplied: false,
    customerSavings: 0,
    runnerBonus: 0,
    platformDiscountFee: 0,
    subtotal: food,
    total: totalFromFood(order, food),
    collegeDiscountStatus: "void",
    runnerCollege,
    notifyCustomer: NO_MATCHING_RUNNER_MESSAGE,
  };
}

/** Cancel after a matching accept: the runner does not keep the bonus. */
export function collegeDiscountOnCancel(order: StoredCollegeOrder): {
  platformDiscountFee: 0;
  runnerBonus: number;
  clearFee: boolean;
} {
  const fee = Number(order.platformDiscountFee ?? 0);
  return {
    platformDiscountFee: 0,
    runnerBonus: 0,
    clearFee: fee > 0 || order.collegeDiscountStatus === "applied",
  };
}

export function runnerCollegeBonus(order: {
  status?: string | null;
  discountApplied?: boolean | null;
  platformDiscountFee?: number | null;
  discountSplit?: Partial<DiscountSplit> | null;
  campus?: string | null;
}): number {
  if (order.campus === "cityu") return 0;
  if (order.status === "cancelled") return 0;
  if (!order.discountApplied) return 0;
  if (!(Number(order.platformDiscountFee ?? 0) > 0)) return 0;
  const bonus = Number(order.discountSplit?.runner ?? 0);
  return Number.isFinite(bonus) && bonus > 0 ? bonus : 0;
}

export function customerCollegeSavingsView(order: StoredCollegeOrder): {
  show: boolean;
  amount: number;
  pending: boolean;
} {
  if (order.campus === "cityu") return { show: false, amount: 0, pending: false };
  if (order.collegeDiscountStatus === "void") {
    return { show: false, amount: 0, pending: false };
  }
  const split = storedSplit(order);
  if (split && order.collegeDiscountStatus === "applied" && order.discountApplied) {
    return { show: split.customer > 0, amount: split.customer, pending: false };
  }
  if (split && order.collegeDiscountStatus === "pending" && !order.discountApplied) {
    return { show: split.customer > 0, amount: split.customer, pending: true };
  }
  if (!split && order.discountApplied && Number(order.discountAmount) > 0) {
    return { show: true, amount: Number(order.discountAmount), pending: false };
  }
  return { show: false, amount: 0, pending: false };
}

export function orderMatchesRunnerCollege(
  order: { campus?: string | null; discountCollege?: string | null; discountAmount?: number | null; discountSplit?: Partial<DiscountSplit> | null },
  runnerCollegeRaw: string | null | undefined,
): boolean {
  if (order.campus === "cityu") return false;
  if (!(Number(order.discountAmount ?? 0) >= MIN_CANTEEN_DISCOUNT)) return false;
  if (!storedSplit(order as StoredCollegeOrder)) return false;
  return collegesMatch(order.discountCollege, runnerCollegeRaw);
}

export function sortOrdersForRunner<T extends {
  campus?: string | null;
  discountCollege?: string | null;
  discountAmount?: number | null;
  discountSplit?: Partial<DiscountSplit> | null;
  createdAt?: Date;
}>(orders: T[], runnerCollegeRaw: string | null | undefined): T[] {
  return [...orders].sort((a, b) => {
    const aMatch = orderMatchesRunnerCollege(a, runnerCollegeRaw) ? 0 : 1;
    const bMatch = orderMatchesRunnerCollege(b, runnerCollegeRaw) ? 0 : 1;
    if (aMatch !== bMatch) return aMatch - bMatch;
    const aTime = a.createdAt?.getTime() ?? 0;
    const bTime = b.createdAt?.getTime() ?? 0;
    return bTime - aTime;
  });
}

export function nonMatchingRunnerNote(restaurantId: string | null | undefined): string {
  return `Order from ${canteenShortName(restaurantId)}. No discount available for your college.`;
}

export function matchingRunnerBanner(collegeId: string | null | undefined): string {
  const name = runnerCollegeLabel(collegeId) || "Your college";
  return `${name}. Use your student card at the counter. You earn an extra HK$${COLLEGE_DISCOUNT_SPLIT.runner}.`;
}

export type RunnerCollegeAppeal = {
  requestedCollege: RunnerCollegeId;
  reason: string;
  submittedAt: string;
  status: "pending" | "approved" | "rejected";
};

/**
 * Client writes cannot change a locked college. Admin approval is the only
 * exception, and it does not rewrite orders already in flight.
 */
export function assertRunnerCollegeWrite(opts: {
  currentCollege: string | null | undefined;
  locked: boolean;
  nextCollege: string | null | undefined;
  viaAdminApproval: boolean;
}): { ok: true; college: RunnerCollegeId } | { ok: false; error: string } {
  const next = normalizeRunnerCollegeId(opts.nextCollege);
  if (!next) return { ok: false, error: "Choose a college." };
  if (!opts.locked) return { ok: true, college: next };
  if (opts.viaAdminApproval) return { ok: true, college: next };
  const current = normalizeRunnerCollegeId(opts.currentCollege);
  if (current && current === next) return { ok: true, college: next };
  return {
    ok: false,
    error: "Your college is permanent. Appeal to GraceRun to change it.",
  };
}

export function appealReasonOk(reason: string): boolean {
  return reason.trim().length >= 20;
}
