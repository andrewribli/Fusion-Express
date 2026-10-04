/**
 * Chunk helpers for admin broadcast sends (Resend batch max = 100).
 */

export const BROADCAST_BATCH_SIZE = 100;

export function chunkEmails(emails: string[], size = BROADCAST_BATCH_SIZE): string[][] {
  const clean = [
    ...new Set(
      emails
        .map((email) => email.trim().toLowerCase())
        .filter((email) => email.includes("@")),
    ),
  ];
  const out: string[][] = [];
  for (let i = 0; i < clean.length; i += size) {
    out.push(clean.slice(i, i + size));
  }
  return out;
}

export function broadcastConfirmMessage(count: number): string {
  return `This will send to ${count} user${count === 1 ? "" : "s"}. Continue?`;
}
