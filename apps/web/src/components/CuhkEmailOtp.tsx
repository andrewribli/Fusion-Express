"use client";

import { useState } from "react";
import { isCuhkStudentEmail, validateCuhkStudentEmail } from "@/lib/constants";

function existingAccountMessage(status: number, message: string): string | null {
  if (
    status === 409 ||
    /already in use|already exists|email-already-in-use/i.test(message)
  ) {
    return "Account already exists";
  }
  return null;
}

export function CuhkEmailOtp({
  initialEmail = "",
  verified,
  onVerified,
  hint = "Use your @link.cuhk.edu.hk email. We send a one-time code.",
}: {
  initialEmail?: string;
  verified: boolean;
  onVerified: (email: string) => void;
  hint?: string;
}) {
  const [email, setEmail] = useState(initialEmail);
  const [code, setCode] = useState("");
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [devCode, setDevCode] = useState("");

  async function requestCode() {
    setError("");
    const invalid = validateCuhkStudentEmail(email);
    if (invalid) {
      setError(invalid);
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/otp/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, purpose: "signup" }),
      });
      let data: { error?: string; message?: string; devCode?: string } = {};
      try {
        data = (await res.json()) as typeof data;
      } catch {
        setError(
          res.status === 409 ? "Account already exists" : "Could not send code",
        );
        return;
      }
      if (!res.ok) {
        const raw = data.error ?? data.message ?? "";
        setError(
          existingAccountMessage(res.status, raw) ??
            (raw || "Could not send code"),
        );
        return;
      }
      setSent(true);
      setDevCode(data.devCode ?? "");
    } catch {
      setError("Could not send code");
    } finally {
      setLoading(false);
    }
  }

  async function verify() {
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/otp/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, code, purpose: "signup" }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        setError(data.error ?? "Could not verify code");
        return;
      }
      onVerified(email.trim().toLowerCase());
    } catch {
      setError("Could not verify code");
    } finally {
      setLoading(false);
    }
  }

  if (verified) {
    return (
      <div className="rounded-xl bg-green-50 px-4 py-3 text-sm text-green-800">
        CUHK email verified
        {initialEmail ? `: ${initialEmail}` : isCuhkStudentEmail(email) ? `: ${email}` : ""}.
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-gray-100 bg-gray-50 p-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
        CUHK student verification
      </p>
      <p className="mt-1 text-sm text-gray-600">{hint}</p>
      <div className="mt-3 space-y-3">
        <div>
          <label className="block text-xs font-medium text-gray-600">
            Email
          </label>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                if (sent) void verify();
                else void requestCode();
              }
            }}
            placeholder="1155xxxxxx@link.cuhk.edu.hk"
            className="mt-1 w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm"
          />
        </div>
        {sent && (
          <div>
            <label className="block text-xs font-medium text-gray-600">
              6-digit code
            </label>
            <input
              inputMode="numeric"
              autoComplete="one-time-code"
              required
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  void verify();
                }
              }}
              className="mt-1 w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm tracking-widest"
            />
            {devCode && (
              <p className="mt-1 text-xs text-amber-700">Dev code: {devCode}</p>
            )}
          </div>
        )}
        {error && (
          <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
        )}
        <button
          type="button"
          disabled={loading}
          onClick={() => (sent ? void verify() : void requestCode())}
          className="w-full rounded-xl bg-[#ED1C24] py-3 text-sm font-semibold text-white disabled:opacity-60"
        >
          {loading
            ? "Please wait…"
            : sent
              ? "Verify code"
              : "Send Verification Code"}
        </button>
        {sent && (
          <button
            type="button"
            disabled={loading}
            onClick={() => void requestCode()}
            className="w-full text-xs font-medium text-gray-500 underline"
          >
            Resend code
          </button>
        )}
      </div>
    </div>
  );
}
