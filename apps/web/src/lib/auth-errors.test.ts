import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { friendlyAuthError, isEmailAlreadyInUse } from "./auth-errors";

describe("signup error copy", () => {
  it("hides the Firestore permission-denied string", () => {
    const err = Object.assign(new Error("Missing or insufficient permissions."), {
      code: "permission-denied",
    });
    assert.equal(
      friendlyAuthError(err, "Sign up failed"),
      "We couldn't save your account. Please try again.",
    );
    assert.equal(
      friendlyAuthError(new Error("Missing or insufficient permissions.")).includes(
        "Missing or insufficient permissions",
      ),
      false,
    );
  });

  it("tells an existing email to sign in", () => {
    const err = Object.assign(new Error("Firebase: Error (auth/email-already-in-use)."), {
      code: "auth/email-already-in-use",
    });
    assert.equal(isEmailAlreadyInUse(err), true);
    assert.equal(
      friendlyAuthError(err, "Sign up failed"),
      "This email is already registered. Sign in instead.",
    );
  });
});
