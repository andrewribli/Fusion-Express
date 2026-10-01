# Android Play Store readiness — GraceRun (Expo)

Audit date: 1 October 2026  
Scope: `apps/mobile` Play blockers + privacy route check (`apps/web`).  
Brand: **GraceRun** (not Ptero).

## App config
- Bundle ID: **unset** — `app.json` has no `expo.android.package` (required before Play / EAS store builds)
- Version: `1.0.0` (`expo.version`)
- versionCode: **unset** — no `expo.android.versionCode` (Expo defaults to `1` on first native build)
- targetSdkVersion: **not set in config**; inferred **35** via Expo SDK `~53.0.20` + React Native `0.79.5` defaults (`compileSdk`/`targetSdk` 35). Meets Play’s 34+ requirement. No `expo-build-properties` plugin and no `android/` prebuild tree present.

## Build profile
- Production build type: **not configured** — no `eas.json` in repo (no `production` profile, no Android submit config)
- EAS project linked: **no** — no `extra.eas.projectId` / `owner` in `app.json`; no `eas.json`; `eas-cli` not in workspace scripts/deps

## Blockers (must fix before submission)
- Missing Android applicationId: set `expo.android.package` (e.g. `fit.gracerun.app`) before any store AAB. Do not change `app.json` without an explicit ask.
- EAS not set up: add `eas.json` with a `production` profile (`android.buildType: "app-bundle"`), run `eas init` / link project, and configure Play credentials.
- Store identity incomplete for release: no `android.adaptiveIcon` / `icon` / splash assets declared in `app.json` (Play listing also needs high-res icon separately).
- Production Firebase env not wired for native builds: only `.env.example` with `EXPO_PUBLIC_FIREBASE_*`; no `google-services.json` (JS SDK does not require it, but release builds must bake working keys or Auth/Firestore fail at runtime).

## Warnings (should fix)
- **Legacy / non-GraceRun naming (flag):** Expo `slug` is `fusion-express`, URL `scheme` is `fusionexpress`, npm package is `@fusion-express/mobile`. Display `name` is correctly `GraceRun`. No `Ptero` string in `apps/mobile` app config; working/base branch name `cursor/ptero-cityu-match` still contains **Ptero** — keep Play listing and store package IDs GraceRun-only.
- Privacy policy URL is reachable: `https://gracerun.fit/privacy` → 308 → `https://www.gracerun.fit/privacy` (200). Web route exists at `apps/web/src/app/privacy/page.tsx` (GraceRun-branded). Declare this URL in Play Console Data safety / Store listing.
- Restricted permissions: **no** SMS, Call Log, or Location requested. `app.json` has no `android.permissions` block; no `expo-location` / SMS modules; no `AndroidManifest.xml` (managed workflow). `expo-image-picker` is used for delivery proof (`launchImageLibraryAsync`) and will add photo/media library permission — disclose photo access; not a sensitive-permission rejection risk if justified.
- Analytics / ad SDKs: **none** of Firebase Analytics, Amplitude, AdMob, or other ad SDKs in `apps/mobile/package.json`. Dependency `firebase` (^12.17.1) is used for **Auth / Firestore / Storage only** (no `firebase/analytics` imports). Still complete Play **Data safety** for account info, order/delivery data, and photos uploaded as proof. No ad SDK disclosures needed unless ads are added later.
- `versionCode` should be set explicitly and bumped every Play upload.
- `MOBILE_AUDIT.md` still lists product parity gaps (push notifications, guest persistence, runner ops) — product completeness, not hard Play policy blockers.

## Ready to submit?
- **no** — missing `android.package`, no EAS production profile / project link, and incomplete store/release asset + env wiring. Privacy URL and targetSdk (inferred 35) are OK; SMS/Call Log/Location are not requested; no analytics/ad SDKs beyond Firebase core services that need Data safety (not Analytics).

---

### Production AAB command (do not run until blockers above are fixed)

```bash
cd apps/mobile && eas build --platform android --profile production
```
