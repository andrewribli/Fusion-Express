import "server-only";
import { FieldValue, Timestamp, type Firestore } from "firebase-admin/firestore";
import {
  adminRealName,
  adminRealPhoto,
  generatePseudonym,
  isListedPseudonym,
  pseudonymChangeAllowed,
  publicDeliveryName,
  publicDeliveryPhoto,
  type DeliveryProfileFields,
} from "@fusion-express/shared/delivery-identity";
import { collectionName } from "@/lib/constants";
import {
  callerIsAdmin,
  type AuthedRequest,
} from "@/lib/firebase-admin";

export type PartyFace = {
  name: string;
  photoUrl: string | null;
};

const CLAIMABLE = new Set(["pending", "paid"]);

function asDate(value: unknown): Date | null {
  if (!value) return null;
  if (value instanceof Date && !Number.isNaN(value.getTime())) return value;
  if (
    typeof value === "object" &&
    value &&
    "toDate" in value &&
    typeof (value as { toDate: () => Date }).toDate === "function"
  ) {
    const date = (value as { toDate: () => Date }).toDate();
    return Number.isNaN(date.getTime()) ? null : date;
  }
  return null;
}

function profileFromDoc(data: Record<string, unknown>): DeliveryProfileFields {
  return {
    displayName: typeof data.displayName === "string" ? data.displayName : null,
    fullName: typeof data.fullName === "string" ? data.fullName : null,
    email: typeof data.email === "string" ? data.email : null,
    photoUrl: typeof data.photoUrl === "string" ? data.photoUrl : null,
    photoURL: typeof data.photoURL === "string" ? data.photoURL : null,
    isAnonymous: data.isAnonymous === true,
    pseudonym: typeof data.pseudonym === "string" ? data.pseudonym : null,
  };
}

/**
 * Who may see the other person.
 * - customer: the order's customer, looking at the assigned runner
 * - runner: the assigned runner, looking at the customer
 * - board: a runner browsing a still-unclaimed pending/paid order
 * Anyone else gets nothing, including another runner's active job.
 */
export type DeliveryAccess = "customer" | "runner" | "board" | "none";

export function deliveryAccess(opts: {
  callerUid: string;
  callerIsRunner: boolean;
  callerRunnerId?: string;
  order: Record<string, unknown>;
}): DeliveryAccess {
  const status = String(opts.order.status ?? "");
  if (status === "cancelled") return "none";
  const customerId = String(opts.order.customerId ?? "").trim();
  const runnerUid = String(opts.order.runnerUid ?? "").trim();
  const runnerId = String(opts.order.runnerId ?? "").trim();
  if (customerId && customerId === opts.callerUid) return "customer";
  if (runnerUid && runnerUid === opts.callerUid) return "runner";
  if (
    runnerId &&
    opts.callerRunnerId &&
    runnerId === opts.callerRunnerId
  ) {
    return "runner";
  }
  const unassigned = !runnerUid && !runnerId;
  if (
    opts.callerIsRunner &&
    unassigned &&
    CLAIMABLE.has(status) &&
    customerId !== opts.callerUid
  ) {
    return "board";
  }
  return "none";
}

function faceFor(
  profile: DeliveryProfileFields,
  admin: boolean,
  fallback: string,
): PartyFace {
  if (admin) {
    return {
      name: adminRealName(profile, fallback),
      photoUrl: adminRealPhoto(profile),
    };
  }
  return {
    name: publicDeliveryName(profile, fallback),
    photoUrl: publicDeliveryPhoto(profile),
  };
}

function snapshotName(value: unknown, orderId: string, fallback: string): string {
  if (typeof value !== "string") return fallback;
  const name = value.trim();
  if (!name || name === orderId || name.includes("@")) return fallback;
  return name;
}

/**
 * The other party on this order. Returns null when the caller is not on it,
 * or the customer has no runner yet. Response is name + photo only.
 */
