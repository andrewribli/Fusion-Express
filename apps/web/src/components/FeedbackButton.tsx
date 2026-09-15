"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useUser } from "@/context/UserContext";
import { feedbackErrorMessage, submitFeedback } from "@/lib/feedback";

export function FeedbackButton() {
  const { user } = useUser();
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    function onPointerDown(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
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
  }, [open]);

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError("");
    setSending(true);
    try {
      if (!user?.uid && !user?.studentId) {
        throw new Error("Sign in to send feedback.");
      }
      await submitFeedback({
        userId: user.uid ?? user.studentId!,
        userName: user.fullName || user.username,
        message,
      });
      setMessage("");
      setDone(true);
      window.setTimeout(() => {
        setDone(false);
        setOpen(false);
      }, 1600);
    } catch (err) {
      setError(feedbackErrorMessage(err));
    } finally {
      setSending(false);
    }
  }

  return (
    <div
      ref={rootRef}
      className="fixed bottom-28 right-3 z-40 md:bottom-6 md:right-6"
    >
      {open ? (
        <form
          onSubmit={(e) => void onSubmit(e)}
          className="w-[min(22rem,calc(100vw-1.5rem))] rounded-2xl border border-gray-100 bg-white p-4 shadow-2xl"
        >
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-base font-bold text-gray-900">Give us feedback 😊</p>
              <p className="mt-0.5 text-xs text-gray-500">
                What worked, what was confusing, or what we should add.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-2xl leading-none text-gray-500 hover:bg-gray-100"
              aria-label="Close feedback"
            >
              ×
            </button>
          </div>
          <textarea
            required
            value={message}
            onChange={(event) => {
              setMessage(event.target.value);
              setDone(false);
            }}
            rows={4}
            maxLength={2000}
            placeholder="Type here…"
            className="mt-3 w-full resize-none rounded-xl border border-gray-200 px-3 py-3 text-sm text-gray-900 placeholder:text-gray-400 focus:border-[#ED1C24] focus:outline-none focus:ring-2 focus:ring-red-100"
          />
          {!user && (
            <p className="mt-2 text-xs text-gray-600">
              <Link href="/login" className="font-semibold text-[#ED1C24] underline">
                Sign in
              </Link>{" "}
              to send feedback.
            </p>
          )}
          {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
          {done && (
            <p className="mt-2 text-xs font-medium text-green-700">
              Thanks — we got it.
            </p>
          )}
          <button
            type="submit"
            disabled={sending || !message.trim() || !user}
            className="mt-3 min-h-11 w-full rounded-xl bg-[#ED1C24] py-3.5 text-sm font-bold text-white shadow-sm hover:bg-[#d11920] disabled:opacity-50"
          >
            {sending ? "Sending…" : "Give us feedback 😊"}
          </button>
        </form>
      ) : (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="flex h-11 w-11 items-center justify-center rounded-full bg-[#ED1C24]/90 text-white shadow-lg backdrop-blur hover:bg-[#d11920] md:h-12 md:w-12"
          aria-label="Give us feedback"
          aria-expanded={false}
        >
          <svg viewBox="0 0 24 24" className="h-6 w-6" fill="currentColor" aria-hidden>
            <path d="M4 4h16a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H8.4L4 20.4V6a2 2 0 0 1 2-2Zm2 4v2h12V8H6Zm0 4v2h8v-2H6Z" />
          </svg>
        </button>
      )}
    </div>
  );
}
