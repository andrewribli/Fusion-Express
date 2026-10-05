import "server-only";
import { collectionName } from "@/lib/constants";
import { getAdminDb, getAdminStorage } from "@/lib/firebase-admin";

const DAY_MS = 24 * 60 * 60 * 1000;
const ORDER_MEDIA_RETENTION_MS = 30 * DAY_MS;
const ADMIN_MEDIA_RETENTION_MS = 90 * DAY_MS;

export type CleanupChatMediaSummary = {
  orderFoldersScanned: number;
  adminFoldersScanned: number;
  filesDeleted: number;
  errors: number;
};

async function deletePrefix(
  // firebase-admin Bucket; keep loose to avoid pulling @google-cloud types into the route graph
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  bucket: any,
  prefix: string,
): Promise<number> {
  const [files] = (await bucket.getFiles({ prefix })) as Array<
    Array<{ delete: (opts?: { ignoreNotFound?: boolean }) => Promise<unknown> }>
  >;
  let deleted = 0;
  for (const file of files ?? []) {
    await file.delete({ ignoreNotFound: true });
    deleted += 1;
  }
  return deleted;
}

/**
 * Delete order-chat media for completed orders older than 30 days, and
 * admin-chat media files older than 90 days.
 */
export async function processChatMediaCleanup(): Promise<CleanupChatMediaSummary> {
  const summary: CleanupChatMediaSummary = {
    orderFoldersScanned: 0,
    adminFoldersScanned: 0,
    filesDeleted: 0,
    errors: 0,
  };

  const db = getAdminDb();
  const storage = getAdminStorage();
  if (!db || !storage) {
    console.error("cleanup-chat-media: admin SDK not configured");
    return summary;
  }

  const bucket = storage.bucket();
  const now = Date.now();

  // --- Order chat: completed/runner_paid older than 30 days ---
  try {
    const ordersSnap = await db
      .collection(collectionName("orders"))
      .where("status", "in", ["completed", "runner_paid", "customer_paid"])
      .limit(200)
      .get();

    for (const docSnap of ordersSnap.docs) {
      const data = docSnap.data() as Record<string, unknown>;
      const updated =
        data.updatedAt &&
        typeof data.updatedAt === "object" &&
        "toDate" in data.updatedAt
          ? (data.updatedAt as { toDate: () => Date }).toDate()
          : data.completedAt &&
              typeof data.completedAt === "object" &&
              "toDate" in data.completedAt
            ? (data.completedAt as { toDate: () => Date }).toDate()
            : null;
      if (!updated) continue;
      if (now - updated.getTime() < ORDER_MEDIA_RETENTION_MS) continue;

      summary.orderFoldersScanned += 1;
      const prefixes = [
        `chats/${docSnap.id}/`,
        `test/chats/${docSnap.id}/`,
      ];
      for (const prefix of prefixes) {
        try {
          summary.filesDeleted += await deletePrefix(bucket, prefix);
        } catch (err) {
          summary.errors += 1;
          console.error("cleanup order chat media failed", prefix, err);
        }
      }
    }
  } catch (err) {
    summary.errors += 1;
    console.error("cleanup order chat scan failed", err);
  }

  // --- Admin chat media: objects under adminChats/ older than 90 days ---
  try {
    for (const root of ["adminChats/", "test/adminChats/"]) {
      const [files] = await bucket.getFiles({
        prefix: root,
        autoPaginate: true,
        maxResults: 1000,
      });
      const byFolder = new Map<string, typeof files>();
      for (const file of files) {
        // adminChats/{userId}/{messageId}/file
        const parts = file.name.split("/");
        if (parts.length < 4) continue;
        const folder = parts.slice(0, 3).join("/") + "/";
        const list = byFolder.get(folder) ?? [];
        list.push(file);
        byFolder.set(folder, list);
      }

      for (const [folder, folderFiles] of byFolder) {
        summary.adminFoldersScanned += 1;
        const newest = folderFiles.reduce((max, f) => {
          const t = f.metadata?.timeCreated
            ? Date.parse(f.metadata.timeCreated)
            : 0;
          return Math.max(max, t);
        }, 0);
        if (!newest || now - newest < ADMIN_MEDIA_RETENTION_MS) continue;
        for (const file of folderFiles) {
          try {
            await file.delete({ ignoreNotFound: true });
            summary.filesDeleted += 1;
          } catch (err) {
            summary.errors += 1;
            console.error("cleanup admin chat media failed", file.name, err);
          }
        }
        void folder;
      }
    }
  } catch (err) {
    summary.errors += 1;
    console.error("cleanup admin chat scan failed", err);
  }

  console.log("cleanup-chat-media", summary);
  return summary;
}
