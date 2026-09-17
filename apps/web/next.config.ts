import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@fusion-express/shared", "@fusion-express/ui"],
  distDir: process.env.VERCEL ? "../../.next" : ".next",
  images: {
    // Bypass Vercel Image Optimization until quota is restored (remote
    // medias.pns.hk / foodpanda URLs were returning HTTP 402).
    // Local /images/* aisle assets remain fine either way; global
    // unoptimized is the short-term fix while remotePatterns stay for
    // when optimization is re-enabled.
    unoptimized: true,
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
