import { getAuthClient } from "@/lib/firebase";
import { broadcastConfirmMessage } from "@/lib/broadcast-batch";

export type BroadcastGroup = "everyone" | "new_users" | "runners" | "long_term";

export type BroadcastPerson = {
  email: string;
  name: string;
  isRunner: boolean;
};

export type BroadcastResult = {
  ok: boolean;
  group?: BroadcastGroup;
  count?: number;
  sent?: number;
  failed?: { email: string; error: string }[];
  recipients?: BroadcastPerson[];
  scannedDocs?: number;
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

export async function loadBroadcastRecipients(
  group: BroadcastGroup,
): Promise<{ people: BroadcastPerson[]; count: number; scannedDocs: number }> {
  const res = await fetch("/api/email/broadcast", {
    method: "POST",
    headers: await authHeaders(),
    body: JSON.stringify({ group, dryRun: true }),
  });
  const data = await parseBroadcastResponse(res);
  if (!res.ok) {
    throw new Error(data.error ?? "Could not load recipients.");
  }
  const people = data.recipients ?? [];
  return {
    people,
    count: data.count ?? people.length,
    scannedDocs: data.scannedDocs ?? people.length,
  };
}

export async function sendBroadcast(opts: {
  group: BroadcastGroup;
  subject: string;
  body: string;
  emails?: string[];
  test?: boolean;
  audience?: "all" | "customers" | "runners" | "cuhk" | "cityu";
}): Promise<BroadcastResult> {
  let emails = opts.emails;
  if (!opts.test && !emails) {
    const listed = await loadBroadcastRecipients(opts.group);
    emails = listed.people
      .filter((person) => {
        if (opts.audience === "customers") return !person.isRunner;
        if (opts.audience === "runners") return person.isRunner;
        if (opts.audience === "cuhk" || opts.audience === "cityu") {
          // Campus filter is applied server-side when audience is set; dry-run
          // list for "everyone" does not campus-filter, so pass through and let
          // the route apply audience again.
          return true;
        }
        return true;
      })
      .map((person) => person.email);
  }

  const res = await fetch("/api/email/broadcast", {
    method: "POST",
    headers: await authHeaders(),
    body: JSON.stringify({
      group: opts.group,
      subject: opts.subject,
      body: opts.body,
      emails,
      test: Boolean(opts.test),
      audience: opts.audience,
    }),
  });
  const data = await parseBroadcastResponse(res);
  if (!res.ok) {
    throw new Error(data.error ?? "Could not send broadcast.");
  }
  return data;
}

export { broadcastConfirmMessage };
