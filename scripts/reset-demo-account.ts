/**
 * Clear demo activity. Keeps Auth + the users/{uid} profile.
 *
 *   npx tsx scripts/reset-demo-account.ts
 */
import { FieldValue } from "firebase-admin/firestore";
import { DEMO_EMAIL, getDemoUser } from "./demo-account-shared";

async function deleteQuery(label: string, snap: FirebaseFirestore.QuerySnapshot) {
  if (snap.empty) {
    console.log(`  ${label}: 0`);
    return;
  }
  const batch = snap.docs[0]!.ref.firestore.batch();
  for (const doc of snap.docs) batch.delete(doc.ref);
  await batch.commit();
  console.log(`  ${label}: ${snap.size}`);
}

async function main() {
  const { db, uid } = await getDemoUser();
  console.log(`Resetting demo ${DEMO_EMAIL} (${uid})`);

  const orders = await db.collection("orders").where("customerId", "==", uid).get();
  const orderIds = orders.docs.map((doc) => doc.id);
  await deleteQuery("orders", orders);

  for (const orderId of orderIds) {
    const messages = await db.collection("chats").doc(orderId).collection("messages").get();
    if (!messages.empty) {
      const batch = db.batch();
      for (const doc of messages.docs) batch.delete(doc.ref);
      await batch.commit();
    }
    await db.collection("chats").doc(orderId).delete().catch(() => undefined);
  }
  console.log(`  order chats: ${orderIds.length}`);

  const dms = await db.collection("messages").where("userId", "==", uid).get();
  await deleteQuery("direct messages", dms);

  await db.collection("users").doc(uid).set(
    {
      favorites: FieldValue.delete(),
      updatedAt: FieldValue.serverTimestamp(),
    },
    { merge: true },
  );
  console.log("  favorites: cleared");
  console.log("Account kept. Sign in again with the same email/password.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
