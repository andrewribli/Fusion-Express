"use client";

import { useState } from "react";
import { getAuthClient } from "@/lib/firebase";
import { useUser } from "@/context/UserContext";

export function DeleteAccountModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const { user, logout } = useUser();
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  if (!open) return null;

  async function onDelete() {
    if (confirm.trim().toUpperCase() !== "DELETE") {
      setError("Type DELETE to confirm.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const token = await getAuthClient().currentUser?.getIdToken();
      if (!token) throw new Error("Sign in again to delete your account.");
      const res = await fetch("/api/account/delete", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      const body = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) throw new Error(body.error || "Could not delete account.");
      await logout();
      window.location.href = "/";
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not delete account.");
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/40 px-4">
      <div className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-xl">
        <h2 className="text-lg font-bold text-gray-900">Delete account</h2>
        <p className="mt-2 text-sm text-gray-600">
          This permanently removes {user?.email || "your account"} and cannot be
          undone. Type DELETE to confirm.
        </p>
        <input
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          placeholder="DELETE"
          className="mt-3 w-full rounded-xl border border-gray-200 px-3 py-2 text-sm"
        />
        {error ? <p className="mt-2 text-sm text-[#ED1C24]">{error}</p> : null}
        <div className="mt-4 flex gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            className="flex-1 rounded-xl border border-gray-200 py-2 text-sm font-semibold"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => void onDelete()}
            disabled={busy}
            className="flex-1 rounded-xl bg-[#ED1C24] py-2 text-sm font-semibold text-white"
          >
            {busy ? "Deleting…" : "Delete"}
          </button>
        </div>
      </div>
    </div>
  );
}
