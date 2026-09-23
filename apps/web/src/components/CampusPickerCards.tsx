"use client";

import { campusConfig, type CampusId } from "@fusion-express/shared/campus";

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
  const muted = dark ? "text-zinc-400" : "text-gray-500";

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
              <p className="text-xs font-semibold uppercase tracking-wide text-[#ED1C24]">
                {cfg.name}
              </p>
              <p className="mt-1 text-base font-bold">{cfg.brandLabel}</p>
              <p className={`mt-1 text-xs leading-snug ${muted}`}>
                {cfg.emailDomains.map((d) => `@${d}`).join(" · ")}
              </p>
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}
