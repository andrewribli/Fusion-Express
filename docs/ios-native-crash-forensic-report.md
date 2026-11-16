# iOS Native Launch Crash — Forensic Report (paste-ready for another AI)

**Date:** 2026-10-22 (workspace timezone context; builds logged as 2026-10-20 in `docs/ios-fix-log.md`)  
**Repo:** `fusion-express` (monorepo)  
**Crasher app:** `apps/mobile` (GraceRun / bundle `com.gracerun.fusionexpress`)  
**Control app:** `apps/mobile-test` (same EAS project + same bundle ID historically used for bisect)  
**Audience:** Analysis-only. Do **not** propose or apply product fixes unless Andrew asks. Use this document + next TestFlight result to decide the next bisect step.

---

## 1. Symptom

### What works
- **`apps/mobile-test`** ships a simple Red Box / canary UI and **launches successfully** on device (TestFlight / production EAS iOS). Same Expo SDK 53 / RN 0.79.6 generation, same Xcode build image family (`macos-sequoia-15.6-xcode-26.2`).

### What fails
- **`apps/mobile`** (real GraceRun app) **crashes at launch** with a **native** abort, even when JS UI is reduced to the same style of Red Box `App.tsx`.
- Crash signature class (device / Xcode crash logs):
  - **`NSException`**
  - Frames / modules involving **`MetalPerformanceShadersGraph`** (seen in crash analysis)
  - Thread / queue: **`com.facebook.react.ExceptionsManagerQueue`**
  - Timing: very early (~0.4s on some builds) — **before meaningful JS UI mounts** (Red Box never appears)
- Important distinction vs earlier bisect on `mobile-test`:
  - Some older `mobile-test` + expo-router builds died with **Hermes SIGSEGV**.
  - Current **real app** failures (builds **18 / 19 / 35 / 37**, and expected class for pending tests) are **NSException / ExceptionsManagerQueue / MetalPerformanceShadersGraph** — not the same as “white screen after JS mounts.”

### Critical experiment already done
- Real app `App.tsx` replaced with Red Box canary.
- NativeWind runtime wiring stripped (metro / CSS / babel) in build **38**.
- Crash still attributed to **native module / autolink / startup path**, not the React tree content — because Red Box never shows.

**Interpretation rule for next TestFlight:**
- If Red Box appears → last stripped native dependency was the culprit (or strongly implicated).
- If same native crash → continue dependency bisect; do not chase App.tsx UI.

---

## 2. Working vs crashing apps

| Dimension | `apps/mobile-test` (WORKS) | `apps/mobile` (CRASHES) |
|---|---|---|
| Purpose | Launch bisect / canary | Production GraceRun customer app |
| Expo SDK | `~53.0.27` | `~53.0.20` |
| React / RN | `19.0.0` / `0.79.6` | `19.0.0` / `0.79.6` |
| Entry | `index.ts` → Red Box / nav canaries | `index.ts` → gesture-handler + global error handler + Firebase Auth init + Red Box `App` |
| Navigation stack in working canaries | React Navigation (no expo-router) proved OK on test app | Real app migrated off expo-router to React Navigation; still crashes |
| NativeWind | Not used | Package still listed; babel/metro/CSS **stripped** in bisect (build 38) |
| Reanimated | **Not installed** | Was `~3.17.4` + babel plugin — **STRIPPED in current bisect** (this report’s Part B) |
| Firebase JS SDK | No | Yes (`firebase` + custom `src/firebase-init.ts`) |
| expo-notifications | No | Yes |
| expo-image-picker | No | Yes (+ config plugin) |
| @react-native-community/netinfo | No | Yes |
| Monorepo workspace packages | No | `@fusion-express/shared`, `@fusion-express/ui` |
| EAS project | Same `bcb10fe2-e2f2-40e6-a6dd-0c6337441e8a` | Same |
| Bundle ID | `com.gracerun.fusionexpress` | `com.gracerun.fusionexpress` |
| Xcode image (production) | `macos-sequoia-15.6-xcode-26.2` | `macos-sequoia-15.6-xcode-26.2` |
| `newArchEnabled` | Not set (default) in test `app.json` | Explicitly **`false`** in `app.json` + `expo-build-properties` |

