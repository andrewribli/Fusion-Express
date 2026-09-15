import type { Metadata, Viewport } from "next";
import { Geist } from "next/font/google";
import { StagingBanner } from "@/components/StagingBanner";
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
    icon: [{ url: "/images/gracerun-icon.png?v=3", type: "image/png" }],
    apple: "/images/gracerun-icon.png?v=3",
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
      <body className="dark-mode min-h-full bg-lakers-navy font-sans text-gray-900 antialiased">
        <script
          dangerouslySetInnerHTML={{
            __html:
              "try{var t=localStorage.getItem('gracerun-theme');if(t==='lite'){document.body.classList.remove('dark-mode');document.body.classList.add('lite-mode');}}catch(e){}",
          }}
        />
        <ThemeProvider>
          <UserProvider>
            <CartProvider>
              <ManualItemModalProvider>
                <StagingBanner />
                {children}
              </ManualItemModalProvider>
            </CartProvider>
          </UserProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
