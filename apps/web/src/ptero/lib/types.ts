import type { CampusId } from "@/ptero/config/campus";
import type { CollegeId } from "@/ptero/config/canteen/colleges";
import type { RestaurantId } from "@/ptero/config/canteen/restaurants";

export type OrderChannel = "taste" | "wellcome" | "canteen";

export const ORDER_STATUSES = [
  "pending",
  "accepted",
  "purchased",
  "receipt_uploaded",
  "delivered",
  "paid",
  "cancelled",
] as const;

export type OrderStatus = (typeof ORDER_STATUSES)[number];

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  pending: "Waiting for a runner",
  accepted: "Runner accepted",
  purchased: "Bought at the store",
  receipt_uploaded: "Receipt uploaded",
  delivered: "Delivered to lobby",
  paid: "Paid",
  cancelled: "Cancelled",
};

export const TRACKING_STEPS: { status: OrderStatus; label: string }[] = [
  { status: "pending", label: "Placed" },
  { status: "accepted", label: "Accepted" },
  { status: "purchased", label: "Purchased" },
  { status: "receipt_uploaded", label: "Receipt" },
  { status: "delivered", label: "Delivered" },
  { status: "paid", label: "Paid" },
];

export function getStepIndex(status: OrderStatus): number {
  const idx = TRACKING_STEPS.findIndex((s) => s.status === status);
  return idx === -1 ? 0 : idx;
}

export type PriceType = "fixed" | "variable" | "range";

export interface MenuItem {
  id: string;
  /** Future multi-campus catalog key. */
  campus: CampusId;
  name: string;
  category: string;
  price: number;
  salePrice?: number;
  unit: string;
  image?: string;
  description?: string;
  priceType: PriceType;
  runnerInputsPrice: boolean;
  inStock: boolean;
  sortOrder: number;
  weightKg: number;
  /** Set for canteen cart lines (`canteen:{restaurant}:{item}`). */
  restaurantId?: RestaurantId | string;
  restaurantName?: string;
  /** CityU grocery store this line belongs to. */
  grocerySource?: "taste" | "wellcome";
}

export interface CartItem {
  item: MenuItem;
  quantity: number;
}

export interface OrderItem {
  itemId: string;
  name: string;
  price: number;
  quantity: number;
  weightKg?: number;
  image?: string;
}

export type AppMode = "customer" | "runner";

export interface AppUser {
  uid: string;
  campus: CampusId;
  name: string;
  email: string | null;
  /** Runners only. Customers never provide a phone number. */
  phone?: string;
  /**
   * Runners only — CityU residence affiliation for canteen discount matching.
   * Same role as CUHK `college` on runner profiles.
   */
  college?: CollegeId | null;
  isGuest: boolean;
  isRunner: boolean;
  /** Doc id in /runners when registered on Firestore (CUHK parity). */
  runnerDocId?: string;
  passwordHash?: string;
}

export interface Order {
  id: string;
  campus: CampusId;
  /** taste = supermarket; canteen = CityU canteens. Mirrors CUHK fusion|canteen. */
  orderChannel?: OrderChannel;
  grocerySource?: "taste" | "wellcome";
  pickupLocation?: string;
  canteenRestaurantId?: string;
  canteenCollege?: CollegeId | null;
  sessionId: string;
  customerId: string;
  customerName: string;
  customerEmail?: string;
  items: OrderItem[];
  status: OrderStatus;
  compound: string;
  hall: string;
  lobby: string;
  customerNote: string;
  subtotal: number;
  deliveryFee: number;
  tip: number;
  /** Exact Taste till total entered by the runner. */
  receiptTotal?: number;
  runnerId?: string;
  runnerName?: string;
  runnerPhone?: string;
  runnerCollege?: CollegeId | null;
  discountApplied?: boolean;
  discountAmount?: number;
  createdAt: string;
  paidAt?: string;
  paidVia?: "airwallex";
}

export type CustomerNotificationType =
  | "discount_received"
  | "order_update"
  | "general";

export interface CustomerNotification {
  id: string;
  userId: string;
  type: CustomerNotificationType;
  title: string;
  body: string;
  orderId?: string;
  href?: string;
  accent?: "gold" | "green" | "red";
  read: boolean;
  createdAt: string;
  /** Prototype email mirror of the notify payload. */
  emailSubject?: string;
  emailTo?: string;
}

export function formatHkd(amount: number): string {
  return `HK$${amount.toFixed(2)}`;
}

export function formatMenuPrice(item: MenuItem): string {
  return formatHkd(item.salePrice ?? item.price);
}

export function groceryAmountDue(order: Order): number {
  const food = order.receiptTotal ?? order.subtotal;
  const discount = order.discountApplied ? order.discountAmount ?? 0 : 0;
  return Math.max(0, food - discount);
}

export function customerAmountDue(order: Order): number {
  return groceryAmountDue(order) + order.deliveryFee + order.tip;
}

export function resolveOrderChannel(order: Order): OrderChannel {
  if (order.orderChannel) return order.orderChannel;
  if (order.items.some((i) => i.itemId.startsWith("canteen:"))) return "canteen";
  return "taste";
}
