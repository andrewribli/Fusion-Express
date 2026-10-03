/** Known demo logins for the CityU prototype. Seeded into localStorage on first load. */

export const DEMO_CUSTOMER = {
  name: "Demo CityU Student",
  email: "demo@my.cityu.edu.hk",
  password: "cityu1234",
  uid: "demo-cityu-customer",
} as const;

export const DEMO_RUNNER = {
  name: "Demo CityU Runner",
  email: "runner@my.cityu.edu.hk",
  password: "cityu1234",
  phone: "51234567",
  /** MOS hall runner — unlocks 10% at Hall Canteen @MOS. */
  college: "MOS" as const,
  uid: "demo-cityu-runner",
} as const;
