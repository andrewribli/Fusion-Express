import { LegalLink } from "@/components/LegalLink";

export function SiteFooter({
  className = "",
  light = false,
}: {
  className?: string;
  light?: boolean;
}) {
  const link = light
    ? "font-semibold text-[#ED1C24] underline-offset-2 hover:underline"
    : "font-semibold text-white/80 underline-offset-2 hover:text-white hover:underline";
  const muted = light ? "text-gray-500" : "text-white/50";

  return (
    <footer className={`px-4 py-6 text-center text-xs ${className}`}>
      <nav className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1">
        <LegalLink href="/terms" className={link}>
          Terms &amp; Conditions
        </LegalLink>
        <span className={muted}>·</span>
        <LegalLink href="/privacy" className={link}>
          Privacy Policy
        </LegalLink>
      </nav>
      <p className={`mt-2 ${muted}`}>
        GraceRun · Groceries. Delivered with grace.
      </p>
    </footer>
  );
}
