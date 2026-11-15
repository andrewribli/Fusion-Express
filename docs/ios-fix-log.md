# iOS Launch Bisection Log

## Known facts
- Blank Expo SDK 53 (no router): **LAUNCHED** (build 24)
- Blank + expo-router: **CRASHED** (builds 25–26, 28) — Hermes SIGSEGV at launch
- Attempt 3 (router without scheme/plugins): config applied locally; build **blocked** (EAS free iOS quota, Oct 9)

## Step 1 — Restore expo-router config on mobile-test
- **Date:** 2026-10-20
- **Changed:** `apps/mobile-test/app.json`
  - `scheme`: `mobiletest`
  - `plugins`: `["expo-router"]`
  - Fell back to `ios.bundleIdentifier`: `com.gracerun.fusionexpress` + projectId `bcb10fe2-e2f2-40e6-a6dd-0c6337441e8a` (minimaltest3 credentials failed non-interactive)
- **Build URL:** https://expo.dev/accounts/gracerun/projects/fusion-express/builds/ecc9f935-c67c-4c8f-82c1-4dfffefa88d1
- **Result:** CRASHED (build 28) — Hermes SIGSEGV at launch (same class as 25/26)

## Step 4 — Migrate off expo-router → React Navigation
- **Date:** 2026-10-20
- **Intent:** Isolate whether expo-router itself causes the launch SIGSEGV. Replace file-based expo-router with a minimal `@react-navigation/native` + native-stack screen. If this still crashes, the bug is elsewhere (gesture-handler / screens / Hermes / iOS 26) — **not a guarantee that router was the only bug**.
- **Changed (apps/mobile-test only):**
  - Removed `expo-router` dependency; `main` → `index.ts`
  - Removed `plugins: ["expo-router"]` and `scheme` from `app.json`
  - Deleted `app/_layout.tsx` and `app/index.tsx`
  - Added `App.tsx` with `NavigationContainer` + `NativeStack` one screen: `"STEP 4 — React Navigation (no expo-router)"`
  - Installed `@react-navigation/native` + `@react-navigation/native-stack` (kept gesture-handler / screens / safe-area-context)
  - Kept production `eas.json` Xcode 26 image + `com.gracerun.fusionexpress` + projectId `bcb10fe2-e2f2-40e6-a6dd-0c6337441e8a`
- **Build URL:** https://expo.dev/accounts/gracerun/projects/fusion-express/builds/0064cd72-b8e7-4603-915f-0e21fcdd89d0 (build **29**, auto-submit scheduled)
- **Result:** LAUNCHED — blank white screen (native/JS shell OK; UI not mounting). Likely cause: `react-native-gesture-handler` imported in `App.tsx` instead of first line of entry `index.ts` (React Navigation requirement).

## Step 4b — White screen fix (build 30)
- **Date:** 2026-10-20
- **Intent:** Fix blank white screen after React Navigation migration without reintroducing expo-router. Keep bisect: one visible Home screen only.
- **Changed (apps/mobile-test only):**
  - `index.ts`: `import 'react-native-gesture-handler'` as first import (before expo / App)
  - `App.tsx`: `SafeAreaProvider` + `NavigationContainer` + native-stack `Home` with bold visible text `"STEP 4b / build 30 — GraceRun Works"`; dark bg so white-screen ≠ empty UI; `enableScreens(true)`; nav `onReady` / `onStateChange` / `onUnhandledAction` + `console.error` logging
- **Build URL:** https://expo.dev/accounts/gracerun/projects/fusion-express/builds/2ccebb94-7735-4b4b-99e2-2ba56c3b80cf (build **30**, auto-submit scheduled)
- **Submission:** https://expo.dev/accounts/gracerun/projects/fusion-express/submissions/085eb9c9-ac65-445e-a672-bcdb72614c20
- **Result:** WAITING (device test)

## Step 5 — Bottom tabs proof (build 31)
- **Date:** 2026-10-20
- **Intent:** Prove React Navigation UI renders with a Bottom Tab Navigator (no expo-router, no real ShopHome). If tabs show visible text, navigation shell is healthy and we can migrate real screens next.
- **Changed (apps/mobile-test only):**
  - Installed `@react-navigation/bottom-tabs`
  - `App.tsx`: replaced native-stack with `createBottomTabNavigator` — 4 dummy screens Home / Canteens / Cart / Profile with labels `"STEP 5 / build 31 — …"`; kept `SafeAreaProvider`, `enableScreens(true)`, nav error/logging hooks
  - Kept `import 'react-native-gesture-handler'` as first line of `index.ts` (build 30 fix)
