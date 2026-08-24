import Image from "next/image";

export const APP_LOGO_SRC = "/images/fusion-express-logo.png";

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
    <Image
      src={APP_LOGO_SRC}
      alt="Fusion Express"
      width={size}
      height={size}
      priority={priority}
      className={`rounded-lg object-cover ${className}`}
    />
  );
}
