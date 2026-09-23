"use client";

import { useState } from "react";
import { useCart } from "@/ptero/context/CartContext";

/**
 * Floating feedback button — same chrome affordance as CUHK GraceRun.
 * Prototype: stores feedback in localStorage only.
 */
export function FeedbackButton() {
  const { itemCount } = useCart();
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [sent, setSent] = useState(false);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = message.trim();
    if (!trimmed) return;
    try {
      const key = "gracerun_cityu_feedback";
      const prev = JSON.parse(localStorage.getItem(key) ?? "[]") as unknown[];
      prev.unshift({
        message: trimmed,
        at: new Date().toISOString(),
        path: window.location.pathname,
      });
      localStorage.setItem(key, JSON.stringify(prev.slice(0, 50)));
    } catch {
      /* ignore */
    }
    setMessage("");
    setSent(true);
    setTimeout(() => {
      setSent(false);
      setOpen(false);
    }, 1600);
  }

  const bottomClass =
    itemCount > 0
      ? "bottom-[11.5rem] md:bottom-8"
      : "bottom-24 md:bottom-6";

  return (
    <div className={`fixed right-4 z-[70] ${bottomClass}`}>
      {open && (
        <form
          onSubmit={submit}
          className="mb-2 w-72 rounded-2xl border border-gray-200 bg-white p-3 shadow-xl"
        >
          <p className="text-xs font-bold text-gray-900">Send feedback</p>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={3}
            placeholder="What's working? What's missing?"
            className="mt-2 w-full rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none focus:border-[#ED1C24]"
          />
          <button
            type="submit"
            className="mt-2 w-full rounded-xl bg-[#ED1C24] py-2 text-sm font-bold text-white"
          >
            {sent ? "Thanks!" : "Submit"}
          </button>
        </form>
      )}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="rounded-full bg-gray-900 px-4 py-2.5 text-xs font-bold text-white shadow-lg hover:bg-gray-800"
      >
        Feedback
      </button>
    </div>
  );
}
