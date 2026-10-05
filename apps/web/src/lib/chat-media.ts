"use client";

import {
  getDownloadURL,
  ref,
  uploadBytesResumable,
  type UploadTask,
} from "firebase/storage";
import { storagePath } from "@/lib/constants";
import { getFirebaseStorage, isFirebaseConfigured } from "@/lib/firebase";

/** UI picker offers this many; hard cap is MAX_IMAGES_PER_MESSAGE. */
export const UI_MAX_IMAGES_PICK = 3;
export const MAX_IMAGES_PER_MESSAGE = 10;
export const MAX_VIDEOS_PER_MESSAGE = 1;
export const MAX_MESSAGES_PER_USER_PER_ORDER = 50;
export const MAX_MEDIA_BYTES_PER_ORDER = 100 * 1024 * 1024;
export const UPLOAD_RATE_LIMIT_MS = 3000;
export const MAX_IMAGE_LONGEST_SIDE = 1600;
export const JPEG_QUALITY = 0.8;
/** Reject after client compression if still above this. */
export const MAX_COMPRESSED_IMAGE_BYTES = 5 * 1024 * 1024;
/** Storage rules mirror this write cap. */
export const MAX_STORAGE_OBJECT_BYTES = 10 * 1024 * 1024;

export const IMAGE_ACCEPT =
  "image/jpeg,image/png,image/webp,image/heic,image/heif,.heic,.heif";

export type ChatMediaKind = "image" | "video";

export type ChatThreadKind = "order" | "admin";

export type PendingChatMedia = {
  id: string;
  file: File;
  previewUrl: string;
  kind: ChatMediaKind;
  width?: number;
  height?: number;
};

const lastUploadAt = new Map<string, number>();

export function chatMediaPreviewText(
  type: "text" | "image" | "video" | undefined,
  text?: string,
): string {
  const trimmed = (text ?? "").trim();
  if (type === "image") {
    return trimmed || "Sent a photo";
  }
  if (type === "video") {
    return trimmed || "Sent a video";
  }
  return trimmed;
}

export function assertUploadRateLimit(userId: string): void {
  const prev = lastUploadAt.get(userId) ?? 0;
  const elapsed = Date.now() - prev;
  if (elapsed < UPLOAD_RATE_LIMIT_MS) {
    const wait = Math.ceil((UPLOAD_RATE_LIMIT_MS - elapsed) / 1000);
    throw new Error(`Please wait ${wait}s before sending another photo.`);
  }
}

export function markUploadRateLimit(userId: string): void {
  lastUploadAt.set(userId, Date.now());
}

export function chatMediaStoragePath(opts: {
  thread: ChatThreadKind;
  threadId: string;
  messageId: string;
  filename: string;
}): string {
  const safe = opts.filename.replace(/[^\w.\-]+/g, "_").slice(0, 80);
  if (opts.thread === "order") {
    return storagePath(`chats/${opts.threadId}/${opts.messageId}/${safe}`);
  }
  return storagePath(`adminChats/${opts.threadId}/${opts.messageId}/${safe}`);
}

function loadImageElement(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(
        new Error(
          "Could not read this image. Try JPEG or PNG (HEIC may not work in this browser).",
        ),
      );
    };
    img.src = url;
  });
}

/**
 * Resize so the longest side is ≤ 1600px, encode JPEG @ 0.8.
 * Rejects if the result is still > 5MB.
 */
export async function compressChatImage(file: File): Promise<{
  blob: Blob;
  width: number;
  height: number;
  filename: string;
}> {
  if (file.size > MAX_STORAGE_OBJECT_BYTES) {
    throw new Error("Image is too large. Try a smaller one.");
  }

  let img: HTMLImageElement;
  try {
    img = await loadImageElement(file);
  } catch (err) {
    throw err instanceof Error
      ? err
      : new Error("Could not read this image.");
  }

  const longest = Math.max(img.naturalWidth, img.naturalHeight);
  const scale =
    longest > MAX_IMAGE_LONGEST_SIDE ? MAX_IMAGE_LONGEST_SIDE / longest : 1;
  const width = Math.max(1, Math.round(img.naturalWidth * scale));
  const height = Math.max(1, Math.round(img.naturalHeight * scale));

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Could not process image.");
  ctx.drawImage(img, 0, 0, width, height);

  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error("Could not compress image."))),
      "image/jpeg",
      JPEG_QUALITY,
    );
  });

  if (blob.size > MAX_COMPRESSED_IMAGE_BYTES) {
    throw new Error("Image is too large. Try a smaller one.");
  }

  const base = file.name.replace(/\.[^.]+$/, "") || "photo";
  return {
    blob,
    width,
    height,
    filename: `${base.slice(0, 40)}.jpg`,
  };
}

