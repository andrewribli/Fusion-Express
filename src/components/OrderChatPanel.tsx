"use client";

import { useEffect, useRef, useState } from "react";
import { useUser, getUserAccountId } from "@/context/UserContext";
import { isChatActive } from "@/lib/constants";
import {
  canAccessOrderChat,
  sendChatMessage,
  subscribeChatMessages,
} from "@/lib/chat";
import type { ChatMessage, Order } from "@/lib/types";

interface OrderChatPanelProps {
  order: Order;
  compact?: boolean;
}

function formatMessageTime(date: Date): string {
  return date.toLocaleTimeString("en-HK", { hour: "2-digit", minute: "2-digit" });
}

export function OrderChatPanel({ order, compact }: OrderChatPanelProps) {
  const { user } = useUser();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [text, setText] = useState("");
  const [expanded, setExpanded] = useState(!compact);
  const bottomRef = useRef<HTMLDivElement>(null);

  const chatActive = isChatActive(order.status);

  useEffect(() => {
    if (!chatActive) return;
    return subscribeChatMessages(order.id, setMessages);
  }, [order.id, chatActive]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, expanded]);

  if (!user || !chatActive) return null;
  if (!canAccessOrderChat(order, user)) return null;

  const senderId = getUserAccountId(user);

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    if (!text.trim()) return;
    await sendChatMessage(order.id, senderId, user!.fullName, text);
    setText("");
    setExpanded(true);
  }

  if (compact && !expanded) {
    return (
      <button
        type="button"
        onClick={() => setExpanded(true)}
        className="mt-3 flex w-full items-center gap-2 rounded-xl bg-fusion-red px-4 py-3 text-sm font-semibold text-white shadow-md"
      >
        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-white/20 text-lg">
          💬
        </span>
        Chat with {user.isRunner ? "customer" : "runner"} · Tap to open
      </button>
    );
  }

  return (
    <div className="mt-3 overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
      <div className="flex items-center justify-between border-b border-gray-100 bg-red-50 px-4 py-2">
        <p className="text-sm font-semibold text-gray-900">Live Chat</p>
        {compact && (
          <button
            type="button"
            onClick={() => setExpanded(false)}
            className="text-xs text-gray-500"
          >
            Minimize
          </button>
        )}
      </div>

      <div className="max-h-48 space-y-2 overflow-y-auto px-3 py-3">
        {messages.length === 0 ? (
          <p className="text-center text-xs text-gray-400">
            Coordinate pickup — substitutes, lobby location, etc.
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
                  className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm ${
                    isMine ? "bg-fusion-red text-white" : "bg-gray-100"
                  }`}
                >
                  <p className="text-[10px] opacity-75">
                    {msg.senderName} · {formatMessageTime(msg.timestamp)}
                  </p>
                  <p className="mt-0.5">{msg.message}</p>
                </div>
              </div>
            );
          })
        )}
        <div ref={bottomRef} />
      </div>

      <form onSubmit={handleSend} className="flex gap-2 border-t border-gray-100 p-2">
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Type a message…"
          className="flex-1 rounded-xl border border-gray-200 px-3 py-2 text-sm focus:border-fusion-red focus:outline-none"
        />
        <button
          type="submit"
          disabled={!text.trim()}
          className="rounded-xl bg-fusion-red px-3 py-2 text-sm font-semibold text-white disabled:opacity-50"
        >
          Send
        </button>
      </form>
    </div>
  );
}
