# Mobile audit (Expo) — remaining parity gaps

Critical auth/order blockers fixed on this branch:

- Checkout no longer writes `customerId: sessionId`; it uses Firebase `auth.uid` (signed-in CUHK account or guest phone Auth).
- App-wide `AuthProvider` with `onAuthStateChanged`.
- Orders tab loads via `fetchOrdersByCustomer(uid)` (not device `localStorage` history).
- Runner accept uses real `auth.uid` as `runnerUid` and refuses accept when `isRunner` is false.

## Still not at web parity

| Area | Gap |
| --- | --- |
| Sign-up / password reset | Profile is email sign-in only; no mobile sign-up, forgot-password, or guest→password upgrade UI. |
| Profile address | Web stores college/hall on the user doc after checkout; mobile does not write back profile fields. |
| Payment method | Web collects PayMe/FPS at checkout; mobile places orders without `paymentMethod`. |
| Tips / order limit UX | Mobile relies on shared `createOrder` limit throw; no tip field or pre-check copy. |
| Guest persistence | Guest temp passwords use an in-memory Storage polyfill — lost on app kill. Returning guest phones may need web login/reset. |
| Runner onboarding | No mobile runner registration / terms; must already have `users/{uid}.isRunner` (+ preferably `runnerId`) from web. |
| Runner ops | No till prices, receipt upload, PayMe QR, chat, ratings, or payout views. |
| Catalog | Basic menu list only — no categories, search, favorites, custom/manual items, or popular shelf. |
| Tracking | Polling status steps only — no live chat, ETA polish, or payment confirmation. |
| Notifications | No push / local notification wiring. |
| Env / Auth persistence | Needs `EXPO_PUBLIC_FIREBASE_*`; confirm Firebase Auth persistence works for the Expo target you ship. |
| Typecheck | `npx tsc --noEmit -p apps/mobile` (or `npm run typecheck -w @fusion-express/mobile`). |

## Intentional non-goals (this pass)

Full feature parity with `apps/web`, username login restoration, and redesign work.