**Bottom line:** Control proves Expo 53 + gesture-handler + screens + safe-area + React Navigation can launch on this Xcode/device path. Delta is almost entirely **extra native modules + Firebase boot + Reanimated (until this bisect) + remaining packages still present**.

---

## 3. Full package.json dependency diff (mobile-only deps)

Sources: `apps/mobile/package.json` vs `apps/mobile-test/package.json` **before** the Reanimated strip (historical crash baseline). After Part B, Reanimated is removed from mobile.

### Shared (both apps)
| Package | mobile-test | mobile |
|---|---|---|
| `@react-native-async-storage/async-storage` | `2.1.2` | `2.1.2` |
| `@react-navigation/bottom-tabs` | `^7.21.0` | `^7.21.0` |
| `@react-navigation/native` | `^7.5.1` | `^7.5.1` |
| `@react-navigation/native-stack` | `^7.21.0` | `^7.21.0` |
| `expo` | `~53.0.27` | `~53.0.20` |
| `expo-constants` | `~17.1.7` | `~17.1.7` |
| `expo-linking` | `~7.1.7` | `~7.1.7` |
| `expo-status-bar` | `2.2.3` | `~2.2.3` |
| `react` | `19.0.0` | `19.0.0` |
| `react-native` | `0.79.6` | `0.79.6` |
| `react-native-gesture-handler` | `~2.24.0` | `~2.24.0` |
| `react-native-safe-area-context` | `5.4.0` | `5.4.0` |
| `react-native-screens` | `~4.11.1` | `~4.11.1` |

### mobile-only (present on crashing app, absent on working test)
| Package | Version (at crash baseline) | Notes |
|---|---|---|
| `@fusion-express/shared` | `*` | Workspace JS package |
| `@fusion-express/ui` | `*` | Workspace JS package |
| `@react-native-community/netinfo` | `11.4.1` | Native module — **not stripped yet** |
| `expo-build-properties` | `~0.14.8` | Forces `newArchEnabled: false` |
| `expo-image-picker` | `~16.1.4` | Native + config plugin — **not stripped yet** |
| `expo-notifications` | `~0.31.5` | Native — **not stripped yet** |
| `firebase` | `^12.17.1` | JS SDK; Auth init on entry — **not stripped yet** |
| `nativewind` | `^4.1.23` | Package still installed; babel/metro/CSS wiring stripped (build 38) |
| `react-is` | `^19.1.0` | JS |
| `react-native-reanimated` | `~3.17.4` | **TOP SUSPECT — removed in current bisect** |
| `scheduler` | `^0.25.0` | JS |
| `tailwindcss` | `^3.4.17` | JS tooling / styles |

### mobile-only (devDependencies of note)
| Package | mobile | mobile-test |
|---|---|---|
| `@babel/core` | `^7.25.2` | (none) |
| `babel-preset-expo` | `~13.0.0` | (none listed; Expo may supply transitively) |
| `typescript` / `@types/react` | present | present |

### Install topology
- Monorepo root: `package.json` workspaces `apps/*`, `packages/*`; lockfile at repo root (`package-lock.json`).
- Mobile has `"eas-build-post-install": "cd ../.. && npm install"`.
- Prefer `npm install` from **repo root** after dependency edits.

---

## 4. Full `apps/mobile/app.json` + flags

```json
{
  "expo": {
    "name": "GraceRun",
    "slug": "fusion-express",
    "owner": "gracerun",
    "version": "1.0.0",
    "orientation": "portrait",
    "icon": "./assets/icon.png",
    "scheme": "fusionexpress",
    "userInterfaceStyle": "light",
    "newArchEnabled": false,
    "splash": {
      "image": "./assets/splash.png",
      "resizeMode": "contain",
      "backgroundColor": "#000000"
    },
    "plugins": [
      [
        "expo-image-picker",
        {
          "photosPermission": "GraceRun uses photos for delivery proof."
        }
      ],
      [
        "expo-build-properties",
        {
          "ios": {
            "newArchEnabled": false
          },
          "android": {
            "newArchEnabled": false
          }
        }
      ]
    ],
    "extra": {
      "eas": {
        "projectId": "bcb10fe2-e2f2-40e6-a6dd-0c6337441e8a"
      }
    },
    "ios": {
      "supportsTablet": false,
      "bundleIdentifier": "com.gracerun.fusionexpress",
      "infoPlist": {
        "ITSAppUsesNonExemptEncryption": false,
        "NSPhotoLibraryUsageDescription": "GraceRun uses photos for delivery proof.",
        "NSCameraUsageDescription": "GraceRun uses the camera for delivery proof."
      }
    },
    "android": {
      "adaptiveIcon": {
        "foregroundImage": "./assets/adaptive-icon.png",
        "backgroundColor": "#000000"
      },
      "package": "com.gracerun.fusionexpress"
    },
    "web": {
      "favicon": "./assets/favicon.png"
    }
  }
}
```

