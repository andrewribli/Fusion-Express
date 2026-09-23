import { CAMPUS } from "@/ptero/config/campus";

/** Ptero mark (pterodactyl + bag + wordmark) on light background. */
export const APP_LOGO_SRC = "/ptero/images/ptero-logo.png?v=4";
export const APP_ICON_SRC = "/ptero/images/ptero-icon.png?v=4";

export function AppLogo({
  size = 40,
  className = "",
}: {
  size?: number;
  className?: string;
  /** @deprecated Logo already includes the wordmark; kept for call-site compat. */
  wordmark?: boolean;
}) {
  return (
    <span
      className={`inline-flex shrink-0 items-center justify-center overflow-hidden rounded-xl bg-transparent ${className}`}
      style={{ width: size, height: size }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={APP_LOGO_SRC}
        alt={CAMPUS.brandName}
        width={size}
        height={size}
        decoding="async"
        className="h-full w-full object-contain object-center"
      />
    </span>
  );
}
