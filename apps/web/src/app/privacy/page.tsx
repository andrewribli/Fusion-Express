import type { Metadata } from "next";
import { AppHeader } from "@/components/AppHeader";
import { LakersWallpaper } from "@/components/LakersWallpaper";
import { LegalDocument } from "@/components/LegalDocument";
import { SiteFooter } from "@/components/SiteFooter";
import { PRIVACY_SECTIONS } from "@/data/legal";

export const metadata: Metadata = {
  title: "Privacy Policy — GraceRun",
  description:
    "How GraceRun collects, stores, and uses your data for CUHK grocery delivery.",
};

export default function PrivacyPage() {
  return (
    <LakersWallpaper>
      <AppHeader showBack backHref="/" title="Privacy Policy" />
      <main className="mx-auto w-full max-w-[800px] px-4 py-6">
        <LegalDocument
          title="Privacy Policy"
          intro="This policy explains what personal data GraceRun collects, why we use it, and how you can ask us to delete it. It applies when you create an account, place an order, or browse the app."
          groups={[{ heading: "Your data", sections: PRIVACY_SECTIONS }]}
        />
      </main>
      <SiteFooter />
    </LakersWallpaper>
  );
}
