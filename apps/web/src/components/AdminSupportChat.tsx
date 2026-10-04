"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChatComposer } from "@/components/chat/ChatComposer";
import { ChatMessageBubble } from "@/components/chat/ChatMessageBubble";
import { useCart } from "@/context/CartContext";
import { useUser } from "@/context/UserContext";
import {
  fetchUnreadForUser,
  markThreadRead,
  sendDirectMediaMessage,
  sendDirectMessage,
  subscribeDirectMessages,
} from "@/lib/direct-messages";
import type { DirectMessage } from "@/lib/direct-messages";

export function AdminSupportChat({
  forceOpen,
  onOpenChange,
  embedded,
}: {
  forceOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  /** Inline panel (e.g. runner deliveries) instead of floating FAB */
  embedded?: boolean;
} = {}) {
  const pathname = usePathname();
  const { user, mode } = useUser();
  const { itemCount } = useCart();
  const [open, setOpen] = useState(Boolean(forceOpen));
  const [messages, setMessages] = useState<DirectMessage[]>([]);
  const [unread, setUnread] = useState(0);
  const bottomRef = useRef<HTMLDivElement>(null);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (forceOpen != null) setOpen(forceOpen);
  }, [forceOpen]);

  useEffect(() => {
    onOpenChange?.(open);
  }, [open, onOpenChange]);

  useEffect(() => {
    if (!user?.uid) return;
    const uid = user.uid;
    if (open) {
      return subscribeDirectMessages(uid, setMessages);
    }
    void fetchUnreadForUser(uid).then(setUnread).catch(() => undefined);
    const interval = setInterval(() => {
      void fetchUnreadForUser(uid).then(setUnread).catch(() => undefined);
    }, 15000);
    return () => clearInterval(interval);
  }, [user?.uid, open]);

  useEffect(() => {
    if (!open || !user?.uid) return;
    void markThreadRead({ userId: user.uid, readerId: user.uid });
    setUnread(0);
  }, [open, user?.uid, messages.length]);

  useEffect(() => {
    if (open) bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, open]);

  useEffect(() => {
    if (!open || embedded) return;
    function onPointerDown(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open, embedded]);

  if (pathname.startsWith("/admin")) return null;
  if (!embedded && mode === "runner" && pathname.startsWith("/runner/deliveries")) {
    // Deliveries page has its own Chat with Admin card.
    return null;
  }

  const panel = (
    <div
      className={
        embedded
          ? "flex h-[22rem] flex-col overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm"
          : "flex h-[24rem] w-[min(22rem,calc(100vw-1.5rem))] flex-col overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-2xl"
      }
    >
      <div
        className="flex items-start justify-between gap-3 px-4 py-3"
        style={{ backgroundColor: mode === "runner" ? "#1d1160" : "#ED1C24" }}
      >
        <div>
          <p className="text-sm font-bold text-white">Chat with Admin</p>
          <p className="mt-0.5 text-[11px] text-white/80">
            Payments, receipts, and order help.
          </p>
        </div>
        {!embedded && (
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xl text-white/90 hover:bg-white/15"
            aria-label="Close chat"
          >
            ×
          </button>
        )}
      </div>

      {!user ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-2 px-4 text-center">
          <p className="text-sm text-gray-600">Sign in to message admin.</p>
          <Link href="/login" className="text-sm font-semibold text-[#ED1C24] underline">
            Sign in
          </Link>
        </div>
      ) : (
        <>
          <div className="flex-1 space-y-2 overflow-y-auto bg-gray-50 px-3 py-3">
            {messages.length === 0 && (
              <p className="text-center text-xs text-gray-500">
                Ask admin about payments, refunds, or delivery issues.
              </p>
            )}
            {messages.map((msg) => {
              const mine = msg.senderId === user.uid;
              return (
                <ChatMessageBubble
                  key={msg.id}
                  message={{
                    id: msg.id,
                    senderId: msg.senderId,
                    senderName: mine ? undefined : "Admin",
                    message: msg.message,
                    text: msg.text,
                    type: msg.type,
                    mediaUrl: msg.mediaUrl,
                    mediaUrls: msg.mediaUrls,
                    mediaThumbnailUrl: msg.mediaThumbnailUrl,
                    timestamp: msg.createdAt,
                  }}
                  isMine={mine}
                  accent="admin"
                  showSender={!mine}
                />
              );
            })}
            <div ref={bottomRef} />
          </div>
          <ChatComposer
            placeholder="Message admin…"
            mediaEnabled
            accent="admin"
            inputClassName="min-w-0 flex-1 rounded-full border border-gray-200 px-3 py-2 text-sm focus:border-[#ED1C24] focus:outline-none"
            onSend={async ({ text, pending, signal, onProgress }) => {
              if (!user.uid) throw new Error("Sign in required.");
              if (pending.length) {
                await sendDirectMediaMessage({
                  userId: user.uid,
                  senderId: user.uid,
                  caption: text,
                  pending,
                  signal,
                  onProgress,
                });
              } else {
                await sendDirectMessage({
                  userId: user.uid,
                  senderId: user.uid,
                  message: text,
                });
              }
            }}
          />
        </>
      )}
    </div>
  );

  if (embedded) {
    return (
      <div ref={rootRef}>
        {!open ? (
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="flex min-h-12 w-full items-center justify-between gap-3 rounded-2xl px-4 py-3 text-left text-sm font-bold text-white shadow-sm"
            style={{ backgroundColor: "#1d1160" }}
          >
            <span>Chat with Admin</span>
            <span className="text-[#ED1C24]">Open →</span>
          </button>
        ) : (
          panel
        )}
      </div>
    );
  }

  // Sit above bottom nav (+ OrderActionBar when cart has items). Main content
  // uses extra right padding on mobile so cards clear this FAB.
  const fabBottom =
    mode === "runner" || itemCount > 0
      ? "bottom-[calc(9.5rem+env(safe-area-inset-bottom,0px))] md:bottom-28"
      : "bottom-[calc(5.75rem+env(safe-area-inset-bottom,0px))] md:bottom-6";

  return (
    <div ref={rootRef} className={`fixed right-2 z-30 sm:right-4 ${fabBottom}`}>
      {open ? (
        panel
      ) : (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="relative flex h-10 w-10 items-center justify-center rounded-full text-white shadow-lg sm:h-12 sm:w-12"
          style={{ backgroundColor: mode === "runner" ? "#1d1160" : "#ED1C24" }}
          aria-label="Chat with Admin"
        >
          <svg
            viewBox="0 0 24 24"
            className="h-5 w-5 sm:h-6 sm:w-6"
            fill="currentColor"
            aria-hidden
          >
            <path d="M4 4h16a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H8.4L4 20.4V6a2 2 0 0 1 2-2Zm2 4v2h12V8H6Zm0 4v2h8v-2H6Z" />
          </svg>
          {unread > 0 && (
            <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-amber-400 px-1 text-[10px] font-bold text-gray-900">
              {unread}
            </span>
          )}
        </button>
      )}
    </div>
  );
}
