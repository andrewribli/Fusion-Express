import type { Metadata, Viewport } from "next";
import { Geist } from "next/font/google";
import { CartProvider } from "@/context/CartContext";
import { UserProvider } from "@/context/UserContext";
import "./globals.css";

const geist = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Fusion Express — CUHK Dorm Delivery",
  description: "Order groceries from Fusion supermarket delivered to your CUHK dorm lobby.",
  icons: {
    icon: "/images/fusion-express-logo.png",
    apple: "/images/fusion-express-logo.png",
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Fusion Express",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  themeColor: "#552583",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${geist.variable} h-full`}>
      <body className="min-h-full bg-lakers-navy font-sans text-gray-900 antialiased">
        <UserProvider>
          <CartProvider>{children}</CartProvider>
        </UserProvider>
      </body>
    </html>
  );
}