### Flag summary
- **`newArchEnabled`: `false`** at Expo root **and** via `expo-build-properties` for iOS/Android.
- **Plugins that touch native:** `expo-image-picker`, `expo-build-properties`.
- **No** `expo-router` plugin (removed during React Navigation migration).
- **Scheme:** `fusionexpress` (deep linking; test app currently has no scheme).
- **EAS projectId:** `bcb10fe2-e2f2-40e6-a6dd-0c6337441e8a`.

---

## 5. Entry files: `apps/mobile/index.ts` vs `apps/mobile-test/index.ts`

### `apps/mobile/index.ts` (crasher — current)

```ts
import "react-native-gesture-handler";
import "./src/global-error-handler";
import { initMobileFirebaseAuth } from "./src/firebase-init";
import { registerRootComponent } from "expo";
import App from "./App";

// Auth persistence must be ready before any screen calls getAuth().
initMobileFirebaseAuth();

// registerRootComponent calls AppRegistry.registerComponent('main', () => App);
// It also ensures that whether you load the app in Expo Go or in a native build,
// the environment is set up appropriately
registerRootComponent(App);
```

### `apps/mobile-test/index.ts` (working)

```ts
import "react-native-gesture-handler";
import { registerRootComponent } from "expo";

import App from "./App";

// registerRootComponent calls AppRegistry.registerComponent('main', () => App);
// It also ensures that whether you load the app in Expo Go or in a native build,
// the environment is set up appropriately
registerRootComponent(App);
```

### Delta on entry path
1. Mobile imports **`./src/global-error-handler`** before App.
2. Mobile calls **`initMobileFirebaseAuth()`** before `registerRootComponent`.
3. Both import **`react-native-gesture-handler`** first (required for React Navigation; proven OK on test app).
4. Mobile `App.tsx` is currently Red Box only — so Firebase/error-handler still run even when UI is canary.

---

## 6. Babel / Metro / EAS notes

### Babel — `apps/mobile/babel.config.js`
**Before Reanimated strip (crash builds through 38):**
```js
module.exports = function (api) {
  api.cache(true);
  return {
    presets: ["babel-preset-expo"],
    plugins: ["react-native-reanimated/plugin"],
  };
};
```

**After Reanimated strip (current bisect):**
```js
module.exports = function (api) {
  api.cache(true);
  return {
    presets: ["babel-preset-expo"],
  };
};
```

**`apps/mobile-test/babel.config.js`:** `babel-preset-expo` only (no reanimated plugin) — matches post-strip mobile.

### Metro — `apps/mobile/metro.config.js`
Current (post NativeWind strip):
```js
const { getDefaultConfig } = require('expo/metro-config');
module.exports = getDefaultConfig(__dirname);
```
- No `withNativeWind`.
- Earlier builds had monorepo/Firebase resolver hacks; current file is plain default (verify if Firebase resolver was reintroduced — as of this bisect it is plain).

### EAS — both apps
- Production iOS image: **`macos-sequoia-15.6-xcode-26.2`** (Xcode **26.2**).
- `autoIncrement: true` on production.
- Auto-submit to ASC app id `6819612841`.
- Same Apple credentials / same bundle ID used across test and real app bisects (TestFlight slot sharing).

### Historical Babel failure
- Build **36**: adding `nativewind/babel` failed bundle with missing `react-native-worklets/plugin` (SDK 53 / Reanimated 3 world). Reverted in build **37**.

---

## 7. Top 3 suspects (ranked)

