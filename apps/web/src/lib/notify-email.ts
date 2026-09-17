type OrderEmailItem = {
  name: string;
  quantity: number;
  price: number;
};

async function postJson(url: string, body: unknown): Promise<void> {
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
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
 * Runner recipients are resolved server-side from RUNNER_ALERT_EMAIL. The
 * browser used to read every /users doc to collect runner addresses, which
 * exposed the whole roster to any signed-in student.
 */
export async function notifyOrderPlaced(opts: {
  customerEmail?: string;
  orderId: string;
  items: OrderEmailItem[];
  total: number;
  customerName?: string;
  deliveryLocation?: string;
}): Promise<void> {
  await postJson("/api/email/order-placed", {
    customerEmail: opts.customerEmail,
    orderId: opts.orderId,
    items: opts.items,
    total: opts.total,
    customerName: opts.customerName,
    deliveryLocation: opts.deliveryLocation,
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
 * The address comes from the order document, since a runner cannot read the
 * customer's profile.
 */
export async function notifyOrderStatus(opts: {
  customerEmail?: string;
  extraEmails?: string[];
  orderId: string;
  status: string;
  customerName?: string;
  total?: number;
  paymentInfo?: string;
  runnerEmail?: string;
  runnerName?: string;
  deliveryLocation?: string;
  estimate?: number;
}): Promise<void> {
  const extras = (opts.extraEmails ?? []).filter(Boolean);
  if (!opts.customerEmail && extras.length === 0 && !opts.runnerEmail) return;
  await postJson("/api/email/status", {
    customerEmail: opts.customerEmail,
    extraEmails: extras,
    orderId: opts.orderId,
    status: opts.status,
    customerName: opts.customerName,
    total: opts.total,
    paymentInfo: opts.paymentInfo,
    runnerEmail: opts.runnerEmail,
    runnerName: opts.runnerName,
    deliveryLocation: opts.deliveryLocation,
    estimate: opts.estimate,
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
  email?: string;
  extraEmails?: string[];
}): Promise<void> {
  await postJson("/api/email/deadline", opts);
}
