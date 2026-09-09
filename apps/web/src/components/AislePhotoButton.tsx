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
      className={`group relative flex overflow-hidden rounded-2xl shadow-lg transition-transform active:scale-[0.98] ${
        compact
          ? "min-h-[160px] md:min-h-[190px]"
          : "min-h-[220px] md:min-h-[280px]"
      }`}
    >
      <Image
        src={imageSrc}
        alt={imageAlt}
        fill
        className="object-cover transition-transform duration-300 group-hover:scale-105"
        sizes="(min-width: 768px) 40vw, 50vw"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/25 to-black/10" />
      <div className="relative z-10 mt-auto flex w-full flex-col p-4 text-white">
        {sideLabel && (
          <p className="text-[10px] font-semibold uppercase tracking-wide text-white/80">
            {sideLabel}
          </p>
        )}
        <h2 className="text-base font-bold leading-snug md:text-lg">{title}</h2>
        {subtitle && (
          <p className="mt-0.5 text-[11px] text-white/85">{subtitle}</p>
        )}
        {!compact && (
          <span className="mt-2 text-xs font-semibold">Browse →</span>
        )}
      </div>
    </Link>
  );
}
