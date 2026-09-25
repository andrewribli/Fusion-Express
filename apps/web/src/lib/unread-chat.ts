/** How long the other person must leave a chat unopened before we email. */
export const UNREAD_CHAT_DELAY_MS = 5 * 60 * 1000;

export type ChatParty = "customer" | "runner";

export type UnreadMessage = {
  id: string;
  senderId: string;
  senderRole?: string;
  timestampMs: number;
};

export type OrderParties = {
  customerId?: string;
  runnerUid?: string;
  runnerId?: string;
};

/** Burst ids already emailed, stored on the chat parent document. */
export type NotifiedBursts = {
  customerBurstId?: string;
  runnerBurstId?: string;
};

export type ReadyBurst = {
  recipient: ChatParty;
  /** Oldest still-unseen message. Stable until that message is opened. */
  burstId: string;
  count: number;
};

/**
 * Who should be emailed about this message.
 * Role wins when it is set. Admin messages are not order-party mail.
 */
export function recipientForMessage(
  message: UnreadMessage,
  order: OrderParties,
): ChatParty | null {
  const role = message.senderRole;
  if (role === "admin") return null;
  if (role === "customer") return "runner";
  if (role === "runner") return "customer";
  const id = message.senderId;
  if (!id) return null;
  if (order.customerId && id === order.customerId) return "runner";
  if (order.runnerUid && id === order.runnerUid) return "customer";
  if (order.runnerId && id === order.runnerId) return "customer";
  return null;
}

/**
 * One email per unread burst: every unseen message that shares the same
 * oldest unopened message is the same burst. A new email waits until that
 * oldest message is marked seen and a later one sits unread for 5 minutes.
 */
export function selectUnreadBursts(opts: {
  messages: UnreadMessage[];
  order: OrderParties;
  notified: NotifiedBursts;
  nowMs: number;
  delayMs?: number;
}): ReadyBurst[] {
  const delay = opts.delayMs ?? UNREAD_CHAT_DELAY_MS;
  const cutoff = opts.nowMs - delay;
  const groups = new Map<ChatParty, UnreadMessage[]>();

  for (const message of opts.messages) {
    if (!Number.isFinite(message.timestampMs) || message.timestampMs > cutoff) {
      continue;
    }
    const recipient = recipientForMessage(message, opts.order);
    if (!recipient) continue;
    const list = groups.get(recipient) ?? [];
    list.push(message);
    groups.set(recipient, list);
  }

  const ready: ReadyBurst[] = [];
  for (const recipient of ["customer", "runner"] as const) {
    const list = groups.get(recipient);
    if (!list?.length) continue;
    list.sort(
      (a, b) => a.timestampMs - b.timestampMs || a.id.localeCompare(b.id),
    );
    const burstId = list[0].id;
    const notifiedId =
      recipient === "customer"
        ? opts.notified.customerBurstId
        : opts.notified.runnerBurstId;
    if (notifiedId === burstId) continue;
    ready.push({ recipient, burstId, count: list.length });
  }
  return ready;
}
