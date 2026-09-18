import { getAuthClient, isFirebaseConfigured } from "@/lib/firebase";

type OrderEmailItem = {
  name: string;
  quantity: number;
  price: number;
};

async function authHeaders(): Promise<HeadersInit> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (!isFirebaseConfigured()) return headers;
  const user = getAuthClient().currentUser;
  if (!user) return headers;
  try {
    const token = await user.getIdToken();
    headers.Authorization = `Bearer ${token}`;
  } catch (err) {
    console.error("Could not get ID token for email notify", err);
  }
  return headers;
}

async function postJson(url: string, body: unknown): Promise<void> {
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: await authHeaders(),
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      console.error("Email notify failed", url, res.status, text);
    }
  } catch (err) {
    console.error("Email notify failed", url, err);
  }
}

/**
 * Runner recipients are resolved server-side from Firestore / RUNNER_ALERT_EMAIL.
 * The browser only sends orderId; the API loads the order after verifying the
 * caller's ID token and that they are the customer (or an admin).
 */
export async function notifyOrderPlaced(opts: {
  orderId: string;
  /** @deprecated ignored — derived server-side from the order doc */
  customerEmail?: string;
  /** @deprecated ignored — derived server-side */
  items?: OrderEmailItem[];
  /** @deprecated ignored — derived server-side */
  total?: number;
  customerName?: string;
  deliveryLocation?: string;
}): Promise<void> {
  await postJson("/api/email/order-placed", {
    orderId: opts.orderId,
  });
}

export async function notifyNewUser(opts: {
  fullName: string;
  email?: string;
  isRunner?: boolean;
}): Promise<void> {
  await postJson("/api/email/signup", {
    fullName: opts.fullName,
    email: opts.email,
    isRunner: opts.isRunner,
  });
}

/**
 * Status emails derive customer/runner addresses from the order document.
 * Body recipient fields are ignored by the API.
 */
export async function notifyOrderStatus(opts: {
  orderId: string;
  status: string;
  /** @deprecated ignored — derived server-side */
  customerEmail?: string;
  /** @deprecated ignored — derived server-side */
  extraEmails?: string[];
  customerName?: string;
  total?: number;
  paymentInfo?: string;
  /** @deprecated ignored — derived server-side */
  runnerEmail?: string;
  runnerName?: string;
  deliveryLocation?: string;
  estimate?: number;
}): Promise<void> {
  await postJson("/api/email/status", {
    orderId: opts.orderId,
    status: opts.status,
  });
}

export async function notifyDeadlineEvent(opts: {
  kind:
    | "runner_reminder"
    | "customer_reminder"
    | "admin_runner_missed"
    | "admin_customer_missed"
    | "escalate_runner"
    | "escalate_customer";
  orderId: string;
  /** @deprecated ignored — derived server-side */
  email?: string;
  /** @deprecated ignored — derived server-side */
  extraEmails?: string[];
}): Promise<void> {
  await postJson("/api/email/deadline", {
    kind: opts.kind,
    orderId: opts.orderId,
  });
}
