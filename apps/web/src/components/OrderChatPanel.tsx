"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useUser } from "@/context/UserContext";
import { isAdminUid } from "@/lib/admins";
import { isChatActive } from "@/lib/constants";
import {
  canAccessOrderChat,
  isOwnChatMessage,
  sendChatMedia,
  sendChatMessage,
  subscribeChatMessages,
} from "@/lib/chat";
import type { ChatMessage, Order } from "@/lib/types";
import { notifyOrderEvent } from "@/lib/notify-push";

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
  const [sending, setSending] = useState(false);
  const [expanded, setExpanded] = useState(!compact);
  const [lastReadAt, setLastReadAt] = useState(0);
  const [isAdmin, setIsAdmin] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const chatActive = isChatActive(order);
  const accountId = user?.uid ?? "";

  useEffect(() => {
    let cancelled = false;
    void isAdminUid(user?.uid).then((ok) => {
      if (!cancelled) setIsAdmin(ok);
    });
    return () => {
      cancelled = true;
    };
  }, [user?.uid]);

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
  if (!canAccessOrderChat(order, { ...user, isAdmin })) return null;

  const senderId = user.uid ?? "";
  const senderName = user.fullName || (isAdmin ? "Admin" : "You");
  const viewingAsCustomer = Boolean(user.uid && order.customerId === user.uid);
  const otherParty = isAdmin
    ? "order parties"
    : viewingAsCustomer
      ? "runner"
      : "customer";
  const chatLabel =
    unread > 0
      ? `${unread} new message${unread === 1 ? "" : "s"} from ${otherParty}`
      : isAdmin
        ? "Admin order chat"
        : `Chat with ${otherParty}`;

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    if (!text.trim() || !senderId || !chatActive) return;
    setSendError("");
    setSending(true);
    try {
      await sendChatMessage(order.id, senderId, senderName, text);
      notifyOrderEvent(order.id, "chat", text);
      setText("");
      setExpanded(true);
    } catch {
      setSendError("Could not send. Try again.");
    } finally {
      setSending(false);
    }
  }

  async function handlePhoto(file: File | null) {
    if (!file || !senderId || !chatActive) return;
    setSendError("");
    setSending(true);
    try {
      await sendChatMedia({
        orderId: order.id,
        senderId,
        senderName,
        file,
        fileName: file.name || "chat.jpg",
        contentType: file.type || "image/jpeg",
        mediaType: file.type.startsWith("video/") ? "video" : "image",
      });
      notifyOrderEvent(order.id, "chat", "Sent a photo");
      setExpanded(true);
    } catch (err) {
      const detail = err instanceof Error ? err.message : "";
      setSendError(detail || "Could not send that photo.");
    } finally {
      setSending(false);
    }
  }

  if (compact && !expanded) {
    return (
      <Link
        href={`/chat/${order.id}`}
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
      </Link>
    );
  }

  return (
    <div className="mt-3 overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
      <div className="flex items-center justify-between border-b border-white/10 bg-[#1e1e1e] px-4 py-2">
        <p className="text-sm font-semibold text-white">
          Chat with {otherParty}
        </p>
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
          messages.map((msg) => {
            const isMine = isOwnChatMessage(msg, user);
            return (
              <div
                key={msg.id}
                className={`flex ${isMine ? "justify-end" : "justify-start"}`}
              >
                <div
                  className="max-w-[85%] rounded-2xl px-3 py-2 text-sm"
                  style={{
                    backgroundColor: isMine ? "#FDB927" : "#2a2a2a",
                    color: isMine ? "#111827" : "#ffffff",
                  }}
                >
                  <p className="text-[10px] opacity-75">
                    {msg.senderName} · {formatMessageTime(msg.timestamp)}
                  </p>
                  {msg.imageUrl && msg.mediaType !== "video" ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={msg.imageUrl}
                      alt=""
                      className="mt-1 max-h-40 rounded-xl object-cover"
                    />
                  ) : null}
                  {msg.mediaType === "video" && msg.imageUrl ? (
                    <a
                      href={msg.imageUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-1 block text-xs underline"
                    >
                      Play video
                    </a>
                  ) : null}
                  {msg.message &&
                  msg.message !== "Photo" &&
                  msg.message !== "Video" ? (
                    <p className="mt-0.5">{msg.message}</p>
                  ) : null}
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
            ref={fileRef}
            type="file"
            accept="image/*,video/*"
            className="hidden"
            onChange={(e) => {
              void handlePhoto(e.target.files?.[0] ?? null);
              e.target.value = "";
            }}
          />
          <button
            type="button"
            disabled={sending}
            onClick={() => fileRef.current?.click()}
            className="rounded-xl border border-gray-200 px-2.5 py-2 text-xs font-semibold text-gray-700 disabled:opacity-50"
          >
            Photo
          </button>
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={`Message ${otherParty}…`}
            className="flex-1 rounded-xl border border-gray-200 px-3 py-2 text-sm focus:border-fusion-red focus:outline-none"
          />
          <button
            type="submit"
            disabled={sending || !text.trim()}
            className="rounded-xl bg-fusion-red px-3 py-2 text-sm font-semibold text-white disabled:opacity-50"
          >
            Send
          </button>
        </div>
      </form>
    </div>
  );
}
