# Android Play readiness — Step 1: `app.json` / app config audit

**Date:** 1 October 2026  
**Scope:** Read-only audit of Expo app config under `apps/mobile/`. No `eas build`, no config edits, no iOS changes.  
**Brand:** GraceRun (Ptero naming is a Play listing warning/blocker).  
**Worktree branch base:** `cursor/ptero-cityu-match`

---

## Files inspected

| Path | Present? | Notes |
| --- | --- | --- |
| `apps/mobile/app.json` | **Yes** | Sole Expo config file |
| `apps/mobile/app.config.js` | **No** | Not present |
| `apps/mobile/app.config.ts` | **No** | Not present |
| `apps/mobile/eas.json` | **No** | Not present |
| `apps/mobile/package.json` | **Yes** | Expo deps listed; no EAS CLI |
| `apps/mobile/google-services.json` | **No** | Not present anywhere under `apps/mobile/` |
| `apps/mobile/assets/` | **No** | Directory missing (no icons/splash) |

---

## Current `apps/mobile/app.json` (verbatim)

```json
{
  "expo": {
    "name": "GraceRun",
    "slug": "fusion-express",
    "version": "1.0.0",
    "orientation": "portrait",
    "scheme": "fusionexpress",
    "userInterfaceStyle": "light",
    "newArchEnabled": true,
    "plugins": [
      "expo-router",
      [
        "expo-image-picker",
        {
          "photosPermission": "GraceRun uses photos for delivery proof."
        }
      ]
    ],
    "experiments": {
      "typedRoutes": true
    }
  }
}
```

**There is no `android` block at all.**

---

## Field-by-field checklist

| Field | Expected (Play / GraceRun) | Current value | Status |
| --- | --- | --- | --- |
| `expo.name` | `"GraceRun"` | `"GraceRun"` | **PASS** |
| `expo.slug` | `"gracerun"` (matches Expo project) | `"fusion-express"` | **FAIL / BLOCKER** — wrong slug for Expo project & brand |
| `expo.version` | `"1.0.0"` | `"1.0.0"` | **PASS** |
| `expo.scheme` | Prefer `gracerun` (brand deep link) | `"fusionexpress"` | **WARN** — not Ptero, but not GraceRun-branded |
| `android.package` | Valid reverse-DNS (e.g. `fit.gracerun.app`) | **MISSING** (`null` / undefined) | **FAIL / BLOCKER** — required for Play / Android applicationId |
| `android.versionCode` | `1` (or current integer) | **MISSING** | **FAIL / BLOCKER** — required for Play versioning |
| `android.permissions` | Explicit list; justify each | **MISSING** (no `android` section) | **FAIL / BLOCKER** — cannot audit declared permissions; Expo plugins may still inject some at prebuild |
| `android.adaptiveIcon` | 1024×1024 foreground + background | **MISSING**; no asset files | **FAIL / BLOCKER** |
| `android.googleServicesFile` | Path to `google-services.json` | **MISSING**; file not found | **FAIL / BLOCKER** for Firebase/Google Services on Android |
| `icon` / `splash` (root expo) | Present for store / launch | **MISSING** | **FAIL / BLOCKER** for store listing assets |

### `android.package` — exact current value

**Exact current value: not set** (field absent from `app.json`).

No fallback `android.package` exists in an `app.config.*` file either (those files do not exist).

### `android.versionCode` — exact current value

**Exact current value: not set** (field absent).

### `android.permissions` — full list

**Declared in `app.json`: none** (no `android.permissions` array).

**Plugin-implied permission messaging (not a full permissions list):**

- `expo-image-picker` plugin with `photosPermission`: `"GraceRun uses photos for delivery proof."`  
  → Implies photo library / media access will be requested at runtime; no corresponding explicit `android.permissions` entry to review in config.
- No camera, location, notifications, or storage permission strings are configured in `app.json`.

**Unused / unexplained:** Cannot classify unused permissions because none are declared. Risk: default Expo prebuild may add permissions from installed packages (`expo-image-picker`, linking, etc.) without an audited allowlist in this repo.

### `android.adaptiveIcon`

| Asset | Expected | Found |
| --- | --- | --- |
| Foreground image path | Configured under `android.adaptiveIcon.foregroundImage` | **Not configured** |
| Background color/image | Configured under `android.adaptiveIcon.backgroundColor` / `backgroundImage` | **Not configured** |
| File existence | Files under e.g. `./assets/adaptive-icon.png` | **`apps/mobile/assets/` does not exist** |
| Dimensions 1024×1024 | Measurable PNG | **N/A — no files to measure** |

Only unrelated store icon found in monorepo: `apps/web/src/app/icon.png` (web favicon; not wired into mobile Expo config).

### `android.googleServicesFile`

| Check | Result |
| --- | --- |
| Config path | **Not set** |
| `apps/mobile/google-services.json` | **Does not exist** |
| Repo-wide `google-services.json` | **Not found** under `/workspace` |

