/**
 * Cute food-themed avatars — defaults instead of forcing a real photo.
 * Rendered as emoji + color locally so web and mobile stay offline-safe.
 */

export const AVATAR_IDS = [
  "sushi-cat",
  "boba-bear",
  "pizza-slice",
  "dumpling-bun",
  "taco-fox",
  "ramen-panda",
  "cookie-frog",
  "avocado-toast",
] as const;

export type AvatarId = (typeof AVATAR_IDS)[number];

export type AvatarDef = {
  id: AvatarId;
  label: string;
  emoji: string;
  /** Soft background for the circular badge. */
  bg: string;
};

export const AVATARS: readonly AvatarDef[] = [
  { id: "sushi-cat", label: "Sushi Cat", emoji: "🍣", bg: "#FFE8E0" },
  { id: "boba-bear", label: "Boba Bear", emoji: "🧋", bg: "#E8F4FF" },
  { id: "pizza-slice", label: "Pizza Slice", emoji: "🍕", bg: "#FFF3D6" },
  { id: "dumpling-bun", label: "Dumpling Bun", emoji: "🥟", bg: "#F0E8FF" },
  { id: "taco-fox", label: "Taco Fox", emoji: "🌮", bg: "#E8FFE8" },
  { id: "ramen-panda", label: "Ramen Panda", emoji: "🍜", bg: "#FFE8F0" },
  { id: "cookie-frog", label: "Cookie Frog", emoji: "🍪", bg: "#E8FFF4" },
  { id: "avocado-toast", label: "Avocado Toast", emoji: "🥑", bg: "#F0FFE8" },
] as const;

const AVATAR_BY_ID: Record<AvatarId, AvatarDef> = AVATARS.reduce(
  (acc, avatar) => {
    acc[avatar.id] = avatar;
    return acc;
  },
  {} as Record<AvatarId, AvatarDef>,
);

export function isAvatarId(value: unknown): value is AvatarId {
  return (
    typeof value === "string" &&
    (AVATAR_IDS as readonly string[]).includes(value)
  );
}

export function getAvatar(id: string | null | undefined): AvatarDef {
  if (id && isAvatarId(id)) return AVATAR_BY_ID[id];
  return AVATAR_BY_ID["sushi-cat"];
}

/** Stable default from uid / email so recreating the profile keeps the same face. */
export function pickDefaultAvatarId(seed?: string | null): AvatarId {
  const text = (seed ?? "").trim().toLowerCase();
  if (!text) return "sushi-cat";
  let hash = 0;
  for (let i = 0; i < text.length; i += 1) {
    hash = (hash * 31 + text.charCodeAt(i)) >>> 0;
  }
  return AVATAR_IDS[hash % AVATAR_IDS.length]!;
}

export type AvatarAudience = "self" | "runner" | "customer";

export type ResolvedAvatar =
  | { kind: "photo"; url: string; avatarId: AvatarId }
  | { kind: "avatar"; avatar: AvatarDef; avatarId: AvatarId };

function photoOf(profile: {
  photoURL?: string | null;
  photoUrl?: string | null;
}): string | null {
  const a = profile.photoUrl?.trim();
  if (a) return a;
  const b = profile.photoURL?.trim();
  return b || null;
}

/**
 * Who sees what:
 * - self: real photo if set, else cute avatar
 * - customer viewing runner: real photo if set, else cute avatar (trust at lobby)
 * - runner viewing customer: real photo only when showRealPhotoToRunners, else avatar
 */
export function resolveDisplayAvatar(
  profile: {
    avatarId?: string | null;
    photoURL?: string | null;
    photoUrl?: string | null;
    showRealPhotoToRunners?: boolean | null;
  } | null | undefined,
  audience: AvatarAudience,
  seed?: string | null,
): ResolvedAvatar {
  const avatarId = isAvatarId(profile?.avatarId)
    ? profile!.avatarId!
    : pickDefaultAvatarId(seed);
  const avatar = getAvatar(avatarId);
  const photo = photoOf(profile ?? {});

  if (audience === "runner") {
    if (profile?.showRealPhotoToRunners === true && photo) {
      return { kind: "photo", url: photo, avatarId };
    }
    return { kind: "avatar", avatar, avatarId };
  }

  if (photo) return { kind: "photo", url: photo, avatarId };
  return { kind: "avatar", avatar, avatarId };
}

/** Fields stamped on an order so counterparties need not read /users. */
export function customerAvatarStamp(profile: {
  avatarId?: string | null;
  photoURL?: string | null;
  photoUrl?: string | null;
  showRealPhotoToRunners?: boolean | null;
  uid?: string | null;
  email?: string | null;
}): { customerAvatarId: AvatarId; customerPhotoURL?: string } {
  const resolved = resolveDisplayAvatar(profile, "runner", profile.uid ?? profile.email);
  return {
    customerAvatarId: resolved.avatarId,
    ...(resolved.kind === "photo" ? { customerPhotoURL: resolved.url } : {}),
  };
}

export function runnerAvatarStamp(profile: {
  avatarId?: string | null;
  photoURL?: string | null;
  photoUrl?: string | null;
  uid?: string | null;
  email?: string | null;
}): { runnerAvatarId: AvatarId; runnerPhotoURL?: string } {
  const resolved = resolveDisplayAvatar(profile, "customer", profile.uid ?? profile.email);
  return {
    runnerAvatarId: resolved.avatarId,
    ...(resolved.kind === "photo" ? { runnerPhotoURL: resolved.url } : {}),
  };
}
