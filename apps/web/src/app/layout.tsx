import type { Metadata, Viewport } from "next";
import { Geist } from "next/font/google";
import { StagingBanner } from "@/components/StagingBanner";
import { CartProvider } from "@/context/CartContext";
import { UserProvider } from "@/context/UserContext";
import "./globals.css";

const geist = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "GraceRun — Groceries. Delivered with grace.",
  description: "Groceries. Delivered with grace. Order from Fusion supermarket to your CUHK dorm lobby.",
  icons: {
    icon: [{ url: "/favicon.svg", type: "image/svg+xml" }, { url: "/images/gracerun-icon.png" }],
    apple: "/images/gracerun-icon.png",
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "GraceRun",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  themeColor: "#ED1C24",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${geist.variable} h-full`}>
      <body className="min-h-full bg-lakers-navy font-sans text-gray-900 antialiased">
        <UserProvider>
          <CartProvider>
            <StagingBanner />
            {children}
          </CartProvider>
        </UserProvider>
      </body>
    </html>
  );
}
