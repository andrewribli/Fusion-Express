import "server-only";
import { Resend } from "resend";
import { isStagingApp } from "@fusion-express/shared";

const ACCENT = "#ED1C24";
const FOOTER = "Thanks for using GraceRun — groceries delivered with grace.";

export type OrderEmailItem = {
  name: string;
  quantity: number;
  price: number;
};

function getResend(): Resend {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    throw new Error("RESEND_API_KEY is not set");
  }
  return new Resend(apiKey);
}

function fromAddress(): string {
  return process.env.RESEND_FROM ?? "GraceRun <verify@gracerun.fit>";
}

function appOrigin(): string {
  if (process.env.NEXT_PUBLIC_APP_ORIGIN) {
    return process.env.NEXT_PUBLIC_APP_ORIGIN.replace(/\/$/, "");
  }
  if (isStagingApp()) return "https://staging-servecart.vercel.app";
  return "https://gracerun.vercel.app";
}

/** Live track page uses ?orderId= (servecart.vercel.app redirects here). */
export function orderTrackUrl(orderId: string): string {
  return `${appOrigin()}/track?orderId=${encodeURIComponent(orderId)}`;
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function formatMoney(amount: number): string {
  return `$${amount.toFixed(1)}`;
}

function brandedEmail(opts: {
  preheader: string;
  heading: string;
  bodyHtml: string;
  trackUrl: string;
}): string {
  const heading = escapeHtml(opts.heading);
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${heading}</title>
</head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:Arial,Helvetica,sans-serif;color:#111827;">
  <span style="display:none;max-height:0;overflow:hidden;">${escapeHtml(opts.preheader)}</span>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:24px 12px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#ffffff;border-radius:16px;overflow:hidden;border:1px solid #e5e7eb;">
          <tr>
            <td style="background:${ACCENT};padding:18px 24px;">
              <p style="margin:0;font-size:20px;font-weight:700;color:#ffffff;">GraceRun</p>
              <p style="margin:4px 0 0;font-size:12px;color:#ffd6d9;">Groceries. Delivered with grace.</p>
            </td>
          </tr>
          <tr>
            <td style="padding:24px;">
              <h1 style="margin:0 0 16px;font-size:20px;color:#111827;">${heading}</h1>
              ${opts.bodyHtml}
              <p style="margin:24px 0 0;">
                <a href="${escapeHtml(opts.trackUrl)}" style="display:inline-block;background:${ACCENT};color:#ffffff;text-decoration:none;font-weight:700;font-size:14px;padding:12px 18px;border-radius:12px;">Track your order</a>
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding:16px 24px 24px;border-top:1px solid #f3f4f6;">
              <p style="margin:0;font-size:12px;color:#6b7280;">${escapeHtml(FOOTER)}</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

function itemsTable(items: OrderEmailItem[]): string {
  const rows = items
    .map((item) => {
      const line = item.price * item.quantity;
      return `<tr>
        <td style="padding:8px 0;border-bottom:1px solid #f3f4f6;font-size:14px;color:#111827;">${escapeHtml(String(item.quantity))}× ${escapeHtml(item.name)}</td>
        <td style="padding:8px 0;border-bottom:1px solid #f3f4f6;font-size:14px;color:#111827;text-align:right;">${formatMoney(line)}</td>
      </tr>`;
    })
    .join("");
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0">${rows}</table>`;
}

const STATUS_COPY: Record<string, { heading: string; body: string }> = {
  pending: {
    heading: "We received your order",
    body: "A runner can accept it now. You pay the exact receipt total after delivery.",
  },
  paid: {
    heading: "Payment received",
    body: "Thanks — GraceRun has your payment for this delivery.",
  },
  accepted: {
    heading: "A runner accepted your order",
    body: "Your runner is heading to Fusion to collect your groceries.",
  },
  purchased: {
    heading: "Your order has been purchased",
    body: "Your groceries are on the way to your dorm lobby.",
  },
  delivered: {
    heading: "Order delivered — receipt ready",
    body: "The runner uploaded the Fusion receipt. Reimburse them via PayMe/FPS, then mark runner paid.",
  },
  runner_paid: {
    heading: "GraceRun reimbursed you",
    body: "The owner marked your grocery spend and delivery fee as paid.",
  },
  completed: {
    heading: "Order complete",
    body: "Thanks for ordering with GraceRun.",
  },
  customer_paid: {
    heading: "Payment received",
    body: "Thanks — this order is marked paid to GraceRun.",
  },
  cancelled: {
    heading: "Your order was cancelled",
    body: "This order is no longer in progress. If you paid, we will follow the refund policy.",
  },
};

export async function sendOrderConfirmation(
  customerEmail: string,
  orderId: string,
  items: OrderEmailItem[],
  total: number,
): Promise<void> {
  const trackUrl = orderTrackUrl(orderId);
  const html = brandedEmail({
    preheader: `Order ${orderId} confirmed`,
    heading: "Order confirmed",
    trackUrl,
    bodyHtml: `
      <p style="margin:0 0 8px;font-size:14px;color:#6b7280;">Order number</p>
      <p style="margin:0 0 16px;font-size:18px;font-weight:700;color:${ACCENT};">${escapeHtml(orderId)}</p>
      <p style="margin:0 0 8px;font-size:14px;font-weight:700;color:#111827;">Items</p>
      ${itemsTable(items)}
      <p style="margin:16px 0 0;font-size:16px;font-weight:700;color:#111827;">Total ${formatMoney(total)}</p>
      <p style="margin:8px 0 0;font-size:14px;color:#6b7280;">Delivery status: Pending</p>
    `,
  });
  const { error } = await getResend().emails.send({
    from: fromAddress(),
    to: customerEmail,
    subject: `GraceRun order ${orderId} confirmed`,
    html,
    text: `Order ${orderId} confirmed. Total ${formatMoney(total)}. Track: ${trackUrl}\n\n${FOOTER}`,
  });
  if (error) throw new Error(error.message);
}

export async function sendOrderStatusUpdate(
  customerEmail: string,
  orderId: string,
  status: string,
): Promise<void> {
  const trackUrl = orderTrackUrl(orderId);
  const copy = STATUS_COPY[status] ?? {
    heading: "Your order was updated",
    body: `Status is now ${status}.`,
  };
  const html = brandedEmail({
    preheader: `${copy.heading} (${orderId})`,
    heading: copy.heading,
    trackUrl,
    bodyHtml: `
      <p style="margin:0 0 8px;font-size:14px;color:#6b7280;">Order number</p>
      <p style="margin:0 0 16px;font-size:18px;font-weight:700;color:${ACCENT};">${escapeHtml(orderId)}</p>
      <p style="margin:0;font-size:14px;color:#111827;">${escapeHtml(copy.body)}</p>
      <p style="margin:12px 0 0;font-size:14px;color:#6b7280;">Delivery status: ${escapeHtml(status)}</p>
    `,
  });
  const { error } = await getResend().emails.send({
    from: fromAddress(),
    to: customerEmail,
    subject: `GraceRun: ${copy.heading} (${orderId})`,
    html,
    text: `${copy.heading}\nOrder ${orderId}\n${copy.body}\nTrack: ${trackUrl}\n\n${FOOTER}`,
  });
  if (error) throw new Error(error.message);
}

export async function sendRunnerNotification(
  runnerEmail: string,
  orderId: string,
  pickupLocation: string,
): Promise<void> {
  const trackUrl = orderTrackUrl(orderId);
  const html = brandedEmail({
    preheader: `New order ${orderId} is available`,
    heading: "New order available",
    trackUrl,
    bodyHtml: `
      <p style="margin:0 0 12px;font-size:14px;color:#111827;">A customer just placed an order. Open the runner dashboard to accept it.</p>
      <p style="margin:0 0 8px;font-size:14px;color:#6b7280;">Order number</p>
      <p style="margin:0 0 16px;font-size:18px;font-weight:700;color:${ACCENT};">${escapeHtml(orderId)}</p>
      <p style="margin:0 0 4px;font-size:14px;font-weight:700;color:#111827;">Pickup</p>
      <p style="margin:0;font-size:14px;color:#111827;">${escapeHtml(pickupLocation)}</p>
    `,
  });
  const { error } = await getResend().emails.send({
    from: fromAddress(),
    to: runnerEmail,
    subject: `GraceRun: new order ${orderId}`,
    html,
    text: `New order ${orderId} is available. Pickup: ${pickupLocation}. Track: ${trackUrl}\n\n${FOOTER}`,
  });
  if (error) throw new Error(error.message);
}

export async function sendNonRunnerOrderNudge(
  email: string,
  orderId: string,
  pickupLocation: string,
): Promise<void> {
  const origin = appOrigin();
  const registerUrl = `${origin}/runner/register`;
  const trackUrl = orderTrackUrl(orderId);
  const html = brandedEmail({
    preheader: `New campus order ${orderId} — runners wanted`,
    heading: "A new order just dropped 🏃",
    trackUrl: registerUrl,
    bodyHtml: `
      <p style="margin:0 0 12px;font-size:14px;color:#111827;">
        Someone at CUHK just ordered groceries from Fusion — and GraceRun needs a hero (that's you, maybe?) to pick it up.
      </p>
      <p style="margin:0 0 12px;font-size:14px;color:#111827;">
        You're signed up as a customer, so you can't grab this one yet. Create a runner account (takes a minute), then accept orders and earn delivery fees between classes.
      </p>
      <p style="margin:0 0 8px;font-size:14px;color:#6b7280;">Order number</p>
      <p style="margin:0 0 16px;font-size:18px;font-weight:700;color:${ACCENT};">${escapeHtml(orderId)}</p>
      <p style="margin:0 0 4px;font-size:14px;font-weight:700;color:#111827;">Pickup</p>
      <p style="margin:0 0 16px;font-size:14px;color:#111827;">${escapeHtml(pickupLocation)}</p>
      <p style="margin:0;font-size:13px;color:#6b7280;">No cape required. Just comfortable shoes and a CUHK email.</p>
    `,
  });
  const { error } = await getResend().emails.send({
    from: fromAddress(),
    to: email,
    subject: `GraceRun: new order up — become a runner to grab it`,
    html,
    text: `A new GraceRun order (${orderId}) is available at ${pickupLocation}. Create a runner account to pick it up: ${registerUrl}\n\nTrack: ${trackUrl}\n\n${FOOTER}`,
  });
  if (error) throw new Error(error.message);
}

export const FUSION_PICKUP_LOCATION =
  "Fusion supermarket, Benjamin Franklin Centre, CUHK";

const DEADLINE_COPY: Record<string, { heading: string; body: string }> = {
  runner_reminder: {
    heading: "30 minutes left to deliver",
    body: "Please mark this order delivered soon. Orders must be completed within 3 hours.",
  },
  customer_reminder: {
    heading: "Payment due in 2 hours",
    body: "Please pay GraceRun for this delivery. Payment is due within 24 hours.",
  },
  admin_runner_missed: {
    heading: "Runner missed the 3-hour deadline",
    body: "This order was not marked delivered within 3 hours. A warning has been recorded.",
  },
  admin_customer_missed: {
    heading: "Customer payment is overdue",
    body: "This order was not paid within 24 hours. A warning has been recorded.",
  },
  escalate_runner: {
    heading: "Formal notice — delivery deadline",
    body: "Orders must be delivered within 3 hours. Repeated delays may result in disciplinary action to your CUHK email account.",
  },
  escalate_customer: {
    heading: "Formal notice — payment deadline",
    body: "Payment is due within 24 hours. Repeated non-payment may result in disciplinary action to your CUHK email account.",
  },
};

export async function sendDeadlineNotice(
  to: string,
  orderId: string,
  kind: keyof typeof DEADLINE_COPY,
): Promise<void> {
  const trackUrl = orderTrackUrl(orderId);
  const copy = DEADLINE_COPY[kind] ?? {
    heading: "GraceRun deadline update",
    body: "Please check this order.",
  };
  const html = brandedEmail({
    preheader: `${copy.heading} (${orderId})`,
    heading: copy.heading,
    trackUrl,
    bodyHtml: `
      <p style="margin:0 0 8px;font-size:14px;color:#6b7280;">Order number</p>
      <p style="margin:0 0 16px;font-size:18px;font-weight:700;color:${ACCENT};">${escapeHtml(orderId)}</p>
      <p style="margin:0;font-size:14px;color:#111827;">${escapeHtml(copy.body)}</p>
    `,
  });
  const { error } = await getResend().emails.send({
    from: fromAddress(),
    to,
    subject: `GraceRun: ${copy.heading} (${orderId})`,
    html,
    text: `${copy.heading}\nOrder ${orderId}\n${copy.body}\nTrack: ${trackUrl}\n\n${FOOTER}`,
  });
  if (error) throw new Error(error.message);
}

const BROADCAST_FROM = "GraceRun <hello@gracerun.fit>";
const BROADCAST_REPLY_TO = "andrew.ribli@gmail.com";

function helloFrom(): string {
  return process.env.RESEND_BROADCAST_FROM?.trim() || BROADCAST_FROM;
}

function formatHk(amount: number): string {
  const rounded = Math.round(amount * 10) / 10;
  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1);
}

const DEFAULT_ADMIN_OPS_EMAILS = [
  "andrew.ribli@gmail.com",
  "1155233599@link.cuhk.edu.hk",
];

export function adminOpsEmails(): string[] {
  const extras = (process.env.OWNER_ALERT_EMAIL ?? "")
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);
  return [
    ...new Set([
      ...DEFAULT_ADMIN_OPS_EMAILS.map((email) => email.toLowerCase()),
      ...extras,
    ]),
  ];
}

