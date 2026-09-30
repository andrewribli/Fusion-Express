# Mobile UI audit — GraceRun CUHK and GraceRun CityU

**Date:** 26 September 2026

**Site:** https://www.gracerun.fit (live). `http://localhost:3000` timed out, so this report does not compare a local dev server.

**Viewports:** 390×844 (primary), 360×800 and 375×667 on Fusion, Taste, and login, plus Taste header overlap measured at all three. No page-level horizontal scroll was found at those widths.

**Session:** Started signed out. Then demo CityU customer (`demo@my.cityu.edu.hk`) and demo CityU runner (`runner@my.cityu.edu.hk`). Signed out afterward. Signed-out `/cuhk` stayed on the CUHK hub.

**How it was checked:** Phone-width Edge (mobile, iPhone Safari UA, device scale 2). The in-IDE browser tab did not stay open, so captures are from Edge at the viewports above, not a physical iPhone. Keyboard coverage is inferred from control position and font size.

**Not a new mobile bug:** A signed-in CityU session sends `/cuhk` and `/runner/dashboard` to `/cityu`. After sign-out, `/cuhk` stays on CUHK. The known CityU delivery-sheet issue (bottom nav covering Mark as Picked Up / Mark delivered) was **not** seen: Available was empty, My Deliveries said “No accepted orders”, and tapping the expired card did not open that sheet.

Screenshots are in `docs/mobile-audit/`.