### #1 — `react-native-reanimated` (highest)
**Rationale:**
- Present only on crashing app; absent on working `mobile-test`.
- Autolinks native code + requires last babel plugin — runs at native startup / worklet runtime even when App UI does not import it.
- Crash involves Metal / graph frameworks; Reanimated’s native pipeline historically intersects animation / UI thread / Fabric edges (even with New Arch off).
- Red Box App still crashed while Reanimated remained linked → classic “native module in binary” fingerprint, not React component bug.
- **This bisect removes it from package + babel and rebuilds with cache clear.**

### #2 — `expo-notifications` (next after Reanimated)
**Rationale:**
- Native module only on mobile; often registers at launch / has iOS entitlement & push path.
- Not required for Red Box proof; easy next strip if Reanimated removal fails.
- Less implicated by MetalPerformanceShadersGraph naming than graphics/animation stacks, but still a strong native delta.

### #3 — `expo-image-picker` (and/or its config plugin)
**Rationale:**
- Native + `app.json` plugin; photo/camera usage strings present.
- Only on mobile; not on boot UI path for Red Box, but still linked into binary.
- Slightly lower than notifications because picker is usually lazy until invoked — still worth stripping if #1/#2 fail.

### Honorable mentions (do not jump yet)
- **Firebase Auth init on entry** (`initMobileFirebaseAuth`) — caused fatal *JS* paths earlier; current signature reads more *native*. Keep until native deltas cleared, unless evidence shifts.
- **`@react-native-community/netinfo`** — native, mobile-only; after notifications/image-picker.
- **NativeWind package still installed** — wiring already stripped (build 38); package presence alone is lower priority than Reanimated/notifications/picker.
- **Xcode 26.2** — shared by working test app, so unlikely sole cause unless interacting with a specific native module.

---

## 8. Bisect plan (status)

| Step | Action | Status |
|---|---|---|
| A | Prove `mobile-test` launches (no expo-router; React Navigation / canary) | **DONE** |
| B | Real app off expo-router → React Navigation (build 35) | **DONE** — still crashed |
| C | Firebase Auth RN resolution / boot harden (build 36) | **DONE** — build **ERRORED** (babel worklets) |
| D | Revert nativewind/babel; keep reanimated plugin (build 37) | **DONE** — crashed same class as 18/19/35 |
| E | Strip NativeWind **config** (metro/CSS/index); keep Red Box (build 38) | **DONE** (device result may still be pending / assumed not sufficient) |
| F | **Strip `react-native-reanimated`** (package + babel plugin); Red Box App; EAS clear-cache | **IN PROGRESS (this change)** |
| G | Strip `expo-notifications` (keep picker/firebase/netinfo) | **PENDING** |
| H | Strip `expo-image-picker` (+ plugin) | **PENDING** |
| I | Strip/netinfo / simplify Firebase entry init | **PENDING** if still crashing |
| J | Re-add modules one-by-one after first green Red Box | **PENDING** |

**Constraint:** One native delta per production build. Do not batch strips.

---

## 9. Build history notes (known)

| Build | App | Intent | Result |
|---|---|---|---|
| 18 / 19 | mobile | Earlier real-app launches | **CRASHED** — same native class later seen again |
| 24 | mobile-test | Blank Expo SDK 53 | **LAUNCHED** |
| 25–26, 28 | mobile-test | + expo-router | **CRASHED** — Hermes SIGSEGV (different class) |
| 29–31 | mobile-test | React Navigation migration / tabs | Launch shell OK / white-screen UI issues (not NSException class) |
| 33 | mobile-test | Red canary without nav | WAITING / canary path |
| 35 | mobile | Real app on React Navigation | **CRASHED** ~0.4s — ExceptionsManagerQueue / fatal at boot |
| 36 | mobile | Firebase Auth metro/babel work | **ERRORED** — `[BABEL] Cannot find module 'react-native-worklets/plugin'` |
| 37 | mobile | babel = preset-expo + reanimated; NativeWind via metro | **CRASHED** — NSException / ExceptionsManagerQueue (same as 18/19/35); Red Box never appeared |
| 38 | mobile | NativeWind strip + Red Box | WAITING / NativeWind-config bisect |
| **(next)** | mobile | **Reanimated strip** + Red Box + `--clear-cache` | See §11 below |

