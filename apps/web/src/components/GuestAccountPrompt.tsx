"use client";

import { useState } from "react";
import Link from "next/link";
import {
  isGuestSyntheticEmail,
  setPasswordFromGuestTemp,
  validatePassword,
} from "@/lib/auth";
import { PasswordInput } from "@/components/PasswordInput";
import { useUser } from "@/context/UserContext";
import { useDemoAuth } from "@/lib/use-demo-auth";

/**
 * Shown after guest checkout so the customer can optionally set a password
 * (and later add email on Profile) without blocking the order.
 */
export function GuestAccountPrompt({
  compact = false,
}: {
  compact?: boolean;
}) {
  const { user, updateProfile, firebaseEnabled } = useUser();
  const demoAuth = useDemoAuth();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");
  const [dismissed, setDismissed] = useState(false);

  if (dismissed || done) {
    if (done) {
      return (
        <div className="rounded-2xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">
          Password saved. You can sign in with your phone number next time.
        </div>
      );
    }
    return null;
  }

  if (!user?.isGuest || !user.phone) return null;
  if (!firebaseEnabled || demoAuth) {
    return (
      <div className="rounded-2xl border border-lakers-gold/40 bg-white px-4 py-3 text-sm text-gray-700 shadow-sm">
        <p className="font-semibold text-gray-900">Order confirmed</p>
        <p className="mt-1 text-xs text-gray-600">
          Your guest account is tied to phone {user.phone}. Add a real password
          and email anytime from{" "}
          <Link href="/profile" className="font-semibold text-[#ED1C24] underline">
            Profile
          </Link>
          .
        </p>
      </div>
    );
  }

  if (!isGuestSyntheticEmail(user.email)) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    const err = validatePassword(password);
    if (err) {
      setError(err);
      return;
    }
    if (password !== confirm) {
      setError("Passwords do not match");
      return;
    }
    setLoading(true);
    try {
      await setPasswordFromGuestTemp(user!.phone!, password);
      updateProfile({ ...user!, isGuest: true });
      setDone(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not set password");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section
      className={`rounded-2xl border border-[#ED1C24]/25 bg-white shadow-sm ${
        compact ? "p-4" : "p-5"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-sm font-bold text-gray-900">
            Optional: set a password
          </h2>
          <p className="mt-1 text-xs text-gray-600">
            Your order is placed. Set a password now so you can track orders on
            other devices with phone {user.phone}. You can skip this.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setDismissed(true)}
          className="shrink-0 text-xs font-semibold text-gray-500 hover:text-gray-800"
        >
          Skip
        </button>
      </div>
      <form onSubmit={(e) => void handleSubmit(e)} className="mt-3 space-y-3">
        <PasswordInput
          id="guest-set-password"
          label="New password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="new-password"
          required
        />
        <PasswordInput
          id="guest-set-password-confirm"
          label="Confirm password"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          autoComplete="new-password"
          required
        />
        {error && (
          <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </p>
        )}
        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-xl bg-[#ED1C24] py-3 text-sm font-semibold text-white disabled:opacity-60"
        >
          {loading ? "Saving…" : "Save password"}
        </button>
      </form>
      <p className="mt-2 text-xs text-gray-500">
        Want to add an email later? Open{" "}
        <Link href="/profile#account" className="font-semibold text-[#ED1C24] underline">
          Profile
        </Link>
        .
      </p>
    </section>
  );
}
