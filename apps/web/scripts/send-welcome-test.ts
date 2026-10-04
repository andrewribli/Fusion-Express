import { Resend } from "resend";
import {
  WELCOME_EMAIL_BODY,
  WELCOME_EMAIL_FROM,
  WELCOME_EMAIL_REPLY_TO,
  WELCOME_EMAIL_SUBJECT,
} from "../src/lib/welcome-email";

async function main() {
  const to = process.argv[2]?.trim() || "hello@gracerun.fit";
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.error("RESEND_API_KEY missing");
    process.exit(1);
  }

  const resend = new Resend(apiKey);
  const { data, error } = await resend.emails.send({
    from: WELCOME_EMAIL_FROM,
    replyTo: WELCOME_EMAIL_REPLY_TO,
    to,
    subject: WELCOME_EMAIL_SUBJECT,
    text: WELCOME_EMAIL_BODY,
  });

  if (error) {
    console.error(error);
    process.exit(1);
  }
  console.log(
    JSON.stringify({ id: data?.id, to, subject: WELCOME_EMAIL_SUBJECT }),
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
