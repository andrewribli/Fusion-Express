export const APP_LOGO_SRC = "/images/gracerun-logo.png?v=3";
export const APP_ICON_SRC = "/images/gracerun-icon.png?v=3";

export function AppLogo({
  size = 32,
  className = "",
  priority = false,
}: {
  size?: number;
  className?: string;
  priority?: boolean;
}) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={APP_LOGO_SRC}
      alt="GraceRun"
      width={size}
      height={size}
      decoding="async"
      fetchPriority={priority ? "high" : "auto"}
      className={`rounded-[22%] bg-black object-contain ${className}`}
    />
  );
}
