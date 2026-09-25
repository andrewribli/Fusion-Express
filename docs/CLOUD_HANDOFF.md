# Cloud Agent handoff — fusion-express

**Branch:** `cursor/ptero-cityu-match`  
**Repo:** https://github.com/andrewribli/fusion-express  
**Last pushed WIP commit:** see `git log -1` on branch (after handoff push).

---

## Production URLs

| Host | Role |
|------|------|
| https://gracerun.vercel.app | Primary CUHK / GraceRun production |
| https://gracerun.fit | Marketing / alias (same deployment) |
| https://servecart.vercel.app | Legacy host redirect → same deployment |

**CityU (Ptero):** `/cityu`, `/cityu/taste`, `/cityu/wellcome`, `/cityu/checkout`, runner dashboard under `/cityu/runner/*`.

**CUHK canteen:** https://gracerun.vercel.app/canteen and `/canteen/[slug]`.

---

## Deploy (required after user-visible fixes)

From repo root:

```bash
npx --yes vercel@59.3.0 --prod --yes --scope fusion-1468
```

Then alias the new deployment URL to:

- `gracerun.vercel.app`
- `servecart.vercel.app`
- `gracerun.fit` (when Andrew expects custom domain on latest prod)

Workspace rule: `.cursor/rules/deploy-production.mdc` — **product review in browser before deploy** (Andrew was explicit after bad `/canteen` layout shipped).

Build check locally: `cd apps/web && npm run build`.

---

## Product rules (do not guess)

1. **Brands:** CUHK campus experience = **GraceRun** (`/cuhk`, `/canteen`, `/fusion` legacy paths). CityU = **Ptero** (`/cityu/*`).
2. **Canteens:** Only **four** venues are **open / orderable**: SoraZen, Paper & Coffee, UC Canteen, Ebeneezer's. All others stay **coming soon** in `CANTEEN_CATALOG` — do **not** flip everything to open.
3. **CityU channels:** **Taste** and **Wellcome** are separate product surfaces (not mixed into CUHK canteen list).
4. **Checkout:** Shared `/cart` → `/checkout` for canteen. **No university/campus picker on locked checkout** when cart campus is fixed. Use `cartCampus` / `cartCampusError` and canteen gates (below).
5. **Campus isolation:** Signed-in users should not cross `/cuhk` vs `/cityu` routes except admins and CityU owner email — see `campus-access.ts` + `CampusAccessGuard`.
6. **Deploy discipline:** Fix UX → verify desktop + mobile on live paths → then Vercel prod.

---

## Live `/canteen` status (Sep 2026 session)

**Canteen UX subagent (`2eec9050-…`): finished and deployed** without git commit at the time.

| Issue | Status |
|-------|--------|
| Narrow cards (one word per line) | **Fixed** — vertical card stack in `canteen/page.tsx` |
| Red “Soon” same as “Menu” | **Fixed** — grey disabled styling for Soon |
| Stale cart checkout (NA / closed / coming soon) | **Fixed** — `getCanteenCheckoutGate()` in cart, sidebar, `/checkout` |
| Open vs Soon list | **OK** — four open, rest Soon |
| All menu categories / images QA | **Not fully manually tested** — spot-check four open menus |
| Visual regression tests | **None** |

**Production deploy from UX pass:** `dpl_HBkF2WTedAXyQEimMJL9HnLqLrfK` (may differ after next deploy). Code for that pass is in commit `536e8a3`+ on branch.

**Note:** There is no `/canteen/cart` route; flow uses global `/cart` and `/checkout`.

---

## Prioritized backlog

### P0

- [ ] Desktop + mobile **product review** of `/canteen` after any grid/card change (4-col desktop `lg:grid-cols-4`, 2-col `sm`).
- [ ] Verify **stale NA cart** shows amber block and disabled checkout on `/canteen`, `/cart`, `/checkout`.
- [ ] **Campus guard** smoke test: CUHK user cannot browse `/cityu` checkout; CityU user cannot order CUHK canteen cart on wrong checkout.
- [ ] **UC hours:** lunch/dinner period logic via `getCurrentUcPeriod()` must match real UC schedule.

### P1

- [ ] **Wellcome** grocery: `loadWellcomeMenu.ts` + `/cityu/wellcome` — catalog is gitignored at `/data/wellcome-catalog.json`; seed/scrape scripts live locally under `scripts/` (not all committed).
- [ ] **Orchid Lodge** and other **coming soon** menus — finish catalog when product says go-live.
- [ ] **Image gaps** on canteen items — check `apps/web/public/canteen/food/` vs menu TS ids.
- [ ] Reconcile **Fusion** landing vs `/cuhk` hub CTAs.

### P2

- [ ] Commit useful **seed scripts** (`scripts/seed-wellcome.ts`, `scrape-wellcome.ts`) when stable; keep debug `_*.py` local.
- [ ] Firestore index changes in `firestore.indexes.json` — deploy indexes if new queries fail in prod.

