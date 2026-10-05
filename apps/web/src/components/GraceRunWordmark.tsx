import Link from "next/link";

type GraceRunWordmarkProps = {
  href?: string;
  label?: string;
  className?: string;
  /** Hide below 360px so search stays usable on very narrow phones. */
  dropBelow360?: boolean;
};

/**
 * Compact GraceRun text mark for cramped mobile headers (no square logo).
 */
export function GraceRunWordmark({
  href = "/cuhk",
  label = "GraceRun",
  className = "",
  dropBelow360 = true,
}: GraceRunWordmarkProps) {
  return (
    <Link
      href={href}
      aria-label={`${label} home`}
      className={`shrink-0 items-center ${
        dropBelow360 ? "hidden min-[361px]:inline-flex" : "inline-flex"
      } ${className}`}
    >
      <span className="max-h-5 text-[13px] font-extrabold leading-5 tracking-tight text-gray-900">
        {label}
      </span>
    </Link>
  );
}
