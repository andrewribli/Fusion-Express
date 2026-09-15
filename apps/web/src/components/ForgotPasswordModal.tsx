"use client";

import { useEffect, useState } from "react";
import { validateEmail, validatePassword } from "@/lib/auth";

type Step = "email" | "code" | "password" | "done";

export function ForgotPasswordModal({
  open,
  onClose,
  initialEmail = "",
}: {
  open: boolean;
  onClose: () => void;
  initialEmail?: string;
}) {
  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [devCode, setDevCode] = useState("");

  useEffect(() => {
    if (!open) return;
    setStep("email");
    setEmail(initialEmail.trim());
    setCode("");
    setPassword("");
    setConfirm("");
    setLoading(false);
    setError("");
    setDevCode("");
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

  async function sendCode() {
    setError("");
    const trimmed = email.trim().toLowerCase();
    const emailErr = validateEmail(trimmed);
    if (emailErr) {
      setError(emailErr);
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/otp/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: trimmed, purpose: "reset" }),
      });
      const data = (await res.json()) as { error?: string; devCode?: string };
      if (!res.ok) {
        setError(data.error ?? "Could not send code");
        return;
      }
      setEmail(trimmed);
      setDevCode(data.devCode ?? "");
      setStep("code");
    } catch {
      setError("Could not send code");
    } finally {
      setLoading(false);
    }
  }

  async function verifyCode() {
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/otp/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, code, purpose: "reset" }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        setError(data.error ?? "Could not verify code");
        return;
      }
      setStep("password");
    } catch {
      setError("Could not verify code");
    } finally {
      setLoading(false);
    }
  }

  async function savePassword() {
    setError("");
    const passErr = validatePassword(password);
    if (passErr) {
      setError(passErr);
      return;
    }
    if (password !== confirm) {
      setError("Passwords do not match");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/password-reset/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        setError(data.error ?? "Could not update password");
        return;
      }
      setStep("done");
    } catch {
      setError("Could not update password");
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

        {step === "done" ? (
          <>
            <p className="mt-3 text-sm text-gray-700">
              Password updated. You can sign in with your new password.
            </p>
            <button
              type="button"
              onClick={onClose}
              className="mt-5 min-h-11 w-full rounded-full bg-[#ED1C24] py-3 text-sm font-semibold text-white"
            >
              Back to sign in
            </button>
          </>
        ) : step === "email" ? (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void sendCode();
            }}
            className="mt-3 space-y-4"
          >
            <p className="text-sm text-gray-600">
              Enter your CUHK (@link.cuhk.edu.hk) email. We&apos;ll send a
              GraceRun verification code right away.
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
                placeholder="1155xxxxxx@link.cuhk.edu.hk"
                className="mt-1 w-full rounded-lg border border-gray-200 bg-white px-4 py-3 text-sm text-gray-900 focus:border-[#ED1C24] focus:outline-none focus:ring-2 focus:ring-[#ED1C24]/20"
              />
            </div>
            {error && (
              <p className="rounded-lg bg-red-50 px-4 py-2 text-sm text-red-700">{error}</p>
            )}
            <div className="flex gap-3">
              <button
                type="button"
                onClick={onClose}
                disabled={loading}
                className="min-h-11 flex-1 rounded-lg border border-gray-300 py-3 text-sm font-semibold text-gray-700 disabled:opacity-60"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="min-h-11 flex-1 rounded-full bg-[#ED1C24] py-3 text-sm font-semibold text-white disabled:opacity-60"
              >
                {loading ? "Sending…" : "Send code"}
              </button>
            </div>
          </form>
        ) : step === "code" ? (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void verifyCode();
            }}
            className="mt-3 space-y-4"
          >
            <p className="text-sm text-gray-600">
              Enter the 6-digit code we sent to {email}.
            </p>
            <input
              inputMode="numeric"
              autoComplete="one-time-code"
              required
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
              className="w-full rounded-lg border border-gray-200 px-4 py-3 text-sm tracking-widest"
            />
            {devCode && (
              <p className="text-xs text-amber-700">Dev code: {devCode}</p>
            )}
            {error && (
              <p className="rounded-lg bg-red-50 px-4 py-2 text-sm text-red-700">{error}</p>
            )}
            <div className="flex gap-3">
              <button
                type="button"
                disabled={loading}
                onClick={() => void sendCode()}
                className="min-h-11 flex-1 rounded-lg border border-gray-300 py-3 text-sm font-semibold text-gray-700 disabled:opacity-60"
              >
                Resend
              </button>
              <button
                type="submit"
                disabled={loading || code.length !== 6}
                className="min-h-11 flex-1 rounded-full bg-[#ED1C24] py-3 text-sm font-semibold text-white disabled:opacity-60"
              >
                {loading ? "Checking…" : "Verify"}
              </button>
            </div>
          </form>
        ) : (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void savePassword();
            }}
            className="mt-3 space-y-4"
          >
            <p className="text-sm text-gray-600">Choose a new password.</p>
            <input
              type="password"
              required
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="New password"
              className="w-full rounded-lg border border-gray-200 px-4 py-3 text-sm"
            />
            <input
              type="password"
              required
              autoComplete="new-password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              placeholder="Confirm password"
              className="w-full rounded-lg border border-gray-200 px-4 py-3 text-sm"
            />
            {error && (
              <p className="rounded-lg bg-red-50 px-4 py-2 text-sm text-red-700">{error}</p>
            )}
            <button
              type="submit"
              disabled={loading}
              className="min-h-11 w-full rounded-full bg-[#ED1C24] py-3 text-sm font-semibold text-white disabled:opacity-60"
            >
              {loading ? "Saving…" : "Update password"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
