"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ChatComposer } from "@/components/chat/ChatComposer";
import { ChatMessageBubble } from "@/components/chat/ChatMessageBubble";
import { OrderCounterparty } from "@/components/DeliveryIdentity";
import { useUser } from "@/context/UserContext";
import { publicDeliveryName } from "@fusion-express/shared/delivery-identity";
import { isChatActive } from "@/lib/constants";
import {
  canAccessOrderChat,
  isOwnChatMessage,
  sendChatMediaMessage,
  sendChatMessage,
  subscribeChatMessages,
} from "@/lib/chat";
import type { ChatMessage, Order } from "@/lib/types";

interface OrderChatPanelProps {
  order: Order;
  compact?: boolean;
}

function readKey(orderId: string, accountId: string): string {
  return `fusion_chat_read_${orderId}_${accountId}`;
}

export function OrderChatPanel({ order, compact }: OrderChatPanelProps) {
  const { user } = useUser();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [expanded, setExpanded] = useState(!compact);
  const [lastReadAt, setLastReadAt] = useState(0);
  const bottomRef = useRef<HTMLDivElement>(null);

  const chatActive = isChatActive(order.status);
  const accountId = user?.uid ?? "";

  useEffect(() => {
    if (!chatActive) return;
    return subscribeChatMessages(order.id, setMessages);
  }, [order.id, chatActive]);

  useEffect(() => {
    if (!accountId) return;
    const raw = localStorage.getItem(readKey(order.id, accountId));
    setLastReadAt(raw ? Number(raw) : 0);
  }, [order.id, accountId]);

  useEffect(() => {
    if (!expanded || !accountId) return;
    const latest = messages.reduce(
      (max, msg) => Math.max(max, msg.timestamp.getTime()),
      Date.now(),
    );
    localStorage.setItem(readKey(order.id, accountId), String(latest));
    setLastReadAt(latest);
  }, [expanded, accountId, messages, order.id]);

  useEffect(() => {
    if (expanded) {
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, expanded]);

  const unread = useMemo(() => {
    if (!user) return 0;
    return messages.filter(
      (msg) =>
        !isOwnChatMessage(msg, user) && msg.timestamp.getTime() > lastReadAt,
    ).length;
  }, [messages, user, lastReadAt]);

  if (!user || !chatActive) return null;
  if (!canAccessOrderChat(order, user)) return null;

  const senderId = user.uid ?? "";
  const senderName = publicDeliveryName(user, user.fullName || "Customer");
  const viewingAsCustomer = Boolean(user.uid && order.customerId === user.uid);
  const otherParty = viewingAsCustomer ? "runner" : "customer";
  const role =
    order.runnerUid && order.runnerUid === senderId ? "runner" : "customer";
  const chatLabel =
    unread > 0
      ? `${unread} new message${unread === 1 ? "" : "s"} from ${otherParty}`
      : `Chat with ${otherParty}`;

  if (compact && !expanded) {
    return (
      <button
        type="button"
        onClick={() => setExpanded(true)}
        className={`mt-3 flex w-full items-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold text-white shadow-md ${
          unread > 0 ? "bg-fusion-red" : "bg-gray-800"
        }`}
      >
        <span className="relative flex h-8 w-8 items-center justify-center rounded-full bg-white/20 text-lg">
          💬
          {unread > 0 && (
            <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-white px-1 text-[10px] font-bold text-fusion-red">
              {unread > 9 ? "9+" : unread}
            </span>
          )}
        </span>
        {chatLabel}
      </button>
    );
  }

  return (
    <div className="mt-3 overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
      <div className="flex items-center justify-between border-b border-white/10 bg-[#1e1e1e] px-4 py-2">
        <div className="min-w-0 text-white">
          <OrderCounterparty
            orderId={order.id}
            label={viewingAsCustomer ? "Your runner:" : "Customer:"}
            tone="dark"
          />
        </div>
        {compact && (
          <button
            type="button"
            onClick={() => setExpanded(false)}
            className="text-xs font-semibold text-[#f5f5f5]"
            style={{ color: "#f5f5f5" }}
          >
            Minimize
          </button>
        )}
      </div>

      <div className="max-h-48 space-y-2 overflow-y-auto px-3 py-3">
        {messages.length === 0 ? (
          <p className="text-center text-xs text-gray-400">
            Coordinate pickup, substitutes, lobby location, etc.
          </p>
        ) : (
          messages.map((msg) => (
            <ChatMessageBubble
              key={msg.id}
              message={msg}
              isMine={isOwnChatMessage(msg, user)}
              accent="order"
              showSender
            />
          ))
        )}
        <div ref={bottomRef} />
      </div>

      <ChatComposer
        placeholder={`Message ${otherParty}…`}
        mediaEnabled
        accent="order"
        inputClassName="min-w-0 flex-1 rounded-xl border border-gray-200 px-3 py-2 text-sm focus:border-fusion-red focus:outline-none"
        onSend={async ({ text, pending, signal, onProgress }) => {
          if (!senderId) throw new Error("Sign in required.");
          setExpanded(true);
          if (pending.length) {
            await sendChatMediaMessage({
              orderId: order.id,
              senderId,
              senderName,
              senderRole: role,
              caption: text,
              pending,
              signal,
              onProgress,
            });
          } else {
            await sendChatMessage(
              order.id,
              senderId,
              senderName,
              text,
              role,
            );
          }
        }}
      />
    </div>
  );
}
