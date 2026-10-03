/**
 * Transactional OTP email content for Resend.
 * Keep HTML simple, no tracking pixels, links only on gracerun.fit.
 */

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

export function otpReplyToAddress(): string {
  return (
    process.env.RESEND_REPLY_TO?.trim() ||
    "GraceRun Support <hello@gracerun.fit>"
  );
}

/** Prefer a human-looking from; avoid no-reply (hurts inbox placement). */
export function otpMailFromAddress(): string {
  return (
    process.env.RESEND_FROM?.trim() || "GraceRun <hello@gracerun.fit>"
  );
}

export function buildOtpEmail(opts: {
  brand: string;
  campusName: string;
  code: string;
  purpose: "signup" | "reset";
}): { subject: string; text: string; html: string; preheader: string } {
  const { brand, campusName, code, purpose } = opts;
  const isReset = purpose === "reset";
  // Code-first subject helps iOS/Android autofill and notification visibility.
  const subject = isReset
    ? `${code} is your ${brand} password reset code`
    : `${code} is your ${brand} verification code`;
  const preheader = isReset
    ? `Expires in 10 minutes. Use this code to reset your password.`
    : `Expires in 10 minutes. Enter this code to verify your ${campusName} email.`;
  const text = isReset
    ? `${brand} password reset\n\nYour code is ${code}.\nIt expires in 10 minutes.\n\nIf you did not request this, ignore this email.\n\n— GraceRun (https://gracerun.fit)`
    : `${brand} ${campusName} verification\n\nYour code is ${code}.\nIt expires in 10 minutes.\n\nIf you did not request this, ignore this email.\n\n— GraceRun (https://gracerun.fit)`;

  const heading = isReset ? "Password reset code" : "Your verification code";
  const brandSafe = escapeHtml(brand);
  const headingSafe = escapeHtml(heading);
  const preSafe = escapeHtml(preheader);
  const codeSafe = escapeHtml(code);

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${headingSafe}</title>
</head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:Arial,Helvetica,sans-serif;color:#111827;">
  <span style="display:none;max-height:0;overflow:hidden;opacity:0;">${preSafe}</span>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:24px 12px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;background:#ffffff;border-radius:16px;overflow:hidden;border:1px solid #e5e7eb;">
          <tr>
            <td style="background:#ED1C24;padding:18px 24px;">
              <p style="margin:0;font-size:20px;font-weight:700;color:#ffffff;">${brandSafe}</p>
              <p style="margin:4px 0 0;font-size:12px;color:#ffd6d9;">Campus delivery · gracerun.fit</p>
            </td>
          </tr>
          <tr>
            <td style="padding:28px 24px 8px;">
              <h1 style="margin:0 0 8px;font-size:20px;line-height:1.3;color:#111827;">${headingSafe}</h1>
              <p style="margin:0 0 20px;font-size:15px;line-height:1.5;color:#4b5563;">${preSafe}</p>
              <p style="margin:0 0 8px;font-size:12px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:#6b7280;">Code</p>
              <p style="margin:0;padding:16px 12px;text-align:center;font-size:32px;font-weight:700;letter-spacing:0.28em;font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;color:#111827;background:#f9fafb;border:1px solid #e5e7eb;border-radius:12px;">${codeSafe}</p>
              <p style="margin:20px 0 0;font-size:13px;line-height:1.5;color:#6b7280;">Never share this code. GraceRun staff will never ask for it.</p>
            </td>
          </tr>
          <tr>
            <td style="padding:16px 24px 24px;">
              <p style="margin:0;font-size:12px;line-height:1.5;color:#9ca3af;">Sent by GraceRun · <a href="https://www.gracerun.fit" style="color:#ED1C24;text-decoration:none;">gracerun.fit</a></p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  return { subject, text, html, preheader };
}
