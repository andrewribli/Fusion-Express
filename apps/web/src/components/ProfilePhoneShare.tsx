"use client";

import { useState } from "react";
import { normalizePhone, validatePhone } from "@/lib/auth";
import { useUser } from "@/context/UserContext";
import { updateUserProfileDoc } from "@/lib/users";

/**
 * Privacy opt-in: share a phone with the assigned runner for Call / WhatsApp.
 * Off by default — number is stamped on new orders only when enabled.
 */
export function ProfilePhoneShare() {
  const { user, updateProfile, firebaseEnabled } = useUser();
  const [phone, setPhone] = useState(user?.phone ?? "");
  const [share, setShare] = useState(user?.sharePhoneWithRunner === true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);
  const canEdit = Boolean(user?.uid && firebaseEnabled && !user.isGuest);

  async function save() {
    if (!user?.uid || !canEdit) return;
    setError("");
    setSaved(false);
    const trimmed = phone.trim();
    if (share) {
      const phoneErr = validatePhone(trimmed);
      if (phoneErr) {
        setError(phoneErr);
        return;
      }
    }
    setBusy(true);
    try {
      const digits = trimmed ? normalizePhone(trimmed) : "";
      const next = {
        phone: digits || undefined,
        sharePhoneWithRunner: share && Boolean(digits),
      };
      await updateUserProfileDoc(user.uid, next);
      updateProfile({
        ...user,
        phone: next.phone,
        sharePhoneWithRunner: next.sharePhoneWithRunner,
      });
      setShare(next.sharePhoneWithRunner);
      setSaved(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save.");
    } finally {
      setBusy(false);
    }
  }

  if (!canEdit) return null;

  return (
    <div className="mb-4 space-y-3 rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
      <div>
        <p className="text-sm font-semibold text-gray-900">
          Runner Call / WhatsApp
        </p>
        <p className="mt-0.5 text-xs text-gray-500">
          Off by default. When on, your number is shared only with the assigned
          runner on new orders — for one-tap Call or WhatsApp.
        </p>
      </div>
      <label className="flex items-start gap-2 text-sm text-gray-700">
        <input
          type="checkbox"
          className="mt-0.5"
          checked={share}
          disabled={busy}
          onChange={(e) => {
            setShare(e.target.checked);
            setSaved(false);
          }}
        />
        <span className="font-medium">Share my phone with my runner</span>
      </label>
      <div>
        <label
          htmlFor="share-phone"
          className="text-xs font-medium text-gray-600"
        >
          Mobile number
        </label>
        <input
          id="share-phone"
          type="tel"
          inputMode="tel"
          autoComplete="tel"
          value={phone}
          disabled={busy}
          onChange={(e) => {
            setPhone(e.target.value);
            setSaved(false);
          }}
          placeholder="e.g. 5123 4567"
          className="mt-1 w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm focus:border-fusion-red focus:outline-none focus:ring-2 focus:ring-fusion-red/20"
        />
      </div>
      {error ? <p className="text-xs text-[#ED1C24]">{error}</p> : null}
      {saved ? (
        <p className="text-xs text-emerald-700">Saved for future orders.</p>
      ) : null}
      <button
        type="button"
        disabled={busy}
        onClick={() => void save()}
        className="rounded-xl bg-[#ED1C24] px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
      >
        {busy ? "Saving…" : "Save contact preference"}
      </button>
    </div>
  );
}
