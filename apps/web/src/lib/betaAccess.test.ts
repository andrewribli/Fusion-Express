import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  CITYU_BETA_ALLOWLIST,
  CITYU_BETA_LOCK_ENABLED,
  CITYU_COMING_SOON_LABEL,
  canAccessCityU,
  cityuBetaRedirect,
} from "./betaAccess";

describe("canAccessCityU", () => {
  it("keeps the temporary lock switch explicit", () => {
    assert.equal(typeof CITYU_BETA_LOCK_ENABLED, "boolean");
    assert.equal(CITYU_COMING_SOON_LABEL, "Coming very soon");
  });

  it("allows the listed CUHK SID, case-insensitive", () => {
    assert.equal(canAccessCityU("1155233599@link.cuhk.edu.hk"), true);
    assert.equal(canAccessCityU("1155233599@LINK.CUHK.EDU.HK"), true);
  });

  it("allows permanent operator emails", () => {
    assert.equal(canAccessCityU("andrew.ribli@gmail.com"), true);
    assert.equal(canAccessCityU("hello@gracerun.fit"), true);
  });

  it("denies everyone else while the lock is on", () => {
    if (!CITYU_BETA_LOCK_ENABLED) return;
    assert.equal(canAccessCityU(null), false);
    assert.equal(canAccessCityU(""), false);
    assert.equal(canAccessCityU("student@cityu.edu.hk"), false);
  });

  it("keeps the public list as the source of truth", () => {
    assert.ok(CITYU_BETA_ALLOWLIST.includes("1155233599@link.cuhk.edu.hk"));
    assert.ok(CITYU_BETA_ALLOWLIST.includes("andrew.ribli@gmail.com"));
    assert.ok(CITYU_BETA_ALLOWLIST.includes("hello@gracerun.fit"));
  });
});

describe("cityuBetaRedirect", () => {
  it("sends locked visitors home from CityU routes", () => {
    if (!CITYU_BETA_LOCK_ENABLED) return;
    assert.equal(cityuBetaRedirect("/cityu", null), "/");
    assert.equal(cityuBetaRedirect("/cityu/taste", "a@b.com"), "/");
  });

  it("leaves allowlisted users on CityU", () => {
    assert.equal(
      cityuBetaRedirect("/cityu/canteen", "1155233599@link.cuhk.edu.hk"),
      null,
    );
  });

  it("does not touch CUHK paths", () => {
    assert.equal(cityuBetaRedirect("/cuhk", null), null);
    assert.equal(cityuBetaRedirect("/", null), null);
  });

  it("does not lock CityU admin (RequireAdmin still applies)", () => {
    assert.equal(cityuBetaRedirect("/cityu/admin/users", null), null);
    assert.equal(cityuBetaRedirect("/cityu/admin", "student@cityu.edu.hk"), null);
  });
});
