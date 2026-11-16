/** Known demo logins for GraceRun (gracerun.fit). */

/** CUHK mobile / App Store two-device demos. */
export const DEMO_CUHK_MOBILE_CUSTOMER = {
  name: "Demo Mobile Customer",
  email: "1155000099@link.cuhk.edu.hk",
  password: "demo1234",
  campus: "cuhk" as const,
} as const;

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
