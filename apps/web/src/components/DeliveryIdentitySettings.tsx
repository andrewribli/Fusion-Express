"use client";

import { useEffect, useState } from "react";
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
  const [busy, setBusy] = useState(false);
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
      rememberProfile(applyIdentity(user, row));
    });
    return () => {
      cancelled = true;
    };
    // Load once per account. rememberProfile updates user and would loop.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.uid]);

  if (!user?.uid) return null;

  const previewName = showReal
    ? publicDeliveryName({
        ...user,
        displayName: displayName.trim() || null,
        isAnonymous: false,
      })
    : identity?.pseudonym || "Anonymous";

  async function persist(next: {
    displayName: string;
    showReal: boolean;
    photoUrl?: string | null;
    clearPhoto?: boolean;
    changePseudonym?: boolean;
  }): Promise<boolean> {
    if (!user) return false;
    setBusy(true);
    setError("");
    try {
      const saved = await saveMyDeliveryIdentity({
        displayName: next.displayName.trim() || null,
        isAnonymous: !next.showReal,
        photoUrl: next.photoUrl,
        clearPhoto: next.clearPhoto,
        changePseudonym: next.changePseudonym,
      });
      setIdentity(saved);
      setDisplayName(saved.displayName ?? "");
      setShowReal(!saved.isAnonymous);
      rememberProfile(applyIdentity(user, saved));
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
      setShowReal(!(identity?.isAnonymous ?? false));
      return false;
    } finally {
      setBusy(false);
    }
  }

  async function onPhoto(file: File | undefined) {
    if (!file || !user?.uid) return;
    setBusy(true);
    setError("");
    try {
      const url = await uploadAvatar(user.uid, file);
      await persist({
        displayName,
        showReal,
        photoUrl: url,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not upload that photo.");
      setBusy(false);
    }
  }

  const ownPhoto = identity?.photoUrl || user.photoUrl || user.photoURL || null;
  const avatarName = showReal ? previewName : identity?.pseudonym || "Anonymous";

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
          accept="image/*"
          capture="user"
          className="sr-only"
          disabled={busy}
          onChange={(event) => {
            const file = event.target.files?.[0];
            event.target.value = "";
            void onPhoto(file);
          }}
        />
        <span className="text-sm font-medium text-gray-800">
          Tap the photo to take one or choose from your gallery
        </span>
      </label>
      {identity?.photoUrl ? (
        <button
          type="button"
          disabled={busy}
          onClick={() => void persist({ displayName, showReal, clearPhoto: true })}
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
        onBlur={() => {
          if ((identity?.displayName ?? "") === displayName.trim()) return;
          void persist({ displayName, showReal });
        }}
        className="mt-1 w-full max-w-[390px] rounded-xl border border-gray-200 px-3 py-2.5 text-sm"
      />
      <p className="mt-1 max-w-[390px] truncate text-xs text-gray-500">
        On an active order they&apos;ll see: {previewName}
      </p>

      <label className="mt-4 flex min-h-11 items-start gap-3 text-sm text-gray-800">
        <input
          type="checkbox"
          className="mt-1 h-5 w-5 accent-[#ED1C24]"
          checked={showReal}
          disabled={busy}
          title={TOOLTIP}
          onChange={(event) => {
            const next = event.target.checked;
            setShowReal(next);
            void persist({ displayName, showReal: next });
          }}
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
          <p className="max-w-[390px] truncate text-sm font-semibold text-gray-900">
            You&apos;ll appear as: {identity.pseudonym}
          </p>
          <button
            type="button"
            disabled={busy || !identity.canChangePseudonym}
            onClick={() =>
              void persist({ displayName, showReal: false, changePseudonym: true })
            }
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

      {error ? <p className="mt-3 text-sm text-red-700">{error}</p> : null}
      {busy ? <p className="mt-2 text-xs text-gray-500">Saving…</p> : null}
    </section>
  );
}
