"use client";

import type { ReactNode } from "react";
import Image from "next/image";

export function PageWallpaper({
  src,
  alt,
  overlayClassName = "bg-white/58",
  children,
}: {
  src: string;
  alt: string;
  overlayClassName?: string;
  children: ReactNode;
}) {
  return (
    <div className="relative min-h-screen">
      <div className="pointer-events-none fixed inset-0 z-0">
        <Image
          src={src}
          alt={alt}
          fill
          priority
          className="object-cover"
          sizes="100vw"
        />
        <div className={`absolute inset-0 ${overlayClassName}`} />
      </div>
      <div className="relative z-10">{children}</div>
    </div>
  );
}
