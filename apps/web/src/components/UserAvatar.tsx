"use client";

import { useState } from "react";
import type { UserProfile } from "@/context/UserContext";

/** Prefer delivery/account photo (`photoUrl`), then Firebase Auth `photoURL`. */
export function resolveProfilePhoto(
  user: Pick<UserProfile, "photoUrl" | "photoURL"> | null | undefined,
): string | null {
  const a = user?.photoUrl?.trim();
  if (a) return a;
  const b = user?.photoURL?.trim();
  return b || null;
}

export function profileInitials(
  user: Pick<UserProfile, "fullName" | "email" | "displayName"> | null | undefined,
): string {
  const name = (user?.fullName || user?.displayName || "").trim();
  const parts = name.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return `${parts[0]![0] ?? ""}${parts[1]![0] ?? ""}`.toUpperCase();
  }
  if (parts.length === 1 && parts[0]!.length >= 2) {
    return parts[0]!.slice(0, 2).toUpperCase();
  }
  if (parts.length === 1 && parts[0]!.length === 1) {
    return parts[0]!.toUpperCase();
  }
  const handle = (user?.email || "").replace(/[^a-zA-Z0-9]/g, "");
  if (handle.length >= 2) return handle.slice(0, 2).toUpperCase();
  if (handle.length === 1) return handle.toUpperCase();
  return "";
}

function DefaultUserIcon({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden>
      <path d="M12 12a4 4 0 1 0-4-4 4 4 0 0 0 4 4Zm0 2c-4.42 0-8 2.24-8 5v1h16v-1c0-2.76-3.58-5-8-5Z" />
    </svg>
  );
}

type UserAvatarProps = {
  user: UserProfile | null | undefined;
  /** Pixel size of the circle (default matches header AccountMenu). */
  size?: number;
  className?: string;
  /** Override photo (e.g. local upload preview). */
  photoUrl?: string | null;
  /** Override initials source name. */
  name?: string | null;
};

/**
 * Same circular avatar used in the header: photo when set, else red
 * two-letter initials. Use everywhere a profile icon appears.
 */
export function UserAvatar({
  user,
  size = 36,
  className = "",
  photoUrl,
  name,
}: UserAvatarProps) {
  const [imageFailed, setImageFailed] = useState(false);
  const photo =
    (photoUrl !== undefined ? photoUrl?.trim() || null : null) ??
    resolveProfilePhoto(user);
  const showPhoto = Boolean(photo) && !imageFailed;
  const letters = name?.trim()
    ? profileInitials({ fullName: name, email: user?.email })
    : profileInitials(user);

  const style = {
    width: size,
    height: size,
    minWidth: size,
    minHeight: size,
    fontSize: Math.max(10, Math.round(size * 0.31)),
  } as const;

  if (!user && !photo && !name) {
    return (
      <span
        className={`inline-flex items-center justify-center rounded-full bg-[#2a2a2a] text-gray-300 ${className}`}
        style={style}
        aria-hidden
      >
        <DefaultUserIcon className="h-4 w-4" />
      </span>
    );
  }

  if (showPhoto && photo) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={photo}
        alt=""
        className={`rounded-full object-cover ${className}`}
        style={style}
        onError={() => setImageFailed(true)}
      />
    );
  }

  return (
    <span
      className={`inline-flex items-center justify-center rounded-full bg-[#ED1C24] font-bold text-white ${className}`}
      style={style}
      aria-hidden
    >
      {letters || <DefaultUserIcon className="h-4 w-4 text-white" />}
    </span>
  );
}