async function sendFromHello(opts: {
  to: string;
  subject: string;
  body: string;
}): Promise<void> {
  const html = brandedBroadcastEmail({
    preheader: opts.subject,
    heading: opts.subject,
    bodyHtml: bodyTextToHtml(opts.body),
  });
  const { error } = await getResend().emails.send({
    from: helloFrom(),
    to: opts.to,
    subject: opts.subject,
    html,
    text: `${opts.body}\n\n${FOOTER}`,
  });
  if (error) throw new Error(error.message);
}

async function sendReliably(
  label: string,
  fn: () => Promise<void>,
): Promise<void> {
  try {
    await fn();
  } catch (err) {
    console.error(`${label} failed, retrying once`, err);
    await fn();
  }
}

export async function sendAdminNewOrderNotice(opts: {
  customerName: string;
  items: OrderEmailItem[];
  deliveryLocation: string;
  total: number;
  orderId: string;
}): Promise<void> {
  const customerName = opts.customerName.trim() || "Customer";
  const itemList =
    opts.items
      .map((item) => `${item.quantity}× ${item.name}`)
      .join(", ") || "—";
  const subject = `New GraceRun Order — ${customerName}`;
  const body = `Hey Andrew,

A new order has been placed on GraceRun.

Customer: ${customerName}
Items: ${itemList}
Dorm/Lobby: ${opts.deliveryLocation.trim() || "—"}
Estimated Total: HK$${formatHk(opts.total)}
Order ID: ${opts.orderId}

Check the admin dashboard for details.`;
  await Promise.all(
    adminOpsEmails().map((to) =>
      sendReliably(`admin new-order ${to}`, () =>
        sendFromHello({ to, subject, body }),
      ),
    ),
  );
}

