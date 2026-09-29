import { getAuthClient, getFirebaseStorage, isFirebaseConfigured } from "@/lib/firebase";
import { storagePath } from "@/lib/constants";
import { getDownloadURL, ref, uploadBytes } from "firebase/storage";

export type PartyFace = {
  name: string;
  photoUrl: string | null;
};

export type DeliveryIdentityState = {
  displayName: string | null;
  photoUrl: string | null;
  isAnonymous: boolean;
  pseudonym: string | null;
  pseudonymChangedAt: string | null;
  canChangePseudonym: boolean;
};

const partyCache = new Map<string, Promise<PartyFace | null>>();

async function authToken(): Promise<string | null> {
  if (!isFirebaseConfigured()) return null;
  const user = getAuthClient().currentUser;
  if (!user) return null;
  return user.getIdToken();
}

async function authedJson<T>(url: string, init?: RequestInit): Promise<T> {
  const token = await authToken();
  if (!token) throw new Error("Sign in again to update this.");
  const res = await fetch(url, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      ...(init?.headers ?? {}),
    },
  });
  const data = (await res.json().catch(() => ({}))) as T & { error?: string; retryAt?: string };
  if (!res.ok) {
    const error = new Error(data.error || "Could not save.");
    (error as Error & { retryAt?: string }).retryAt = data.retryAt;
    throw error;
  }
  return data;
}

/** Other person on this order. Cached for the session. Null when they aren't on it. */
export function lookupOrderParty(orderId: string): Promise<PartyFace | null> {
  const cached = partyCache.get(orderId);
  if (cached) return cached;
  const pending = (async () => {
    try {
      const data = await authedJson<{ party?: PartyFace | null }>(
        "/api/orders/party-identity",
        {
          method: "POST",
          body: JSON.stringify({ orderId }),
        },
      );
      const party = data.party;
      if (!party?.name?.trim()) return null;
      return {
        name: party.name.trim(),
        photoUrl: party.photoUrl?.trim() || null,
      };
    } catch {
      partyCache.delete(orderId);
      return null;
    }
  })();
  partyCache.set(orderId, pending);
  return pending;
}

export async function fetchMyDeliveryIdentity(): Promise<DeliveryIdentityState | null> {
  try {
    return await authedJson<DeliveryIdentityState>("/api/account/delivery-identity");
  } catch {
    return null;
  }
}

export async function saveMyDeliveryIdentity(input: {
  displayName: string | null;
  isAnonymous: boolean;
  photoUrl?: string | null;
  clearPhoto?: boolean;
  changePseudonym?: boolean;
}): Promise<DeliveryIdentityState> {
  return authedJson<DeliveryIdentityState>("/api/account/delivery-identity", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

/** Longest side 512px, JPEG quality 0.85. Falls back when createImageBitmap fails (HEIC). */
export async function compressAvatar(file: Blob): Promise<Blob> {
  try {
    const bitmap = await createImageBitmap(file);
    try {
      const longest = Math.max(bitmap.width, bitmap.height);
      const scale = longest > 512 ? 512 / longest : 1;
      const width = Math.max(1, Math.round(bitmap.width * scale));
      const height = Math.max(1, Math.round(bitmap.height * scale));
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("Could not process that photo.");
      ctx.drawImage(bitmap, 0, 0, width, height);
      const blob = await new Promise<Blob | null>((resolve) => {
        canvas.toBlob((result) => resolve(result), "image/jpeg", 0.85);
      });
      if (!blob) throw new Error("Could not process that photo.");
      return blob;
    } finally {
      bitmap.close();
    }
  } catch {
    // iOS HEIC / some cameras: load via <img> then draw.
    const objectUrl = URL.createObjectURL(file);
    try {
      const img = await new Promise<HTMLImageElement>((resolve, reject) => {
        const el = new Image();
        el.onload = () => resolve(el);
        el.onerror = () => reject(new Error("Could not read that photo."));
        el.src = objectUrl;
      });
      const longest = Math.max(img.naturalWidth, img.naturalHeight);
      const scale = longest > 512 ? 512 / longest : 1;
      const width = Math.max(1, Math.round(img.naturalWidth * scale));
      const height = Math.max(1, Math.round(img.naturalHeight * scale));
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("Could not process that photo.");
      ctx.drawImage(img, 0, 0, width, height);
      const blob = await new Promise<Blob | null>((resolve) => {
        canvas.toBlob((result) => resolve(result), "image/jpeg", 0.85);
      });
      if (!blob) throw new Error("Could not process that photo.");
      return blob;
    } finally {
      URL.revokeObjectURL(objectUrl);
    }
  }
}

export async function uploadAvatar(uid: string, file: Blob): Promise<string> {
  if (!isFirebaseConfigured()) {
    throw new Error("Photo upload needs a live account.");
  }
  const jpeg = await compressAvatar(file);
  const storageRef = ref(
    getFirebaseStorage(),
    storagePath(`avatars/${uid}/avatar.jpg`),
  );
  await uploadBytes(storageRef, jpeg, { contentType: "image/jpeg" });
  return getDownloadURL(storageRef);
}
