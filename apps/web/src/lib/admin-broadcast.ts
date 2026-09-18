import { getAuthClient } from "@/lib/firebase";

export type BroadcastGroup = "new_users" | "runners" | "long_term";

export type BroadcastResult = {
  ok: boolean;
  group?: BroadcastGroup;
  count?: number;
  sent?: number;
  failed?: { email: string; error: string }[];
  test?: boolean;
  to?: string;
  error?: string;
};

async function authHeaders(): Promise<HeadersInit> {
  const user = getAuthClient().currentUser;
  if (!user) throw new Error("Sign in required.");
  const token = await user.getIdToken();
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  };
}

async function parseBroadcastResponse(
  res: Response,
): Promise<BroadcastResult> {
  const text = await res.text();
  if (!text.trim()) {
    throw new Error(
      res.ok
        ? "Empty response from server."
        : `Server error (${res.status}). Try again.`,
    );
  }
  try {
    return JSON.parse(text) as BroadcastResult;
  } catch {
    throw new Error(
      res.ok
        ? "Could not read server response."
        : `Server error (${res.status}). Try again.`,
    );
  }
}

export async function previewBroadcastCount(
  group: BroadcastGroup,
): Promise<number> {
  const res = await fetch("/api/email/broadcast", {
    method: "POST",
    headers: await authHeaders(),
    body: JSON.stringify({ group, dryRun: true }),
  });
  const data = await parseBroadcastResponse(res);
  if (!res.ok) {
    throw new Error(data.error ?? "Could not load recipient count.");
  }
  return data.count ?? 0;
}

export async function sendBroadcast(opts: {
  group: BroadcastGroup;
  subject: string;
  body: string;
  test?: boolean;
}): Promise<BroadcastResult> {
  const res = await fetch("/api/email/broadcast", {
    method: "POST",
    headers: await authHeaders(),
    body: JSON.stringify({
      group: opts.group,
      subject: opts.subject,
      body: opts.body,
      test: Boolean(opts.test),
    }),
  });
  const data = await parseBroadcastResponse(res);
  if (!res.ok) {
    throw new Error(data.error ?? "Could not send broadcast.");
  }
  return data;
}
