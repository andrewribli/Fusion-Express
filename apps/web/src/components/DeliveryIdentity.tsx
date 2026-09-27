"use client";

import { useEffect, useState } from "react";
import type { UserProfile } from "@/context/UserContext";
import { fetchUserProfile } from "@/lib/users";
import {
  lookupOrderParty,
  type PartyFace,
} from "@/lib/delivery-identity-client";

const AVATAR_COLORS = [
  "#ED1C24",
  "#111827",
  "#0F766E",
  "#1D4ED8",
  "#B45309",
  "#7C3AED",
  "#BE185D",
  "#0369A1",
];

function colorFor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i += 1) {
    hash = (hash + name.charCodeAt(i) * (i + 1)) % AVATAR_COLORS.length;
  }
  return AVATAR_COLORS[hash] ?? AVATAR_COLORS[0];
}

export function useOrderParty(orderId: string | undefined): PartyFace | null {
  const [party, setParty] = useState<PartyFace | null>(null);
  useEffect(() => {
    if (!orderId) return;
    let cancelled = false;
    void lookupOrderParty(orderId).then((face) => {
      if (!cancelled) setParty(face);
    });
    return () => {
      cancelled = true;
    };
  }, [orderId]);
  return party;
}

export function PartyAvatar({
  name,
  photoUrl,
  size = 44,
}: {
  name: string;
  photoUrl?: string | null;
  size?: number;
}) {
  const letter = (name.trim()[0] || "?").toUpperCase();
  return (
    <span
      className="inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full text-sm font-bold text-white"
      style={{
        width: size,
        height: size,
        minWidth: size,
        minHeight: size,
        backgroundColor: colorFor(name),
      }}
      aria-hidden
    >
      {photoUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={photoUrl} alt="" className="h-full w-full object-cover" />
      ) : (
        letter
      )}
    </span>
  );
}

/** Customer or runner on this order: label, avatar, and truncated name. */
export function OrderCounterparty({
  orderId,
  label,
  tone = "light",
}: {
  orderId: string;
  label: string;
  tone?: "light" | "dark";
}) {
  const party = useOrderParty(orderId);
  if (!party?.name) return null;
  const text = tone === "dark" ? "text-white" : "text-gray-900";
  return (
    <div className="flex min-w-0 items-center gap-3">
      <PartyAvatar name={party.name} photoUrl={party.photoUrl} />
      <p className={`min-w-0 max-w-[min(100%,390px)] truncate text-sm font-semibold ${text}`}>
        {label} {party.name}
      </p>
    </div>
  );
}

/** Runner card title. Never the Firestore document id. */
export function CustomerPartyName({
  orderId,
  className = "",
}: {
  orderId: string;
  className?: string;
}) {
  const party = useOrderParty(orderId);
  const name = party?.name?.trim() || "Customer";
  return (
    <span className={`inline-block min-w-0 max-w-[min(100%,390px)] truncate align-bottom ${className}`}>
      {name}
    </span>
  );
}

/**
 * Admin surfaces. Reads the user document the admin is already allowed to
 * open, and always shows the account name and uploaded photo.
 */
export function AdminRealPerson({
  uid,
  fallbackName,
}: {
  uid?: string;
  fallbackName: string;
}) {
  const [person, setPerson] = useState<{
    name: string;
    photoUrl: string | null;
  } | null>(null);

  useEffect(() => {
    const id = uid?.trim();
    if (!id) return;
    let cancelled = false;
    void fetchUserProfile(id).then((profile) => {
      if (cancelled || !profile) return;
      const name = profile.fullName?.trim() || fallbackName;
      setPerson({
        name,
        photoUrl: profile.photoUrl || profile.photoURL || null,
      });
    });
    return () => {
      cancelled = true;
    };
  }, [uid, fallbackName]);

  const name = person?.name || fallbackName;
  return (
    <span className="mt-1 flex min-w-0 items-center gap-2">
      <PartyAvatar name={name} photoUrl={person?.photoUrl} />
      <span className="min-w-0 max-w-[390px] truncate text-sm font-semibold text-gray-900">
        {name}
      </span>
    </span>
  );
}

export function adminProfilePhoto(profile: UserProfile): string | null {
  return profile.photoUrl || profile.photoURL || null;
}
