"use client";

import { useState } from "react";
import { ChatMediaLightbox } from "@/components/chat/ChatMediaLightbox";
import type { ChatMessageType } from "@/lib/types";

export type ChatBubbleMessage = {
  id: string;
  senderId: string;
  senderName?: string;
  message: string;
  text?: string;
  type?: ChatMessageType;
  mediaUrl?: string;
  mediaUrls?: string[];
  mediaThumbnailUrl?: string;
  timestamp: Date;
  seen?: boolean;
};

function formatMessageTime(date: Date): string {
  return date.toLocaleTimeString("en-HK", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function mediaList(msg: ChatBubbleMessage): string[] {
  if (msg.mediaUrls?.length) return msg.mediaUrls;
  if (msg.mediaUrl) return [msg.mediaUrl];
  return [];
}

export function ChatMessageBubble({
  message,
  isMine,
  accent = "order",
  showSender = true,
  showSeen = false,
}: {
  message: ChatBubbleMessage;
  isMine: boolean;
  /** order = yellow/dark; admin = red/white */
  accent?: "order" | "admin";
  showSender?: boolean;
  showSeen?: boolean;
}) {
  const [lightbox, setLightbox] = useState<number | null>(null);
  const type = message.type ?? "text";
  const urls = mediaList(message);
  const caption = (message.text ?? "").trim();
  const bodyText =
    type === "text" ? message.message || caption : caption;

  const mineStyle =
    accent === "admin"
      ? "bg-[#ED1C24] text-white"
      : undefined;
  const theirsStyle =
    accent === "admin"
      ? "bg-white text-gray-900 shadow-sm"
      : undefined;

  return (
    <>
      <div className={`flex ${isMine ? "justify-end" : "justify-start"}`}>
        <div
          className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm ${
            accent === "admin"
              ? mineStyle && isMine
                ? mineStyle
                : theirsStyle
              : ""
          }`}
          style={
            accent === "order"
              ? {
                  backgroundColor: isMine ? "#FDB927" : "#2a2a2a",
                  color: isMine ? "#111827" : "#ffffff",
                }
              : undefined
          }
        >
          {showSender && message.senderName ? (
            <p className="text-[10px] font-medium opacity-80">
              {message.senderName} · {formatMessageTime(message.timestamp)}
            </p>
          ) : (
            <p
              className={`text-[10px] ${
                isMine && accent === "admin" ? "text-white/70" : "opacity-70"
              }`}
            >
              {formatMessageTime(message.timestamp)}
            </p>
          )}

          {type === "image" && urls.length > 0 && (
            <div
              className={`mt-1 grid gap-1 ${
                urls.length > 1 ? "grid-cols-2" : "grid-cols-1"
              }`}
            >
              {urls.map((url, i) => (
                <button
                  key={`${message.id}-${i}`}
                  type="button"
                  onClick={() => setLightbox(i)}
                  className="overflow-hidden rounded-xl focus:outline-none focus:ring-2 focus:ring-white/40"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={url}
                    alt=""
                    className="max-h-[200px] w-full max-w-[200px] object-cover"
                    loading="lazy"
                  />
                </button>
              ))}
            </div>
          )}

          {type === "video" && (
            <div className="mt-1">
              {message.mediaUrl ? (
                <video
                  src={message.mediaUrl}
                  poster={message.mediaThumbnailUrl}
                  controls
                  playsInline
                  className="max-h-[200px] w-full max-w-[200px] rounded-xl bg-black"
                />
              ) : (
                <p className="text-xs opacity-80">Video (unavailable)</p>
              )}
            </div>
          )}

          {bodyText ? (
            <p className="mt-0.5 whitespace-pre-wrap break-words">{bodyText}</p>
          ) : null}

          {type === "image" && !urls.length && !bodyText ? (
            <p className="mt-0.5 opacity-80">Sent a photo</p>
          ) : null}

          {showSeen && isMine && message.seen ? (
            <p className="mt-0.5 text-[10px] opacity-70">Seen</p>
          ) : null}
        </div>
      </div>
      {lightbox != null && (
        <ChatMediaLightbox
          urls={urls}
          startIndex={lightbox}
          onClose={() => setLightbox(null)}
        />
      )}
    </>
  );
}
