import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { pickClientWritableUserFields } from "./user-writable-fields";

describe("pickClientWritableUserFields", () => {
  it("drops locked college and pseudonym fields", () => {
    const picked = pickClientWritableUserFields({
      fullName: "Felix",
      campus: "cuhk",
      runnerCollege: "uc",
      runnerCollegeLockedAt: "2026-01-01",
      runnerCollegeAppeal: { status: "pending" },
      pseudonym: "Anonymous Happy Fox",
      pseudonymChangedAt: "2026-01-01",
      email: "student@link.cuhk.edu.hk",
    });
    assert.equal(picked.fullName, "Felix");
    assert.equal(picked.campus, "cuhk");
    assert.equal(picked.email, "student@link.cuhk.edu.hk");
    assert.equal("runnerCollege" in picked, false);
    assert.equal("runnerCollegeLockedAt" in picked, false);
    assert.equal("runnerCollegeAppeal" in picked, false);
    assert.equal("pseudonym" in picked, false);
    assert.equal("pseudonymChangedAt" in picked, false);
  });

  it("drops null display identity fields", () => {
    const picked = pickClientWritableUserFields({
      displayName: null,
      photoUrl: null,
      isAnonymous: null,
      role: "customer",
    });
    assert.deepEqual(picked, { role: "customer" });
  });
});
