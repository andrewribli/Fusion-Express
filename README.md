This is a Turborepo with the Next.js site in `apps/web` and the Expo app in `apps/mobile`. Shared fee math, Firestore helpers, and product data live in `packages/shared`.

## Web (Vercel)

```bash
npm install
npm run dev
```

The site still deploys with `npx --yes vercel@59.3.0 --prod --yes` from the repo root (`turbo` builds `@fusion-express/web`). Keep Firebase `NEXT_PUBLIC_*` env vars on the Vercel project.

## Mobile (Expo)

```bash
npm run dev:mobile
```

Copy Firebase keys into `apps/mobile/.env` using the `EXPO_PUBLIC_FIREBASE_*` names in `apps/mobile/.env.example`. Product photos that are local files are loaded from the live website origin.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