export async function sendAdminNewUserNotice(opts: {
  fullName: string;
  email: string;
  collegeHall: string;
  isRunner: boolean;
}): Promise<void> {
  const fullName = opts.fullName.trim() || "New user";
  const subject = `New GraceRun User — ${fullName}`;
  const body = `Hey Andrew,

A new user just registered on GraceRun.

Name: ${fullName}
Email: ${opts.email.trim() || "—"}
Is Runner: ${opts.isRunner ? "Yes" : "No"}

Check the admin dashboard for details.`;
  await Promise.all(
    adminOpsEmails().map((to) =>
      sendReliably(`admin new-user ${to}`, () =>
        sendFromHello({ to, subject, body }),
      ),
    ),
  );
}

export async function sendCustomerPaymentReminder(opts: {
  to: string;
  customerName: string;
  total: number;
  paymentInfo: string;
}): Promise<void> {
  const name = opts.customerName.trim() || "there";
  const paymentInfo = opts.paymentInfo.trim() || "See the GraceRun app";
  const subject = "Your GraceRun order has arrived — pay within 24 hours";
  const body = `Hey ${name},

Your GraceRun order has been delivered to your dorm lobby! 🎉

You now have 24 hours to complete your payment. Please pay via PayMe or FPS to the account provided in the app.

Order Total: HK$${formatHk(opts.total)}
Runner's PayMe/FPS: ${paymentInfo}

If you've already paid, you can ignore this email.

Thanks for using GraceRun!
— Andrew`;
  const html = brandedBroadcastEmail({
    preheader: subject,
    heading: subject,
    bodyHtml: bodyTextToHtml(body),
  });
  const { error } = await getResend().emails.send({
    from: helloFrom(),
    to: opts.to,
    subject,
    html,
    text: `${body}\n\n${FOOTER}`,
  });
  if (error) throw new Error(error.message);
}

