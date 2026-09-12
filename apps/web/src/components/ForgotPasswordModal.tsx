"use client";

import { useEffect, useState } from "react";
import { sendPasswordReset, validateEmail, validateUsername } from "@/lib/auth";

function resetErrorMessage(err: unknown): string {
  const code =
    err && typeof err === "object" && "code" in err
      ? String((err as { code: string }).code)
      : err instanceof Error
        ? err.message
        : "";
  if (code.includes("invalid-email")) return "Invalid email";
  if (code.includes("user-not-found")) return "Email not found";
  if (code.includes("too-many-requests")) {
    return "Too many attempts. Please try again later.";
  }
  return "Could not send reset email. Try again.";
}

export function ForgotPasswordModal({
  open,
  onClose,
  initialEmail = "",
}: {
  open: boolean;
  onClose: () => void;
  initialEmail?: string;
}) {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) return;
    setEmail(initialEmail.trim());
    setLoading(false);
    setSent(false);
    setError("");
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !loading) onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [open, loading, onClose, initialEmail]);

  if (!open) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    const trimmed = email.trim();
    const emailErr = trimmed.includes("@")
      ? validateEmail(trimmed)
      : validateUsername(trimmed);
    if (emailErr) {
      setError(emailErr);
      return;
    }
    setLoading(true);
    try {
      await sendPasswordReset(email);
      setSent(true);
    } catch (err) {
      setError(resetErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-end justify-center bg-black/50 p-4 sm:items-center">
      <div
        className="w-full max-w-[480px] rounded-2xl bg-white p-5 shadow-xl"
        role="dialog"
        aria-modal="true"
        aria-labelledby="forgot-password-title"
      >
        <h2 id="forgot-password-title" className="text-lg font-bold text-gray-900">
          Reset password
        </h2>
        {sent ? (
          <>
            <p className="mt-3 text-sm text-gray-700">
              Check your email for a password reset link.
            </p>
            <button
              type="button"
              onClick={onClose}
              className="mt-5 w-full rounded-xl bg-[#ED1C24] py-3 text-sm font-semibold text-white"
            >
              Back to sign in
            </button>
          </>
        ) : (
          <form onSubmit={(e) => void handleSubmit(e)} className="mt-3 space-y-4">
            <p className="text-sm text-gray-600">
              Enter your CUHK (@link.cuhk.edu.hk) email or username. We&apos;ll
              email a reset link if that account exists. Check spam if you do not
              see it within a few minutes.
            </p>
            <div>
              <label htmlFor="reset-email" className="block text-xs font-medium text-gray-600">
                Email
              </label>
              <input
                id="reset-email"
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="1155xxxxxx@link.cuhk.edu.hk or username"
                className="mt-1 w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-900 focus:border-[#ED1C24] focus:outline-none focus:ring-2 focus:ring-[#ED1C24]/20"
              />
            </div>
            {error && (
              <p className="rounded-xl bg-red-50 px-4 py-2 text-sm text-red-700">{error}</p>
            )}
            <div className="flex gap-3">
              <button
                type="button"
                onClick={onClose}
                disabled={loading}
                className="flex-1 rounded-xl border border-gray-300 py-3 text-sm font-semibold text-gray-700 disabled:opacity-60"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex-1 rounded-xl bg-[#ED1C24] py-3 text-sm font-semibold text-white disabled:opacity-60"
              >
                {loading ? "Sending…" : "Send Reset Link"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
