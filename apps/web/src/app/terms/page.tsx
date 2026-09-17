import type { Metadata } from "next";
import { AppHeader } from "@/components/AppHeader";
import { LakersWallpaper } from "@/components/LakersWallpaper";
import { LegalDocument } from "@/components/LegalDocument";
import { SiteFooter } from "@/components/SiteFooter";
import {
  PRIVACY_SECTIONS,
  REFUND_SECTIONS,
  TERMS_SECTIONS,
} from "@/data/legal";

export const metadata: Metadata = {
  title: "Terms & Conditions — GraceRun",
  description:
    "GraceRun terms of service, refund and cancellation policy for CUHK grocery delivery.",
};

export default function TermsPage() {
  return (
    <LakersWallpaper>
      <AppHeader showBack backHref="/" title="Terms & Conditions" />
      <main className="mx-auto w-full max-w-[800px] px-4 py-6">
        <LegalDocument
          title="Terms & Conditions"
          intro="These terms govern your use of GraceRun, a grocery delivery service for CUHK students. Please read them before you create an account or place an order."
          groups={[
            { heading: "Terms of Service", sections: TERMS_SECTIONS },
            {
              heading: "Refund / Cancellation Policy",
              sections: REFUND_SECTIONS,
            },
            { heading: "Privacy Policy", sections: PRIVACY_SECTIONS },
          ]}
        />
      </main>
      <SiteFooter />
    </LakersWallpaper>
  );
}
