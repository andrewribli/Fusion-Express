import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { resolveRunnerEntry } from "./runner-entry";

const campuses = ["cuhk", "cityu"] as const;

describe("resolveRunnerEntry", () => {
  it("does not navigate while auth is loading", () => {
    for (const campus of campuses) {
      assert.deepEqual(
        resolveRunnerEntry({
          authReady: false,
          signedIn: false,
          runner: false,
          campus,
        }),
        { status: "loading" },
      );
      assert.deepEqual(
        resolveRunnerEntry({
          authReady: false,
          signedIn: true,
          runner: false,
          campus,
        }),
        { status: "loading" },
      );
    }
  });

  it("sends a loaded customer to signup, not login", () => {
    assert.deepEqual(
      resolveRunnerEntry({
        authReady: true,
        signedIn: true,
        runner: false,
        campus: "cuhk",
      }),
      { status: "ready", href: "/runner/terms", runner: false },
    );
    assert.deepEqual(
      resolveRunnerEntry({
        authReady: true,
        signedIn: true,
        runner: false,
        campus: "cityu",
      }),
      { status: "ready", href: "/cityu/runner/register", runner: false },
    );
  });

  it("sends an existing runner to the dashboard", () => {
    assert.deepEqual(
      resolveRunnerEntry({
        authReady: true,
        signedIn: true,
        runner: true,
        campus: "cuhk",
      }),
      { status: "ready", href: "/runner/dashboard", runner: true },
    );
    assert.deepEqual(
      resolveRunnerEntry({
        authReady: true,
        signedIn: true,
        runner: true,
        campus: "cityu",
      }),
      { status: "ready", href: "/cityu/runner/dashboard", runner: true },
    );
  });

  it("does not send a firebase session to login while the profile is still loading", () => {
    for (const campus of campuses) {
      const decision = resolveRunnerEntry({
        authReady: true,
        profilePending: true,
        signedIn: false,
        runner: false,
        campus,
      });
      assert.deepEqual(decision, { status: "loading" });
    }
  });

  it("sends a signed-out click to login with the signup next path", () => {
    assert.deepEqual(
      resolveRunnerEntry({
        authReady: true,
        signedIn: false,
        runner: false,
        campus: "cuhk",
      }),
      { status: "ready", href: "/login?next=/runner/terms", runner: false },
    );
    assert.deepEqual(
      resolveRunnerEntry({
        authReady: true,
        signedIn: false,
        runner: false,
        campus: "cityu",
      }),
      {
        status: "ready",
        href: "/cityu/login?next=/cityu/runner/register",
        runner: false,
      },
    );
  });
});
