"use client";

import { FUSION_COORDS } from "@/lib/constants";
import type { RunnerLocation } from "@/lib/types";

export function RunnerLocationMap({
  location,
}: {
  location?: RunnerLocation;
}) {
  if (!location) {
    return (
      <p className="rounded-xl bg-gray-50 px-3 py-2 text-xs text-gray-500">
        Waiting for the runner&apos;s live location…
      </p>
    );
  }

  const { lat, lng } = location;
  const delta = 0.008;
  const bbox = [
    lng - delta,
    lat - delta,
    lng + delta,
    lat + delta,
  ].join(",");
  const src = `https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik&marker=${lat}%2C${lng}`;
  const ageMin = Math.max(
    0,
    Math.round((Date.now() - location.updatedAt.getTime()) / 60000),
  );

  return (
    <div>
      <p className="text-xs font-medium text-gray-500">
        Runner location
        {ageMin === 0 ? " · just now" : ` · ${ageMin} min ago`}
      </p>
      <iframe
        title="Runner location map"
        src={src}
        className="mt-2 h-48 w-full rounded-xl border-0"
        loading="lazy"
      />
      <p className="mt-1 text-[11px] text-gray-400">
        Fusion is near {FUSION_COORDS.lat.toFixed(4)}, {FUSION_COORDS.lng.toFixed(4)}.
        Location is only shared while this order is active.
      </p>
    </div>
  );
}
