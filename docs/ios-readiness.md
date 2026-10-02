# GraceRun iOS App Store readiness audit

**Date:** 2026-10-02  
**Scope:** Audit + report only (`apps/mobile/`). No `eas build`, no App Store submit, no `app.json` / Android changes.  
**Brand for store listing:** GraceRun (not Ptero, not Fusion Express as the customer-facing name).

---

## App config

Source: `apps/mobile/app.json` (no `app.config.js` / `app.config.ts`).

| Field | Expected / needed | Current | Status |
| --- | --- | --- | --- |
| `expo.name` | GraceRun | `GraceRun` | OK |
| `expo.slug` | `gracerun` | `fusion-express` | **Mismatch** |
| `expo.version` | `1.0.0` | `1.0.0` | OK |
| `expo.scheme` | GraceRun-branded | `fusionexpress` | Warning (legacy naming) |
| `ios.bundleIdentifier` | e.g. `fit.gracerun.app` (choose & register) | **Missing** — no `ios` block | **Blocker** |
| `ios.buildNumber` | `"1"` (or EAS autoIncrement) | **Missing** | **Blocker** |
| `ios.supportsTablet` | Explicit `true`/`false` | **Missing** | Missing (Expo default applies once `ios` exists) |
| `ios.icon` / root `icon` | 1024×1024 PNG, **no transparency** | **Missing** — no icon path; no `apps/mobile/assets/` | **Blocker** |
| `ios.googleServicesFile` / `GoogleService-Info.plist` | Present if using native Firebase config file | **Missing** | Warning (app uses JS Firebase via `EXPO_PUBLIC_*`; plist not required for current JS SDK path, but needed if you add `@react-native-firebase/*`) |
| `NSCameraUsageDescription` | Required if camera used | **Missing** | OK for now — mobile uses **photo library only** (`launchImageLibraryAsync`), not camera |
| `NSPhotoLibraryUsageDescription` | Required (delivery proof) | Set via `expo-image-picker` plugin: `"GraceRun uses photos for delivery proof."` | OK (maps into Info.plist on prebuild) |
| `NSLocationWhenInUseUsageDescription` | Required if location used | **Missing** | OK for now — no `expo-location` / geolocation in `apps/mobile` |

### Icon inventory (not wired in mobile config)

| Asset | Size / format | Notes |
| --- | --- | --- |
| `apps/web/public/images/gracerun-logo.png` | **1024×1024 JPEG** (file extension is `.png` but content is JPEG) | Closest App Store–sized brand mark; must be converted to real PNG with **no alpha** before use as `ios.icon` |
| `apps/web/src/app/icon.png` | **1024×1024 JPEG** | Same as above (misnamed) |
| `apps/web/public/images/gracerun-icon.png` | 512×512 PNG RGBA, **~3.5% transparent pixels** | Too small; transparency fails Apple icon rules |
| `apps/web/public/apple-touch-icon.png` | 180×180 PNG with transparency | Web only; not App Store icon |
| Mobile `assets/icon.png` | — | **Does not exist** |

**Bundle ID:** exact current value = **none configured**. Register a GraceRun ID in Apple Developer (suggested: `fit.gracerun.app`) and set `ios.bundleIdentifier` to match before any EAS iOS build.

**Version:** `1.0.0`  
**Build number:** unset  
**Icon status:** not configured for Expo; no compliant 1024 PNG in the mobile app tree

---

## Blockers

1. **No `ios` section in `app.json`** — missing `bundleIdentifier`, `buildNumber`, and icon. EAS cannot produce a submittable iOS binary until these are set (ask before editing config).
2. **No `eas.json`** — no `build.production` or `submit.production` profiles. Production iOS Release / remote credentials / submit targets are undefined.
3. **No App Store icon in mobile** — need a 1024×1024 PNG with no transparency, referenced from Expo config.
4. **No App Store screenshots in repo** — nothing under `apps/mobile` (or elsewhere) for required device sizes (see list below).
5. **Store listing copy not prepared in repo** — no promo text, description, keywords, or support-URL draft for GraceRun iOS.
6. **Expo slug / deep-link scheme still Fusion-branded** (`fusion-express` / `fusionexpress`) — fix before listing so Expo project + URLs align with GraceRun (config change requires approval).
7. **Firebase env for shipping builds** — production EAS profile must inject `EXPO_PUBLIC_FIREBASE_*` (and ideally `EXPO_PUBLIC_WEB_ORIGIN=https://www.gracerun.fit`); `.env` is local-only and gitignored.

### Privacy URL (Apple requirement) — OK

| URL | Result |
| --- | --- |
| `https://gracerun.fit/privacy` | 308 → `https://www.gracerun.fit/privacy` |
| `https://www.gracerun.fit/privacy` | **200** — live GraceRun Privacy Policy (`apps/web/src/app/privacy/page.tsx`) |

Use **`https://www.gracerun.fit/privacy`** (or apex; both resolve) in App Store Connect. Terms also live at `https://www.gracerun.fit/terms`.

---

## Warnings

### Brand / naming (flag for store listing)

