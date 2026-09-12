"use client";

import { useState } from "react";
import { useUser } from "@/context/UserContext";
import { submitFeedback } from "@/lib/feedback";

export function FeedbackButton() {
  const { user } = useUser();
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError("");
    setSending(true);
    try {
      await submitFeedback({
        userId: user?.uid || "anonymous",
        userName: user?.fullName || user?.username,
        message,
      });
      setMessage("");
      setDone(true);
      window.setTimeout(() => setDone(false), 4000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not send feedback.");
    } finally {
      setSending(false);
    }
  }

  return (
    <form
      onSubmit={(e) => void onSubmit(e)}
      className="fixed bottom-24 right-3 z-40 w-[min(22rem,calc(100vw-1.5rem))] rounded-2xl border border-gray-100 bg-white p-4 shadow-2xl md:bottom-6 md:right-6"
    >
      <p className="text-base font-bold text-gray-900">Give us feedback 😊</p>
      <p className="mt-0.5 text-xs text-gray-500">
        What worked, what was confusing, or what we should add.
      </p>
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
      {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
      {done && (
        <p className="mt-2 text-xs font-medium text-green-700">
          Thanks — we got it.
        </p>
      )}
      <button
        type="submit"
        disabled={sending || !message.trim()}
        className="mt-3 w-full rounded-xl bg-[#ED1C24] py-3.5 text-sm font-bold text-white shadow-sm hover:bg-[#d11920] disabled:opacity-50"
      >
        {sending ? "Sending…" : "Give us feedback 😊"}
      </button>
    </form>
  );
}
