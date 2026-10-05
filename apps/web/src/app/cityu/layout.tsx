import type { Metadata } from "next";
import { CAMPUS } from "@/ptero/config/campus";
import { AppStateProvider } from "@/ptero/context/AppState";
import { CartProvider } from "@/ptero/context/CartContext";

export const metadata: Metadata = {
  title: `${CAMPUS.brandName} — ${CAMPUS.shortTagline}`,
  description: CAMPUS.tagline,
  icons: {
    icon: [
      { url: "/favicon.svg?v=4", type: "image/svg+xml" },
      { url: "/favicon-32.png?v=4", type: "image/png", sizes: "32x32" },
      { url: "/images/gracerun-icon.png?v=4", type: "image/png", sizes: "512x512" },
    ],
    apple: [{ url: "/apple-touch-icon.png?v=4", sizes: "180x180", type: "image/png" }],
  },
  openGraph: {
    title: CAMPUS.brandName,
    description: CAMPUS.tagline,
    images: [{ url: "/images/gracerun-icon.png?v=4" }],
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: CAMPUS.brandName,
  },
};

export default function CityULayout({ children }: { children: React.ReactNode }) {
  return (
    <AppStateProvider>
      <CartProvider>{children}</CartProvider>
    </AppStateProvider>
  );
}
