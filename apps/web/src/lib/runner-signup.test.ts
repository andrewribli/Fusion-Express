import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import {
  routeAfterRunnerAgree,
  RUNNER_SIGNUP_ROLE,
  studentIdPlaceholder,
  submitRunnerAgreement,
  validateStudentId,
  type RunnerAgreeDeps,
  type RunnerAgreeProfile,
} from "./runner-signup";

const profile: RunnerAgreeProfile = {
  uid: "uid-9306",
  fullName: "Andrew Mate",
  campus: "cuhk",
  college: "United College",
  hall: "Adam Schall Residence",
};

function deps(overrides: Partial<RunnerAgreeDeps> = {}): RunnerAgreeDeps & {
  calls: string[];
} {
  const calls: string[] = [];
  return {
    calls,
    getIdToken: async () => {
      calls.push("token");
      return "token-1";
    },
    saveCollege: async (_token, collegeId) => {
      calls.push(`college:${collegeId}`);
      return {
        runnerCollege: collegeId,
        confirmation: "Your college is set to United College.",
        emailSent: true,
      };
    },
    activateRunner: async (input) => {
      calls.push(
        `activate:${input.role}:${input.studentId}:${input.phone}:${input.paymentId}`,
      );
      return { runnerId: "runner-doc-1", role: input.role };
    },
    ...overrides,
  };
}

describe("runner terms I Agree", () => {
  it("blocks an empty student ID and does not save", async () => {
    const d = deps();
    const result = await submitRunnerAgreement(
      profile,
      { studentId: "   ", phone: "95000974", collegeId: "uc" },
      d,
    );
    assert.equal(result.ok, false);
    if (result.ok) return;
    assert.equal(result.error, "Student ID is required to become a runner.");
    assert.equal(result.error.includes("Profile"), false);
    assert.deepEqual(d.calls, []);
  });

  it("rejects a non-numeric or implausible SID with a visible error", () => {
    assert.match(validateStudentId("andrew@link.cuhk.edu.hk") ?? "", /digits only/);
    assert.match(validateStudentId("123") ?? "", /7 to 12/);
    assert.equal(validateStudentId("1155233599"), null);
    assert.equal(studentIdPlaceholder("cuhk"), "1155xxxxxx");
    assert.equal(studentIdPlaceholder("cityu"), "51234567");
  });

  it("saves SID, college lock, phone, and runner record for a valid sheet", async () => {
    const d = deps();
    const result = await submitRunnerAgreement(
      profile,
      { studentId: "1155 233599", phone: "9500 0974", collegeId: "uc" },
      d,
    );
    assert.equal(result.ok, true);
    if (!result.ok) return;
    assert.equal(result.studentId, "1155233599");
    assert.equal(result.phone, "95000974");
    assert.equal(result.runnerCollege, "uc");
    assert.ok(result.runnerCollegeLockedAt);
    assert.equal(result.runnerId, "runner-doc-1");
    assert.equal(result.role, "both");
    assert.equal(result.role, RUNNER_SIGNUP_ROLE);
    assert.deepEqual(result.payment, { method: "PayMe", id: "95000974" });
    assert.deepEqual(d.calls, [
      "token",
      "college:uc",
      `activate:both:1155233599:95000974:95000974`,
    ]);
    assert.equal(routeAfterRunnerAgree(true), "/runner/dashboard");
  });

  it("surfaces a college or runner failure instead of swallowing it", async () => {
    const collegeFail = deps({
      saveCollege: async () => {
        throw new Error("College is already locked.");
      },
    });
    const failed = await submitRunnerAgreement(
      profile,
      { studentId: "1155233599", phone: "95000974", collegeId: "uc" },
      collegeFail,
    );
    assert.deepEqual(failed, { ok: false, error: "College is already locked." });
    assert.equal(
      collegeFail.calls.some((call) => call.startsWith("activate:")),
      false,
    );

    const runnerFail = deps({
      activateRunner: async () => {
        throw new Error("Missing or insufficient permissions.");
      },
    });
    const runner = await submitRunnerAgreement(
      profile,
      { studentId: "1155233599", phone: "95000974", collegeId: "uc" },
      runnerFail,
    );
    assert.deepEqual(runner, {
      ok: false,
      error: "Missing or insufficient permissions.",
    });
  });

  it("puts Student ID on the sheet and leaves Cancel as a link that does not save", () => {
    const page = readFileSync(
      new URL("../app/runner/terms/page.tsx", import.meta.url),
      "utf8",
    );
    assert.match(page, /Student ID/);
    assert.equal(page.includes("Add your student ID on Profile"), false);
    assert.match(page, /id="runner-student-id"/);
    assert.match(page, /id="runner-student-id-error"/);
    assert.match(page, /Student ID is required to become a runner\./);
    assert.match(page, /commitRunnerActivation/);
    assert.match(page, /text-\[16px\]/);
    assert.match(page, /submitRunnerAgreement/);
    assert.match(page, /setError\(result\.error\)/);
    const studentAt = page.indexOf('id="runner-student-id"');
    const collegeAt = page.indexOf("<RunnerCollegeSelect");
    const phoneAt = page.indexOf('id="runner-phone"');
    assert.ok(studentAt > 0 && studentAt < collegeAt && collegeAt < phoneAt);
    assert.match(page, /href="\/"/);
    const cancelAt = page.lastIndexOf("Cancel");
    const cancelTag = page.slice(Math.max(0, cancelAt - 280), cancelAt);
    assert.equal(cancelTag.includes("onClick"), false);
    assert.match(cancelTag, /href="\/"/);
  });

  it("does not ask CityU runners for a CUHK college", async () => {
    const d = deps();
    const result = await submitRunnerAgreement(
      { ...profile, campus: "cityu" },
      { studentId: "51234567", phone: "95000974", collegeId: "" },
      d,
    );
    assert.equal(result.ok, true);
    if (!result.ok) return;
    assert.equal(result.studentId, "51234567");
    assert.equal(result.runnerCollege, undefined);
    assert.equal(result.role, "both");
    assert.deepEqual(d.calls, [
      "activate:both:51234567:95000974:95000974",
    ]);
  });
});
