"use client";

import { useRef, useState } from "react";
import { useUser } from "@/context/UserContext";
import { updateUserProfileDoc } from "@/lib/users";
import { resolveProfilePhoto, uploadAvatar } from "@/lib/profile-photo";

export function ProfilePhotoSettings() {
  const { user, updateProfile, firebaseEnabled } = useUser();
  const inputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const photo = preview || resolveProfilePhoto(user);
  const canEdit = Boolean(user?.uid && firebaseEnabled && !user.isGuest);

  async function onPick(file: File | undefined) {
    if (!file || !user?.uid) return;
    setError("");
    setBusy(true);
    const local = URL.createObjectURL(file);
    setPreview(local);
    try {
      const url = await uploadAvatar(user.uid, file);
      await updateUserProfileDoc(user.uid, { photoURL: url, photoUrl: url });
      updateProfile({ ...user, photoURL: url, photoUrl: url });
      setPreview(url);
    } catch (err) {
      setPreview(null);
      setError(err instanceof Error ? err.message : "Could not save that photo.");
    } finally {
      setBusy(false);
      URL.revokeObjectURL(local);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <div className="mb-4 flex items-center gap-4">
      <button
        type="button"
        disabled={!canEdit || busy}
        onClick={() => inputRef.current?.click()}
        className="relative h-20 w-20 shrink-0 overflow-hidden rounded-full border border-gray-200 bg-gray-100"
        aria-label="Change profile photo"
      >
        {photo ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={photo} alt="" className="h-full w-full object-cover" />
        ) : (
          <span className="flex h-full w-full items-center justify-center text-lg font-bold text-[#ED1C24]">
            {(user?.fullName || "?").trim().slice(0, 1).toUpperCase()}
          </span>
        )}
      </button>
      <div className="min-w-0">
        <p className="text-sm font-semibold text-gray-900">Profile photo</p>
        <p className="mt-0.5 text-xs text-gray-500">
          {canEdit
            ? busy
              ? "Uploading…"
              : "Tap the circle to upload a photo. It shows on your profile and in the header."
            : "Sign in to add a profile photo."}
        </p>
        {error ? <p className="mt-1 text-xs text-[#ED1C24]">{error}</p> : null}
        {canEdit ? (
          <button
            type="button"
            disabled={busy}
            onClick={() => inputRef.current?.click()}
            className="mt-2 text-sm font-semibold text-[#ED1C24]"
          >
            {photo ? "Change photo" : "Add photo"}
          </button>
        ) : null}
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="sr-only"
        onChange={(event) => void onPick(event.target.files?.[0])}
      />
    </div>
  );
}
