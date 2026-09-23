import Link from "next/link";
import { CAMPUS } from "@/config/campus";

export function SiteFooter({
  className = "",
}: {
  className?: string;
}) {
  return (
    <footer className={`px-4 py-6 text-center text-xs ${className}`}>
      <nav className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1">
        <Link
          href="/terms"
          className="font-semibold text-[#ED1C24] underline-offset-2 hover:underline"
        >
          Terms &amp; Conditions
        </Link>
        <span className="text-gray-500">·</span>
        <Link
          href="/privacy"
          className="font-semibold text-[#ED1C24] underline-offset-2 hover:underline"
        >
          Privacy Policy
        </Link>
      </nav>
      <p className="mt-2 text-gray-500">
        {CAMPUS.brandName} · {CAMPUS.shortTagline}
      </p>
      <p className="mt-1 text-[10px] text-gray-400">
        Prototype — dummy {CAMPUS.supermarket} catalog. Not live orders.
      </p>
    </footer>
  );
}