---

## File map

| Area | Path |
|------|------|
| Canteen status / orderable | `apps/web/src/lib/canteenConfig.ts` (`CANTEEN_CATALOG`, `isOrderableCanteen`) |
| Hours config (data) | `apps/web/src/data/canteen/canteen-config.ts` |
| Browse list + cards | `apps/web/src/app/canteen/page.tsx` |
| Menu slug pages | `apps/web/src/app/canteen/[slug]/page.tsx` |
| Restaurant ids / fees | `apps/web/src/data/canteen/restaurants.ts` |
| Menu TS per venue | `apps/web/src/data/canteen/*-menu.ts` |
| UC period hours | `apps/web/src/lib/canteen/hours.ts` |
| Cart helpers + checkout gate | `apps/web/src/lib/canteen/cart.ts` (`getCanteenCheckoutGate`) |
| Shared cart UI | `apps/web/src/components/MenuCartSummary.tsx`, `OrderActionBar.tsx` |
| Global cart / checkout | `apps/web/src/app/cart/page.tsx`, `apps/web/src/app/checkout/page.tsx` |
| Place order validation | `apps/web/src/lib/use-place-order.ts`, `apps/web/src/app/api/canteen/validate-order/` |
| Campus from cart items | `packages/shared/src/canteen-college.ts`, `apps/web/src/lib/cart-campus.ts` |
| Campus routing / guard | `apps/web/src/lib/campus-routes.ts`, `campus-access.ts`, `CampusAccessGuard.tsx` |
| Shared campus types | `packages/shared/src/campus.ts` |
| CityU shop shell | `apps/web/src/ptero/components/ShopHome.tsx`, `ChannelSelector.tsx` |
| CityU checkout lock | `apps/web/src/app/cityu/checkout/page.tsx` |
| Wellcome stub | `apps/web/src/app/cityu/wellcome/page.tsx`, `loadWellcomeMenu.ts` |

---

## What NOT to do

- Do **not** commit `.env*`, Firebase service account JSON, PDFs, exe, zip dumps, FoodPanda txt at repo root, or scraped **`/data/wellcome-catalog.json`** (gitignored).
- Do **not** open all canteens in `canteenConfig` without product approval.
- Do **not** deploy layout/checkout changes without a quick **live or local prod build** review.
- Do **not** force-push `main` / `master`.

---

## Local-only / excluded from push

Untracked: root PDFs, zips, `FoodPanda*.txt`, `06_large_demo_dataset.sql`, `scripts/_debug*.py`, `tmp/`, `seed-output.txt`, Grok installers, optional `scripts/scrape-wellcome.ts` (add when ready).

---

## Agent transcript reference

Parent chat folder: `agent-transcripts/a3cff02b-abd0-43bd-875c-d63b66edd4d6/`  
Canteen UX review subagent: `subagents/2eec9050-48d1-4cf8-9a86-2f80252e7c28.jsonl` — **complete** (fixes + prod deploy).

---

## Overnight — 26 Sep 2026 (Andrew sleeping)

Continue on `cursor/ptero-cityu-match`. Do not reopen extra canteens. Do not commit PDFs, zips, exe, or catalogs.

### Just landed locally (commit with this handoff)

- Universal sign-in: `/cityu/login` redirects to `/login`. Email domain sends CUHK addresses to `/cuhk` and CityU addresses to `/cityu`. `?next=` on the other campus is ignored.
- CityU runner uses CUHK `RunnerWorkspace` (`My Deliveries`, chat at `/cityu/chat/[orderId]`).
- CityU delivery: no bank statement. Receipt photo then lobby photo. Status `receipt_uploaded` before `delivered`. Server check: `POST /api/orders/transition`. Runner cannot accept a second order while one is `accepted` / `purchased` / `receipt_uploaded`.
- Chat: `senderRole`, `text`, `seen`. Read-only 24h after `completed`.
- Admin: `/admin/chats` broadcast audiences (all / customers / runners / CUHK / CityU) plus 1:1. Log `adminBroadcasts`.
- Rules/indexes updated in repo. **Firebase rules are not live until `firebase deploy`.**

### Still do

1. Confirm production deploy of this commit is aliased to gracerun.fit, www.gracerun.fit, gracerun.vercel.app, servecart.vercel.app.
2. Deploy Firestore rules, storage rules, and indexes (`firebase deploy --only firestore:rules,firestore:indexes,storage`).
3. Unread chat email: if the other person has not opened the thread within 5 minutes, send Resend “You have a new message”. Needs a cron or scheduled route. Do not email on every keystroke.
4. Product-check CityU: sign in with `@link.cuhk.edu.hk` lands on CUHK; demo runner sees pending orders; accept → My Deliveries → receipt → dropoff photo → customer sees progress. CUHK runners still require a bank statement.
5. Do not let customers mark delivered. Payment stays post-delivery.
