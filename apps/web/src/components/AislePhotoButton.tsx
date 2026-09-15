"use client";

import Link from "next/link";
import Image from "next/image";

export function AislePhotoButton({
  href,
  imageSrc,
  imageAlt,
  title,
  subtitle,
  sideLabel,
  compact,
}: {
  href: string;
  imageSrc: string;
  imageAlt: string;
  title: string;
  subtitle?: string;
  sideLabel?: string;
  compact?: boolean;
}) {
  return (
    <Link
      href={href}
      className={`group relative block w-full overflow-hidden rounded-xl shadow-md transition-transform active:scale-[0.98] ${
        compact ? "aspect-[3/4] max-h-[200px]" : "aspect-[4/5] min-h-[220px]"
      }`}
    >
      <Image
        src={imageSrc}
        alt={imageAlt}
        fill
        className="object-cover"
        sizes="(min-width: 768px) 40vw, 50vw"
      />
      <div
        className="absolute inset-0"
        style={{ backgroundColor: "rgba(0,0,0,0.35)" }}
        aria-hidden
      />
      <div className="absolute inset-x-0 bottom-0 z-10 flex flex-col p-3 text-white">
        {sideLabel && (
          <p className="text-[10px] font-semibold uppercase tracking-wide text-white/90">
            {sideLabel}
          </p>
        )}
        <h2 className="text-sm font-bold leading-snug sm:text-base">{title}</h2>
        {subtitle && (
          <p className="mt-0.5 line-clamp-2 text-[11px] text-white/90">{subtitle}</p>
        )}
        <span className="mt-1.5 text-xs font-semibold text-white">Browse →</span>
      </div>
    </Link>
  );
}
