"use client";

import { useEffect, useRef, useState } from "react";
import { ChatComposer } from "@/components/chat/ChatComposer";
import { ChatMessageBubble } from "@/components/chat/ChatMessageBubble";
import type { UserProfile } from "@/context/UserContext";
import { useUser } from "@/context/UserContext";
import {
  emailDirectMessage,
  markThreadRead,
  sendDirectMediaMessage,
  sendDirectMessage,
  subscribeDirectMessages,
  type DirectMessage,
} from "@/lib/direct-messages";

export function AdminUserChatModal({
  target,
  onClose,
}: {
  target: UserProfile;
  onClose: () => void;
}) {
  const { user } = useUser();
  const threadId = target.uid ?? "";
  const [messages, setMessages] = useState<DirectMessage[]>([]);
  const [alsoEmail, setAlsoEmail] = useState(true);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [onClose]);

  useEffect(() => {
    if (!threadId) return;
    return subscribeDirectMessages(threadId, setMessages);
  }, [threadId]);

  useEffect(() => {
    if (!threadId || !user?.uid) return;
    void markThreadRead({ userId: threadId, readerId: user.uid });
  }, [threadId, user?.uid, messages.length]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  return (
    <div
      className="fixed inset-0 z-[120] flex items-end justify-center bg-black/50 p-0 sm:items-center sm:p-4"
      onClick={onClose}
    >
      <div
        className="flex h-[88vh] w-full max-w-lg flex-col overflow-hidden rounded-t-2xl bg-white shadow-2xl sm:h-[36rem] sm:rounded-2xl"
        role="dialog"
        aria-modal="true"
        aria-labelledby="admin-user-chat-title"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3 bg-[#ED1C24] px-4 py-3">
          <div>
            <h2 id="admin-user-chat-title" className="text-sm font-bold text-white">
              Message {target.fullName || target.email || "user"}
            </h2>
            <p className="mt-0.5 text-[11px] text-white/80">
              {target.email || "No email on file"} · in-app inbox
              {alsoEmail && target.email ? " + email" : ""}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-full text-xl text-white hover:bg-white/15"
            aria-label="Close"
          >
            ×
          </button>
        </div>

        {!threadId ? (
          <p className="m-auto px-4 text-sm text-gray-500">
            This account has no auth uid yet, so chat cannot be opened.
          </p>
        ) : (
          <>
            <div className="flex-1 space-y-2 overflow-y-auto bg-gray-50 px-3 py-3">
              {messages.length === 0 && (
                <p className="text-center text-xs text-gray-500">
                  No messages yet. Write a note — it is saved here and can be emailed.
                </p>
              )}
              {messages.map((msg) => {
                const mine = msg.senderId === user?.uid;
                return (
                  <ChatMessageBubble
                    key={msg.id}
                    message={{
                      id: msg.id,
                      senderId: msg.senderId,
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
                    showSender={false}
                  />
                );
              })}
              <div ref={bottomRef} />
            </div>
            <div className="border-t border-gray-100">
              <label className="flex items-center gap-2 px-3 pt-2 text-xs text-gray-600">
                <input
                  type="checkbox"
                  checked={alsoEmail}
                  disabled={!target.email}
                  onChange={(e) => setAlsoEmail(e.target.checked)}
                />
                Also send to email
                {!target.email ? " (no address)" : ""}
              </label>
              <ChatComposer
                placeholder="Write a message…"
                mediaEnabled
                accent="admin"
                inputClassName="min-w-0 flex-1 rounded-full border border-gray-200 px-3 py-2 text-sm focus:border-[#ED1C24] focus:outline-none"
                onSend={async ({ text, pending, signal, onProgress }) => {
                  if (!user?.uid || !threadId) {
                    throw new Error("Sign in required.");
                  }
                  if (pending.length) {
                    const sent = await sendDirectMediaMessage({
                      userId: threadId,
                      senderId: user.uid,
                      caption: text,
                      pending,
                      signal,
                      onProgress,
                    });
                    if (alsoEmail && target.email) {
                      await emailDirectMessage({
                        to: target.email,
                        recipientName: target.fullName,
                        message: sent.message,
                        hasPhoto: true,
                      });
                    }
                  } else {
                    await sendDirectMessage({
                      userId: threadId,
                      senderId: user.uid,
                      message: text,
                    });
                    if (alsoEmail && target.email) {
                      await emailDirectMessage({
                        to: target.email,
                        recipientName: target.fullName,
                        message: text,
                      });
                    }
                  }
                }}
              />
            </div>
          </>
        )}
      </div>
    </div>
  );
}
