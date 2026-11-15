import { getDownloadURL, ref, uploadBytes } from "firebase/storage";
import { getFirebaseStorage } from "@/lib/firebase";

export function resolveProfilePhoto(user: {
  photoUrl?: string;
  photoURL?: string;
} | null | undefined): string | null {
  const a = user?.photoUrl?.trim();
  if (a) return a;
  const b = user?.photoURL?.trim();
  return b || null;
}

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
    return file;
  }
}

export async function uploadAvatar(uid: string, file: Blob): Promise<string> {
  const blob = await compressAvatar(file);
  const storageRef = ref(getFirebaseStorage(), `avatars/${uid}/avatar.jpg`);
  await uploadBytes(storageRef, blob, { contentType: "image/jpeg" });
  return getDownloadURL(storageRef);
}