| # | Page | Issue | Severity | Screenshot ref |
| --- | --- | --- | --- | --- |
| 1 | `/cityu/taste`, `/cityu/wellcome` | Grocery header controls overlap. At 390×844 the red Search button is 32×32 and sits on the Canteens pill (pill is 74×35, under 44px tall). The search field ends at x=264 while Notifications starts at x=234 (about 30px of overlap). At 360×800 and 375×667, Canteens is clipped to “Cantee”, overlaps Search by 24px, and the search field overlaps Notifications by 40px. | MAJOR | `docs/mobile-audit/taste-header-360.png` |
| 2 | `/cityu/taste`, `/cityu/wellcome`, `/cityu/canteen/city-express-ac1` | Fixed Feedback button (90×36) covers the control under it. On City Express it covers the second item’s Add. At 360×800 on Taste it covers the pear card’s “Est. HK$4…” price. Wellcome’s right-hand price (`HK$7.00`) is likewise covered at 390×844. | MAJOR | `docs/mobile-audit/feedback-covers-add.png` |
| 3 | `/fusion`, `/canteen/sorazen`, `/canteen/paper-and-coffee` | Fixed “Chat with Admin” (48×48) covers nearby actions. On Fusion it sits on the red “add your own item” button. On SoraZen it covers the right-column add control. On Paper & Coffee (open) it covers the lower-right drink photo. Paper & Coffee add buttons that were measured are 32×32. | MAJOR | `docs/mobile-audit/paper-chat-overlap.png` |
| 4 | `/fusion`, `/canteen`, `/canteen/paper-and-coffee`, `/canteen/sorazen` | Shop search field is squeezed by the logo, camera, search, bell, and cart. At 390×844 the Fusion input is 48×36, font-size 14px, and the placeholder shows “Searc”. At 360×800 the field is a sliver. Canteen placeholder shows “Search cante”; Paper & Coffee shows “Search Paper”. | MAJOR | `docs/mobile-audit/fusion-search-360.png` |
| 5 | CityU pages that share the CityU shell (`/cityu/taste`, `/cityu/wellcome`, `/cityu/cart`, `/cityu/orders`, `/cityu/profile`, `/cityu/checkout`, `/cityu/track/…`, `/cityu/chat/…`, `/cityu/pay/…`) | A full-width 11px bar reads “GraceRun CityU · Taste Citygate (Foodpanda) · campus: cityu”, including on Wellcome and on a canteen checkout. Footer line “Prototype — Taste Citygate catalog (Foodpanda). Not live orders.” appears on those pages too. | MAJOR | `docs/mobile-audit/taste-header-360.png` |
| 6 | `/cityu/taste` notifications | The bell opens a panel whose title is clipped to “cations”. Escape left the panel text on the page. | MAJOR | `docs/mobile-audit/notifications-clipped.png` |
| 7 | `/login`, `/login?mode=signup`, forgot-password modal, `/cart` manual add, `/cityu/checkout`, `/cityu/chat/…`, shop search | Text inputs, selects, and the chat composer use font-size 14px (login email and password are 318×46 at 390px). iOS is likely to zoom on focus. Login show-password control is 28×28. Checkout tip chips are 75×36. Empty sign-in shows the browser tooltip “Please fill out this field.” | MAJOR | `docs/mobile-audit/login-360.png` |
| 8 | `/cityu/runner/deliveries`, `/cityu/runner/expired` | The expired-order warning says disciplinary action may be sent “to your CUHK email account” on the CityU runner. | MAJOR | `docs/mobile-audit/runner-cuhk-copy.png` |
| 9 | Pages with the fixed bottom nav (CUHK shop and CityU customer/runner) | Nav is flush to the bottom: computed padding-bottom 0, and no stylesheet used `safe-area-inset`. Tab labels are 10px (“Home”, “My Deliveries”, “Account”, and the rest). On a real iPhone the home indicator will sit on those labels. | MAJOR | `docs/mobile-audit/orders-stepper.png` |
| 10 | `/cityu/wellcome` | After choosing Wellcome @ Nam Shan Estate, product photos render as empty white boxes (two pantry items checked: 福字雞汁伊麵 and 百福鮮低糖豆漿). Names and prices are still readable where Feedback does not cover them. | MAJOR | `docs/mobile-audit/wellcome-blank-photos.png` |
| 11 | `/cityu/canteen/city-express-ac1` | Menu thumbnails are broken-image placeholders, not food photos. | MAJOR | `docs/mobile-audit/city-express-images.png` |
| 12 | `/cityu/chat/bkPpTgAvTDMlurnxPK1J` | Composer (“Type a message…”, 14px, 42px tall) and Send sit around y=551 in an 844px viewport, then a large empty gap, then Terms, then the bottom nav. Send is not under the nav. An iOS keyboard rising from the bottom is likely to cover the composer. The page text includes “No messages yet”; that sentence is not obvious in the white pane. | MAJOR | `docs/mobile-audit/chat-composer.png` |
| 13 | `/cityu/pay/b7W3CSnzC6F1mnAskjo5` and `/pay/b7W3CSnzC6F1mnAskjo5` | CityU pay route says “Order not found.” The same order id on `/pay/…` renders the CUHK GraceRun PayMe screen (order id, $46, screenshot dropzone, Submit Payment), while still signed in as the CityU customer. Submit Payment is visible above the nav. Note field is 14px. Payment was not submitted. | MAJOR | `docs/mobile-audit/payme-gracerun-chrome.png` |
| 14 | `/` | Header logo is a 40×40 black square (alt “GraceRun”, natural size 0, empty image src) on a black bar, so the mark is not visible. The rest of the hero loaded in about 2.4s after a “Loading…” state. | MINOR | `docs/mobile-audit/home-logo.png` |
| 15 | `/cityu/orders`, `/cityu/track/bkPpTgAvTDMlurnxPK1J` | Status words Placed, Purchased, Receipt, Paid are 10px. Order ids `bkPpTgAvTDMlurnxPK1J` and `b7W3CSnzC6F1mnAskjo5` fit at 390px and wrap as themselves (no overflow). Hall lines fit. | MINOR | `docs/mobile-audit/orders-stepper.png` |
| 16 | `/login` at 360×800 and 375×667 | Email placeholder is clipped inside the field (“you@my.cityu.edu.ε” / cuts off before `.hk`). At 390×844 it ends at “you@my.cityu.edu.h”. The field itself does not widen the page. | MINOR | `docs/mobile-audit/login-360.png` |
| 17 | `/fusion` | Recommended-card subtitle “Beverage 225ml x 6” is clipped at the bottom of the card. The Australian Striploin photo area stayed blank at 360×800 while the milk photo loaded. Carousel peeks the next card; the page does not scroll sideways. | MINOR | `docs/mobile-audit/fusion-search-360.png` |
| 18 | `/cityu/taste`, `/cityu/wellcome` | Category chips are 28px tall. The last chip is clipped (“Bak”) at the right edge. The page does not scroll horizontally; the chip row is the scroller, with no visible cue that it scrolls. | MINOR | `docs/mobile-audit/taste-header-360.png` |
| 19 | `/cityu/runner/expired` | Bottom nav stays on “My Deliveries” while the red tab is “Expired Deliveries (1)”. The four tabs fit at 390×844. “My Deliveries” is 78×56 with a 10px label and is readable at that width. | MINOR | `docs/mobile-audit/runner-expired-tab.png` |
| 20 | `/login` | “Continue as Guest” is repeated (top banner and again under the password form), plus a second “Shop now as guest” link. Not a layout collision. | MINOR | `docs/mobile-audit/login-360.png` |
| 21 | CUHK and CityU shop headers | First header control starts at x=12, so horizontal inset is 12px rather than 16px. | MINOR | `docs/mobile-audit/fusion-search-360.png` |

