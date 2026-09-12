import type { Order } from "./types";

/** TODO: Replace with Firestore query once Firebase is wired up */
export const MOCK_ORDERS: Order[] = [
  {
    id: "FE-1001",
    sessionId: "demo-session",
    customerId: "1155123456",
    customerName: "Demo Customer",
    items: [
      { itemId: "indomie-goreng", name: "Indomie Mi Goreng", price: 8, quantity: 2 },
      { itemId: "coke-can", name: "Coca-Cola Can", price: 6, quantity: 1 },
    ],
    status: "assigned",
    college: "Shaw College",
    hall: "Sun Chui",
    roomNumber: "301",
    lobbyPoint: "Sun Chui lobby",
    subtotal: 22,
    deliveryFee: 10,
    total: 32,
    paymentReceived: false,
    runnerId: "demo-runner",
    runnerName: "Alex",
    createdAt: new Date("2026-08-14T09:30:00"),
    updatedAt: new Date("2026-08-14T09:45:00"),
  },
  {
    id: "FE-1002",
    sessionId: "demo-session-2",
    customerId: "1155987654",
    customerName: "Jamie Lee",
    items: [
      { itemId: "nissin-cup-curry", name: "Nissin Cup Noodles Curry", price: 9, quantity: 3 },
      { itemId: "lays-classic", name: "Lays Classic Potato Chips", price: 12, quantity: 1 },
    ],
    status: "pending",
    college: "United College",
    hall: "Adam Schall",
    roomNumber: "205",
    lobbyPoint: "Adam Schall lobby",
    subtotal: 39,
    deliveryFee: 10,
    total: 49,
    paymentReceived: false,
    createdAt: new Date("2026-08-14T10:15:00"),
    updatedAt: new Date("2026-08-14T10:15:00"),
  },
  {
    id: "FE-1003",
    sessionId: "demo-session-3",
    customerId: "1155111222",
    customerName: "Chris Wong",
    items: [
      { itemId: "pocari-sweat", name: "Pocari Sweat 500ml", price: 9, quantity: 2 },
      { itemId: "oreo-original", name: "Oreo Original", price: 14, quantity: 1 },
    ],
    status: "pending",
    college: "Chung Chi College",
    hall: "Ming Hua",
    roomNumber: "108",
    lobbyPoint: "Ming Hua lobby",
    subtotal: 32,
    deliveryFee: 10,
    total: 42,
    paymentReceived: false,
    createdAt: new Date("2026-08-14T11:00:00"),
    updatedAt: new Date("2026-08-14T11:00:00"),
  },
  {
    id: "FE-1004",
    sessionId: "demo-session-4",
    customerId: "1155333444",
    customerName: "Sam Ng",
    items: [
      { itemId: "samyang-2x", name: "Samyang 2x Spicy Ramen", price: 15, quantity: 1 },
    ],
    status: "picked",
    college: "New Asia College",
    hall: "Ch'ien Mu",
    roomNumber: "401",
    lobbyPoint: "Ch'ien Mu lobby",
    subtotal: 15,
    deliveryFee: 10,
    total: 25,
    paymentReceived: false,
    runnerId: "demo-runner",
    runnerName: "Jamie",
    createdAt: new Date("2026-08-14T08:00:00"),
    updatedAt: new Date("2026-08-14T08:40:00"),
    pickedUpAt: new Date("2026-08-14T08:40:00"),
  },
  {
    // Recently delivered and awaiting payment — used to demo the "Pay GraceRun
    // now" flow and the 24-hour payment countdown. Delivered ~2h ago so the
    // payment is still within the 24-hour window.
    id: "FE-1005",
    sessionId: "demo-session-5",
    customerId: "1155123456",
    customerName: "Demo Customer",
    items: [
      { itemId: "shin-ramyun", name: "Shin Ramyun", price: 12.5, quantity: 2 },
      { itemId: "pocari-sweat", name: "Pocari Sweat 500ml", price: 9, quantity: 1 },
    ],
    status: "delivered",
    college: "Shaw College",
    hall: "Sun Chui",
    roomNumber: "512",
    lobbyPoint: "Sun Chui lobby",
    subtotal: 34,
    deliveryFee: 10,
    total: 44,
    paymentReceived: false,
    runnerId: "demo-runner",
    runnerName: "Alex",
    createdAt: new Date(Date.now() - 3 * 60 * 60 * 1000),
    updatedAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
    pickedUpAt: new Date(Date.now() - 2.5 * 60 * 60 * 1000),
    deliveredAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
    tillPricesSubmittedAt: new Date(Date.now() - 2.2 * 60 * 60 * 1000),
  },
];

export function getMockOrderById(orderId: string): Order | undefined {
  return MOCK_ORDERS.find(
    (o) => o.id.toLowerCase() === orderId.trim().toLowerCase(),
  );
}

export function getMockPendingOrders(): Order[] {
  return MOCK_ORDERS.filter((o) => o.status === "pending");
}

export function getMockRunnerOrders(
  runnerId: string,
  deliveredOnly = false,
): Order[] {
  return MOCK_ORDERS.filter((o) => {
    if (o.runnerId !== runnerId) return false;
    if (deliveredOnly) return o.status === "delivered";
    return o.status === "assigned" || o.status === "picked";
  });
}

export function getMockActiveOrders(): Order[] {
  return MOCK_ORDERS.filter((o) =>
    ["assigned", "picked"].includes(o.status),
  );
}

/** TODO: Replace with Firestore write */
export function addMockOrder(order: Order): void {
  MOCK_ORDERS.unshift(order);
}
