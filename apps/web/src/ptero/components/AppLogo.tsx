/** GraceRun mark. CityU chrome uses the same asset as CUHK. */
export const APP_LOGO_SRC = "/images/gracerun-logo.png?v=3";
export const APP_ICON_SRC = "/images/gracerun-icon.png?v=3";

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
        alt="GraceRun"
        width={size}
        height={size}
        decoding="async"
        className="h-full w-full object-contain object-center"
      />
    </span>
  );
}
