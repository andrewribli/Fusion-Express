import Link from "next/link";

interface BackButtonProps {
  href?: string;
  label?: string;
}

export function BackButton({ href = "/", label = "Back to menu" }: BackButtonProps) {
  return (
    <Link
      href={href}
      className="inline-flex items-center gap-1.5 text-sm font-medium text-gray-600 transition-colors hover:text-fusion-red"
    >
      <svg
        className="h-4 w-4"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={2}
        aria-hidden
      >
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
      </svg>
      {label}
    </Link>
  );
}
