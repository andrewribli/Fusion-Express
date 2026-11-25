"use client";

import {
  getAvatar,
  resolveDisplayAvatar,
  type AvatarAudience,
  type AvatarId,
} from "@fusion-express/shared/avatars";

type Size = "sm" | "md" | "lg";

const SIZE_CLASS: Record<Size, string> = {
  sm: "h-9 w-9 text-base",
  md: "h-12 w-12 text-xl",
  lg: "h-20 w-20 text-3xl",
};

export function AvatarBadge({
  avatarId,
  photoURL,
  showRealPhotoToRunners,
  audience = "self",
  seed,
  size = "md",
  className = "",
  alt = "",
}: {
  avatarId?: string | null;
  photoURL?: string | null;
  showRealPhotoToRunners?: boolean | null;
  audience?: AvatarAudience;
  seed?: string | null;
  size?: Size;
  className?: string;
  alt?: string;
}) {
  const resolved = resolveDisplayAvatar(
    { avatarId, photoURL, photoUrl: photoURL, showRealPhotoToRunners },
    audience,
    seed,
  );
  const box = `${SIZE_CLASS[size]} ${className}`.trim();

  if (resolved.kind === "photo") {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={resolved.url}
        alt={alt}
        className={`shrink-0 rounded-full object-cover ${box}`}
      />
    );
  }

  const avatar = resolved.avatar;
  return (
    <span
      className={`inline-flex shrink-0 items-center justify-center rounded-full ${box}`}
      style={{ backgroundColor: avatar.bg }}
      role="img"
      aria-label={alt || avatar.label}
    >
      <span aria-hidden>{avatar.emoji}</span>
    </span>
  );
}

/** Compact emoji chip for stamped order fields (no privacy resolve). */
export function StampedAvatar({
  avatarId,
  photoURL,
  size = "md",
  className = "",
  alt = "",
}: {
  avatarId?: string | null;
  photoURL?: string | null;
  size?: Size;
  className?: string;
  alt?: string;
}) {
  const box = `${SIZE_CLASS[size]} ${className}`.trim();
  const photo = photoURL?.trim();
  if (photo) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={photo}
        alt={alt}
        className={`shrink-0 rounded-full object-cover ${box}`}
      />
    );
  }
  const avatar = getAvatar(avatarId as AvatarId | undefined);
  return (
    <span
      className={`inline-flex shrink-0 items-center justify-center rounded-full ${box}`}
      style={{ backgroundColor: avatar.bg }}
      role="img"
      aria-label={alt || avatar.label}
    >
      <span aria-hidden>{avatar.emoji}</span>
    </span>
  );
}