## 1. Totals

| Severity | Count |
| --- | --- |
| BLOCKER | 0 |
| MAJOR | 13 |
| MINOR | 8 |
| **Total** | **21** |

## 2. Top blockers

None. These are the highest majors, in the order they get in a student’s way:

1. Grocery header overlap on Taste and Wellcome (issue 1), worse at 360 and 375.
2. Feedback covering Add and prices (issue 2).
3. Chat button covering add and photos on Fusion and CUHK canteens (issue 3).
4. Search field collapsed to “Searc” / a sliver at 360px (issue 4).
5. Taste Citygate debug bar on every CityU screen, including Wellcome (issue 5).
6. 14px fields that will zoom on iPhone (issue 7).
7. Chat composer sitting mid-screen, so the keyboard is likely to cover it (issue 12).
8. CityU pay route “Order not found”, while `/pay/{id}` shows GraceRun PayMe chrome (issue 13).
9. CityU runner warning that mentions a CUHK email (issue 8).
10. Bottom nav flush to the screen edge with 10px labels and no safe-area inset (issue 9).

## 3. Pages that looked clean

- `/cuhk` signed out: hub, Fusion and Canteen cards, buttons readable, no sideways scroll.
- `/cityu` hub: Taste, Wellcome, and canteen cards read cleanly. Feedback sits in the runner card rather than covering “Become a runner”.
- Forgot-password modal fits at 390×844. Escape closed it. Cancel and Send code are visible. The email field is still 14px (issue 7).
- Manual-add sheet on `/cart` fits at 390×844. Add to Cart is on the sheet, not under the nav. Fields are 14px and the price field has `inputMode="decimal"`.
- `/cityu/checkout` with items in the cart: name, residence, hall, lobby, and note stack; long item names wrap; “Place order — pay after delivery” sits fully above the bottom nav at 390×844. Order was not placed.
- `/cityu/track/bkPpTgAvTDMlurnxPK1J`: id, hall, runner, “Chat with runner”, and amount due fit. Status labels are 10px (issue 15).
- `/cityu/runner/dashboard` Available at 390×844: Available / My Deliveries / Expired Deliveries (1) / Earnings fit, and “No orders available right now” is readable. Bottom nav is a second row (Shop, Available, My Deliveries, Earnings, Profile).
- `/cityu/profile` for the demo student: name and `demo@my.cityu.edu.hk` fit (email is 12px, not under 12). Sign out is a full-width button.
- Fusion scan control uses `<input type="file" accept="image/*" capture="environment">`. Delivery-sheet camera inputs were not on screen.

## 4. What Andrew should check on a real iPhone

- Keyboard on login, signup, checkout, manual add, and chat. Confirm 14px fields zoom, and whether Send / Place order / Sign In stay above the keyboard.
- Home indicator vs the bottom nav (no safe-area padding was present in CSS).
- Camera on Fusion “scan” and on the PayMe screenshot dropzone (`/pay/…` says “Tap to take or choose a photo”). A real capture was not possible here.
- An active CityU delivery sheet, to see if the nav still covers Mark as Picked Up / Mark delivered. That sheet was not reachable on the demo runner.
- Slow network on `/` and `/fusion` (both showed “Loading…” before content; home became usable in about 2.4s on this run) and on Wellcome photos.
- CUHK runner dashboard `/runner/dashboard`. Signed out, it redirects to login. Signed in as the CityU runner, it redirects to `/cityu`. No CUHK runner account was used.

## Not reachable

- `/admin`, `/admin/users`, and `/admin/chats` redirect to `/login?next=…`. No admin credentials were used.
- `/admin/orders` is a 404.
- `/cityu/pay/b7W3CSnzC6F1mnAskjo5` shows “Order not found.”

## 5. No code was changed

This pass only added `docs/mobile-audit.md` and screenshots under `docs/mobile-audit/`. No application code was edited, and nothing was committed or deployed. Fixes wait for Andrew’s review.
