# Deploy Fusion Express for Felix (Live Demo)

Get a live URL Felix can open on his phone, create an account, place his Shin Ramen order, and chat with you as the runner.

## What Felix will do

1. Open your Vercel URL (e.g. `https://fusion-express.vercel.app`)
2. Tap **Create Account** → username `felix`, password of his choice
3. Fill in name, SID, college/hall/room
4. On Home → tap **Add to Cart & Checkout** (pre-built Shin Ramen × 4 deal — $36 subtotal)
5. Checkout → confirm order → track on `/track`
6. You (as runner) sign in on another device → **Runner** tab → accept order → chat with Felix

---

## Step 1 — Firebase setup (required for live accounts)

1. Go to [Firebase Console](https://console.firebase.google.com) → Create project
2. **Build → Authentication → Sign-in method → Email/Password → Enable**
3. **Build → Firestore Database → Create database** (test mode is fine for prototype)
4. **Build → Storage → Get started** (for delivery photos)
5. **Project settings → Your apps → Web app** → copy config values

### Firestore collections used

| Collection | Purpose |
|------------|---------|
| `users` | Account profiles (username, name, address) |
| `orders` | All orders — visible to runners in real time |
| `runners` | Runner registrations |
| `chats/{orderId}/messages` | Order chat |
| `menu` | Product catalog (optional — app falls back to static menu) |

### Firestore rules (prototype — open read/write)

For demo only. Tighten before public launch:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if true;
    }
  }
}
```

---

## Step 2 — Environment variables

Create `.env.local` locally (copy from `.env.example`):

```
NEXT_PUBLIC_FIREBASE_API_KEY=...
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=...
NEXT_PUBLIC_FIREBASE_PROJECT_ID=...
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=...
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=...
NEXT_PUBLIC_FIREBASE_APP_ID=...
```

---

## Step 3 — Push to GitHub

```powershell
cd C:\Users\Andrew\Projects\fusion-express
git init
git add .
git commit -m "Fusion Express prototype for Felix demo"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/fusion-express.git
git push -u origin main
```

---

## Step 4 — Deploy on Vercel

1. [vercel.com/new](https://vercel.com/new) → Import GitHub repo
2. Add the same `NEXT_PUBLIC_FIREBASE_*` env vars in Vercel → Settings → Environment Variables
3. Deploy
4. Copy the live URL and send it to Felix

Auto-deploy: every push to `main` redeploys.

---

## Step 5 — Seed menu (optional)

After Firebase is configured locally:

```powershell
npm run seed
```

This uploads the menu including **Shin Ramen – Bowl Noodle** (4 for $36 deal) and sale cup noodles.

---

## Step 6 — You as the runner

1. Open the same live URL
2. Create your account (e.g. username `andrew`)
3. Profile → **Become a Runner** → accept terms → register
4. **Runner** tab → see Felix's pending order → **Accept**
5. Chat appears immediately — coordinate delivery
6. Mark **Picked Up** → **Delivered** (+ optional photo)

---

## Felix's order (built into the app)

| Item | Qty | Subtotal |
|------|-----|----------|
| Shin Ramen – Bowl Noodle (4 for $36 deal) | 4 | $36 |
| Delivery fee | | $10 |
| **Total** | | **$46** |

Fallback (if Shin Ramen deal removed): 3 sale cup noodles @ $8 each = $24 subtotal.

One-tap on Home: **Add to Cart & Checkout**.

---

## Troubleshooting

| Issue | Fix |
|-------|-----|
| "Wrong username or password" | Felix must use **Create Account** first |
| Orders not visible to runner | Confirm Firebase env vars on Vercel; redeploy |
| Chat not showing | Chat is open once order is placed (pending+) |
| Build fails | Run `npm run build` locally first |

---

## CLI deploy (alternative)

```powershell
npm i -g vercel
vercel login
vercel --prod
```

Set Firebase env vars when prompted or in the Vercel dashboard.
