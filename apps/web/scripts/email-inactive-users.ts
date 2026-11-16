/**
 * Email customers with 0 orders a short founder check-in + reply CTA.
 *
 * Audience (chosen after checking production data):
 *   - All /users with a valid email
 *   - Skip runners: isRunner, runnerId, or role "runner" | "both"
 *   - Skip admins: /admins/{uid} docs (admins are NOT a user.role value)
 *   - Skip users who already have ≥1 order (customerId query is reliable —
 *     all 31 live orders have customerId; copy says "haven't placed an order")
 *   - Skip inactiveEmailSentAt unless --force
 *   - No 24h age gate (expanded vs earlier script)
 *
 * Default is dry-run. Actual sends require --send or CONFIRM=1.
 *
 * Usage (from apps/web):
 *   npx tsx --env-file=.env.local scripts/email-inactive-users.ts
 *   npx tsx --env-file=.env.local scripts/email-inactive-users.ts --send
 *   npx tsx --env-file=.env.local scripts/email-inactive-users.ts --send --to=andrew.ribli@gmail.com --force
 *   npx tsx --env-file=.env.local scripts/email-inactive-users.ts --preview-to=andrew.ribli@gmail.com
 *
 * Flags:
 *   --send / CONFIRM=1   Actually send (and set inactiveEmailSentAt)
 *   --to=<email>         Only this address
 *   --limit=<n>          Cap number of sends
 *   --force              Re-send even if inactiveEmailSentAt is set
 *   --preview-to=<email> One sample (no Firestore write)
 */

import { readFileSync } from "fs";
import { resolve } from "path";
import { initializeApp, cert, getApps } from "firebase-admin/app";
import { getFirestore, FieldValue } from "firebase-admin/firestore";

const SUBJECT = "How can we improve GraceRun for you?";
const FROM =
  process.env.RESEND_BROADCAST_FROM?.trim() ||
  "GraceRun <hello@gracerun.fit>";
const REPLY_TO = "hello@gracerun.fit";
const ACCENT = "#ED1C24";
const REPLY_MAILTO =
  "mailto:hello@gracerun.fit?subject=" +
  encodeURIComponent("Re: GraceRun Feedback");

const serviceAccountCandidates = [
  process.env.FIREBASE_SERVICE_ACCOUNT_PATH,
  "./firebase-service-account.json",
  "../firebase-service-account.json",
  "../../firebase-service-account.json",
  "../fusion-express-6a438-firebase-adminsdk-fbsvc-817676b923.json",
  "../../fusion-express-6a438-firebase-adminsdk-fbsvc-817676b923.json",
].filter(Boolean) as string[];

function loadServiceAccount(): object {
  for (const rel of serviceAccountCandidates) {
    try {
      return JSON.parse(readFileSync(resolve(process.cwd(), rel), "utf8"));
    } catch {
      // try next
    }
  }
  throw new Error(
    "No firebase service account JSON found. Set FIREBASE_SERVICE_ACCOUNT_PATH.",
  );
}

function parseArgs(argv: string[]) {
  let send = process.env.CONFIRM === "1";
  let force = false;
  let toFilter: string | undefined;
  let limit: number | undefined;
  let previewTo: string | undefined;

  for (const raw of argv) {
    if (raw === "--send") send = true;
    else if (raw === "--force") force = true;
    else if (raw.startsWith("--to="))
      toFilter = raw.slice("--to=".length).trim().toLowerCase();
    else if (raw.startsWith("--limit=")) {
      const n = Number(raw.slice("--limit=".length));
      if (Number.isFinite(n) && n > 0) limit = Math.floor(n);
    } else if (raw.startsWith("--preview-to="))
      previewTo = raw.slice("--preview-to=".length).trim().toLowerCase();
  }

  return { send, force, toFilter, limit, previewTo };
}

