import type { OrderStatus } from "./order-status";
import type { CampusId } from "./campus";

export type { CampusId };

export const MENU_CATEGORIES = [
  "seasonings",
  "tea",
  "toiletries",
  "instant-noodles",
  "condiments",
  "household",
  "canned-goods",
  "sauces",
  "rice-noodles",
  "chips",
  "pickles",
  "crackers",
  "biscuits",
  "cleaning-supplies",
  "snacks",
  "other",
  // legacy / fresh-food placeholders kept for older Firestore docs
  "instant-meals",
  "bread",
  "meat",
  "seafood",
  "tofu-protein",
  "fruit-veg",
  "dairy-eggs",
  "frozen",
  "drinks",
  "coffee-tea",
  "household-essentials",
  "salads",
  "chilled-drinks",
] as const;

export type MenuCategory = (typeof MENU_CATEGORIES)[number];

export const CATEGORY_LABELS: Record<MenuCategory, string> = {
  seasonings: "Seasonings",
  tea: "Tea",
  toiletries: "Toiletries",
  "instant-noodles": "Instant Noodles",
  condiments: "Condiments",
  household: "Household",
  "canned-goods": "Canned Goods",
  sauces: "Sauces",
  "rice-noodles": "Rice & Noodles",
  chips: "Chips",
  pickles: "Pickles",
  crackers: "Crackers",
  biscuits: "Biscuits",
  "cleaning-supplies": "Cleaning Supplies",
  snacks: "Snacks",
  other: "Other",
  "instant-meals": "Instant Meals",
  bread: "Bread & Bakery",
  meat: "Meat",
  seafood: "Seafood",
  "tofu-protein": "Tofu & Protein",
  "fruit-veg": "Fruit & Vegetables",
  "dairy-eggs": "Dairy & Eggs",
  frozen: "Frozen",
  drinks: "Drinks",
  "coffee-tea": "Coffee & Tea",
  "household-essentials": "Household Essentials",
  salads: "Salads",
  "chilled-drinks": "Chilled Drinks",
};

/** Fresh Food aisle ids. Populated when Excel includes Fresh Food Sub-Categories. */
export const REFRIGERATED_CATEGORIES = new Set<string>([]);

export function isRefrigeratedCategory(category: string): boolean {
  return REFRIGERATED_CATEGORIES.has(category);
}

