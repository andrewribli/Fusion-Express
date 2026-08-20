# Fusion Express — How it works

CUHK dorm grocery delivery prototype. A customer (Felix) opens a link, creates an account, orders from Fusion supermarket, and a runner (you) accepts the order and chats with them.

**Live site:** https://fusion-express-blush.vercel.app  
**Firebase project:** `fusion-express-6a438` (Google account `andrew.ribli@gmail.com`)  
**Local folder:** `C:\Users\Andrew\Projects\fusion-express`

Prices on screen are **estimates**. They are not accurate yet. Final amount is confirmed at pickup.

---

## How do I run it?

### 1. One-time on this machine

Need Node.js 20+ and npm.

```powershell
cd C:\Users\Andrew\Projects\fusion-express
npm install
```

Firebase keys are already in `.env.local` (gitignored). If that file is missing, copy `.env.example` and fill in the `NEXT_PUBLIC_FIREBASE_*` values from Firebase Console → Project settings → Your apps.

### 2. Start the app

```powershell
npm run dev
```

Open **http://localhost:3000**

| Command | What it does |
|---------|----------------|
| `npm run dev` | Local site with hot reload (Turbopack) |
| `npm run build` | Production build (same as Vercel) |
| `npm start` | Serve the production build locally |
| `npm run seed` | Upload `src/data/menu.json` into Firestore `menu` (needs a service-account JSON) |

### 3. Try a customer + runner locally

1. Create account `felix` (or any username + password, 6+ characters).
2. Home → **Make an Order** → pick items or “Popular requests”.
3. Cart → checkout → confirm.
4. In another browser / incognito: create `andrew` → Become a Runner → dashboard → accept Felix’s order → chat.

Default runner PIN (if used later): `runner2026`.

---

## How is it run in production?

The live site is a **Next.js app on Vercel**. Each deploy runs `npm run build` in the cloud, then serves the result at:

https://fusion-express-blush.vercel.app

That URL is already allowed as a Firebase Auth domain.

Redeploy from this folder (Vercel CLI is already logged in on this PC):

```powershell
npx vercel --prod --yes
```

There is **no GitHub remote** yet. Auto-deploy-on-push is not set up. Every live update is a CLI deploy (or connecting a GitHub repo later).

**Admin view of the database** is the Firebase Console, not an in-app page:

- Firestore: https://console.firebase.google.com/project/fusion-express-6a438/firestore/databases/-default-/data
- Accounts: https://console.firebase.google.com/project/fusion-express-6a438/authentication/users

---

## What the user sees

### Logged out (`/`)

Sign in or create account (username + password). Profile fields on signup: name, SID, college / hall / room.

### Home (`/` when logged in, and `/home`)

Three actions:

| Button | Goes to |
|--------|---------|
| Pick Up an Order | `/track` |
| Make an Order | `/menu` |
| Continue Where You Left Off | `/cart` if the cart has items, else `/menu` |

Cart is saved in **localStorage**, so it survives refresh on the same phone/browser.

### Menu (`/menu`)

- Refrigerated vs Non-Refrigerated → aisle grids → item lists.
- Popular requests (Felix-style items): biggest Pocari, 百果園金桔檸檬 bundle (or 3 singles), Tao Ti Mandarin Lemon, Shin Ramyun 3–4 / cup-noodle fallback, Fanta Mini 6×200ml.
- Note on those: *Runner will use best judgment for substitutions and discounts*.

### Cart / checkout

- Manual line: “Did we miss something?”
- Cancel order: clears cart, back to home.
- Subtotal + **$10 delivery** + estimated total + ~**30 min** ETA.
- Confirm modal before placing.
- Optional tip + delivery instructions.

### After order

`pending` → runner accepts (`assigned`) → **Picked Up** (`picked`) → **Delivered** + optional photo (`delivered`). Customer can cancel only while `pending`.

Chat is open once the order exists (customer + any runner). Messages live in Firestore.

---

## What makes it work (the stack)

```
Phone / laptop browser
        │
        ▼
Next.js (React pages in src/app/)
        │
        ├── Firebase Auth     → accounts (username mapped to email)
        ├── Cloud Firestore   → users, orders, chats, runners, ratings
        ├── Firebase Storage  → delivery photos (if Storage is enabled)
        └── localStorage      → cart, cached profile, favorites, order IDs
```

