/**
 * Optional seeded history for the demo account. Marked isSeed: true
 * and hidden from the customer order list.
 *
 *   npx tsx scripts/seed-demo-orders.ts
 */
import { Timestamp } from "firebase-admin/firestore";
import { DEMO_EMAIL, DEMO_FULL_NAME, getDemoUser } from "./demo-account-shared";

function daysAgo(days: number): Date {
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000);
}

async function main() {
  const { db, uid } = await getDemoUser();
  const existing = await db
    .collection("orders")
    .where("customerId", "==", uid)
    .where("isSeed", "==", true)
    .get();
  if (!existing.empty) {
    const batch = db.batch();
    for (const doc of existing.docs) batch.delete(doc.ref);
    await batch.commit();
    console.log(`Cleared ${existing.size} previous seed orders`);
  }

  const seeds = [
    {
      restaurant: "paper-and-coffee",
      sourceId: "paper-and-coffee",
      items: [
        { itemId: "latte", name: "Latte", price: 32, quantity: 1 },
        { itemId: "long-black", name: "Long Black", price: 27, quantity: 1 },
      ],
      deliveryMode: "leave_at_door" as const,
      createdAt: daysAgo(3),
    },
    {
      restaurant: "sorazen",
      sourceId: "sorazen",
      items: [
        {
          itemId: "classic-breakfast-chicken",
          name: "Classic Breakfast (Chicken)",
          price: 38,
          quantity: 1,
        },
      ],
      deliveryMode: "face_to_face" as const,
      createdAt: daysAgo(12),
    },
    {
      restaurant: "uc-canteen",
      sourceId: "uc-canteen",
      items: [
        {
          itemId: "uc-box-chicken-spam",
          name: "Chicken Steak & Luncheon Meat Rice",
          price: 39,
          quantity: 1,
        },
      ],
      deliveryMode: "leave_at_door" as const,
      createdAt: daysAgo(21),
    },
    {
      restaurant: "paper-and-coffee",
      sourceId: "paper-and-coffee",
      items: [{ itemId: "espresso-single", name: "Espresso (Single)", price: 23, quantity: 2 }],
      deliveryMode: "face_to_face" as const,
      createdAt: daysAgo(28),
    },
  ];

  for (const seed of seeds) {
    const subtotal = seed.items.reduce((sum, item) => sum + item.price * item.quantity, 0);
    const deliveryFee = 10;
    const platformFee = 1.5;
    const total = subtotal + deliveryFee + platformFee;
    const createdAt = Timestamp.fromDate(seed.createdAt);
    await db.collection("orders").add({
      sessionId: uid,
      customerId: uid,
      customerName: DEMO_FULL_NAME,
      customerEmail: DEMO_EMAIL,
      campus: "cuhk",
      orderChannel: "canteen",
      canteenRestaurantId: seed.restaurant,
      sourceId: seed.sourceId,
      items: seed.items,
      status: "completed",
      college: "United College",
      hall: "Adam Schall Residence",
      lobbyPoint: "Lobby",
      subtotal,
      deliveryFee,
      deliveryTotal: deliveryFee,
      platformFee,
      total,
      paymentReceived: true,
      deliveryMode: seed.deliveryMode,
      isSeed: true,
      createdAt,
      updatedAt: createdAt,
      deliveredAt: createdAt,
    });
    console.log(
      `Seeded ${seed.restaurant} ${seed.deliveryMode} HK$${total} (${seed.createdAt.toISOString().slice(0, 10)})`,
    );
  }
  console.log(`Done. ${seeds.length} seed orders for ${DEMO_EMAIL} (${uid})`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