export function categoryLabel(category: string): string {
  if (category in CATEGORY_LABELS) {
    return CATEGORY_LABELS[category as MenuCategory];
  }
  return category
    .split(/[-_]/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

export type PriceType = "fixed" | "variable" | "range";

/** Pantry vs chilled store area (Excel top-level Category). */
export type StoreSection = "refrigerated" | "dry";

export interface MenuItem {
  id: string;
  name: string;
  category: string;
  /** Excel Category: Groceries → dry, Fresh Food → refrigerated. */
  storeSection?: StoreSection;
  /** Campus this SKU belongs to (CUHK Fusion vs CityU Taste). */
  campus?: CampusId;
  price: number;
  salePrice?: number;
  bulkDealQty?: number;
  bulkDealPrice?: number;
  unit: string;
  image?: string;
  priceType: PriceType;
  priceRange?: string;
  runnerInputsPrice: boolean;
  itemNote?: string;
  inStock: boolean;
  sortOrder: number;
  weightKg: number;
  subcategory?: string;
}

export interface CartItem {
  item: MenuItem;
  quantity: number;
}

export type { OrderStatus };
export {
  ORDER_STATUSES,
  ORDER_STATUS_LABELS,
  RUNNER_EARNINGS_RATE,
  runnerEarningsForOrder,
  runnerEarningsFromOrder,
  orderTipTotal,
  TRACKING_STEPS,
  getStepIndex,
  normalizeOrderStatus,
  isActiveRunnerStatus,
  isActiveCustomerOrderStatus,
  countsTowardCustomerOrderPlacementCap,
  MAX_ACTIVE_CUSTOMER_ORDERS,
  ACTIVE_ORDER_LIMIT_MESSAGE,
  formatOrderPlacedAt,
  groceryAmountDue,
  hasConfirmedGroceryTotal,
  customerAmountDue,
  runnerReimburseTotal,
  adminPayoutLabel,
  runnerPayoutPending,
  runnerPayoutPaid,
  summarizeRunnerPayouts,
  CUSTOMER_PAY_WINDOW_MS,
  CUSTOMER_PAY_REMINDER_MS,
  RUNNER_DELIVERY_WINDOW_MS,
  RUNNER_DEADLINE_REMINDER_MS,
  CUSTOMER_DEADLINE_REMINDER_MS,
  RUNNER_DEADLINE_WARNING,
  EXPIRED_DELIVERIES_NOTICE,
  CUSTOMER_DEADLINE_WARNING,
  formatRemaining,
  runnerDeadlineOf,
  customerDeadlineOf,
  isRunnerDeliveryOpen,
  isRunnerHoldStatus,
  isRunnerDeliveryExpired,
  runnerExpiredAtOf,
  formatExpiredAgo,
  runnerWarningTotal,
  isCustomerPaymentOpen,
  isClaimableOrderStatus,
  canCustomerCancelOrder,
  isTestOrder,
  isVisibleOnRunnerBoard,
} from "./order-status";


export interface OrderItem {
  itemId: string;
  name: string;
  price: number;
  quantity: number;
  weightKg?: number;
  /** Unit price at the Fusion till. */
  actualPrice?: number;
  /** Customer-typed item not in the catalog (runner confirms price). */
  isCustom?: boolean;
}

export type PriceAdjustmentStatus =
  | "none"
  | "pending_customer"
  | "approved"
  | "refund_pending"
  | "refunded";

export interface RunnerLocation {
  lat: number;
  lng: number;
  updatedAt: Date;
}

export type OrderChannel = "fusion" | "taste" | "canteen";

export interface Order {
  id: string;
  sessionId: string;
  customerId: string;
  customerName?: string;
  /**
   * Stored on the order so status emails do not need to read the customer's
   * /users doc, which only the customer themselves may read.
   */
  customerEmail?: string;
  /**
   * Customer mobile stamped only when they opted in to share with the runner
   * (`sharePhoneWithRunner` on their profile). Absent = no Call / WhatsApp.
   */
  customerPhone?: string;
  /**
   * When the assigned runner tapped "I'm at lobby". Drives the customer
   * track banner + push; cleared from active UI once the order is delivered.
   */
  lobbyArrivedAt?: Date;
  /** Cute avatar stamped at place-order (runners cannot read /users). */
  customerAvatarId?: string;
  /**
   * Real photo URL only when the customer opted in to show it to runners.
   * Absent means runners should render customerAvatarId instead.
   */
  customerPhotoURL?: string;
  /** University campus that owns this order (CUHK vs CityU). */
  campus?: CampusId;
  /** Storefront channel that placed the order (grocery vs campus canteen). */
  orderChannel?: OrderChannel;
  /** Canteen restaurant slug (e.g. uc-canteen) when orderChannel is canteen. */
  canteenRestaurantId?: string;
  items: OrderItem[];
  status: OrderStatus;
  /** CUHK college or CityU compound. */
  college: string;
  hall: string;
  roomNumber?: string;
  lobbyPoint: string;
  zone?: 1 | 2 | 3;
  totalWeight?: number;
  customerNote?: string;
  runnerNote?: string;
  subtotal: number;
  deliveryFee: number;
  /**
   * Flat GraceRun platform fee (HK$) charged on this order.
   * Missing on legacy orders — treat as 0.
   */
  platformFee?: number;
  tip?: number;
  total: number;
  /** True when a same-college runner unlocked the 10% canteen food discount. */
  discountApplied?: boolean;
  /** HK$ amount subtracted from canteen food subtotal (not delivery). */
  discountAmount?: number;
  /** Normalized college id of the assigned runner (e.g. UC). */
  runnerCollege?: string;
  /** Normalized college id of the canteen (e.g. UC). */
  canteenCollege?: string;
  paymentReceived: boolean;
  /**
   * Extra HKD when runner marks a bag over 5 kg as heavy.
   * Added on top of deliveryFee for customer + runner earnings.
   */
  heavyBagSurcharge?: number;
  paymentMethod?: "PayMe" | "FPS";
  /** Online checkout provider (e.g. airwallex). */
  paymentProvider?: "airwallex" | string;
  /** True while the customer still owes Airwallex for this order. */
  awaitingOnlinePayment?: boolean;
  airwallexPaymentIntentId?: string;
  airwallexPaidAmount?: number;
  airwallexPaidCurrency?: string;
  /** Grocery receipt total the runner spent at Fusion. */
  finalTotal?: number;
  amountPaidByRunner?: number;
  receiptUrl?: string;
  /** Customer FPS transfer screenshot (pending admin confirmation). */
  fpsReceiptUrl?: string;
  bankStatementUrl?: string;
  customerNameOnReceipt?: boolean;
  runnerVerified?: boolean;
  adminVerified?: boolean;
  customerPaidAt?: Date;
  runnerPaidAt?: Date;
  /** Admin-uploaded bank/FPS transfer proof shown to the runner. */
  runnerPayoutProofUrl?: string;
  runnerEmail?: string;
  acceptedAt?: Date;
  purchasedAt?: Date;
  runnerPaymentMethod?: "PayMe" | "FPS";
  runnerPaymentId?: string;
  /** Doc id in /runners. */
  runnerId?: string;
  /**
   * Auth uid of the runner. Security rules compare this to request.auth.uid,
   * which runnerId cannot do, so runner queries filter on this field.
   */
  runnerUid?: string;
  runnerName?: string;
  /** Student ID stamped at accept for lobby pickup verification. */
  runnerStudentId?: string;
  /** Cute avatar for the runner (fallback when no real photo). */
  runnerAvatarId?: string;
  /** Runner real photo URL when set — always shown to the customer on track. */
  runnerPhotoURL?: string;
  /** @deprecated Prefer `rating` — kept in sync for older clients. */
  runnerRating?: number;
  /** Customer 1–5 star rating after delivery. */
  rating?: number;
  /** Optional free-text feedback with the rating. */
  feedback?: string;
  /** When the customer submitted the rating. */
  ratedAt?: Date;
  /**
   * Optional tip (HK$) added after delivery via the rating form.
   * Checkout tip remains on `tip`; earnings use both.
   */
  tipAmount?: number;
  /** When the post-delivery tip was recorded. */
  tippedAt?: Date;
  deliveryPhotoUrl?: string;
  estimatedDeliveryAt?: Date;
  /** When true, runners may accept now but shop only near scheduledFor. */
  isScheduled?: boolean;
  /** Customer-chosen delivery window (Hong Kong local). */
  scheduledFor?: Date;
  createdAt: Date;
  updatedAt: Date;
  pickedUpAt?: Date;
  deliveredAt?: Date;
  runnerDeadline?: Date;
  customerDeadline?: Date;
  runnerWarningCount?: number;
  customerWarningCount?: number;
  runnerExpiredAt?: Date;
  customerOverdueAt?: Date;
  runnerReminderSentAt?: Date;
  customerReminderSentAt?: Date;
  adminMissedNotifiedAt?: Date;
  lastEscalatedAt?: Date;
  /** Original app subtotal before till prices. */
  estimatedSubtotal?: number;
  actualSubtotal?: number;
  priceDifference?: number;
  priceAdjustmentStatus?: PriceAdjustmentStatus;
  refundAmount?: number;
  refundedAt?: Date;
  tillPricesSubmittedAt?: Date;
  customerApprovedPriceAt?: Date;
  fusionPaidByPlatform?: boolean;
  runnerLocation?: RunnerLocation;
  /** Admin-only test checkout — real order doc, no community notifications. */
  isTest?: boolean;
}

export interface Runner {
  id: string;
  uid?: string;
  fullName: string;
  studentId: string;
  phone: string;
  college: string;
  hall: string;
  paymentMethod: "PayMe" | "FPS";
  paymentId: string;
  termsAcceptedAt: Date;
  active: boolean;
  totalEarned: number;
  pendingPayout: number;
  payoutHistory: RunnerPayout[];
}

export interface RunnerPayout {
  orderId: string;
  amount: number;
  paidAt: Date;
  /** Admin bank/FPS transfer proof URL when available. */
  proofUrl?: string;
}

export interface ChatMessage {
  id: string;
  orderId: string;
  senderId: string;
  senderName: string;
  message: string;
  timestamp: Date;
  imageUrl?: string;
  mediaType?: "image" | "video";
}

export interface RunnerRegistrationInput {
  uid?: string;
  fullName: string;
  studentId: string;
  phone: string;
  college: string;
  hall: string;
  paymentMethod: "PayMe" | "FPS";
  paymentId: string;
}

export { BASE_DELIVERY_FEE as DELIVERY_FEE } from "./delivery";

export function formatMenuPrice(item: MenuItem): string {
  if (item.priceType !== "fixed" && item.priceRange) {
    return item.priceRange;
  }
  if (item.priceType === "variable") {
    return `~$${item.price}`;
  }
  if (item.salePrice != null && item.salePrice < item.price) {
    return `$${item.salePrice}`;
  }
  return `$${item.price}`;
}