- **Build URL:** https://expo.dev/accounts/gracerun/projects/fusion-express/builds/a4f6e122-9dfc-409e-b421-d19c0d072dca (build **31**, auto-submit scheduled)
- **Submission:** https://expo.dev/accounts/gracerun/projects/fusion-express/submissions/460ebdf9-72a5-4c9d-be9c-bffe1e4f1adb
- **Result:** LAUNCHED — blank white screen (same class as 29/30; tabs did not appear)

## Step 6 — Canary render (build 33)
- **Date:** 2026-10-20
- **Intent:** Prove JS bundle loads and paints **without** React Navigation. If red canary shows, entry/metro/bundle is healthy and white screen was nav/native. If still white, problem is entry/bundle earlier than App UI.
- **Note:** Remote autoIncrement skipped CFBundle **32** (already used) → this canary shipped as build **33**.
- **Changed (apps/mobile-test only + this log):**
  - `App.tsx`: **CANARY ONLY** — red full-screen View + white text `"CANARY: APP IS RUNNING"` (no NavigationContainer, no tabs)
  - `index.ts`: gesture-handler first + `registerRootComponent(App)`
  - Added plain `metro.config.js` (`getDefaultConfig(__dirname)` only — no NativeWind/global.css; none existed before)
  - `npx expo install react-native-screens react-native-safe-area-context` (deps healthy; canary unused)
  - `app.json`: confirmed no expo-router plugins
- **Build URL:** https://expo.dev/accounts/gracerun/projects/fusion-express/builds/b606407b-f7d6-4dfd-9023-e8222356135b (build **33**, auto-submit scheduled)
- **Submission:** https://expo.dev/accounts/gracerun/projects/fusion-express/submissions/690107ff-d59a-4fb2-9e67-a8ce14e3830e
- **Result:** WAITING

## Step 7 — Real app (apps/mobile) on React Navigation (build 35)
- **Date:** 2026-10-20
- **Intent:** Abandon Expo Router for launch on the real GraceRun app. Wire existing Shop / Orders / Profile / Runner + Menu / Cart / Checkout / Track screens through `@react-navigation/native` (same provider stack as pre-bisection `RootLayout`: Auth + Cart). Keep NativeWind/metro monorepo config.
- **Changed (apps/mobile):**
  - `package.json` `main`: `expo-router/entry` → `index.ts`
  - `index.ts`: `import 'react-native-gesture-handler'` first → global error handler → Firebase Auth init → `registerRootComponent(App)`
  - `App.tsx`: `ErrorBoundary` + `SafeAreaProvider` + `AuthProvider` + `CartProvider` + `NavigationContainer` + native stack (Tabs / Menu / Cart / Checkout / Track) + bottom tabs (Shop Now / Orders / Profile / Runner)
  - Adapted screen navigations off `expo-router` (`Link` / `router` / `useLocalSearchParams` → React Navigation)
  - `app.json`: removed `expo-router` plugin + `typedRoutes`; left `expo-router` package installed temporarily
  - Neutralized unused `app/_layout.tsx` and `app/(tabs)/_layout.tsx` (return null)
- **Screens wired:**
  - `app/(tabs)/index.tsx` (Shop Now)
  - `app/(tabs)/orders.tsx`
  - `app/(tabs)/profile.tsx`
  - `app/(tabs)/runner.tsx`
  - `app/menu.tsx`, `app/cart.tsx`, `app/checkout.tsx`, `app/track.tsx`
- **Build URL:** https://expo.dev/accounts/gracerun/projects/fusion-express/builds/8212e574-feb8-462a-8dde-8b7d84d47dbd (build **35**, auto-submit scheduled)
- **Submission:** https://expo.dev/accounts/gracerun/projects/fusion-express/submissions/abe00adf-9fe3-4e85-bf29-73a4c23d9ff3
- **Result:** CRASHED ~0.4s — EXC_CRASH SIGABRT on `com.facebook.react.ExceptionsManagerQueue` (fatal JS at boot). React Navigation shell was not the sole issue.

