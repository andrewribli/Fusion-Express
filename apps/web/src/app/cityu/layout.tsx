import type { Metadata } from "next";
import { CAMPUS } from "@/ptero/config/campus";
import { AppStateProvider } from "@/ptero/context/AppState";
import { CartProvider } from "@/ptero/context/CartContext";

export const metadata: Metadata = {
  title: `${CAMPUS.brandName} — ${CAMPUS.shortTagline}`,
  description: CAMPUS.tagline,
  icons: {
    icon: [
      { url: "/ptero/images/ptero-icon.png?v=4", type: "image/png" },
      { url: "/ptero/favicon.svg", type: "image/svg+xml" },
    ],
    apple: [
      { url: "/ptero/images/ptero-icon.png?v=4", sizes: "180x180", type: "image/png" },
    ],
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: CAMPUS.brandName,
  },
};

export default function PteroLayout({ children }: { children: React.ReactNode }) {
  return (
    <AppStateProvider>
      <CartProvider>{children}</CartProvider>
    </AppStateProvider>
  );
}
