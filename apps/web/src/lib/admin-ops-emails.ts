/** Permanent ops inbox. Prefer ADMIN_EMAIL; OWNER_ALERT_EMAIL is still merged. */
const DEFAULT_ADMIN_EMAIL = "hello@gracerun.fit";

function parseEmailList(raw: string | undefined): string[] {
  return (raw ?? "")
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);
}

/**
 * Admin alert recipients for new orders, new signups, delivered notices,
 * deadline admin kinds, and expired-delivery CCs.
 * Never includes a student CUHK address as a hardcoded default.
 */
export function adminOpsEmails(): string[] {
  const primary = parseEmailList(process.env.ADMIN_EMAIL);
  const owner = parseEmailList(process.env.OWNER_ALERT_EMAIL);
  const list = [
    ...(primary.length > 0 ? primary : [DEFAULT_ADMIN_EMAIL]),
    ...owner,
  ];
  return [...new Set(list)];
}

export function primaryAdminEmail(): string {
  return adminOpsEmails()[0] ?? DEFAULT_ADMIN_EMAIL;
}