| Location | Issue |
| --- | --- |
| `expo.slug`: `fusion-express` | Not `gracerun` |
| `expo.scheme`: `fusionexpress` | Legacy Fusion deep link scheme |
| Package `@fusion-express/mobile`, monorepo `fusion-express` | Internal OK; must not appear as App Store display name |
| Guest auth emails `@fusion-express.app` | Internal Firebase addresses; do not surface in UI/listing |
| `BRANCHES.md` | Mentions **Ptero** (CityU canteen / clone path) — **do not use Ptero** in App Store name, subtitle, keywords, or screenshots |
| `apps/web/public/images/fusion-express-logo.png` | Do not use as iOS marketing/icon asset |
| Some docs still titled “Fusion Express” | Keep store-facing strings **GraceRun** only |

### ATT / tracking

- **No App Tracking Transparency usage found** in `apps/mobile` (no `expo-tracking-transparency`, no IDFA APIs).
- Firebase JS SDK is a dependency; **Analytics is not imported/initialized** in shared Firebase bootstrap (`packages/shared/src/firebase.ts` uses Auth / Firestore / Storage only).
- Order “tracking” UI is delivery status polling, not advertising tracking.
- **Conclusion:** ATT prompt not required for the current codebase. If you later enable Firebase Analytics, Adjust, Meta, etc., revisit ATT + Privacy Nutrition Labels.

### Sign in with Apple

- Mobile auth = **Firebase email/password** + **guest phone → synthetic email/password** (`ensureGuestAuthForPhone`). No Google / Facebook / Apple / other social buttons in mobile.
- **SIWA not required** under Guideline 4.8 while only first-party email/password is offered. If you add any third-party social login later, Apple Sign In becomes required.

### Age rating recommendation

- **Recommend 12+** (not 4+).
- Reasons: terms require **18+ or parental consent**; grocery delivery + runner model; user-generated content path (delivery proof photos; chat exists on web and may land on mobile later). No alcohol/tobacco catalog hits found in shared menu JSON, but UGC + account/comms push above 4+.
- Separately set an in-app / Connect age gate consistent with terms (18+).

### Export compliance / encryption

- App uses standard HTTPS (Firebase, Vercel/web origin). No custom crypto observed.
- Set **`ITSAppUsesNonExemptEncryption` = `false`** in `ios.infoPlist` (or answer “No” in Connect) so every upload is not blocked on the export questionnaire. Confirm with counsel if you add non-HTTPS crypto later.

### `expo-doctor` (2026-10-02, `apps/mobile`)

- **16/18 passed, 2 failed**
  1. Metro `watchFolders` does not match Expo defaults (monorepo override in `metro.config.js` — expected for Turborepo; review, don’t blindly remove).
  2. Version drift: `react-native@0.79.5` (expected `0.79.6`); `typescript@5.9.3` (expected `~5.8.3`).
- **Prebuild skipped:** no `ios.bundleIdentifier` / icon / `eas.json`; generating `ios/` on Linux would not validate signing and risks a noisy uncommitted tree. Re-run after config is approved: `npx expo prebuild --platform ios --clean`.

### Listing asset readiness

| Item | In repo? |
| --- | --- |
| App icon (1024 PNG, no alpha) for Expo | **No** |
| iPhone screenshots (required sizes) | **No** |
| iPad screenshots | **No** (only needed if `supportsTablet: true` / iPad binary) |
| Promo text (≤170 chars) | **No** |
| Description | **No** (web marketing copy exists; not App Store–formatted) |
| Keywords | **No** |
| Support URL | Suggest `https://www.gracerun.fit` or `mailto:hello@gracerun.fit` — confirm dedicated support page if required |
| Marketing URL | Optional: `https://www.gracerun.fit` |
| Privacy Policy URL | **Yes** — live |

---

## Ready to build? **no**

**Reason:** Missing `ios.bundleIdentifier`, build number, App Store–compliant icon wiring, and entire `eas.json` production/submit profiles. Privacy URL is fine; auth/ATT posture is acceptable for a first submission once config and assets exist. Do not run `eas build` until those blockers are fixed (and config edits are explicitly approved).

---

## Next commands

After config/assets/`eas.json` are approved and written (not done in this audit):

```bash
cd apps/mobile
npx expo-doctor
# optional local native project check:
# npx expo prebuild --platform ios --clean

# Production binary (COSTS EAS CREDITS — do not run until ready):
eas build --platform ios --profile production

# After build succeeds + App Store Connect app exists:
eas submit --platform ios --profile production
```

---

## App Store screenshot sizes and counts

Apple’s required set depends on the devices your binary supports. For a typical iPhone-only first ship (`supportsTablet: false`):

### Required (iPhone)

| Display | Size (portrait px) | Count (typical) |
| --- | --- | --- |
| 6.7" / 6.9" (e.g. iPhone 15 Pro Max / 16 Pro Max class) | **1290 × 2796** | **3–10** screenshots (minimum **1**; recommend **5–6**) |
| 6.5" (e.g. iPhone 11 Pro Max / XS Max class) | **1284 × 2778** or **1242 × 2688** | **3–10** (often still required as a second size class) |