export async function preparePendingImages(
  files: FileList | File[],
  opts?: { maxPick?: number },
): Promise<PendingChatMedia[]> {
  const maxPick = Math.max(0, opts?.maxPick ?? UI_MAX_IMAGES_PICK);
  if (maxPick <= 0) {
    throw new Error(`You can attach up to ${UI_MAX_IMAGES_PICK} photos at a time.`);
  }
  const list = Array.from(files).slice(0, Math.min(maxPick, MAX_IMAGES_PER_MESSAGE));
  if (!list.length) {
    throw new Error(`You can attach up to ${UI_MAX_IMAGES_PICK} photos at a time.`);
  }

  const pending: PendingChatMedia[] = [];
  for (const file of list) {
    if (!file.type.startsWith("image/") && !/\.(heic|heif)$/i.test(file.name)) {
      throw new Error("Only photos are supported right now. Video is coming soon.");
    }
    const compressed = await compressChatImage(file);
    const outFile = new File([compressed.blob], compressed.filename, {
      type: "image/jpeg",
    });
    pending.push({
      id: crypto.randomUUID(),
      file: outFile,
      previewUrl: URL.createObjectURL(outFile),
      kind: "image",
      width: compressed.width,
      height: compressed.height,
    });
  }
  return pending;
}

export function revokePendingMedia(pending: PendingChatMedia[]): void {
  for (const item of pending) {
    URL.revokeObjectURL(item.previewUrl);
  }
}

export type UploadChatMediaResult = {
  mediaUrls: string[];
  mediaUrl: string;
  mediaSize: number;
  mediaWidth?: number;
  mediaHeight?: number;
  tasks: UploadTask[];
};

export async function uploadChatMediaFiles(opts: {
  thread: ChatThreadKind;
  threadId: string;
  messageId: string;
  files: PendingChatMedia[];
  signal?: AbortSignal;
  onProgress?: (ratio: number) => void;
}): Promise<UploadChatMediaResult> {
  if (!opts.files.length) {
    throw new Error("No photos to upload.");
  }
  if (opts.files.length > MAX_IMAGES_PER_MESSAGE) {
    throw new Error(`Max ${MAX_IMAGES_PER_MESSAGE} images per message.`);
  }

  if (!isFirebaseConfigured()) {
    const urls = opts.files.map(
      (f, i) => `mock://chat-media/${opts.threadId}/${opts.messageId}/${i}.jpg`,
    );
    opts.onProgress?.(1);
    return {
      mediaUrls: urls,
      mediaUrl: urls[0]!,
      mediaSize: opts.files.reduce((n, f) => n + f.file.size, 0),
      mediaWidth: opts.files[0]?.width,
      mediaHeight: opts.files[0]?.height,
      tasks: [],
    };
  }

  const totalBytes = opts.files.reduce((n, f) => n + f.file.size, 0) || 1;
  const loaded = new Array(opts.files.length).fill(0);
  const urls: string[] = [];
  const tasks: UploadTask[] = [];

  const report = () => {
    const sum = loaded.reduce((a, b) => a + b, 0);
    opts.onProgress?.(Math.min(1, sum / totalBytes));
  };

  for (let i = 0; i < opts.files.length; i++) {
    if (opts.signal?.aborted) {
      throw new DOMException("Upload cancelled", "AbortError");
    }
    const item = opts.files[i]!;
    const path = chatMediaStoragePath({
      thread: opts.thread,
      threadId: opts.threadId,
      messageId: opts.messageId,
      filename: `${i + 1}-${item.file.name}`,
    });
    const storageRef = ref(getFirebaseStorage(), path);
    const task = uploadBytesResumable(storageRef, item.file, {
      contentType: item.file.type || "image/jpeg",
    });
    tasks.push(task);

    const url = await new Promise<string>((resolve, reject) => {
      const onAbort = () => {
        task.cancel();
        reject(new DOMException("Upload cancelled", "AbortError"));
      };
      opts.signal?.addEventListener("abort", onAbort, { once: true });

      task.on(
        "state_changed",
        (snap) => {
          loaded[i] = snap.bytesTransferred;
          report();
        },
        (err) => {
          opts.signal?.removeEventListener("abort", onAbort);
          reject(err);
        },
        () => {
          opts.signal?.removeEventListener("abort", onAbort);
          void getDownloadURL(task.snapshot.ref).then(resolve).catch(reject);
        },
      );
    });
    urls.push(url);
    loaded[i] = item.file.size;
    report();
  }

  return {
    mediaUrls: urls,
    mediaUrl: urls[0]!,
    mediaSize: opts.files.reduce((n, f) => n + f.file.size, 0),
    mediaWidth: opts.files[0]?.width,
    mediaHeight: opts.files[0]?.height,
    tasks,
  };
}
