"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useUser, getUserAccountId } from "@/context/UserContext";
import { isChatActive } from "@/lib/constants";
import {
  canAccessOrderChat,
  isOwnChatMessage,
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

function readKey(orderId: string, accountId: string): string {
  return `fusion_chat_read_${orderId}_${accountId}`;
}

export function OrderChatPanel({ order, compact }: OrderChatPanelProps) {
  const { user } = useUser();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [text, setText] = useState("");
  const [sendError, setSendError] = useState("");
  const [expanded, setExpanded] = useState(!compact);
  const [lastReadAt, setLastReadAt] = useState(0);
  const bottomRef = useRef<HTMLDivElement>(null);

  const chatActive = isChatActive(order.status);
  const accountId = user ? getUserAccountId(user) : "";

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

  const senderId = getUserAccountId(user);
  const senderName = user.fullName;
  const otherParty = user.isRunner ? "customer" : "runner";
  const chatLabel =
    unread > 0
      ? `${unread} new message${unread === 1 ? "" : "s"} from ${otherParty}`
      : `Chat with ${otherParty}`;

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    if (!text.trim()) return;
    setSendError("");
    try {
      await sendChatMessage(order.id, senderId, senderName, text);
      setText("");
      setExpanded(true);
    } catch {
      setSendError("Could not send. Try again.");
    }
  }

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
      <div className="flex items-center justify-between border-b border-gray-100 bg-red-50 px-4 py-2">
        <p className="text-sm font-semibold text-gray-900">
          Chat with {otherParty}
        </p>
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
            Coordinate pickup, substitutes, lobby location, etc.
          </p>
        ) : (
          messages.map((msg) => {
            const isMine = isOwnChatMessage(msg, user);
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

      <form onSubmit={handleSend} className="border-t border-gray-100 p-2">
        {sendError && (
          <p className="mb-2 px-1 text-xs text-red-600">{sendError}</p>
        )}
        <div className="flex gap-2">
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={`Message ${otherParty}…`}
            className="flex-1 rounded-xl border border-gray-200 px-3 py-2 text-sm focus:border-fusion-red focus:outline-none"
          />
          <button
            type="submit"
            disabled={!text.trim()}
            className="rounded-xl bg-fusion-red px-3 py-2 text-sm font-semibold text-white disabled:opacity-50"
          >
            Send
          </button>
        </div>
      </form>
    </div>
  );
}
