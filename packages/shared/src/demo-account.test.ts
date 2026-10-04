import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  detectCampusFromEmail,
  isCampusEmail,
  validateAnyCampusEmail,
} from "./campus";
import {
  ANDREW_DEMO_EMAIL,
  DEMO_CUSTOMER_EMAIL,
  isAndrewDemoEmail,
  isDemoCustomerEmail,
  isDemoLoginEmail,
  isDoNotEmailAddress,
} from "./demo-account";

describe("demo customer login", () => {
  it("treats demo@gracerun.fit as a CUHK login without admin owner status", () => {
    assert.equal(isDemoCustomerEmail(DEMO_CUSTOMER_EMAIL), true);
    assert.equal(detectCampusFromEmail(DEMO_CUSTOMER_EMAIL), "cuhk");
    assert.equal(isCampusEmail(DEMO_CUSTOMER_EMAIL, "cuhk"), true);
    assert.equal(validateAnyCampusEmail(DEMO_CUSTOMER_EMAIL), null);
    assert.equal(isDoNotEmailAddress(DEMO_CUSTOMER_EMAIL), true);
  });

  it("treats andrew.demo@gracerun.fit as a CUHK demo login excluded from email", () => {
    assert.equal(isAndrewDemoEmail(ANDREW_DEMO_EMAIL), true);
    assert.equal(isDemoLoginEmail(ANDREW_DEMO_EMAIL), true);
    assert.equal(isDemoCustomerEmail(ANDREW_DEMO_EMAIL), false);
    assert.equal(detectCampusFromEmail(ANDREW_DEMO_EMAIL), "cuhk");
    assert.equal(isCampusEmail(ANDREW_DEMO_EMAIL, "cuhk"), true);
    assert.equal(validateAnyCampusEmail(ANDREW_DEMO_EMAIL), null);
    assert.equal(isDoNotEmailAddress(ANDREW_DEMO_EMAIL), true);
  });
});
