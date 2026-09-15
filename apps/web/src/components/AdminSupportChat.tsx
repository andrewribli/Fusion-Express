"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCart } from "@/context/CartContext";
import { useUser } from "@/context/UserContext";
import {
  sendSupportMessage,
  subscribeSupportMessages,
} from "@/lib/support-chat";
import type { ChatMessage } from "@/lib/types";

function formatTime(date: Date): string {
  return date.toLocaleTimeString("en-HK", { hour: "2-digit", minute: "2-digit" });
}

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
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (forceOpen != null) setOpen(forceOpen);
  }, [forceOpen]);

  useEffect(() => {
    onOpenChange?.(open);
  }, [open, onOpenChange]);

  useEffect(() => {
    if (!user?.uid || !open) return;
    return subscribeSupportMessages(user.uid, setMessages);
  }, [user?.uid, open]);

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

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!user?.uid || !text.trim()) return;
    setError("");
    setSending(true);
    try {
      await sendSupportMessage({
        userId: user.uid,
        userName: user.fullName || user.username || "User",
        senderId: user.uid,
        senderName: user.fullName || "You",
        message: text,
      });
      setText("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not send.");
    } finally {
      setSending(false);
    }
  }

  const panel = (
    <form
      onSubmit={(e) => void onSubmit(e)}
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
                <div
                  key={msg.id}
                  className={`flex ${mine ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm ${
                      mine
                        ? "bg-[#ED1C24] text-white"
                        : "bg-white text-gray-900 shadow-sm"
                    }`}
                  >
                    {!mine && (
                      <p className="mb-0.5 text-[10px] font-semibold opacity-70">
                        {msg.senderName || "Admin"}
                      </p>
                    )}
                    <p className="whitespace-pre-wrap break-words">{msg.message}</p>
                    <p
                      className={`mt-1 text-[10px] ${
                        mine ? "text-white/70" : "text-gray-400"
                      }`}
                    >
                      {formatTime(msg.timestamp)}
                    </p>
                  </div>
                </div>
              );
            })}
            <div ref={bottomRef} />
          </div>
          {error && <p className="px-3 text-xs text-red-600">{error}</p>}
          <div className="flex gap-2 border-t border-gray-100 p-2">
            <input
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Message admin…"
              className="min-w-0 flex-1 rounded-full border border-gray-200 px-3 py-2 text-sm focus:border-[#ED1C24] focus:outline-none"
            />
            <button
              type="submit"
              disabled={sending || !text.trim()}
              className="rounded-full px-4 py-2 text-sm font-bold text-white disabled:opacity-50"
              style={{ backgroundColor: "#ED1C24" }}
            >
              Send
            </button>
          </div>
        </>
      )}
    </form>
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
            <span className="text-lakers-gold">Open →</span>
          </button>
        ) : (
          panel
        )}
      </div>
    );
  }

  const fabBottom =
    itemCount > 0 && mode !== "runner"
      ? "bottom-[9.75rem] md:bottom-6"
      : "bottom-28 md:bottom-6";

  return (
    <div ref={rootRef} className={`fixed right-3 z-40 md:right-6 ${fabBottom}`}>
      {open ? (
        panel
      ) : (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="flex h-12 w-12 items-center justify-center rounded-full text-white shadow-lg"
          style={{ backgroundColor: mode === "runner" ? "#1d1160" : "#ED1C24" }}
          aria-label="Chat with Admin"
        >
          <svg viewBox="0 0 24 24" className="h-6 w-6" fill="currentColor" aria-hidden>
            <path d="M4 4h16a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H8.4L4 20.4V6a2 2 0 0 1 2-2Zm2 4v2h12V8H6Zm0 4v2h8v-2H6Z" />
          </svg>
        </button>
      )}
    </div>
  );
}