## Step 8 — Firebase Auth RN resolution + boot harden (build 36+)
- **Date:** 2026-10-20
- **Root cause:** Metro `unstable_enablePackageExports = false` (needed to avoid Firebase dual-package hazard) made `firebase/auth` resolve to the **browser** build. On that build `getReactNativePersistence` is missing / Auth is not registered for React Native → fatal JS exception during `initMobileFirebaseAuth()` / first `getAuth()` at launch.
- **Intent:** Keep real App shell (Auth + Cart + tabs + Menu/Cart/Checkout/Track) but make Firebase Auth + entry path non-fatal and correctly RN-resolved.
- **Changed (apps/mobile):**
  - `metro.config.js`: force `firebase/auth` + `@firebase/auth` → `@firebase/auth/dist/rn/index.js` on ios/android
  - `src/firebase-init.ts`: no hard named import of `getReactNativePersistence`; runtime require + RN file fallback; idempotent; never abort launch
  - `index.ts`: `gesture-handler` → `global.css` → global error handler → Firebase init → `registerRootComponent` (single Auth init; removed duplicate from `App.tsx`)
  - `babel.config.js`: briefly added NativeWind babel presets (reverted in Step 8b)
  - `src/auth.tsx` / `ErrorBoundary` / `global-error-handler`: softer failures + on-screen error text
  - Removed `expo-router` dependency (no runtime imports left on boot path)
  - Re-synced EAS production `EXPO_PUBLIC_FIREBASE_*` from `apps/mobile/.env`
- **Build URL:** https://expo.dev/accounts/gracerun/projects/fusion-express/builds/2459da30-d77d-470b-8246-0e0a1d7b632c (build **36**)
- **Submission:** https://expo.dev/accounts/gracerun/projects/fusion-express/submissions/19a7092e-daa1-4f52-a26c-cf1b7f8ae87c (canceled with build)
- **Result:** ERRORED — Bundle JavaScript: `[BABEL] Cannot find module 'react-native-worklets/plugin'` (from `nativewind/babel`)

## Step 8b — Fix Babel bundle (build 37+)
- **Date:** 2026-10-20
- **Root cause:** `nativewind/babel` requires `react-native-worklets/plugin`, not present on Expo SDK 53 / Reanimated 3.
- **Fix:** Revert `babel.config.js` to `babel-preset-expo` + `react-native-reanimated/plugin` only. NativeWind stays via metro `withNativeWind` + `global.css` (same as build 35, which bundled successfully).
- **Local verify:** `npx expo export --platform ios` succeeded after revert.
- **Build URL:** https://expo.dev/accounts/gracerun/projects/fusion-express/builds/d9321de7-b6cc-4642-b69e-c6e1b92292b2 (build **37**, auto-submit scheduled)
- **Submission:** https://expo.dev/accounts/gracerun/projects/fusion-express/submissions/b2b6f6df-f42c-4aa2-a77f-5c8f03c75f45
- **Result:** CRASHED — native NSException on ExceptionsManagerQueue before JS mounts (same class as 18/19/35). Red Box never appeared.

## Step 1 — NativeWind strip (real app, build 38+)
- **Date:** 2026-10-20
- **Intent:** Dependency-strip bisect. Disconnect NativeWind (babel already clean; metro + CSS) while keeping `nativewind` package installed. Red Box canary in `App.tsx` proves JS mount if launch succeeds. Do **not** strip Firebase until Andrew tests this build.
- **Changed (apps/mobile):**
  - `babel.config.js`: confirmed no `nativewind/babel` (preset-expo + reanimated only)
  - `metro.config.js`: removed `withNativeWind`; export plain `getDefaultConfig` (+ existing monorepo/Firebase resolver)
  - `index.ts`: removed `import "./global.css"`
  - `App.tsx`: Red Box canary only (`RED BOX TEST` / Step 1 label) — full nav restored after pass
- **Build URL:** https://expo.dev/accounts/gracerun/projects/fusion-express/builds/b55d1a88-9f99-4ff0-9c23-35d267e9b753 (build **38**, auto-submit scheduled)
- **Submission:** https://expo.dev/accounts/gracerun/projects/fusion-express/submissions/5a9f1452-5c7f-48e1-bfe8-1255a7ae1bd2
- **Result:** WAITING (device test — Red Box expected if NativeWind was the crash cause)
