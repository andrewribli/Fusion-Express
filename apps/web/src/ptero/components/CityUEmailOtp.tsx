"use client";

import { useState } from "react";
import {
  isCityUStudentEmail,
  validateCityUStudentEmail,
} from "@/ptero/lib/cityu-email";
import { formInputClassName } from "@/ptero/components/DeliveryAddressFields";

export function CityUEmailOtp({
  initialEmail = "",
  verified,
  onVerified,
  hint = "Use your @cityu.edu.hk or @my.cityu.edu.hk email. We send a one-time code.",
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
    const invalid = validateCityUStudentEmail(email);
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
      const data = (await res.json()) as {
        error?: string;
        message?: string;
        devCode?: string;
      };
      if (!res.ok) {
        setError(data.error ?? data.message ?? "Could not send code");
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
        CityU email verified
        {initialEmail
          ? `: ${initialEmail}`
          : isCityUStudentEmail(email)
            ? `: ${email}`
            : ""}
        .
      </div>
    );
  }

  return (
    <div className="space-y-3 rounded-2xl border border-gray-100 bg-white p-4">
      <p className="text-xs text-gray-500">{hint}</p>
      <label className="block text-xs font-medium text-gray-600">
        CityU email
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="name@my.cityu.edu.hk"
          className={formInputClassName}
          autoComplete="email"
        />
      </label>
      {!sent ? (
        <button
          type="button"
          disabled={loading}
          onClick={() => void requestCode()}
          className="w-full rounded-xl bg-[#ED1C24] py-2.5 text-sm font-bold text-white disabled:opacity-60"
        >
          {loading ? "Sending…" : "Send verification code"}
        </button>
      ) : (
        <>
          {devCode ? (
            <p className="rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800">
              Prototype code (email not configured):{" "}
              <span className="font-mono font-bold">{devCode}</span>
            </p>
          ) : (
            <p className="text-xs text-gray-500">
              Code sent. Check your CityU inbox.
            </p>
          )}
          <label className="block text-xs font-medium text-gray-600">
            6-digit code
            <input
              inputMode="numeric"
              maxLength={6}
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
              className={formInputClassName}
            />
          </label>
          <button
            type="button"
            disabled={loading || code.length !== 6}
            onClick={() => void verify()}
            className="w-full rounded-xl bg-emerald-500 py-2.5 text-sm font-bold text-white disabled:opacity-60"
          >
            {loading ? "Verifying…" : "Verify code"}
          </button>
          <button
            type="button"
            disabled={loading}
            onClick={() => void requestCode()}
            className="w-full text-xs font-semibold text-gray-500 underline"
          >
            Resend code
          </button>
        </>
      )}
      {error ? (
        <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
      ) : null}
    </div>
  );
}
