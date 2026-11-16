"use client";

import { campusConfig, type CampusId } from "@fusion-express/shared/campus";

const CAMPUS_LOGOS: Record<CampusId, string> = {
  cuhk: "/images/campus/cuhk.png",
  cityu: "/images/campus/cityu.svg",
};

/**
 * Compact CUHK / CityU cards for signup and guest checkout.
 */
export function CampusPickerCards({
  value,
  onChange,
  dark = false,
}: {
  value: CampusId | null;
  onChange: (campus: CampusId) => void;
  dark?: boolean;
}) {
  const cardBase = dark
    ? "border-white/10 bg-[#161616] text-white hover:border-[#ED1C24]/60"
    : "border-gray-200 bg-white text-gray-900 hover:border-[#ED1C24]/50";
  const selected = dark
    ? "border-[#ED1C24] bg-[#1a1010] ring-2 ring-[#ED1C24]/40"
    : "border-[#ED1C24] bg-red-50 ring-2 ring-[#ED1C24]/30";
  return (
    <fieldset>
      <legend className={`text-sm font-semibold ${dark ? "text-white" : "text-gray-900"}`}>
        Which university are you from?
      </legend>
      <div className="mt-3 grid gap-3 sm:grid-cols-2" role="radiogroup">
        {(Object.keys(campusConfig) as CampusId[]).map((id) => {
          const cfg = campusConfig[id];
          const active = value === id;
          return (
            <button
              key={id}
              type="button"
              role="radio"
              aria-checked={active}
              onClick={() => onChange(id)}
              className={`rounded-2xl border p-4 text-left transition ${
                active ? selected : cardBase
              }`}
            >
              <div
                className={`flex h-16 w-fit items-center ${
                  dark ? "rounded-lg bg-white p-1.5" : ""
                }`}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={CAMPUS_LOGOS[id]}
                  alt={`${cfg.name} logo`}
                  className="h-full w-auto max-w-full object-contain"
                />
              </div>
              <p className="mt-3 text-base font-bold">{cfg.name}</p>
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}
