"use client";

import { useState } from "react";
import {
  getCampusConfig,
  isCampusEmail,
  validateCampusEmail,
  type CampusId,
} from "@fusion-express/shared/campus";

function existingAccountMessage(status: number, message: string): string | null {
  if (
    status === 409 ||
    /already in use|already exists|email-already-in-use/i.test(message)
  ) {
    return "Account already exists";
  }
  return null;
}

export function CampusEmailOtp({
  campus,
  initialEmail = "",
  verified,
  onVerified,
}: {
  campus: CampusId;
  initialEmail?: string;
  verified: boolean;
  onVerified: (email: string) => void;
}) {
  const cfg = getCampusConfig(campus);
  const hint = `Use your ${cfg.emailDomains.map((d) => `@${d}`).join(" or ")} email. We send a one-time code.`;
  const [email, setEmail] = useState(initialEmail);
  const [code, setCode] = useState("");
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [devCode, setDevCode] = useState("");

  async function requestCode() {
    setError("");
    const invalid = validateCampusEmail(email, campus);
    if (invalid) {
      setError(invalid);
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/otp/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, purpose: "signup", campus }),
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
        {cfg.name} email verified
        {initialEmail
          ? `: ${initialEmail}`
          : isCampusEmail(email, campus)
            ? `: ${email}`
            : ""}
        .
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div>
        <label htmlFor="campus-otp-email" className="block text-xs font-medium text-gray-600">
          {cfg.name} email
        </label>
        <input
          id="campus-otp-email"
          type="email"
          autoComplete="email"
          value={email}
          onChange={(e) => {
            setEmail(e.target.value);
            setSent(false);
          }}
          placeholder={
            campus === "cityu"
              ? "xxxxxx@my.cityu.edu.hk"
              : "1155xxxxxx@link.cuhk.edu.hk"
          }
          className="mt-1 w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-900 placeholder:text-gray-400 focus:border-fusion-red focus:outline-none focus:ring-2 focus:ring-fusion-red/20"
        />
        <p className="mt-1 text-xs text-gray-500">{hint}</p>
      </div>
      {!sent ? (
        <button
          type="button"
          onClick={() => void requestCode()}
          disabled={loading}
          className="min-h-11 w-full rounded-full bg-[#ED1C24] py-3 text-sm font-bold text-white disabled:opacity-60"
        >
          {loading ? "Sending…" : "Send verification code"}
        </button>
      ) : (
        <div className="space-y-3">
          <div>
            <label htmlFor="campus-otp-code" className="block text-xs font-medium text-gray-600">
              6-digit code
            </label>
            <input
              id="campus-otp-code"
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={6}
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
              className="mt-1 w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm tracking-widest text-gray-900 focus:border-fusion-red focus:outline-none focus:ring-2 focus:ring-fusion-red/20"
            />
          </div>
          {devCode ? (
            <p className="text-xs text-amber-700">Dev code: {devCode}</p>
          ) : null}
          <button
            type="button"
            onClick={() => void verify()}
            disabled={loading || code.length !== 6}
            className="min-h-11 w-full rounded-full bg-[#ED1C24] py-3 text-sm font-bold text-white disabled:opacity-60"
          >
            {loading ? "Verifying…" : "Verify email"}
          </button>
          <button
            type="button"
            onClick={() => void requestCode()}
            disabled={loading}
            className="w-full text-sm font-semibold text-[#ED1C24] underline"
          >
            Resend code
          </button>
        </div>
      )}
      {error ? (
        <p className="rounded-xl bg-red-50 px-4 py-2 text-sm text-red-700">{error}</p>
      ) : null}
    </div>
  );
}

