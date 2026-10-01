# Android Play — Step 2: EAS Build profile verification

**Brand:** GraceRun (NOT Ptero)  
**App path:** `apps/mobile/`  
**Scope:** Verify EAS Build profiles for Google Play submission (read-only)  
**Date:** 2026-10-01  
**Branch context:** verified against worktree at time of report  

---

## Verdict

| Check | Status |
| --- | --- |
| `eas.json` present | **BLOCKER — missing** |
| `production` profile with `buildType: "app-bundle"` | **N/A — no profile file** |
| Distribution set for store | **N/A — no profile file** |
| Production env vars (Firebase, etc.) in EAS profile | **N/A — no profile file** |
| EAS project linked (`extra.eas.projectId`) | **No — not linked** |
| Preview / development profiles | **None** |

**BLOCKER:** There is no `eas.json` at `apps/mobile/eas.json` or the repo root. Google Play submission via EAS Build cannot proceed until a production profile exists that emits an Android App Bundle (`.aab`).

No `eas build` was run (credits preserved). No `app.json` / `eas.json` files were modified; proposed config is documented below only.

---

## Files inspected

| Path | Result |
| --- | --- |
| `apps/mobile/eas.json` | **Missing** |
| `/eas.json` (repo root) | **Missing** |
| `apps/mobile/.eas/` | **Missing** |
| `apps/mobile/app.json` | Present — Expo config only; **no** `extra.eas.projectId` |
| `apps/mobile/app.config.js` / `.ts` | **Missing** |
| `apps/mobile/package.json` | Expo ~53; no `eas-cli` script or dependency |
| `apps/mobile/.env.example` | Documents `EXPO_PUBLIC_FIREBASE_*` + `EXPO_PUBLIC_WEB_ORIGIN` |

Repo-wide search found **no** `eas.json` and **no** Expo `projectId` / EAS linking metadata for the mobile app.

---

## Current production profile

**There is no production profile.** Nothing to quote from `eas.json`.

Expected for Play (when created):

- `build.buildType` (Android) = `"app-bundle"` → produces `.aab`, not `.apk`
- `distribution` = `"store"` (typical for Play upload)
- Env / secrets for production Firebase and web origin wired into the profile or EAS project secrets

---

## EAS project linking

**EAS is not linked.**

Evidence from `apps/mobile/app.json`:

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

Gaps related to Play / EAS:

- No `extra.eas.projectId`
- No `android.package` (applicationId) — required before a store build
- No `android` block at all (versionCode, adaptive icon, permissions, etc.)
- No `.eas` project directory

Brand signal in config is correct: `"name": "GraceRun"`. Slug/scheme still use legacy `fusion-express` / `fusionexpress` naming — not a Step 2 blocker by itself, but worth aligning before store listing.

---

## Preview / development profiles

None. With no `eas.json`, there are no `development`, `preview`, or `production` profiles for context.

---

## Environment variables (app needs vs EAS)

Mobile runtime expects Expo public Firebase keys (see `apps/mobile/.env.example` and `packages/shared/src/firebase.ts`):

| Variable | Purpose |
| --- | --- |
| `EXPO_PUBLIC_FIREBASE_API_KEY` | Firebase client config |
| `EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN` | Firebase Auth |
| `EXPO_PUBLIC_FIREBASE_PROJECT_ID` | Firebase project |
| `EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET` | Storage |
| `EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID` | Messaging |
| `EXPO_PUBLIC_FIREBASE_APP_ID` | App ID |
| `EXPO_PUBLIC_WEB_ORIGIN` | Example default: `https://gracerun.vercel.app` |

These are **documented locally** via `.env.example` only. They are **not** declared under any EAS build profile `env` map because `eas.json` does not exist. For production Play builds they should be supplied via EAS secrets / profile `env` (or Expo environment variables) so CI builds are not dependent on a local `.env`.

---

## Proposed changes (documentation only — not applied)

### 1. Create `apps/mobile/eas.json`

```json
{
  "cli": {
    "version": ">= 16.0.0",
    "appVersionSource": "remote"
  },
  "build": {
    "development": {
      "developmentClient": true,
      "distribution": "internal",
      "android": {
        "buildType": "apk"
      }
    },
    "preview": {
      "distribution": "internal",
      "android": {
        "buildType": "apk"
      }
    },
    "production": {
      "distribution": "store",
      "android": {
        "buildType": "app-bundle"
      },
      "env": {
        "EXPO_PUBLIC_FIREBASE_API_KEY": "$(EXPO_PUBLIC_FIREBASE_API_KEY)",
        "EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN": "$(EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN)",
        "EXPO_PUBLIC_FIREBASE_PROJECT_ID": "$(EXPO_PUBLIC_FIREBASE_PROJECT_ID)",
        "EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET": "$(EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET)",
        "EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID": "$(EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID)",
        "EXPO_PUBLIC_FIREBASE_APP_ID": "$(EXPO_PUBLIC_FIREBASE_APP_ID)",
        "EXPO_PUBLIC_WEB_ORIGIN": "https://gracerun.vercel.app"
      }
    }
  },
  "submit": {
    "production": {
      "android": {
        "track": "internal"
      }
    }
  }
}
```

Notes on the proposal:

- Prefer real values via **EAS Secrets** / Expo dashboard env rather than committing secrets into `eas.json`. The `env` keys above are a checklist of what production must inject.
- `production.android.buildType: "app-bundle"` is mandatory for Play Console `.aab` upload.
- `distribution: "store"` is the correct store path; keep `preview`/`development` on `internal` + `apk` for sideload testing.

### 2. Link EAS project (does not create a new Expo app slug unless intentional)

After `eas init` / link (run by a human with Expo credentials — not done in this pass), `app.json` should gain something like:

```json
"extra": {
  "eas": {
    "projectId": "<uuid-from-eas-init>"
  }
}
```

Also add Android identity before first store build (separate from Step 2 profile file, but required for a real AAB):

```json
"android": {
  "package": "fit.gracerun.app",
  "versionCode": 1
}
```

(Package name is illustrative — confirm the final Play applicationId with product before applying.)

### 3. Do not run yet

- Do **not** run `eas build` until profiles + linking + Android package + signing credentials are in place.
- Do **not** touch iOS profiles for this Play track.

---

## Summary for parent agent

1. **`eas.json` is missing — blocker for Step 2 / Play AAB builds.**
2. **No current production profile** (no `buildType: "app-bundle"`, no distribution, no profile env).
3. **EAS is not linked** — no `extra.eas.projectId` in `app.json`, no `.eas/`, no `app.config.*`.
4. **No preview/development profiles** exist for context.
5. Firebase `EXPO_PUBLIC_*` vars are known from `.env.example` but are not wired into any EAS production profile.
6. Proposed `eas.json` + linking + `android.package` documented above; **not applied** in this worktree (read-only preference honored aside from this report).
)
