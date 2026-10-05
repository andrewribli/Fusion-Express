/**
 * Delivery-scoped identity.
 *
 * A pseudonym is generated once and stored on the user document. Callers must
 * keep that stored string. generatePseudonym() is a new draw every call.
 */

export const PSEUDONYM_COOLDOWN_MS = 30 * 24 * 60 * 60 * 1000;

export const DELIVERY_ADJECTIVES = [
  "Amber",
  "Bold",
  "Brave",
  "Bright",
  "Calm",
  "Clever",
  "Cosmic",
  "Cozy",
  "Daring",
  "Dizzy",
  "Dreamy",
  "Eager",
  "Fancy",
  "Fluffy",
  "Gentle",
  "Happy",
  "Jolly",
  "Kind",
  "Lively",
  "Lucky",
  "Merry",
  "Misty",
  "Noble",
  "Plucky",
  "Proud",
  "Quiet",
  "Rapid",
  "Silly",
  "Sleepy",
  "Snappy",
  "Sunny",
  "Swift",
  "Tiny",
  "Trusty",
  "Vivid",
  "Warm",
  "Wise",
  "Witty",
  "Zesty",
  "Zippy",
] as const;

export const DELIVERY_ANIMALS = [
  "Badger",
  "Bear",
  "Crane",
  "Deer",
  "Dolphin",
  "Dove",
  "Duck",
  "Eagle",
  "Falcon",
  "Finch",
  "Fox",
  "Frog",
  "Gecko",
  "Goose",
  "Hare",
  "Heron",
  "Koala",
  "Lark",
  "Lynx",
  "Mole",
  "Moose",
  "Mouse",
  "Newt",
  "Otter",
  "Owl",
  "Panda",
  "Piper",
  "Quail",
  "Rabbit",
  "Robin",
  "Seal",
  "Shrew",
  "Snail",
  "Sparrow",
  "Swan",
  "Tiger",
  "Toad",
  "Turtle",
  "Wren",
  "Yak",
] as const;

const ADJECTIVE_SET = new Set<string>(DELIVERY_ADJECTIVES);
const ANIMAL_SET = new Set<string>(DELIVERY_ANIMALS);

export type DeliveryProfileFields = {
  displayName?: string | null;
  fullName?: string | null;
  email?: string | null;
  photoUrl?: string | null;
  photoURL?: string | null;
  isAnonymous?: boolean | null;
  pseudonym?: string | null;
};

export function generatePseudonym(random: () => number = Math.random): string {
  const adjective =
    DELIVERY_ADJECTIVES[Math.floor(random() * DELIVERY_ADJECTIVES.length)] ??
    "Calm";
  const animal =
    DELIVERY_ANIMALS[Math.floor(random() * DELIVERY_ANIMALS.length)] ?? "Otter";
  return `Anonymous ${adjective} ${animal}`;
}

/** True only for a stored adjective + animal pseudonym. */
export function isListedPseudonym(value: string): boolean {
  const parts = value.trim().split(" ");
  if (parts.length !== 3 || parts[0] !== "Anonymous") return false;
  return ADJECTIVE_SET.has(parts[1] ?? "") && ANIMAL_SET.has(parts[2] ?? "");
}

export function pseudonymChangeAllowed(
  lastChanged: Date | null | undefined,
  now: Date = new Date(),
): boolean {
  if (!lastChanged || Number.isNaN(lastChanged.getTime())) return true;
  return now.getTime() - lastChanged.getTime() >= PSEUDONYM_COOLDOWN_MS;
}

function emailPrefix(email: string | null | undefined): string {
  const prefix = (email ?? "").trim().split("@")[0]?.trim() ?? "";
  if (!prefix || prefix.includes(" ")) return "";
  return prefix;
}

/**
 * Name the other person on this order is allowed to see.
 * Anonymous users show the stored pseudonym. Everyone else shows their
 * delivery display name, then their account name, then the email prefix.
 * The full email address is never returned.
 */
export function publicDeliveryName(
  profile: DeliveryProfileFields,
  fallback = "Customer",
): string {
  if (profile.isAnonymous === true) {
    const stored = profile.pseudonym?.trim() ?? "";
    if (stored && isListedPseudonym(stored)) return stored;
    return "Anonymous";
  }
  const display = profile.displayName?.trim() ?? "";
  if (display && !display.includes("@")) return display;
  const full = profile.fullName?.trim() ?? "";
  if (full && !full.includes("@")) return full;
  return emailPrefix(profile.email) || fallback;
}

/** Photo the other person may see. Hidden while anonymous. */
export function publicDeliveryPhoto(profile: DeliveryProfileFields): string | null {
  if (profile.isAnonymous === true) return null;
  const url = profile.photoUrl?.trim() || profile.photoURL?.trim() || "";
  return url || null;
}

/** Admin console: account name, never the pseudonym. */
export function adminRealName(
  profile: DeliveryProfileFields,
  fallback = "Customer",
): string {
  const full = profile.fullName?.trim() ?? "";
  if (full) return full;
  const display = profile.displayName?.trim() ?? "";
  if (display && !display.includes("@")) return display;
  return emailPrefix(profile.email) || fallback;
}

/** Admin console: uploaded photo, even when the user is anonymous to a delivery partner. */
export function adminRealPhoto(profile: DeliveryProfileFields): string | null {
  const url = profile.photoUrl?.trim() || profile.photoURL?.trim() || "";
  return url || null;
}