export async function sendRunnerPickupReminder(opts: {
  to: string;
  runnerName: string;
  orderId: string;
  customerName: string;
  deliveryLocation: string;
  estimate: number;
}): Promise<void> {
  const runnerName = opts.runnerName.trim() || "there";
  const customerName = opts.customerName.trim() || "Customer";
  const subject = "New order accepted — pick up within 3 hours";
  const body = `Hey ${runnerName},

You've accepted a new GraceRun order. You have 3 hours to pick up the groceries and complete the delivery.

Order ID: ${opts.orderId}
Customer: ${customerName}
Delivery Location: ${opts.deliveryLocation}
Estimated Total: HK$${formatHk(opts.estimate)}

Please upload your receipt and bank statement before marking as delivered.

Thanks for running with GraceRun!
— Andrew`;
  const html = brandedBroadcastEmail({
    preheader: subject,
    heading: subject,
    bodyHtml: bodyTextToHtml(body),
  });
  const { error } = await getResend().emails.send({
    from: helloFrom(),
    to: opts.to,
    subject,
    html,
    text: `${body}\n\n${FOOTER}`,
  });
  if (error) throw new Error(error.message);
}

function bodyTextToHtml(body: string): string {
  const paragraphs = body
    .split(/\n{2,}/)
    .map((block) => block.trim())
    .filter(Boolean);
  if (paragraphs.length === 0) {
    return `<p style="margin:0;font-size:14px;color:#111827;"></p>`;
  }
  return paragraphs
    .map((block) => {
      const withBreaks = escapeHtml(block).replaceAll("\n", "<br />");
      return `<p style="margin:0 0 14px;font-size:14px;line-height:1.55;color:#111827;">${withBreaks}</p>`;
    })
    .join("");
}

