import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { UserProfile } from "@/context/UserContext";
import {
  applyAuthContacts,
  campusForAdminDirectory,
  directoryEmailLabel,
  directoryNameLabel,
  isCityUDirectoryUser,
  isIncompleteDirectoryProfile,
  isOrphanUserProfile,
  MISSING_DIRECTORY_EMAIL,
  MISSING_DIRECTORY_NAME,
  selectAdminDirectoryUsers,
  sortUsersByName,
} from "./user-directory";

function profile(partial: Partial<UserProfile> & { fullName?: string }): UserProfile {
  return {
    fullName: "",
    ...partial,
  };
}

describe("isCityUDirectoryUser", () => {
  it("treats @my.cityu.edu.hk as CityU even with an empty Firestore name", () => {
    assert.equal(
      isCityUDirectoryUser(
        profile({ email: "psidharta3-c@my.cityu.edu.hk", campus: undefined }),
      ),
      true,
    );
  });

  it("does not treat owner Gmail as a CityU directory row", () => {
    assert.equal(
      isCityUDirectoryUser(
        profile({ email: "andrew.ribli@gmail.com", campus: "cuhk" }),
      ),
      false,
    );
  });

  it("includes campus=cityu profiles", () => {
    assert.equal(
      isCityUDirectoryUser(profile({ campus: "cityu", email: "x@gmail.com" })),
      true,
    );
  });
});

describe("campusForAdminDirectory", () => {
  it("keeps CUHK emails off the CityU page", () => {
    const row = profile({ email: "a@link.cuhk.edu.hk", fullName: "A" });
    assert.equal(campusForAdminDirectory("cuhk", row), true);
    assert.equal(campusForAdminDirectory("cityu", row), false);
  });
});

describe("isOrphanUserProfile", () => {
  it("identifies stubs with no name and no email", () => {
    assert.equal(isOrphanUserProfile(profile({ role: "customer" })), true);
    assert.equal(
      isOrphanUserProfile(profile({ email: "a@my.cityu.edu.hk" })),
      false,
    );
  });
});

describe("selectAdminDirectoryUsers", () => {
  it("lists the previously hidden CUHK stubs and keeps campus filtering", () => {
    const complete = Array.from({ length: 15 }, (_, index) =>
      profile({
        uid: `cuhk-${index}`,
        fullName: `Named ${String(index).padStart(2, "0")}`,
        email: `named${index}@link.cuhk.edu.hk`,
      }),
    );
    const hidden = Array.from({ length: 7 }, (_, index) =>
      profile({ uid: `blank-${index}`, role: "customer" }),
    );
    const cityuStudent = profile({
      uid: "cityu-real",
      email: "student@my.cityu.edu.hk",
      fullName: "",
    });
    const listed = selectAdminDirectoryUsers("cuhk", [
      ...hidden,
      cityuStudent,
      ...complete,
    ]);

    assert.equal(listed.length, 22);
    assert.equal(
      listed.filter((row) => isOrphanUserProfile(row)).length,
      7,
    );
    assert.equal(listed.some((row) => row.uid === "cityu-real"), false);
    assert.deepEqual(
      listed.slice(0, 15).map((row) => row.uid),
      complete.map((row) => row.uid),
    );
    assert.deepEqual(
      listed.slice(15).map((row) => row.uid),
      hidden.map((row) => row.uid),
    );
    for (const row of listed.slice(15)) {
      assert.equal(directoryNameLabel(row), MISSING_DIRECTORY_NAME);
      assert.equal(directoryEmailLabel(row), MISSING_DIRECTORY_EMAIL);
      assert.equal(isIncompleteDirectoryProfile(row), true);
    }
  });

  it("keeps a blank CityU Auth account on the CUHK list and shows the Auth email", () => {
    const blank = profile({ uid: "blank-cityu" });
    const selected = selectAdminDirectoryUsers("cuhk", [blank]);
    const shown = sortUsersByName(
      applyAuthContacts(selected, {
        "blank-cityu": {
          email: "psidharta3-c@my.cityu.edu.hk",
          displayName: "",
        },
      }),
    );

    assert.equal(shown.length, 1);
    assert.equal(shown[0]?.email, "psidharta3-c@my.cityu.edu.hk");
    assert.equal(directoryNameLabel(shown[0]!), MISSING_DIRECTORY_NAME);
    assert.equal(directoryEmailLabel(shown[0]!), "psidharta3-c@my.cityu.edu.hk");
    assert.equal(shown[0]?.campus, undefined);
  });

  it("still lists CityU students with a blank name on the CityU page", () => {
    const student = profile({
      uid: "cityu-blank-name",
      email: "a@cityu.edu.hk",
      fullName: "",
    });
    const stamped = profile({ uid: "stamped", campus: "cityu", fullName: "" });
    const listed = selectAdminDirectoryUsers("cityu", [student, stamped]);
    assert.deepEqual(
      listed.map((row) => row.uid),
      ["cityu-blank-name", "stamped"],
    );
    assert.equal(directoryNameLabel(student), "No name");
    assert.equal(directoryEmailLabel(stamped), "No email");
  });
});