Mobile Firebase is currently env-var based (`EXPO_PUBLIC_FIREBASE_*` in `.env.example`); that does not replace Android native `google-services.json` for Play/Firebase native SDKs.

---

## Ptero naming scan (`apps/mobile/`)

| Location | Finding |
| --- | --- |
| `apps/mobile/app.json` `name` | `"GraceRun"` — OK |
| `apps/mobile/app.json` plugins copy | GraceRun — OK |
| `apps/mobile/app/(tabs)/index.tsx` | Displays `GraceRun` — OK |
| `apps/mobile/.env.example` | `https://gracerun.vercel.app` — OK |
| Literal `Ptero` / `ptero` under `apps/mobile/` | **None found** |

**Play-listing note:** No Ptero string inside the mobile Expo app package itself. Remaining Ptero / fusion-express naming that still hurts GraceRun Play readiness:

| Item | Value | Severity for Play listing |
| --- | --- | --- |
| `expo.slug` | `fusion-express` | **BLOCKER** vs expected `gracerun` |
| `expo.scheme` | `fusionexpress` | **WARN** (deep links / brand) |
| npm package name | `@fusion-express/mobile` | **WARN** (internal; not store-facing title) |
| Monorepo / branch names with `ptero` | e.g. `cursor/ptero-cityu-match`, `apps/web/src/ptero/*` | **WARN** for repo hygiene — outside Step 1 mobile config, but do not ship store listing as Ptero |

---

## `package.json` — Expo / EAS dependencies

### `apps/mobile/package.json`

| Package | Version / present? | Notes |
| --- | --- | --- |
| `expo` | `~53.0.20` | Present |
| `expo-router` | `~5.1.4` | Present |
| `expo-constants` | `~17.1.7` | Present |
| `expo-image-picker` | `~16.1.4` | Present (drives photos permission string) |
| `expo-linking` | `~7.1.7` | Present |
| `expo-status-bar` | `~2.2.3` | Present |
| `firebase` | `^12.17.1` | JS SDK only |
| `eas-cli` | **Absent** | Not in dependencies or devDependencies |
| `@expo/config-plugins` / related EAS packages | **Absent** | No dedicated EAS tooling in this package |

Scripts: `start`, `android`, `ios`, `web`, `typecheck` — **no** `eas build` / `eas submit` scripts.

### Root `package.json`

- Workspace name: `fusion-express`
- No `eas-cli` / Expo EAS dependency at root
- `dev:mobile` → `npm run start -w @fusion-express/mobile`

### `eas.json`

**Missing** at `apps/mobile/eas.json` and repo root. Android Play build profiles are not defined in-repo.

---

## Missing / malformed fields (summary for parent)

### Blockers for Google Play / Expo Android readiness

1. **`expo.slug`** is `"fusion-express"` — must be `"gracerun"` to match Expo project / brand.
2. **`android` section entirely missing.**
3. **`android.package` missing** — must be valid reverse-DNS (e.g. `fit.gracerun.app`); current exact value: *(unset)*.
4. **`android.versionCode` missing** — expect `1` for first upload; current: *(unset)*.
5. **`android.permissions` missing** — no audited list; cannot confirm Play permission declarations.
6. **`android.adaptiveIcon` missing** — no foreground/background config; no 1024×1024 assets; `assets/` folder absent.
7. **`android.googleServicesFile` missing** — no path; `google-services.json` not in tree.
8. **No root `icon` / splash** configured for Expo.
9. **No `eas.json`** and **no `eas-cli`** — EAS Android build/submit not configured in this package.

### Warnings (not Ptero in mobile, but brand / ops)

1. **`scheme`: `"fusionexpress"`** — not GraceRun-branded.
2. **npm name `@fusion-express/mobile`** — internal monorepo naming.
3. **Branch / web `ptero` paths** exist elsewhere in monorepo — ensure Play Console listing, store title, and package id never say Ptero.
4. **Permissions unexplained by design**: `expo-image-picker` will need a clear Play Data safety / permissions justification for photos; nothing else is declared yet.

### Passes

1. **`name`: `"GraceRun"`** — correct brand (not Ptero).
2. **`version`: `"1.0.0"`** — matches expected.
3. **No Ptero string inside `apps/mobile/` Expo config or UI strings scanned.**

---

## Verdict

**Step 1 status: NOT Play-ready.** Display name and version are fine; Android packaging, versioning, icons, Google Services, Expo slug, permissions allowlist, and EAS project config are missing or wrong. Fix config in a later step (do not edit in this audit).

---

## Audit constraints honored

- Did **not** run `eas build`
- Did **not** modify `app.json` / `app.config.*`
- Did **not** create a new Expo project
- Did **not** touch iOS config
- Report written to `docs/android-play-step1-app-config.md` only