function brandedBroadcastEmail(opts: {
  preheader: string;
  heading: string;
  bodyHtml: string;
}): string {
  const heading = escapeHtml(opts.heading);
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${heading}</title>
</head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:Arial,Helvetica,sans-serif;color:#111827;">
  <span style="display:none;max-height:0;overflow:hidden;">${escapeHtml(opts.preheader)}</span>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:24px 12px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#ffffff;border-radius:16px;overflow:hidden;border:1px solid #e5e7eb;">
          <tr>
            <td style="background:${ACCENT};padding:18px 24px;">
              <p style="margin:0;font-size:20px;font-weight:700;color:#ffffff;">GraceRun</p>
              <p style="margin:4px 0 0;font-size:12px;color:#ffd6d9;">Groceries. Delivered with grace.</p>
            </td>
          </tr>
          <tr>
            <td style="padding:24px;">
              <h1 style="margin:0 0 16px;font-size:20px;color:#111827;">${heading}</h1>
              ${opts.bodyHtml}
            </td>
          </tr>
          <tr>
            <td style="padding:16px 24px 24px;border-top:1px solid #f3f4f6;">
              <p style="margin:0;font-size:12px;color:#6b7280;">${escapeHtml(FOOTER)}</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

/** Individual admin broadcast (no BCC). Reply-to goes to the owner inbox. */
export async function sendDirectAdminEmail(
  to: string,
  recipientName: string,
  body: string,
): Promise<void> {
  const name = recipientName.trim() || "there";
  const trimmed = body.trim();
  if (!trimmed) throw new Error("Message is required");
  const subject = "Message from GraceRun";
  const full = `Hey ${name},

${trimmed}

Thanks for using GraceRun!
— Andrew`;
  const html = brandedBroadcastEmail({
    preheader: subject,
    heading: subject,
    bodyHtml: bodyTextToHtml(full),
  });
  const { error } = await getResend().emails.send({
    from: helloFrom(),
    to,
    replyTo: BROADCAST_REPLY_TO,
    subject,
    html,
    text: `${full}\n\n${FOOTER}`,
  });
  if (error) throw new Error(error.message);
}

export async function sendAdminBroadcast(
  to: string,
  subject: string,
  body: string,
): Promise<void> {
  const trimmedSubject = subject.trim();
  const trimmedBody = body.trim();
  if (!trimmedSubject || !trimmedBody) {
    throw new Error("Subject and body are required");
  }
  const html = brandedBroadcastEmail({
    preheader: trimmedSubject,
    heading: trimmedSubject,
    bodyHtml: bodyTextToHtml(trimmedBody),
  });
  const { error } = await getResend().emails.send({
    from: process.env.RESEND_BROADCAST_FROM?.trim() || BROADCAST_FROM,
    to,
    replyTo: BROADCAST_REPLY_TO,
    subject: trimmedSubject,
    html,
    text: `${trimmedBody}\n\n${FOOTER}`,
  });
  if (error) throw new Error(error.message);
}