function firstNameFrom(data: Record<string, unknown>, email: string): string {
  const display =
    String(data.displayName ?? "").trim() ||
    String(data.fullName ?? "").trim();
  if (display) {
    const first = display.split(/\s+/)[0];
    if (first) return first;
  }
  const local = email.split("@")[0]?.trim();
  return local || "there";
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function buildText(firstName: string): string {
  return `Hey ${firstName}! 👋

Saw you made an account on GraceRun recently, and we're so glad to have you. We want to provide the best possible service for you, so we're wondering why you haven't placed an order yet? 🤔

Please let us know what we can improve on our website. Whether it's a grocery or food item you wish we had, a navigation issue, or you're just unsure how to use it—your insights are the most valuable thing we have!

Just hit reply below and let us know. 🙏

Keep studying hard,
Andrew
Founder, GraceRun`;
}

function buildHtml(firstName: string): string {
  const name = escapeHtml(firstName);
  const mailto = escapeHtml(REPLY_MAILTO);
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(SUBJECT)}</title>
</head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:Arial,Helvetica,sans-serif;color:#111827;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:24px 12px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#ffffff;border-radius:12px;overflow:hidden;border:1px solid #e5e7eb;">
          <tr>
            <td style="background:${ACCENT};padding:16px 24px;">
              <p style="margin:0;font-size:18px;font-weight:700;color:#ffffff;">GraceRun</p>
            </td>
          </tr>
          <tr>
            <td style="padding:24px;">
              <p style="margin:0 0 12px;font-size:15px;line-height:1.5;color:#111827;">Hey ${name}! 👋</p>
              <p style="margin:0 0 12px;font-size:15px;line-height:1.5;color:#111827;">Saw you made an account on GraceRun recently, and we're so glad to have you. We want to provide the best possible service for you, so we're wondering why you haven't placed an order yet? 🤔</p>
              <p style="margin:0 0 12px;font-size:15px;line-height:1.5;color:#111827;">Please let us know what we can improve on our website. Whether it's a grocery or food item you wish we had, a navigation issue, or you're just unsure how to use it—your insights are the most valuable thing we have!</p>
              <p style="margin:0 0 20px;font-size:15px;line-height:1.5;color:#111827;">Just hit reply below and let us know. 🙏</p>
              <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 0 20px;">
                <tr>
                  <td align="center" style="background:${ACCENT};border-radius:8px;">
                    <a href="${mailto}" style="display:inline-block;padding:12px 22px;font-size:15px;font-weight:700;color:#ffffff;text-decoration:none;">Reply to Andrew</a>
                  </td>
                </tr>
              </table>
              <p style="margin:0;font-size:15px;line-height:1.5;color:#111827;">Keep studying hard,<br />Andrew<br />Founder, GraceRun</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

function isRunnerUser(data: Record<string, unknown>): boolean {
  if (Boolean(data.isRunner) || Boolean(data.runnerId)) return true;
  const role = String(data.role ?? "").toLowerCase();
  return role === "runner" || role === "both";
}

async function sendEmail(opts: { to: string; firstName: string }): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    throw new Error(
      "RESEND_API_KEY is missing. Pull Vercel env into .env.local first.",
    );
  }

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: FROM,
      to: [opts.to],
      reply_to: REPLY_TO,
      subject: SUBJECT,
      html: buildHtml(opts.firstName),
      text: buildText(opts.firstName),
    }),
  });

  const body = await res.text();
  if (!res.ok) throw new Error(`Resend ${res.status}: ${body}`);
}

if (!getApps().length) {
  initializeApp({ credential: cert(loadServiceAccount() as never) });
}

const db = getFirestore();
const { send, force, toFilter, limit, previewTo } = parseArgs(
  process.argv.slice(2),
);

