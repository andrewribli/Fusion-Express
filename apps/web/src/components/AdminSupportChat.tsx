"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCart } from "@/context/CartContext";
import { useUser } from "@/context/UserContext";
import {
  markAdminChatSeen,
  sendAdminChatMessage,
  subscribeAdminChatMessages,
  subscribeAdminInboxUnread,
  type AdminChatMessage,
} from "@/lib/admin-chats";

function formatTime(date: Date): string {
  return date.toLocaleTimeString("en-HK", { hour: "2-digit", minute: "2-digit" });
}

/**
 * User-facing GraceRun 1:1 inbox — adminChats/{userId}/messages.
 */
export function AdminSupportChat({
  forceOpen,
  onOpenChange,
  embedded,
}: {
  forceOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  embedded?: boolean;
} = {}) {
  const pathname = usePathname();
  const { user, mode } = useUser();
  const { itemCount } = useCart();
  const [open, setOpen] = useState(Boolean(forceOpen));
  const [messages, setMessages] = useState<AdminChatMessage[]>([]);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
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
      return subscribeAdminChatMessages(uid, setMessages);
    }
    return subscribeAdminInboxUnread(uid, setUnread);
  }, [user?.uid, open]);

  useEffect(() => {
    if (!open || !user?.uid) return;
    void markAdminChatSeen({ userId: user.uid, readerId: user.uid });
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
    return null;
  }

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!user?.uid || !text.trim()) return;
    setError("");
    setSending(true);
    try {
      await sendAdminChatMessage({
        userId: user.uid,
        senderId: user.uid,
        text: text.trim(),
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
      <div className="flex items-start justify-between gap-3 bg-[#ED1C24] px-4 py-3">
        <div>
          <p className="text-sm font-bold text-white">Message from GraceRun</p>
          <p className="mt-0.5 text-[11px] text-white/80">
            Payments, receipts, and order help.
          </p>
        </div>
        {!embedded && (
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-xl text-white/90 hover:bg-white/15"
            aria-label="Close chat"
          >
            ×
          </button>
        )}
      </div>

      {!user ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-2 px-4 text-center">
          <p className="text-sm text-gray-600">Sign in to message GraceRun.</p>
          <Link href="/login" className="text-sm font-semibold text-[#ED1C24] underline">
            Sign in
          </Link>
        </div>
      ) : (
        <>
          <div className="flex-1 space-y-2 overflow-y-auto bg-gray-50 px-3 py-3">
            {messages.length === 0 && (
              <p className="text-center text-xs text-gray-500">
                Ask about payments, refunds, or delivery issues.
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
                        GraceRun
                      </p>
                    )}
                    <p className="whitespace-pre-wrap break-words">{msg.text}</p>
                    <p
                      className={`mt-1 text-[10px] ${
                        mine ? "text-white/70" : "text-gray-400"
                      }`}
                    >
                      {formatTime(msg.createdAt)}
                      {msg.seen ? " · Seen" : ""}
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
              placeholder="Message GraceRun…"
              className="min-h-11 min-w-0 flex-1 rounded-full border border-gray-200 px-3 py-2 text-sm focus:border-[#ED1C24] focus:outline-none"
            />
            <button
              type="submit"
              disabled={sending || !text.trim()}
              className="min-h-11 rounded-full bg-[#ED1C24] px-4 py-2 text-sm font-bold text-white disabled:opacity-50"
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
            className="flex min-h-12 w-full items-center justify-between gap-3 rounded-2xl bg-[#111827] px-4 py-3 text-left text-sm font-bold text-white shadow-sm"
          >
            <span>Message from GraceRun</span>
            <span className="text-[#ED1C24]">Open →</span>
          </button>
        ) : (
          panel
        )}
      </div>
    );
  }

  // Sit above the docked utility bar / bottom nav — not over product cards.
  const fabBottom =
    mode === "runner"
      ? "bottom-28"
      : itemCount > 0
        ? "bottom-[11.5rem]"
        : "bottom-[8.5rem]";

  return (
    <div ref={rootRef} className={`fixed right-3 z-40 hidden md:block md:bottom-6 ${fabBottom}`}>
      {open ? (
        panel
      ) : (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="relative flex h-12 w-12 items-center justify-center rounded-full bg-[#ED1C24] text-white shadow-lg"
          aria-label="Message from GraceRun"
        >
          <svg viewBox="0 0 24 24" className="h-6 w-6" fill="currentColor" aria-hidden>
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
