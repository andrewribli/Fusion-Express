"use client";

import { useEffect, useRef, useState } from "react";
import {
  IMAGE_ACCEPT,
  preparePendingImages,
  revokePendingMedia,
  UI_MAX_IMAGES_PICK,
  type PendingChatMedia,
} from "@/lib/chat-media";

export type ChatComposerSendPayload = {
  text: string;
  pending: PendingChatMedia[];
  signal: AbortSignal;
  onProgress: (ratio: number) => void;
};

type Props = {
  placeholder?: string;
  disabled?: boolean;
  /** When false, attach is hidden (e.g. archived / inactive order). */
  mediaEnabled?: boolean;
  accent?: "order" | "admin";
  inputClassName?: string;
  onSend: (payload: ChatComposerSendPayload) => Promise<void>;
};

export function ChatComposer({
  placeholder = "Type a message…",
  disabled = false,
  mediaEnabled = true,
  accent = "order",
  inputClassName,
  onSend,
}: Props) {
  const [text, setText] = useState("");
  const [pending, setPending] = useState<PendingChatMedia[]>([]);
  const [menuOpen, setMenuOpen] = useState(false);
  const [sending, setSending] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState("");
  const [failed, setFailed] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const cameraRef = useRef<HTMLInputElement>(null);
  const libraryRef = useRef<HTMLInputElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    return () => {
      revokePendingMedia(pending);
      abortRef.current?.abort();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- cleanup on unmount only
  }, []);

  useEffect(() => {
    if (!menuOpen) return;
    function onDown(e: MouseEvent) {
      if (!menuRef.current?.contains(e.target as Node)) setMenuOpen(false);
    }
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [menuOpen]);

  async function addFiles(files: FileList | null) {
    if (!files?.length) return;
    setError("");
    setFailed(false);
    try {
      const next = await preparePendingImages(files, {
        maxPick: UI_MAX_IMAGES_PICK - pending.length,
      });
      if (!next.length) return;
      setPending((prev) => {
        const merged = [...prev, ...next].slice(0, UI_MAX_IMAGES_PICK);
        return merged;
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not add photo.");
    } finally {
      setMenuOpen(false);
      if (cameraRef.current) cameraRef.current.value = "";
      if (libraryRef.current) libraryRef.current.value = "";
    }
  }

  function removePending(id: string) {
    setPending((prev) => {
      const target = prev.find((p) => p.id === id);
      if (target) URL.revokeObjectURL(target.previewUrl);
      return prev.filter((p) => p.id !== id);
    });
  }

  async function submit() {
    if (disabled || sending) return;
    const trimmed = text.trim();
    if (!trimmed && pending.length === 0) return;

    setSending(true);
    setError("");
    setFailed(false);
    setProgress(pending.length ? 0.02 : 1);
    const controller = new AbortController();
    abortRef.current = controller;

    try {
      await onSend({
        text: trimmed,
        pending: [...pending],
        signal: controller.signal,
        onProgress: setProgress,
      });
      revokePendingMedia(pending);
      setPending([]);
      setText("");
      setProgress(0);
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") {
        setError("Upload cancelled.");
      } else {
        setError(err instanceof Error ? err.message : "Could not send.");
        setFailed(true);
      }
    } finally {
      setSending(false);
      abortRef.current = null;
    }
  }

  function cancelUpload() {
    abortRef.current?.abort();
  }

  const canSend = !disabled && !sending && (Boolean(text.trim()) || pending.length > 0);
  const btnBg = accent === "admin" ? "#ED1C24" : undefined;

  return (
    <div className="border-t border-gray-100 p-2">
      {pending.length > 0 && (
        <div className="mb-2 flex gap-2 overflow-x-auto px-1 pb-1">
          {pending.map((item) => (
            <div key={item.id} className="relative shrink-0">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={item.previewUrl}
                alt=""
                className="h-16 w-16 rounded-lg object-cover"
              />
              {!sending && (
                <button
                  type="button"
                  onClick={() => removePending(item.id)}
                  className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-black/70 text-xs text-white"
                  aria-label="Remove photo"
                >
                  ×
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {sending && pending.length > 0 && (
        <div className="mb-2 px-1">
          <div className="flex items-center justify-between text-[11px] text-gray-500">
            <span>Uploading… {Math.round(progress * 100)}%</span>
            <button
              type="button"
              onClick={cancelUpload}
              className="font-semibold text-[#ED1C24]"
            >
              Cancel
            </button>
          </div>
          <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-gray-100">
            <div
              className="h-full rounded-full bg-[#ED1C24] transition-[width]"
              style={{ width: `${Math.round(progress * 100)}%` }}
            />
          </div>
        </div>
      )}

      {error && (
        <div className="mb-2 flex items-center justify-between gap-2 px-1">
          <p className="text-xs text-red-600">{error}</p>
          {failed && (
            <button
              type="button"
              onClick={() => void submit()}
              className="shrink-0 text-xs font-semibold text-[#ED1C24]"
            >
              Retry
            </button>
          )}
        </div>
      )}

      <div className="flex items-end gap-2">
        {mediaEnabled && (
          <div className="relative" ref={menuRef}>
            <button
              type="button"
              disabled={disabled || sending}
              onClick={() => setMenuOpen((o) => !o)}
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-gray-200 text-gray-700 disabled:opacity-50"
              aria-label="Attach photo"
              title="Attach photo"
            >
              <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor" aria-hidden>
                <path d="M9 3a1 1 0 0 0-.8.4L6.6 5H5a3 3 0 0 0-3 3v9a3 3 0 0 0 3 3h14a3 3 0 0 0 3-3V8a3 3 0 0 0-3-3h-1.6l-1.6-1.6A1 1 0 0 0 15 3H9Zm3 5a5 5 0 1 1 0 10 5 5 0 0 1 0-10Zm0 2a3 3 0 1 0 0 6 3 3 0 0 0 0-6Z" />
              </svg>
            </button>
            {menuOpen && (
              <div className="absolute bottom-12 left-0 z-20 w-48 overflow-hidden rounded-xl border border-gray-100 bg-white shadow-lg">
                <button
                  type="button"
                  className="block w-full px-3 py-2.5 text-left text-sm hover:bg-gray-50"
                  onClick={() => cameraRef.current?.click()}
                >
                  Take Photo
                </button>
                <button
                  type="button"
                  className="block w-full px-3 py-2.5 text-left text-sm hover:bg-gray-50"
                  onClick={() => libraryRef.current?.click()}
                >
                  Choose from Library
                </button>
                <button
                  type="button"
                  disabled
                  className="block w-full cursor-not-allowed px-3 py-2.5 text-left text-sm text-gray-400"
                  title="Coming soon"
                >
                  Video · Coming soon
                </button>
              </div>
            )}
            <input
              ref={cameraRef}
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={(e) => void addFiles(e.target.files)}
            />
            <input
              ref={libraryRef}
              type="file"
              accept={IMAGE_ACCEPT}
              multiple
              className="hidden"
              onChange={(e) => void addFiles(e.target.files)}
            />
          </div>
        )}

        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              void submit();
            }
          }}
          placeholder={pending.length ? "Add a caption…" : placeholder}
          disabled={disabled || sending}
          className={
            inputClassName ??
            "min-w-0 flex-1 rounded-xl border border-gray-200 px-3 py-2.5 text-sm focus:border-fusion-red focus:outline-none focus:ring-2 focus:ring-fusion-red/20 disabled:opacity-60"
          }
        />
        <button
          type="button"
          disabled={!canSend}
          onClick={() => void submit()}
          className="h-11 shrink-0 rounded-xl px-4 text-sm font-semibold text-white disabled:opacity-50"
          style={{ backgroundColor: btnBg ?? "#ED1C24" }}
        >
          {sending ? "…" : "Send"}
        </button>
      </div>
    </div>
  );
}