export async function counterpartyForOrder(
  db: Firestore,
  auth: AuthedRequest,
  orderId: string,
): Promise<PartyFace | null> {
  const users = collectionName("users");
  const callerSnap = await db.collection(users).doc(auth.uid).get();
  const callerData = callerSnap.data() ?? {};
  const orderSnap = await db.collection(collectionName("orders")).doc(orderId).get();
  if (!orderSnap.exists) return null;
  const order = orderSnap.data() ?? {};
  const access = deliveryAccess({
    callerUid: auth.uid,
    callerIsRunner: callerData.isRunner === true,
    callerRunnerId:
      typeof callerData.runnerId === "string" ? callerData.runnerId : "",
    order,
  });
  if (access === "none") return null;

  const admin = await callerIsAdmin(auth.uid, auth.idToken);
  if (access === "customer") {
    const runnerUid = String(order.runnerUid ?? "").trim();
    if (!runnerUid) return null;
    const runnerSnap = await db.collection(users).doc(runnerUid).get();
    if (!runnerSnap.exists) {
      return {
        name: snapshotName(order.runnerName, orderId, "Runner"),
        photoUrl: null,
      };
    }
    return faceFor(profileFromDoc(runnerSnap.data() ?? {}), admin, "Runner");
  }

  const customerId = String(order.customerId ?? "").trim();
  if (!customerId) {
    return {
      name: snapshotName(order.customerName, orderId, "Customer"),
      photoUrl: null,
    };
  }
  const customerSnap = await db.collection(users).doc(customerId).get();
  if (!customerSnap.exists) {
    return {
      name: snapshotName(order.customerName, orderId, "Customer"),
      photoUrl: null,
    };
  }
  return faceFor(profileFromDoc(customerSnap.data() ?? {}), admin, "Customer");
}

export function sanitizeDisplayName(value: unknown): string | null {
  if (value == null) return null;
  if (typeof value !== "string") {
    throw new Error("Display name is invalid.");
  }
  const trimmed = value.trim().replace(/\s+/g, " ");
  if (!trimmed) return null;
  if (trimmed.length > 40) {
    throw new Error("Display name must be 40 characters or fewer.");
  }
  if (trimmed.includes("@")) {
    throw new Error("Display name cannot be an email address.");
  }
  return trimmed;
}

/** Download URL must point at this user's own avatar object. */
export function sanitizeAvatarUrl(value: unknown, uid: string): string | null {
  if (value == null || value === "") return null;
  if (typeof value !== "string" || value.length > 2000) {
    throw new Error("Photo is invalid.");
  }
  if (!value.startsWith("https://")) {
    throw new Error("Photo is invalid.");
  }
  let decoded = value;
  try {
    decoded = decodeURIComponent(value);
  } catch {
    decoded = value;
  }
  const needle = `avatars/${uid}/avatar.jpg`;
  if (!decoded.includes(needle)) {
    throw new Error("Photo must be your own avatar.");
  }
  return value;
}

export type DeliveryIdentityState = {
  displayName: string | null;
  photoUrl: string | null;
  isAnonymous: boolean;
  pseudonym: string | null;
  pseudonymChangedAt: string | null;
  canChangePseudonym: boolean;
};

function stateFrom(
  data: Record<string, unknown>,
  now: Date,
): DeliveryIdentityState {
  const changed = asDate(data.pseudonymChangedAt);
  const pseudonym =
    typeof data.pseudonym === "string" && isListedPseudonym(data.pseudonym)
      ? data.pseudonym
      : null;
  return {
    displayName:
      typeof data.displayName === "string" && data.displayName.trim()
        ? data.displayName.trim()
        : null,
    photoUrl:
      typeof data.photoUrl === "string" && data.photoUrl.trim()
        ? data.photoUrl.trim()
        : null,
    isAnonymous: data.isAnonymous === true,
    pseudonym,
    pseudonymChangedAt: changed ? changed.toISOString() : null,
    canChangePseudonym: pseudonymChangeAllowed(changed, now),
  };
}

