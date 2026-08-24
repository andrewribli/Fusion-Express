import type { OrderStatus } from "./order-status";

export const MENU_CATEGORIES = [
  "instant-noodles",
  "instant-meals",
  "bread",
  "rice-noodles",
  "meat",
  "seafood",
  "tofu-protein",
  "fruit-veg",
  "dairy-eggs",
  "frozen",
  "drinks",
  "coffee-tea",
  "snacks",
  "condiments",
  "toiletries",
] as const;

export type MenuCategory = (typeof MENU_CATEGORIES)[number];

export const CATEGORY_LABELS: Record<MenuCategory, string> = {
  "instant-noodles": "Instant Noodles",
  "instant-meals": "Instant Meals",
  bread: "Bread & Bakery",
  "rice-noodles": "Rice & Noodles",
  meat: "Meat",
  seafood: "Seafood",
  "tofu-protein": "Tofu & Protein",
  "fruit-veg": "Fruit & Vegetables",
  "dairy-eggs": "Dairy & Eggs",
  frozen: "Frozen",
  drinks: "Drinks",
  "coffee-tea": "Coffee & Tea",
  snacks: "Snacks",
  condiments: "Condiments",
  toiletries: "Toiletries",
};

export type PriceType = "fixed" | "variable" | "range";

export interface MenuItem {
  id: string;
  name: string;
  category: MenuCategory;
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
}

export interface Order {
  id: string;
  sessionId: string;
  customerId: string;
  customerName?: string;
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
  runnerId?: string;
  runnerName?: string;
  runnerRating?: number;
  deliveryPhotoUrl?: string;
  estimatedDeliveryAt?: Date;
  createdAt: Date;
  updatedAt: Date;
  pickedUpAt?: Date;
  deliveredAt?: Date;
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
