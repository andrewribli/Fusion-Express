/**
 * Send one test email through Resend (same From as the live app).
 *
 * From apps/web:
 *   npx vercel env pull .env.local
 *   npx tsx --env-file=.env.local scripts/send-test-email.ts 1155xxxxxx@link.cuhk.edu.hk
 */
export {};

const to = process.argv[2]?.trim().toLowerCase() ?? "";
if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to)) {
  console.error("Usage: npx tsx --env-file=.env.local scripts/send-test-email.ts you@link.cuhk.edu.hk");
  process.exit(1);
}

const apiKey = process.env.RESEND_API_KEY;
const from = process.env.RESEND_FROM ?? "GraceRun <onboarding@resend.dev>";
if (!apiKey) {
  console.error("RESEND_API_KEY is missing. Pull Vercel env into .env.local first.");
  process.exit(1);
}

const res = await fetch("https://api.resend.com/emails", {
  method: "POST",
  headers: {
    Authorization: `Bearer ${apiKey}`,
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    from,
    to: [to],
    subject: "GraceRun email test",
    text: `If you received this, Resend can send to ${to} from ${from}.`,
  }),
});

const body = await res.text();
if (!res.ok) {
  console.error("Send failed", res.status, body);
  console.error("If this is a 403 about testing emails, verify your domain in Resend and set RESEND_FROM.");
  process.exit(1);
}

console.log("Sent.", body);
console.log(`From: ${from}`);
console.log(`To:   ${to}`);
