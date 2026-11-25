"use client";

import { useRef, useState } from "react";
import { AVATARS, type AvatarId } from "@fusion-express/shared/avatars";
import { useUser } from "@/context/UserContext";
import { updateUserProfileDoc } from "@/lib/users";
import { resolveProfilePhoto, uploadAvatar } from "@/lib/profile-photo";
import { AvatarBadge } from "@/components/AvatarBadge";

export function ProfilePhotoSettings() {
  const { user, updateProfile, firebaseEnabled } = useUser();
  const inputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const photo = preview || resolveProfilePhoto(user);
  const canEdit = Boolean(user?.uid && firebaseEnabled && !user.isGuest);
  const avatarId = (user?.avatarId as AvatarId | undefined) ?? undefined;
  const showReal = user?.showRealPhotoToRunners === true;

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

  async function selectAvatar(id: AvatarId) {
    if (!user?.uid || !canEdit) return;
    setError("");
    setBusy(true);
    try {
      await updateUserProfileDoc(user.uid, { avatarId: id });
      updateProfile({ ...user, avatarId: id });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save avatar.");
    } finally {
      setBusy(false);
    }
  }

  async function toggleShowReal(next: boolean) {
    if (!user?.uid || !canEdit) return;
    setError("");
    setBusy(true);
    try {
      await updateUserProfileDoc(user.uid, { showRealPhotoToRunners: next });
      updateProfile({ ...user, showRealPhotoToRunners: next });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save preference.");
    } finally {
      setBusy(false);
    }
  }

  async function clearPhoto() {
    if (!user?.uid || !canEdit) return;
    setBusy(true);
    setError("");
    try {
      await updateUserProfileDoc(user.uid, { photoURL: "", photoUrl: "" });
      updateProfile({ ...user, photoURL: undefined, photoUrl: undefined });
      setPreview(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not remove photo.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mb-4 space-y-4">
      <div className="flex items-center gap-4">
        <AvatarBadge
          avatarId={avatarId}
          photoURL={photo}
          audience="self"
          seed={user?.uid ?? user?.email}
          size="lg"
          alt={user?.fullName || "Profile"}
        />
        <div className="min-w-0">
          <p className="text-sm font-semibold text-gray-900">Avatar &amp; photo</p>
          <p className="mt-0.5 text-xs text-gray-500">
            {canEdit
              ? busy
                ? "Saving…"
                : "Pick a cute food avatar. Real photo is optional."
              : "Sign in to customize your avatar."}
          </p>
          {error ? <p className="mt-1 text-xs text-[#ED1C24]">{error}</p> : null}
          {canEdit ? (
            <div className="mt-2 flex flex-wrap gap-3">
              <button
                type="button"
                disabled={busy}
                onClick={() => inputRef.current?.click()}
                className="text-sm font-semibold text-[#ED1C24]"
              >
                {photo ? "Change real photo" : "Upload real photo"}
              </button>
              {photo ? (
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void clearPhoto()}
                  className="text-sm font-semibold text-gray-500"
                >
                  Remove photo
                </button>
              ) : null}
            </div>
          ) : null}
        </div>
      </div>

      {canEdit ? (
        <div>
          <p className="text-xs font-medium text-gray-600">Cute avatar</p>
          <div className="mt-2 grid grid-cols-4 gap-2">
            {AVATARS.map((avatar) => {
              const selected = avatarId === avatar.id;
              return (
                <button
                  key={avatar.id}
                  type="button"
                  disabled={busy}
                  onClick={() => void selectAvatar(avatar.id)}
                  className={`flex flex-col items-center rounded-xl border px-1 py-2 text-center ${
                    selected
                      ? "border-[#ED1C24] bg-red-50"
                      : "border-gray-200 bg-white"
                  }`}
                  aria-pressed={selected}
                  aria-label={avatar.label}
                >
                  <span
                    className="flex h-10 w-10 items-center justify-center rounded-full text-xl"
                    style={{ backgroundColor: avatar.bg }}
                  >
                    {avatar.emoji}
                  </span>
                  <span className="mt-1 line-clamp-2 text-[10px] font-medium text-gray-600">
                    {avatar.label}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      ) : null}

      {canEdit ? (
        <label className="flex items-start gap-2 text-sm text-gray-700">
          <input
            type="checkbox"
            className="mt-0.5"
            checked={showReal}
            disabled={busy || !photo}
            onChange={(e) => void toggleShowReal(e.target.checked)}
          />
          <span>
            <span className="font-medium">Show my real photo to runners</span>
            <span className="mt-0.5 block text-xs text-gray-500">
              Off by default. When off, runners see your cute avatar — same idea as
              Anonymous Frog for names.
              {!photo ? " Upload a photo first to enable this." : null}
            </span>
          </span>
        </label>
      ) : null}

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