Exact Connect slots change over time; if Connect shows a 6.1" slot, common size is **1179 × 2556**. Provide portrait PNG/JPEG, no alpha issues, GraceRun UI only (no Ptero / Fusion Express chrome).

### iPad (only if tablet supported)

| Display | Size (portrait px) | Count |
| --- | --- | --- |
| 12.9" / 13" iPad Pro | **2048 × 2732** | 3–10 |
| 11" iPad Pro (if listed) | **1668 × 2388** | as required by Connect |

### Recommendation for GraceRun v1

- Set **`ios.supportsTablet`: `false`** for the first release to avoid iPad screenshot + layout work.
- Capture **5 screenshots** on the largest required iPhone size: Home, Menu, Cart/Checkout, Orders/Track, Profile (or Runner if you market runner mode).

---

## EAS: expected vs current

### `eas.json` — **file missing**

Expected production build profile (illustrative — do not commit secrets):

```json
{
  "cli": { "version": ">= 16.0.0", "appVersionSource": "remote" },
  "build": {
    "production": {
      "ios": {
        "resourceClass": "m-medium"
      },
      "distribution": "store",
      "credentialsSource": "remote",
      "autoIncrement": "buildNumber",
      "env": {
        "EXPO_PUBLIC_FIREBASE_API_KEY": "${EXPO_PUBLIC_FIREBASE_API_KEY}",
        "EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN": "${EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN}",
        "EXPO_PUBLIC_FIREBASE_PROJECT_ID": "${EXPO_PUBLIC_FIREBASE_PROJECT_ID}",
        "EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET": "${EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET}",
        "EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID": "${EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID}",
        "EXPO_PUBLIC_FIREBASE_APP_ID": "${EXPO_PUBLIC_FIREBASE_APP_ID}",
        "EXPO_PUBLIC_WEB_ORIGIN": "https://www.gracerun.fit"
      }
    }
  },
  "submit": {
    "production": {
      "ios": {
        "ascAppId": "${ASC_APP_ID}",
        "appleId": "${APPLE_ID}",
        "appleTeamId": "${APPLE_TEAM_ID}"
      }
    }
  }
}
```

Notes:

- Production iOS builds should be **Release** (EAS store distribution default).
- Prefer **`credentialsSource": "remote"`** (EAS-managed).
- Prefer **`autoIncrement`: `"buildNumber"`** or manage `ios.buildNumber` manually.
- **Do not hardcode** Apple passwords, app-specific passwords, or API keys in the repo. Use EAS Secrets / env: `APPLE_ID` (= `hello@gracerun.fit`), `APPLE_TEAM_ID`, `ASC_APP_ID`, `EXPO_PUBLIC_FIREBASE_*`.
- Optional: App Store Connect API key via EAS (`ascApiKeyPath` / EAS secrets) instead of appleId password flow.

### Current `submit.production.ios`

**Missing** — no submit profile. After creating the app in Connect, fill `ascAppId` from App Information → Apple ID (numeric), keep `appleId` / team via secrets.

---

## App Store Connect — manual steps

Cannot be automated from this repo. Account: **`hello@gracerun.fit`** (active).

1. **Apple Developer** → Certificates, Identifiers & Profiles → Identifiers → register App ID with Bundle ID **exactly matching** future `ios.bundleIdentifier` (e.g. `fit.gracerun.app`). Enable capabilities you will use (Push later, Sign in with Apple only if added).
2. **App Store Connect** → My Apps → **+** → New App.
   - Platforms: iOS  
   - Name: **GraceRun** (not Ptero / Fusion Express)  
   - Primary language: **English (U.S.)** or English (U.K.)  
   - Bundle ID: select the ID from step 1  
   - SKU: **`gracerun-ios-001`**  
   - User Access: Full Access (as appropriate)
3. App Information: Privacy Policy URL `https://www.gracerun.fit/privacy`; category (e.g. Food & Drink / Lifestyle); age rating questionnaire (target **12+** answers).
4. Pricing: Free (unless otherwise decided).
5. Prepare version 1.0.0 listing: description, keywords, support URL, screenshots, app icon.
6. Export compliance: declare standard encryption only / set Info.plist flag as above.
7. After first EAS build, attach the build to the version and submit for review (human step — out of scope for this audit).

---

## Audit checklist (quick)

| Area | Verdict |
| --- | --- |
| Display name GraceRun | OK in `app.json` |
| Slug `gracerun` | Fail (`fusion-express`) |
| Version 1.0.0 | OK |
| Bundle ID | Missing |
| Build number | Missing |
| Icon | Missing / non-compliant candidates only on web |
| Photo usage string | OK via plugin |
| Camera / location strings | N/A until those APIs are used |
| `eas.json` production | Missing |
| Privacy URL | Live OK |
| Screenshots / listing copy | Missing |
| ATT | Not required currently |
| Sign in with Apple | Not required currently |
| Age rating | Recommend 12+ |
| Encryption exemption flag | Should set `false` when configuring iOS |
| Ptero naming in store assets | Avoid — flagged in docs/branches only |
