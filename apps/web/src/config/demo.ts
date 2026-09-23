/** Known demo logins for GraceRun (gracerun.fit) — CityU campus. */

export const DEMO_CITYU_CUSTOMER = {
  name: "Demo CityU Student",
  email: "demo@my.cityu.edu.hk",
  password: "cityu1234",
  campus: "cityu" as const,
} as const;

export const DEMO_CITYU_RUNNER = {
  name: "Demo CityU Runner",
  email: "runner@my.cityu.edu.hk",
  password: "cityu1234",
  phone: "51234567",
  /** MOS hall runner — CityU residence discount paths. */
  college: "MOS",
  campus: "cityu" as const,
} as const;
