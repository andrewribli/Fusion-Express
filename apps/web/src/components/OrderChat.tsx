"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ChatComposer } from "@/components/chat/ChatComposer";
import { ChatMessageBubble } from "@/components/chat/ChatMessageBubble";
import { OrderCounterparty } from "@/components/DeliveryIdentity";
import { useUser } from "@/context/UserContext";
import { publicDeliveryName } from "@fusion-express/shared/delivery-identity";
import { isChatActive } from "@/lib/constants";
import {
  canAccessOrderChat,
  isOwnChatMessage,
  markChatSeen,
  sendChatMediaMessage,
  sendChatMessage,
  subscribeChatMessages,
} from "@/lib/chat";
import { fetchOrder } from "@/lib/orders";
import type { ChatMessage, Order } from "@/lib/types";

interface OrderChatProps {
  orderId: string;
  backHref?: string;
}

export function OrderChat({ orderId, backHref }: OrderChatProps) {
  const { user } = useUser();
  const [order, setOrder] = useState<Order | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    void fetchOrder(orderId).then(setOrder);
  }, [orderId]);

  useEffect(() => {
    const unsub = subscribeChatMessages(orderId, setMessages);
    return unsub;
  }, [orderId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (!user?.uid || messages.length === 0) return;
    void markChatSeen(orderId, messages, user.uid);
  }, [messages, orderId, user?.uid]);

  if (!user) return null;

  if (order && !canAccessOrderChat(order, user)) {
    return (
      <div className="rounded-2xl bg-red-50 px-4 py-6 text-center text-sm text-red-700">
        You don&apos;t have access to this chat.
        {backHref && (
          <Link href={backHref} className="mt-3 block text-fusion-red underline">
            Go back
          </Link>
        )}
      </div>
    );
  }

  const senderId = user.uid;
  if (!senderId) return null;
  const archived =
    order?.status === "completed" &&
    order.updatedAt instanceof Date &&
    Date.now() - order.updatedAt.getTime() > 24 * 60 * 60 * 1000;
  const chatActive = order ? isChatActive(order.status) && !archived : !archived;
  const role =
    order?.runnerUid && order.runnerUid === senderId ? "runner" : "customer";

  return (
    <div className="flex h-[calc(100vh-8rem)] flex-col rounded-2xl border border-gray-100 bg-white shadow-sm md:h-[520px]">
      <div className="border-b border-gray-100 px-4 py-3">
        {order ? (
          <OrderCounterparty
            orderId={orderId}
            label={order.customerId === user.uid ? "Your runner:" : "Customer:"}
          />
        ) : (
          <p className="text-sm font-semibold text-gray-900">Order chat</p>
        )}
      </div>

      <div className="flex-1 space-y-3 overflow-y-auto px-4 py-4">
        {messages.length === 0 ? (
          <p className="text-center text-sm text-gray-400">
            No messages yet. Say hi to coordinate delivery.
          </p>
        ) : (
          messages.map((msg) => (
            <ChatMessageBubble
              key={msg.id}
              message={msg}
              isMine={isOwnChatMessage(msg, user)}
              accent="order"
              showSeen
            />
          ))
        )}
        <div ref={bottomRef} />
      </div>

      {archived || !chatActive ? (
        <p className="border-t border-gray-100 px-4 py-3 text-xs text-gray-500">
          {archived
            ? "This chat is read-only. The order was completed more than 24 hours ago."
            : "Chat is unavailable for this order status."}
        </p>
      ) : (
        <ChatComposer
          placeholder="Type a message…"
          mediaEnabled
          accent="order"
          onSend={async ({ text, pending, signal, onProgress }) => {
            const name = publicDeliveryName(user, user.fullName || "Customer");
            if (pending.length) {
              await sendChatMediaMessage({
                orderId,
                senderId,
                senderName: name,
                senderRole: role,
                caption: text,
                pending,
                signal,
                onProgress,
              });
            } else {
              await sendChatMessage(orderId, senderId, name, text, role);
            }
          }}
        />
      )}
    </div>
  );
}
