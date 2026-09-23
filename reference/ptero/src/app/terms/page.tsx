import { AppHeader } from "@/components/AppHeader";
import { AppShell } from "@/components/AppShell";
import { PrototypeBanner } from "@/components/PrototypeBanner";
import { CAMPUS } from "@/config/campus";

export default function TermsPage() {
  return (
    <AppShell>
      <PrototypeBanner />
      <AppHeader showBack title="Terms" />
      <main className="mx-auto max-w-[640px] px-4 py-6 pb-28 text-sm leading-relaxed text-gray-700">
        <h1 className="text-xl font-bold text-gray-900">Terms — {CAMPUS.brandName} prototype</h1>
        <p className="mt-3">
          This is a standalone CityU prototype. It is not the live GraceRun CUHK service. Orders
          are stored in your browser only. Dummy {CAMPUS.supermarket} prices are estimates.
          Airwallex checkout on this site does not charge a real card.
        </p>
      </main>
    </AppShell>
  );
}