Reference log (human timeline): `docs/ios-fix-log.md`.

---

## 10. DO NOT FIX — analysis-only guidance for the other AI

### Explicit prohibitions
- **Do not** rewrite the product app, restore full navigation, or “fix” Firebase/UI while the launch bisect is open.
- **Do not** re-enable New Architecture, change Xcode image, or upgrade Expo SDK as the first response — those are large confounders.
- **Do not** reintroduce `nativewind/babel` or `react-native-worklets` without a dedicated experiment.
- **Do not** claim Reanimated is innocent if Red Box appears after this strip — treat that as primary confirmation unless contradicted by a later re-add experiment.
- **Do not** merge multiple dependency removals into one build.

### What to look for on the next TestFlight result

| Device outcome | Meaning | Next action |
|---|---|---|
| **Red Box shows** (`REAL APP RED BOX`) | **Reanimated was the (or a necessary) culprit** | Stop stripping; plan controlled re-add / version pin / alternative; only then restore real `App` |
| **Same native crash** (NSException / MetalPerformanceShadersGraph / ExceptionsManagerQueue, no Red Box) | Reanimated **not sufficient** explanation | Continue bisect → **notifications**, then **image-picker** |
| **Different crash** (new signature) | Progress — capture full crash log; re-rank suspects | Do not restore Reanimated yet |
| **White screen** (no crash, no Red Box) | JS/native shell alive; UI/entry issue | Inspect `index.ts` Firebase/error-handler; not the same as native abort |

### Evidence to request / attach
1. Full crash `.ips` / Xcode Organizer stack (first 30 frames + exception reason string).
2. Whether binary still contains Reanimated symbols (`otool` / crash module list) after this strip — should be **absent**.
3. Confirm TestFlight build number matches the EAS build in §11.
4. Confirm device OS version (especially if iOS 26.x).

### Analysis questions for the other AI (answer these; do not code)
1. Does the MetalPerformanceShadersGraph frame cluster with known Reanimated / graphics native bugs on Xcode 26.2?
2. If Reanimated strip fails, which remaining mobile-only native module is most likely to throw NSException on `ExceptionsManagerQueue` at launch?
3. Could Firebase JS Auth init alone produce this **native** signature, or does evidence favor autolinked Expo modules?
4. Given working `mobile-test`, what is the smallest remaining dependency set that still explains the crash?

---

## 11. Current bisect change log (Reanimated strip) — fill after EAS URL

### Changes made (2026-10-22)
- `apps/mobile/App.tsx`: Red Box canary text **`REAL APP RED BOX`** (StyleSheet full-screen red).
- `apps/mobile/babel.config.js`: removed `react-native-reanimated/plugin`; **babel-preset-expo only**.
- `apps/mobile/metro.config.js`: left as plain `getDefaultConfig` (no NativeWind).
- `apps/mobile/package.json`: removed dependency `react-native-reanimated`.
- Grep: no remaining `react-native-reanimated` / `reanimated` imports under `apps/mobile` after strip (babel + package only).
- **Kept:** firebase, expo-notifications, expo-image-picker, netinfo, nativewind package (unwired), gesture-handler, screens, safe-area.
- `npm install` from monorepo root to refresh lockfile.
- EAS: `npx eas-cli build --platform ios --profile production --clear-cache --no-wait --auto-submit` from `apps/mobile`.

### Build metadata
- **EAS Build URL:** https://expo.dev/accounts/gracerun/projects/fusion-express/builds/1779b028-e013-4d77-a155-879886cea1dd
- **Build number:** **40** (autoIncrement 39 → 40)
- **Submission:** https://expo.dev/accounts/gracerun/projects/fusion-express/submissions/103f85c4-2442-4cb6-abe5-89ca1ab896eb
- **Flags:** `--platform ios --profile production --clear-cache --no-wait --auto-submit`
- **Xcode image:** `macos-sequoia-15.6-xcode-26.2` (unchanged)

### Operator note
**STOP for Andrew device test** after TestFlight delivers this build. Do not start notifications strip until Red Box result is recorded.

**Readout reminder:** Red Box = Reanimated was culprit; same NSException crash = continue bisect to notifications.