| Piece | Role |
|-------|------|
| **Next.js + React + TypeScript** | Pages, UI, routing. App Router under `src/app/`. |
| **Tailwind CSS** | Layout. Fusion red `#ED1C24`, mobile-first `max-width: 480px`. |
| **Firebase Auth** | Username/password. Username `felix` is stored as `felix@fusion-express.app` (Auth requires an email). Session stays on the device. |
| **Cloud Firestore** | Shared database so you can see Felix’s order from another device. |
| **localStorage** | Cart (`fusion_cart`), cached profile, favorites, last order IDs. Works even if Firebase is down (mock fallback). |
| **Vercel** | Hosts the built site on HTTPS (needed for login + notifications). |

### Firestore collections

| Collection | What’s in it |
|------------|----------------|
| `users/{uid}` | Profile: name, SID, hall, runner flags |
| `orders` | Cart snapshot, address, status, tip, ETA, photo URL |
| `chats/{orderId}/messages` | Chat lines |
| `runners` | Runner registration + earnings |
| `ratings` | 1–5 star ratings after delivery |
| `menu` | Optional catalog if seeded; UI uses `src/data/menu.json` if Firestore menu is empty |

### Order statuses

`pending` → `assigned` → `picked` → `delivered` (or `cancelled`)

Anti-self-pickup: a runner cannot accept an order whose `customerId` is their own account.

### Main source files

| Path | Job |
|------|-----|
| `src/app/page.tsx` | Login, or home if already signed in |
| `src/components/HomeLanding.tsx` | Three-button home |
| `src/app/menu/page.tsx` | Supermarket sections + popular requests |
| `src/app/cart/page.tsx` | Cart, manual add, cancel |
| `src/app/checkout/page.tsx` | Address, tip, confirm modal |
| `src/context/UserContext.tsx` | Auth session + profile |
| `src/context/CartContext.tsx` | Cart in localStorage |
| `src/lib/firebase.ts` | Firebase init |
| `src/lib/auth.ts` | Username ↔ email, sign in / sign up |
| `src/lib/orders.ts` | Create / accept / status / cancel |
| `src/lib/chat.ts` | Chat read/write |
| `src/data/menu.json` | Product list (mock prices) |

---

## Setup involved (what’s already done vs not)

### Already done

- App built (Next.js, TypeScript, Tailwind).
- Firebase project **Fusion Express** created.
- Email/password Auth enabled.
- Firestore in `asia-east1` with rules: **signed-in users can read/write**.
- Web app config saved in `.env.local` and on Vercel.
- Live deploy on Vercel.
- Customer items + Shin Ramyun deal in `menu.json`.

### You still need to do

| Item | Why |
|------|-----|
| **GitHub repo + `git remote add origin …`** | Push from Cursor / auto-deploy. There is no `origin` yet. |
| **Redeploy after local UI changes** | Latest home/menu/cart redesign is local (`git` commit `f26a974`) until `npx vercel --prod`. |
| **Enable Firebase Storage in Console** (if photo proof 403s) | Delivery photos. Rules file is `storage.rules`. |
| **In-app Admin page** | Not built. Use Firebase Console. |
| **Real Fusion prices** | Catalog is mock / estimate. |
| **Payments** | PayMe / FPS after delivery, not in-app. |

### Env vars (Vercel + `.env.local`)

```
NEXT_PUBLIC_FIREBASE_API_KEY
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN
NEXT_PUBLIC_FIREBASE_PROJECT_ID
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID
NEXT_PUBLIC_FIREBASE_APP_ID
```

Optional: `NEXT_PUBLIC_ADMIN_PIN`, `NEXT_PUBLIC_RUNNER_PIN` (not wired into a UI yet).

Never commit `.env.local` or `firebase-service-account.json`.

---

## Customer / runner cheat sheet

**Send Felix:** https://fusion-express-blush.vercel.app  

1. Create Account → fill hall.  
2. Make an Order → add items (or Popular requests / Shin Ramyun).  
3. Checkout → Confirm.  
4. Track + chat.

**You:** same site → your account → Become a Runner → Available orders → Accept → chat → Picked Up → Delivered.

---

## If something breaks

| Symptom | Likely cause |
|---------|----------------|
| “Dev mode / Firebase not configured” | Missing `.env.local` or Vercel env vars |
| Wrong username or password | Must **Create Account** first |
| You don’t see Felix’s order | He’s on live site, you’re on localhost (or vice versa). Same URL both sides. |
| Login popup / unauthorized domain | Add the hostname under Firebase Auth → Settings → Authorized domains |
| Cart empty on another phone | Cart is localStorage, not the cloud. Orders *are* in Firestore. |
| Live site looks old | Redesign not deployed yet — run `npx vercel --prod --yes` |
)