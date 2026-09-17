import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@fusion-express/shared", "@fusion-express/ui"],
  // Keep Admin SDK + jwks-rsa/jose out of the Turbopack/webpack server bundle.
  // Bundling them caused ERR_REQUIRE_ESM (CJS require of ESM-only jose@6).
  serverExternalPackages: ["firebase-admin", "jose", "jwks-rsa"],
  distDir: process.env.VERCEL ? "../../.next" : ".next",
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "upload.wikimedia.org",
        pathname: "/wikipedia/**",
      },
      {
        protocol: "https",
        hostname: "commons.wikimedia.org",
      },
      {
        protocol: "https",
        hostname: "images.hktvmall.com",
      },
      {
        protocol: "https",
        hostname: "images-dynamic.hktvmall.com",
      },
      {
        protocol: "https",
        hostname: "cdn-media.hktvmall.com",
      },
      {
        protocol: "https",
        hostname: "images.openbeautyfacts.org",
      },
      {
        protocol: "https",
        hostname: "images.openproductsfacts.org",
      },
      {
        protocol: "https",
        hostname: "static.openfoodfacts.org",
      },
      {
        protocol: "https",
        hostname: "foodpanda.dhmedia.io",
      },
      {
        protocol: "https",
        hostname: "images.deliveryhero.io",
      },
      {
        protocol: "https",
        hostname: "medias.pns.hk",
      },
      {
        protocol: "https",
        hostname: "images.openfoodfacts.org",
      },
      {
        protocol: "https",
        hostname: "images.unsplash.com",
      },
    ],
  },
};

export default nextConfig;
