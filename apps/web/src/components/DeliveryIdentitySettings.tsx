"use client";

import { useEffect, useMemo, useState } from "react";
import { useUser, type UserProfile } from "@/context/UserContext";
import { publicDeliveryName } from "@fusion-express/shared/delivery-identity";
import {
  fetchMyDeliveryIdentity,
  saveMyDeliveryIdentity,
  uploadAvatar,
  type DeliveryIdentityState,
} from "@/lib/delivery-identity-client";
import { PartyAvatar } from "@/components/DeliveryIdentity";

const TOOLTIP =
  "You can change this anytime. The other party only sees this on active orders.";

function applyIdentity(user: UserProfile, identity: DeliveryIdentityState): UserProfile {
  return {
    ...user,
    displayName: identity.displayName,
    photoUrl: identity.photoUrl,
    isAnonymous: identity.isAnonymous,
    pseudonym: identity.pseudonym,
    pseudonymChangedAt: identity.pseudonymChangedAt,
  };
}

export function DeliveryIdentitySettings() {
  const { user, rememberProfile } = useUser();
  const [identity, setIdentity] = useState<DeliveryIdentityState | null>(null);
  const [displayName, setDisplayName] = useState("");
  const [showReal, setShowReal] = useState(true);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [clearPhoto, setClearPhoto] = useState(false);
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [savedFlash, setSavedFlash] = useState(false);
  const [error, setError] = useState("");
  const [tipOpen, setTipOpen] = useState(false);

  useEffect(() => {
    if (!user?.uid) return;
    let cancelled = false;
    void fetchMyDeliveryIdentity().then((row) => {
      if (cancelled || !row) return;
      setIdentity(row);
      setDisplayName(row.displayName ?? "");
      setShowReal(!row.isAnonymous);
      setPhotoUrl(row.photoUrl);
      setPreviewUrl(null);
      setClearPhoto(false);
      rememberProfile(applyIdentity(user, row));
    });
    return () => {
      cancelled = true;
    };
    // Load once per account. rememberProfile updates user and would loop.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.uid]);

  useEffect(() => {
    return () => {
      if (previewUrl?.startsWith("blob:")) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  const dirty = useMemo(() => {
    if (!identity) return false;
    const nameNow = displayName.trim();
    const nameSaved = (identity.displayName ?? "").trim();
    if (nameNow !== nameSaved) return true;
    if (showReal === identity.isAnonymous) return true;
    if (clearPhoto && identity.photoUrl) return true;
    if (photoUrl && photoUrl !== identity.photoUrl) return true;
    return false;
  }, [identity, displayName, showReal, clearPhoto, photoUrl]);

  if (!user?.uid) return null;

  const previewName = showReal
    ? publicDeliveryName({
        ...user,
        displayName: displayName.trim() || null,
        isAnonymous: false,
      })
    : identity?.pseudonym || "Anonymous";

  const ownPhoto =
    previewUrl ||
    (!clearPhoto ? photoUrl || identity?.photoUrl || user.photoUrl || user.photoURL || null : null);
  const avatarName = showReal ? previewName : identity?.pseudonym || "Anonymous";

  async function saveAll(extra?: { changePseudonym?: boolean }): Promise<boolean> {
    if (!user) return false;
    setBusy(true);
    setError("");
    setSavedFlash(false);
    try {
      const saved = await saveMyDeliveryIdentity({
        displayName: displayName.trim() || null,
        isAnonymous: !showReal,
        photoUrl: clearPhoto ? undefined : photoUrl ?? undefined,
        clearPhoto: clearPhoto || undefined,
        changePseudonym: extra?.changePseudonym,
      });
      setIdentity(saved);
      setDisplayName(saved.displayName ?? "");
      setShowReal(!saved.isAnonymous);
      setPhotoUrl(saved.photoUrl);
      setClearPhoto(false);
      if (previewUrl?.startsWith("blob:")) URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
      rememberProfile(applyIdentity(user, saved));
      setSavedFlash(true);
      window.setTimeout(() => setSavedFlash(false), 2500);
      return true;
    } catch (err) {
      const retryAt = (err as { retryAt?: string }).retryAt;
      const message = err instanceof Error ? err.message : "Could not save.";
      setError(
        retryAt
          ? `${message} Next change ${new Date(retryAt).toLocaleDateString("en-HK", {
              day: "numeric",
              month: "short",
              year: "numeric",
            })}.`
          : message,
      );
      return false;
    } finally {
      setBusy(false);
    }
  }

  async function onPhoto(file: File | undefined) {
    if (!file || !user?.uid) return;
    setError("");
    setUploading(true);
    const local = URL.createObjectURL(file);
    if (previewUrl?.startsWith("blob:")) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(local);
    setClearPhoto(false);
    try {
      const url = await uploadAvatar(user.uid, file);
      setPhotoUrl(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not upload that photo.");
      setPreviewUrl(null);
      URL.revokeObjectURL(local);
    } finally {
      setUploading(false);
    }
  }

  return (
    <section className="mt-4 rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <h2 className="text-sm font-semibold text-gray-500">On a delivery</h2>
        <button
          type="button"
          className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-full border border-gray-200 text-sm font-bold text-gray-600"
          title={TOOLTIP}
          aria-label="About delivery names"
          aria-expanded={tipOpen}
          onClick={() => setTipOpen((open) => !open)}
        >
          i
        </button>
      </div>
      {tipOpen ? (
        <p className="mt-2 text-xs leading-relaxed text-gray-600">{TOOLTIP}</p>
      ) : null}

      <label className="mt-3 flex min-h-11 cursor-pointer items-center gap-3">
        <PartyAvatar name={avatarName} photoUrl={ownPhoto} />
        <span className="sr-only">Profile photo</span>
        <input
          type="file"
          accept="image/*,image/jpeg,image/png,image/webp,image/heic,image/heif"
          capture="user"
          className="sr-only"
          disabled={busy || uploading}
          onChange={(event) => {
            const file = event.target.files?.[0];
            event.target.value = "";
            void onPhoto(file);
          }}
        />
        <span className="text-sm font-medium text-gray-800">
          {uploading
            ? "Uploading photo…"
            : "Tap the photo to take one or choose from your gallery"}
        </span>
      </label>
      {(photoUrl || identity?.photoUrl) && !clearPhoto ? (
        <button
          type="button"
          disabled={busy || uploading}
          onClick={() => {
            setClearPhoto(true);
            setPhotoUrl(null);
            if (previewUrl?.startsWith("blob:")) URL.revokeObjectURL(previewUrl);
            setPreviewUrl(null);
          }}
          className="mt-2 min-h-11 text-sm font-semibold text-[#ED1C24]"
        >
          Remove photo
        </button>
      ) : null}

      <label className="mt-4 block text-sm font-medium text-gray-800" htmlFor="delivery-display-name">
        Delivery name
      </label>
      <input
        id="delivery-display-name"
        value={displayName}
        maxLength={40}
        disabled={busy}
        placeholder={user.fullName || "Your name"}
        onChange={(event) => setDisplayName(event.target.value)}
        className="mt-1 w-full max-w-[390px] rounded-xl border border-gray-200 px-3 py-2.5 text-sm"
      />
      <p className="mt-1 max-w-[390px] break-words text-xs text-gray-500">
        On an active order they&apos;ll see: {previewName}
      </p>

      <label className="mt-4 flex min-h-11 items-start gap-3 text-sm text-gray-800">
        <input
          type="checkbox"
          className="mt-1 h-5 w-5 accent-[#ED1C24]"
          checked={showReal}
          disabled={busy}
          title={TOOLTIP}
          onChange={(event) => setShowReal(event.target.checked)}
        />
        <span>
          Show my real name and photo to the person I&apos;m delivering to / receiving from
        </span>
      </label>

      {!showReal ? (
        <p className="mt-2 text-xs text-gray-500">They won&apos;t see your photo.</p>
      ) : null}

      {!showReal && identity?.pseudonym ? (
        <div className="mt-3 rounded-xl bg-gray-50 px-3 py-3">
          <p className="max-w-[390px] break-words text-sm font-semibold text-gray-900">
            You&apos;ll appear as: {identity.pseudonym}
          </p>
          <button
            type="button"
            disabled={busy || uploading || !identity.canChangePseudonym}
            onClick={() => void saveAll({ changePseudonym: true })}
            className="mt-2 min-h-11 rounded-xl border border-gray-300 px-3 text-sm font-semibold text-gray-800 disabled:opacity-50"
          >
            Change pseudonym
          </button>
          {!identity.canChangePseudonym && identity.pseudonymChangedAt ? (
            <p className="mt-1 text-xs text-gray-500">
              You can change this name again on{" "}
              {new Date(
                new Date(identity.pseudonymChangedAt).getTime() + 30 * 24 * 60 * 60 * 1000,
              ).toLocaleDateString("en-HK", {
                day: "numeric",
                month: "short",
                year: "numeric",
              })}
              .
            </p>
          ) : null}
        </div>
      ) : null}

      <button
        type="button"
        disabled={busy || uploading || !dirty}
        onClick={() => void saveAll()}
        className="mt-4 min-h-12 w-full rounded-xl bg-[#ED1C24] text-sm font-bold text-white disabled:opacity-50"
      >
        {busy ? "Saving…" : "Save profile"}
      </button>
      {savedFlash ? (
        <p className="mt-2 text-sm font-medium text-emerald-700">Saved.</p>
      ) : null}
      {error ? <p className="mt-3 text-sm text-red-700">{error}</p> : null}
    </section>
  );
}