async function main() {
  console.log(`From: ${FROM}`);
  console.log(`Reply CTA: ${REPLY_MAILTO}`);
  console.log(
    send
      ? "Mode: SEND (will email + set inactiveEmailSentAt)"
      : "Mode: DRY-RUN (no emails). Pass --send or CONFIRM=1 to send.",
  );
  if (force) console.log("Force: re-send even if inactiveEmailSentAt is set");
  if (toFilter) console.log(`Filter --to: ${toFilter}`);
  if (limit != null) console.log(`Limit: ${limit}`);

  if (previewTo) {
    const usersSnap = await db.collection("users").get();
    let firstName = "Andrew";
    for (const docSnap of usersSnap.docs) {
      const data = docSnap.data() as Record<string, unknown>;
      const email = String(data.email ?? data.cuhkEmail ?? "")
        .trim()
        .toLowerCase();
      if (email === previewTo) {
        firstName = firstNameFrom(data, email);
        break;
      }
    }
    console.log(`\nPreview → ${previewTo} (firstName="${firstName}")`);
    console.log("--- TEXT ---");
    console.log(buildText(firstName));
    console.log("--- HTML ---");
    console.log(buildHtml(firstName));
    await sendEmail({ to: previewTo, firstName });
    console.log("Preview sent (no Firestore write).");
    return;
  }

  const adminSnap = await db.collection("admins").get();
  const adminUids = new Set(adminSnap.docs.map((d) => d.id));

  // Preload order owners once (reliable: all live orders have customerId).
  const ordersSnap = await db.collection("orders").get();
  const customersWithOrders = new Set<string>();
  for (const o of ordersSnap.docs) {
    const cid = String(o.data().customerId ?? "").trim();
    if (cid) customersWithOrders.add(cid);
  }

  const usersSnap = await db.collection("users").get();
  type Candidate = { uid: string; email: string; firstName: string };
  const eligible: Candidate[] = [];
  let skippedAlreadySent = 0;
  let skippedRunnerAdmin = 0;
  let skippedNoEmail = 0;
  let skippedHasOrders = 0;
  let skippedFilter = 0;

  for (const docSnap of usersSnap.docs) {
    const uid = docSnap.id;
    const data = docSnap.data() as Record<string, unknown>;
    const email = String(data.email ?? data.cuhkEmail ?? "")
      .trim()
      .toLowerCase();

    if (!email.includes("@")) {
      skippedNoEmail++;
      continue;
    }
    if (toFilter && email !== toFilter) {
      skippedFilter++;
      continue;
    }
    if (adminUids.has(uid) || isRunnerUser(data)) {
      skippedRunnerAdmin++;
      continue;
    }
    if (!force && data.inactiveEmailSentAt != null) {
      skippedAlreadySent++;
      continue;
    }
    if (customersWithOrders.has(uid)) {
      skippedHasOrders++;
      continue;
    }

    eligible.push({
      uid,
      email,
      firstName: firstNameFrom(data, email),
    });
  }

  const toProcess = limit != null ? eligible.slice(0, limit) : eligible;

  console.log(`\nUsers scanned: ${usersSnap.size}`);
  console.log(`Eligible (customers, 0 orders, would-send): ${eligible.length}`);
  console.log(`  skipped already emailed: ${skippedAlreadySent}`);
  console.log(`  skipped runner/admin:    ${skippedRunnerAdmin}`);
  console.log(`  skipped no email:        ${skippedNoEmail}`);
  console.log(`  skipped has orders:      ${skippedHasOrders}`);
  if (toFilter) console.log(`  skipped --to filter:     ${skippedFilter}`);
  console.log(`This run will process: ${toProcess.length}`);

  for (const c of toProcess) {
    console.log(`  - ${c.email}  firstName="${c.firstName}"  uid=${c.uid}`);
  }

  if (!send) {
    console.log("\n--- Sample text ---");
    console.log(buildText(toProcess[0]?.firstName ?? "Andrew"));
    console.log("\nDry-run complete. Re-run with --send to deliver.");
    return;
  }

  let sent = 0;
  let failed = 0;
  for (const c of toProcess) {
    try {
      await sendEmail({ to: c.email, firstName: c.firstName });
      await db.collection("users").doc(c.uid).update({
        inactiveEmailSentAt: FieldValue.serverTimestamp(),
      });
      sent++;
      console.log(`Sent → ${c.email} (${c.firstName})`);
    } catch (err) {
      failed++;
      console.error(`Failed → ${c.email}:`, err);
    }
  }

  console.log(`\nDone. Sent ${sent}, failed ${failed}.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
