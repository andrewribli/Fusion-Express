import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@fusion-express/shared", "@fusion-express/ui"],
  distDir: process.env.VERCEL ? "../../.next" : ".next",
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "upload.wikimedia.org",
        pathname: "/wikipedia/commons/**",
      },
      {
        protocol: "https",
        hostname: "images.unsplash.com",
      },
      {
        protocol: "https",
        hostname: "placehold.co",
      },
      {
        protocol: "https",
        hostname: "foodpanda.dhmedia.io",
      },
      {
        protocol: "https",
        hostname: "images.deliveryhero.io",
      },
    ],
  },
};

export default nextConfig;
