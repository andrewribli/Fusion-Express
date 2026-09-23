import type { Metadata, Viewport } from "next";
import { Geist } from "next/font/google";
import { StagingBanner } from "@/components/StagingBanner";
import { CampusProvider } from "@/context/CampusContext";
import { CartProvider } from "@/context/CartContext";
import { UserProvider } from "@/context/UserContext";
import { ManualItemModalProvider } from "@/lib/manual-item-modal";
import { ThemeProvider } from "@/lib/theme";
import "./globals.css";

const geist = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "GraceRun — Groceries. Delivered with grace.",
  description: "Groceries. Delivered with grace. Order from Fusion supermarket to your CUHK dorm lobby.",
  icons: {
    icon: [
      { url: "/favicon.svg?v=4", type: "image/svg+xml" },
      { url: "/favicon-32.png?v=4", type: "image/png", sizes: "32x32" },
      { url: "/images/gracerun-icon.png?v=4", type: "image/png", sizes: "512x512" },
    ],
    apple: [{ url: "/apple-touch-icon.png?v=4", sizes: "180x180", type: "image/png" }],
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

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${geist.variable} h-full`}>
      <body className="lite-mode min-h-full bg-[#f3f4f6] font-sans text-gray-900 antialiased">
        <script
          dangerouslySetInnerHTML={{
            __html:
              "try{document.body.classList.remove('dark-mode');document.body.classList.add('lite-mode');}catch(e){}",
          }}
        />
        <ThemeProvider>
          <UserProvider>
            <CampusProvider>
              <CartProvider>
                <ManualItemModalProvider>
                  <StagingBanner />
                  {children}
                </ManualItemModalProvider>
              </CartProvider>
            </CampusProvider>
          </UserProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
