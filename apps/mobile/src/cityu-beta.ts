/**
 * Mobile has no CityU campus picker yet (CUHK Order / Runner only).
 * When CityU ships on iOS/Android, gate it with the same allowlist pattern as
 * `apps/web/src/lib/betaAccess.ts` — flip `CITYU_BETA_LOCK_ENABLED` before
 * App Store / Play review so reviewers never see a half-locked campus.
 *
 * Do not submit a store build while CityU is beta-locked unless the app has
 * no CityU entry point at all (current state).
 */
export const MOBILE_CITYU_NOTE =
  "CityU beta lock lives on web only until mobile adds a campus selector.";
