import { isChatActive } from "@fusion-express/shared";
import { collectionName } from "@/lib/constants";
import {
  fetchOrderForEmailRest,
  getAdminDocumentRest,
  listRunnerPushTokensRest,
  pushTokensFromUser,
  type RestAuthed,
} from "@/lib/firestore-rest";

type PushEvent = "created" | "accepted" | "chat";

type ExpoMessage = {
  to: string;
  title: string;
  body: string;
  sound: "default";
  channelId: "orders";
  data: { orderId: string; type: string };
};

async function tokensForUid(uid: string): Promise<string[]> {
  if (!uid) return [];
  const doc = await getAdminDocumentRest(collectionName("users"), uid);
  return pushTokensFromUser(doc);
}

async function runnerTokensExcept(skipUid: string): Promise<string[]> {
  const rows = await listRunnerPushTokensRest();
  const found = new Set<string>();
  for (const row of rows) {
    if (row.uid === skipUid) continue;
    for (const token of row.tokens) found.add(token);
  }
  return [...found];
}

async function sendExpo(messages: ExpoMessage[]): Promise<number> {
  if (messages.length === 0) return 0;
  const res = await fetch("https://exp.host/--/api/v2/push/send", {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify(messages),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Expo push failed (${res.status}): ${text.slice(0, 180)}`);
  }
  return messages.length;
}

export async function dispatchOrderPush(opts: {
  auth: RestAuthed;
  orderId: string;
  event: PushEvent;
  preview?: string;
}): Promise<number> {
  const order = await fetchOrderForEmailRest(opts.orderId);
  if (!order) throw new Error("Order not found");

  const preview = (opts.preview ?? "").replace(/\s+/g, " ").trim().slice(0, 80);
  let tokens: string[] = [];
  let title = "GraceRun";
  let body = "";
  let type = "order_created";

  if (opts.event === "created") {
    if (opts.auth.uid !== order.customerId) {
      throw new Error("Not allowed for this order.");
    }
    if (order.status !== "pending" && order.status !== "paid") {
      return 0;
    }
    // Never notify the customer who just placed the order (incl. runner-customers).
    const [runnerTokens, customerTokens] = await Promise.all([
      runnerTokensExcept(order.customerId),
      tokensForUid(order.customerId),
    ]);
    const customerTokenSet = new Set(customerTokens);
    tokens = runnerTokens.filter((t) => !customerTokenSet.has(t));
    title = "New GraceRun order";
    body = `${order.deliveryLocation || "Campus"} · $${order.total || "?"}`;
    type = "order_created";
  } else if (opts.event === "accepted") {
    if (opts.auth.uid !== order.runnerUid) {
      throw new Error("Not allowed for this order.");
    }
    if (order.status !== "accepted" && order.status !== "assigned") return 0;
    tokens = await tokensForUid(order.customerId);
    title = "Runner accepted your order";
    body = order.runnerName
      ? `${order.runnerName} is picking up your GraceRun order.`
      : "A runner is picking up your GraceRun order.";
    type = "order_accepted";
  } else {
    const isCustomer = opts.auth.uid === order.customerId;
    const isRunner = opts.auth.uid === order.runnerUid;
    if (!isCustomer && !isRunner) throw new Error("Not allowed for this order.");
    if (!isChatActive(order.status)) return 0;
    const target = isCustomer ? order.runnerUid : order.customerId;
    tokens = await tokensForUid(target);
    title = "New GraceRun message";
    body = preview || "Open the order to read the chat.";
    type = "chat";
  }

  const messages: ExpoMessage[] = tokens.slice(0, 40).map((to) => ({
    to,
    title,
    body,
    sound: "default",
    channelId: "orders",
    data: { orderId: order.id, type },
  }));
  return sendExpo(messages);
}
