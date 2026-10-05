import assert from "node:assert/strict";
import { afterEach, describe, it } from "node:test";
import { adminOpsEmails } from "@/lib/admin-ops-emails";

const ORIGINAL_ADMIN = process.env.ADMIN_EMAIL;
const ORIGINAL_OWNER = process.env.OWNER_ALERT_EMAIL;

afterEach(() => {
  if (ORIGINAL_ADMIN === undefined) delete process.env.ADMIN_EMAIL;
  else process.env.ADMIN_EMAIL = ORIGINAL_ADMIN;
  if (ORIGINAL_OWNER === undefined) delete process.env.OWNER_ALERT_EMAIL;
  else process.env.OWNER_ALERT_EMAIL = ORIGINAL_OWNER;
});

describe("adminOpsEmails", () => {
  it("defaults to hello@gracerun.fit", () => {
    delete process.env.ADMIN_EMAIL;
    delete process.env.OWNER_ALERT_EMAIL;
    assert.deepEqual(adminOpsEmails(), ["hello@gracerun.fit"]);
  });

  it("uses ADMIN_EMAIL and never hardcodes the CUHK student inbox", () => {
    process.env.ADMIN_EMAIL = "hello@gracerun.fit";
    delete process.env.OWNER_ALERT_EMAIL;
    const list = adminOpsEmails();
    assert.deepEqual(list, ["hello@gracerun.fit"]);
    assert.ok(!list.some((email) => email.includes("link.cuhk.edu.hk")));
  });

  it("merges OWNER_ALERT_EMAIL extras without duplicates", () => {
    process.env.ADMIN_EMAIL = "hello@gracerun.fit";
    process.env.OWNER_ALERT_EMAIL = "hello@gracerun.fit, ops@example.com";
    assert.deepEqual(adminOpsEmails(), [
      "hello@gracerun.fit",
      "ops@example.com",
    ]);
  });
});