/**
 * The signed-in user updates only their own delivery identity.
 * Pseudonym is assigned the first time they go anonymous, then again only
 * after 30 days.
 */
export async function saveDeliveryIdentity(
  db: Firestore,
  uid: string,
  input: {
    displayName?: unknown;
    isAnonymous?: unknown;
    photoUrl?: unknown;
    clearPhoto?: boolean;
    changePseudonym?: boolean;
  },
): Promise<DeliveryIdentityState> {
  if (typeof input.isAnonymous !== "boolean") {
    throw new Error("Choose whether to show your real name.");
  }
  const displayName =
    input.displayName === undefined ? undefined : sanitizeDisplayName(input.displayName);
  const photoUrl = input.clearPhoto
    ? null
    : input.photoUrl === undefined
      ? undefined
      : sanitizeAvatarUrl(input.photoUrl, uid);

  const ref = db.collection(collectionName("users")).doc(uid);
  const snap = await ref.get();
  const current = snap.data() ?? {};
  const now = new Date();
  const existingPseudonym =
    typeof current.pseudonym === "string" && isListedPseudonym(current.pseudonym)
      ? current.pseudonym
      : "";
  const lastChanged = asDate(current.pseudonymChangedAt);

  let pseudonym = existingPseudonym;
  let stamp: Date | null = lastChanged;
  if (input.changePseudonym) {
    if (!input.isAnonymous) {
      throw new Error("Turn on anonymous delivery before changing this name.");
    }
    if (existingPseudonym && !pseudonymChangeAllowed(lastChanged, now)) {
      const error = new Error("You can change this name once every 30 days.");
      (error as Error & { status?: number; retryAt?: string }).status = 429;
      if (lastChanged) {
        (error as Error & { retryAt?: string }).retryAt = new Date(
          lastChanged.getTime() + 30 * 24 * 60 * 60 * 1000,
        ).toISOString();
      }
      throw error;
    }
    let next = generatePseudonym();
    for (let i = 0; i < 6 && next === existingPseudonym; i += 1) {
      next = generatePseudonym();
    }
    pseudonym = next;
    stamp = now;
  } else if (input.isAnonymous && !existingPseudonym) {
    pseudonym = generatePseudonym();
    stamp = now;
  }

  if (input.isAnonymous && !isListedPseudonym(pseudonym)) {
    pseudonym = generatePseudonym();
    stamp = now;
  }

  const patch: Record<string, unknown> = {
    isAnonymous: input.isAnonymous,
    updatedAt: Timestamp.fromDate(now),
  };
  if (displayName === null) patch.displayName = FieldValue.delete();
  else if (typeof displayName === "string") patch.displayName = displayName;
  if (photoUrl === null) patch.photoUrl = FieldValue.delete();
  else if (typeof photoUrl === "string") patch.photoUrl = photoUrl;
  if (pseudonym && isListedPseudonym(pseudonym)) {
    patch.pseudonym = pseudonym;
    if (stamp && stamp === now) {
      patch.pseudonymChangedAt = Timestamp.fromDate(stamp);
    } else if (!lastChanged && stamp) {
      patch.pseudonymChangedAt = Timestamp.fromDate(stamp);
    }
  }

  await ref.set(patch, { merge: true });
  const saved = await ref.get();
  return stateFrom(saved.data() ?? {}, now);
}

/** Name a delivery partner is allowed to see for this account. */
export async function publicNameForUser(
  db: Firestore,
  uid: string,
  fallback = "Customer",
): Promise<string> {
  const id = uid.trim();
  if (!id) return fallback;
  const snap = await db.collection(collectionName("users")).doc(id).get();
  if (!snap.exists) return fallback;
  return publicDeliveryName(profileFromDoc(snap.data() ?? {}), fallback);
}

export async function readDeliveryIdentity(
  db: Firestore,
  uid: string,
): Promise<DeliveryIdentityState> {
  const snap = await db.collection(collectionName("users")).doc(uid).get();
  return stateFrom(snap.data() ?? {}, new Date());
}
