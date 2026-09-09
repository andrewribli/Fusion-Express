import type { OrderStatus } from "./order-status";

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
  TRACKING_STEPS,
  getStepIndex,
  normalizeOrderStatus,
} from "./order-status";


export interface OrderItem {
  itemId: string;
  name: string;
  price: number;
  quantity: number;
  weightKg?: number;
  /** Unit price at the Fusion till. */
  actualPrice?: number;
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
  items: OrderItem[];
  status: OrderStatus;
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
  tip?: number;
  total: number;
  paymentReceived: boolean;
  paymentMethod?: "PayMe" | "FPS";
  /** Doc id in /runners. */
  runnerId?: string;
  /**
   * Auth uid of the runner. Security rules compare this to request.auth.uid,
   * which runnerId cannot do, so runner queries filter on this field.
   */
  runnerUid?: string;
  runnerName?: string;
  runnerRating?: number;
  deliveryPhotoUrl?: string;
  estimatedDeliveryAt?: Date;
  createdAt: Date;
  updatedAt: Date;
  pickedUpAt?: Date;
  deliveredAt?: Date;
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
}

export interface ChatMessage {
  id: string;
  orderId: string;
  senderId: string;
  senderName: string;
  message: string;
  timestamp: Date;
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
