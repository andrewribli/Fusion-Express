import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Shop Now — GraceRun",
  description:
    "Browse Fusion groceries and order delivery to your CUHK hall lobby.",
};

export default function ShopNowLayout({ children }: { children: React.ReactNode }) {
  return children;
}
