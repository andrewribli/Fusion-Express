"use client";

import { useEffect, useState } from "react";
import { changePassword, validatePassword } from "@/lib/auth";
import { PasswordInput } from "@/components/PasswordInput";

function changeErrorMessage(err: unknown): string {
  const code =
    err && typeof err === "object" && "code" in err
      ? String((err as { code: string }).code)
      : err instanceof Error
        ? err.message
        : "";
  if (code.includes("wrong-password") || code.includes("invalid-credential")) {
    return "Current password is incorrect";
  }
  if (code.includes("weak-password")) {
    return "New password must be at least 6 characters";
  }
  if (code.includes("requires-recent-login")) {
    return "Please sign out and sign in again, then change your password.";
  }
  if (err instanceof Error && err.message) return err.message;
  return "Could not change password. Try again.";
}

export function ChangePasswordModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) return;
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
    setLoading(false);
    setDone(false);
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
  }, [open, loading, onClose]);

  if (!open) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    const newErr = validatePassword(newPassword);
    if (newErr) {
      setError(newErr);
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("New passwords do not match");
      return;
    }
    if (currentPassword === newPassword) {
      setError("New password must be different from your current password");
      return;
    }
    setLoading(true);
    try {
      await changePassword(currentPassword, newPassword);
      setDone(true);
    } catch (err) {
      setError(changeErrorMessage(err));
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
        aria-labelledby="change-password-title"
      >
        <h2 id="change-password-title" className="text-lg font-bold text-gray-900">
          Change password
        </h2>
        {done ? (
          <>
            <p className="mt-3 text-sm text-gray-700">
              Your password has been updated.
            </p>
            <button
              type="button"
              onClick={onClose}
              className="mt-5 w-full rounded-xl bg-[#ED1C24] py-3 text-sm font-semibold text-white"
            >
              Done
            </button>
          </>
        ) : (
          <form onSubmit={(e) => void handleSubmit(e)} className="mt-3 space-y-4">
            <PasswordInput
              id="current-password"
              label="Current password"
              required
              autoComplete="current-password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
            />
            <PasswordInput
              id="new-password"
              label="New password"
              required
              autoComplete="new-password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
            />
            <PasswordInput
              id="confirm-new-password"
              label="Confirm new password"
              required
              autoComplete="new-password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
            />
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
                {loading ? "Saving…" : "Update password"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
