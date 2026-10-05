"use client";

import { useEffect, useState } from "react";

export function ChatMediaLightbox({
  urls,
  startIndex = 0,
  onClose,
}: {
  urls: string[];
  startIndex?: number;
  onClose: () => void;
}) {
  const [index, setIndex] = useState(
    Math.min(Math.max(0, startIndex), Math.max(0, urls.length - 1)),
  );
  const [dragY, setDragY] = useState(0);
  const [pinch, setPinch] = useState(1);

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowRight") {
        setIndex((i) => Math.min(urls.length - 1, i + 1));
      }
      if (e.key === "ArrowLeft") {
        setIndex((i) => Math.max(0, i - 1));
      }
    }
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [onClose, urls.length]);

  if (!urls.length) return null;
  const url = urls[index]!;

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center bg-black/92"
      role="dialog"
      aria-modal="true"
      aria-label="Photo viewer"
      onClick={onClose}
    >
      <button
        type="button"
        onClick={onClose}
        className="absolute right-3 top-3 z-10 flex h-11 w-11 items-center justify-center rounded-full bg-white/15 text-2xl text-white"
        aria-label="Close"
      >
        ×
      </button>
      {urls.length > 1 && (
        <p className="absolute left-3 top-4 text-sm text-white/80">
          {index + 1} / {urls.length}
        </p>
      )}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={url}
        alt=""
        className="max-h-[90vh] max-w-[95vw] select-none object-contain touch-none"
        style={{
          transform: `translateY(${dragY}px) scale(${pinch})`,
          transition: dragY === 0 ? "transform 120ms ease" : undefined,
        }}
        draggable={false}
        onClick={(e) => e.stopPropagation()}
        onTouchStart={(e) => {
          if (e.touches.length === 2) {
            const a = e.touches[0]!;
            const b = e.touches[1]!;
            const dist = Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);
            (e.currentTarget as HTMLElement).dataset.pinchStart = String(dist);
            (e.currentTarget as HTMLElement).dataset.pinchScale = String(pinch);
            return;
          }
          const t = e.touches[0];
          if (!t) return;
          (e.currentTarget as HTMLElement).dataset.startY = String(t.clientY);
        }}
        onTouchMove={(e) => {
          if (e.touches.length === 2) {
            const start = Number(
              (e.currentTarget as HTMLElement).dataset.pinchStart ?? "0",
            );
            const base = Number(
              (e.currentTarget as HTMLElement).dataset.pinchScale ?? "1",
            );
            const a = e.touches[0]!;
            const b = e.touches[1]!;
            const dist = Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);
            if (start > 0) {
              setPinch(Math.min(3, Math.max(1, (base * dist) / start)));
            }
            return;
          }
          const startY = Number(
            (e.currentTarget as HTMLElement).dataset.startY ?? "0",
          );
          const t = e.touches[0];
          if (!t || !startY) return;
          setDragY(t.clientY - startY);
        }}
        onTouchEnd={() => {
          if (Math.abs(dragY) > 100) onClose();
          setDragY(0);
          setPinch(1);
        }}
      />
      {urls.length > 1 && (
        <>
          <button
            type="button"
            disabled={index === 0}
            onClick={(e) => {
              e.stopPropagation();
              setIndex((i) => Math.max(0, i - 1));
            }}
            className="absolute left-2 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/15 text-white disabled:opacity-30"
            aria-label="Previous photo"
          >
            ‹
          </button>
          <button
            type="button"
            disabled={index >= urls.length - 1}
            onClick={(e) => {
              e.stopPropagation();
              setIndex((i) => Math.min(urls.length - 1, i + 1));
            }}
            className="absolute right-2 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/15 text-white disabled:opacity-30"
            aria-label="Next photo"
          >
            ›
          </button>
        </>
      )}
    </div>
  );
}
