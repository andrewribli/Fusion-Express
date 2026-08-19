"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useUser, getUserAccountId } from "@/context/UserContext";
import {
  canAccessOrderChat,
  sendChatMessage,
  subscribeChatMessages,
} from "@/lib/chat";
import { fetchOrder } from "@/lib/orders";
import type { ChatMessage, Order } from "@/lib/types";

interface OrderChatProps {
  orderId: string;
  backHref?: string;
}

function formatMessageTime(date: Date): string {
  return date.toLocaleTimeString("en-HK", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function OrderChat({ orderId, backHref }: OrderChatProps) {
  const { user } = useUser();
  const [order, setOrder] = useState<Order | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
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

  const senderId = getUserAccountId(user);

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    if (!text.trim()) return;
    setSending(true);
    setError("");
    try {
      await sendChatMessage(orderId, senderId, user!.fullName, text);
      setText("");
    } catch {
      setError("Failed to send message.");
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="flex h-[calc(100vh-8rem)] flex-col rounded-2xl border border-gray-100 bg-white shadow-sm md:h-[520px]">
      <div className="border-b border-gray-100 px-4 py-3">
        <p className="text-sm font-semibold text-gray-900">Order Chat</p>
        <p className="text-xs text-gray-500">{orderId}</p>
      </div>

      <div className="flex-1 space-y-3 overflow-y-auto px-4 py-4">
        {messages.length === 0 ? (
          <p className="text-center text-sm text-gray-400">
            No messages yet. Say hi to coordinate delivery.
          </p>
        ) : (
          messages.map((msg) => {
            const isMine = msg.senderId === senderId;
            return (
              <div
                key={msg.id}
                className={`flex ${isMine ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[80%] rounded-2xl px-3 py-2 ${
                    isMine
                      ? "bg-fusion-red text-white"
                      : "bg-gray-100 text-gray-900"
                  }`}
                >
                  <p className="text-[10px] font-medium opacity-80">
                    {msg.senderName} · {formatMessageTime(msg.timestamp)}
                  </p>
                  <p className="mt-0.5 text-sm">{msg.message}</p>
                </div>
              </div>
            );
          })
        )}
        <div ref={bottomRef} />
      </div>

      <form
        onSubmit={handleSend}
        className="border-t border-gray-100 p-3"
      >
        {error && (
          <p className="mb-2 text-xs text-red-600">{error}</p>
        )}
        <div className="flex gap-2">
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Type a message…"
            className="flex-1 rounded-xl border border-gray-200 px-3 py-2.5 text-sm focus:border-fusion-red focus:outline-none focus:ring-2 focus:ring-fusion-red/20"
          />
          <button
            type="submit"
            disabled={sending || !text.trim()}
            className="rounded-xl bg-fusion-red px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
          >
            Send
          </button>
        </div>
      </form>
    </div>
  );
}
