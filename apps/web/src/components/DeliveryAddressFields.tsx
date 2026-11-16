"use client";

import {
  getHallsForResidence,
  getResidenceGroups,
  residenceGroupLabel,
  type CampusId,
} from "@fusion-express/shared";
import { zoneSurchargeForCollege } from "@fusion-express/shared/delivery";

const selectClassName =
  "mt-1 w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-900 focus:border-fusion-red focus:outline-none focus:ring-2 focus:ring-fusion-red/20 disabled:bg-gray-50 disabled:text-gray-400";

interface DeliveryAddressFieldsProps {
  campus: CampusId;
  college: string;
  hall: string;
  onCollegeChange: (value: string) => void;
  onHallChange: (value: string) => void;
  required?: boolean;
  showPricing?: boolean;
}

export function DeliveryAddressFields({
  campus,
  college,
  hall,
  onCollegeChange,
  onHallChange,
  required = true,
  showPricing = true,
}: DeliveryAddressFieldsProps) {
  const groups = getResidenceGroups(campus);
  const halls = college ? getHallsForResidence(campus, college) : [];
  const groupLabel = residenceGroupLabel(campus);

  return (
    <div className="space-y-3">
      <div>
        <label htmlFor="residence" className="block text-xs font-medium text-gray-600">
          {groupLabel}
        </label>
        <select
          id="residence"
          required={required}
          value={college}
          onChange={(e) => {
            onCollegeChange(e.target.value);
            onHallChange("");
          }}
          className={selectClassName}
        >
          <option value="">Select {groupLabel.toLowerCase()}</option>
          {groups.map((name) => {
            const surcharge = showPricing
              ? zoneSurchargeForCollege(name, campus)
              : 0;
            return (
              <option key={name} value={name}>
                {showPricing && surcharge > 0
                  ? `${name} (+HK$${surcharge})`
                  : name}
              </option>
            );
          })}
        </select>
      </div>

      <div>
        <label htmlFor="hall" className="block text-xs font-medium text-gray-600">
          Hall / Hostel
        </label>
        <select
          id="hall"
          required={required}
          value={hall}
          disabled={!college}
          onChange={(e) => onHallChange(e.target.value)}
          className={selectClassName}
        >
          <option value="">
            {college
              ? "Select hall"
              : `Select ${groupLabel.toLowerCase()} first`}
          </option>
          {halls.map((name) => (
            <option key={name} value={name}>
              {name}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}

export const formInputClassName =
  "mt-1 w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-900 placeholder:text-gray-400 focus:border-fusion-red focus:outline-none focus:ring-2 focus:ring-fusion-red/20";
