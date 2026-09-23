import { AppHeader } from "@/components/AppHeader";
import { AppShell } from "@/components/AppShell";
import { PrototypeBanner } from "@/components/PrototypeBanner";
import { CAMPUS } from "@/config/campus";

export default function PrivacyPage() {
  return (
    <AppShell>
      <PrototypeBanner />
      <AppHeader showBack title="Privacy" />
      <main className="mx-auto max-w-[640px] px-4 py-6 pb-28 text-sm leading-relaxed text-gray-700">
        <h1 className="text-xl font-bold text-gray-900">Privacy — {CAMPUS.brandName} prototype</h1>
        <p className="mt-3">
          Accounts, carts, and orders stay in localStorage on this device. Customers are not asked
          for a phone number. Runner phone numbers are only stored locally so the prototype can
          show the accept → deliver flow.
        </p>
        <p className="mt-3">
          Sign-up is limited to @{CAMPUS.emailDomains.join(" and @")} addresses.
        </p>
      </main>
    </AppShell>
  );
}
