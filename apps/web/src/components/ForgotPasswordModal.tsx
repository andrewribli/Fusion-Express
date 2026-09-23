"use client";

import { useEffect, useState } from "react";
import { doc, getDoc } from "firebase/firestore";
import {
  normalizeUsername,
  validateEmail,
  validatePassword,
} from "@/lib/auth";
import { collectionName } from "@/lib/constants";
import { getDb, isFirebaseConfigured } from "@/lib/firebase";

type Step = "email" | "code" | "password" | "done";

/** Resolve a username to the CUHK email stored on the usernames map. */
async function resolveResetEmail(identifier: string): Promise<string> {
  const trimmed = identifier.trim().toLowerCase();
  if (!trimmed) {
    throw new Error("Enter your CUHK email or username");
  }
  if (trimmed.includes("@")) {
    const emailErr = validateEmail(trimmed);
    if (emailErr) throw new Error(emailErr);
    return trimmed;
  }

  if (!isFirebaseConfigured()) {
    throw new Error("Enter your full CUHK email (@link.cuhk.edu.hk)");
  }

  const snap = await getDoc(
    doc(getDb(), collectionName("usernames"), normalizeUsername(trimmed)),
  );
  const mapped = snap.exists() ? snap.data().email : undefined;
  if (typeof mapped === "string" && mapped.includes("@")) {
    const email = mapped.trim().toLowerCase();
    const emailErr = validateEmail(email);
    if (emailErr) throw new Error(emailErr);
    return email;
  }
  throw new Error("No account found with this username.");
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
  const [step, setStep] = useState<Step>("email");
  const [identifier, setIdentifier] = useState("");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [devCode, setDevCode] = useState("");

  // Only reset form state when the modal opens or the seed email changes —
  // not when loading flips (that used to wipe the flow mid-request).
  useEffect(() => {
    if (!open) return;
    setStep("email");
    setIdentifier(initialEmail.trim());
    setEmail("");
    setCode("");
    setPassword("");
    setConfirm("");
    setLoading(false);
    setError("");
    setDevCode("");
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
    // intentionally omit onClose — reset only on open + seed value
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, initialEmail]);

  if (!open) return null;

  async function sendCode() {
    setError("");
    setLoading(true);
    try {
      const resolved = await resolveResetEmail(identifier);
      const res = await fetch("/api/otp/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: resolved, purpose: "reset" }),
      });
      const data = (await res.json()) as { error?: string; devCode?: string };
      if (!res.ok) {
        setError(data.error ?? "Could not send code");
        return;
      }
      setEmail(resolved);
      setIdentifier(resolved);
      setDevCode(data.devCode ?? "");
      setStep("code");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not send code");
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
              Enter your university email (@link.cuhk.edu.hk or
              @my.cityu.edu.hk) or username. We&apos;ll send a GraceRun
              verification code right away.
            </p>
            <div>
              <label
                htmlFor="reset-email"
                className="block text-xs font-medium text-gray-600"
              >
                Email or username
              </label>
              <input
                id="reset-email"
                type="text"
                required
                autoComplete="username"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                placeholder="1155xxxxxx@link.cuhk.edu.hk or username"
                className="mt-1 w-full rounded-lg border border-gray-200 bg-white px-4 py-3 text-sm text-gray-900 focus:border-[#ED1C24] focus:outline-none focus:ring-2 focus:ring-[#ED1C24]/20"
              />
            </div>
            {error && (
              <p className="rounded-lg bg-red-50 px-4 py-2 text-sm text-red-700">
                {error}
              </p>
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
              onChange={(e) =>
                setCode(e.target.value.replace(/\D/g, "").slice(0, 6))
              }
              className="w-full rounded-lg border border-gray-200 px-4 py-3 text-sm tracking-widest"
            />
            {devCode && (
              <p className="text-xs text-amber-700">Dev code: {devCode}</p>
            )}
            {error && (
              <p className="rounded-lg bg-red-50 px-4 py-2 text-sm text-red-700">
                {error}
              </p>
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
              <p className="rounded-lg bg-red-50 px-4 py-2 text-sm text-red-700">
                {error}
              </p>
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
