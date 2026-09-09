"use client";

import { CUHK_COLLEGES } from "@/data/cuhk-locations";
import {
  getDeliveryZone,
  ZONE_DISTANCE_SURCHARGE,
  ZONE_LABELS,
} from "@/lib/delivery";

const selectClassName =
  "mt-1 w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-900 focus:border-fusion-red focus:outline-none focus:ring-2 focus:ring-fusion-red/20";

export function CollegeSelect({
  value,
  onChange,
  required = true,
  id = "college",
}: {
  value: string;
  onChange: (college: string) => void;
  required?: boolean;
  id?: string;
}) {
  const zone = value ? getDeliveryZone(value) : null;

  return (
    <div>
      <label htmlFor={id} className="block text-xs font-medium text-gray-600">
        College / dorm (distance zone)
      </label>
      <select
        id={id}
        required={required}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={selectClassName}
      >
        <option value="">Select college</option>
        {CUHK_COLLEGES.map((name) => {
          const z = getDeliveryZone(name);
          const extra = ZONE_DISTANCE_SURCHARGE[z];
          return (
            <option key={name} value={name}>
              {name} — Zone {z}
              {extra > 0 ? ` (+$${extra})` : " (+$0 nearby)"}
            </option>
          );
        })}
      </select>
      {zone && (
        <p className="mt-1 text-xs text-gray-500">
          Zone {zone}: {ZONE_LABELS[zone]}
          {ZONE_DISTANCE_SURCHARGE[zone] > 0
            ? ` · +$${ZONE_DISTANCE_SURCHARGE[zone]} distance`
            : " · no distance surcharge"}
        </p>
      )}
    </div>
  );
}
