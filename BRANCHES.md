# GraceRun work branches

Isolation branches for cheaper, faster testing. All were cut from `main` and push to GitHub so each gets its own Vercel **Preview** deployment (project `servecart`, team `fusion-1468`).

Production (`gracerun.fit`) continues to track the combined app on **`main`** until you deliberately promote `gracerun-everything` (or merge isolation work back).

| Branch | Purpose |
|--------|---------|
| `gracerun-cuhk-canteens` | CUHK canteen menus, mealtime / zone windows, and canteen-only logic |
| `gracerun-cuhk-fusion` | CUHK Fusion grocery catalog, categories, and grocery-only logic |
| `gracerun-cityu-canteens` | CityU canteen menus and canteen-only logic (Ptero canteen path) |
| `gracerun-cityu-taste` | CityU Taste / Wellcome grocery catalog and grocery-only logic |
| `gracerun-everything` | Combined, production-ready merge of all campuses and services |

## Stable branches (do not treat as isolation sandboxes)

| Branch | Role |
|--------|------|
| `main` | Current combined production source of truth |
| `staging` | Staging / integration (when used) |

## How to use

1. Check out the branch that matches the area you are changing.
2. Push commits — Vercel builds a Preview URL for that git branch (GitHub → `servecart`).
3. Open the deployment from the Vercel dashboard (**servecart** → Deployments → filter by branch), or the `*.vercel.app` URL on the GitHub commit / PR check.
4. Merge back into `gracerun-everything` (or `main`) when the slice is ready; keep isolation branches focused so diffs stay small.

## Preview deployments

- **Automatic:** any push to these branches triggers a Preview deployment for `servecart` (not Production).
- **Production:** only promote / merge to `main` (or explicitly deploy `--prod`) when you want live `gracerun.fit` updated.
- Preview hostnames look like `servecart-git-<branch>-fusion-1468.vercel.app` (exact slug may vary; use the Vercel UI if unsure).

## Notes

- These branches start identical to `main`. Trim or gate unrelated campus/channel UI on each branch as you specialize them.
- CityU Ptero clone work may also live on feature branches such as `cursor/ptero-cityu-match`; fold that into `gracerun-cityu-*` / `gracerun-everything` when ready.
