import type { Metadata, Viewport } from "next";
import { Geist } from "next/font/google";
import { CartProvider } from "@/context/CartContext";
import { AppStateProvider } from "@/context/AppState";
import { CAMPUS } from "@/config/campus";
import "./globals.css";

const geist = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: `${CAMPUS.brandName} — ${CAMPUS.shortTagline}`,
  description: CAMPUS.tagline,
  icons: {
    icon: [
      { url: "/images/ptero-icon.png?v=4", type: "image/png" },
      { url: "/favicon.svg", type: "image/svg+xml" },
    ],
    apple: [{ url: "/images/ptero-icon.png?v=4", sizes: "180x180", type: "image/png" }],
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: CAMPUS.brandName,
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  themeColor: "#ED1C24",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${geist.variable} h-full`}>
      <body className="lite-mode min-h-full bg-[#f3f4f6] font-sans text-gray-900 antialiased">
        <AppStateProvider>
          <CartProvider>{children}</CartProvider>
        </AppStateProvider>
      </body>
    </html>
  );
}
