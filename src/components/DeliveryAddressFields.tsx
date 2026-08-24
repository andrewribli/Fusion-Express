"use client";

import { CollegeSelect } from "@/components/CollegeSelect";
import {
  getHallsForCollege,
  type CuhkCollege,
} from "@/data/cuhk-locations";

const selectClassName =
  "mt-1 w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-900 focus:border-fusion-red focus:outline-none focus:ring-2 focus:ring-fusion-red/20 disabled:bg-gray-50 disabled:text-gray-400";

const inputClassName =
  "mt-1 w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-900 placeholder:text-gray-400 focus:border-fusion-red focus:outline-none focus:ring-2 focus:ring-fusion-red/20";

interface DeliveryAddressFieldsProps {
  college: string;
  hall: string;
  roomNumber: string;
  onCollegeChange: (value: string) => void;
  onHallChange: (value: string) => void;
  onRoomNumberChange: (value: string) => void;
  required?: boolean;
  hideRoom?: boolean;
}

export function DeliveryAddressFields({
  college,
  hall,
  roomNumber,
  onCollegeChange,
  onHallChange,
  onRoomNumberChange,
  required = true,
  hideRoom = false,
}: DeliveryAddressFieldsProps) {
  const halls = college ? getHallsForCollege(college as CuhkCollege) : [];

  return (
    <div className="space-y-3">
      <CollegeSelect
        value={college}
        onChange={(next) => {
          onCollegeChange(next);
          onHallChange("");
        }}
        required={required}
      />

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
            {college ? "Select hall" : "Select college first"}
          </option>
          {halls.map((name) => (
            <option key={name} value={name}>
              {name}
            </option>
          ))}
        </select>
      </div>

      {!hideRoom && (
        <div>
          <label htmlFor="roomNumber" className="block text-xs font-medium text-gray-600">
            Room Number{" "}
            <span className="font-normal text-gray-400">(optional)</span>
          </label>
          <input
            id="roomNumber"
            type="text"
            value={roomNumber}
            onChange={(e) => onRoomNumberChange(e.target.value)}
            placeholder="e.g. 301"
            className={inputClassName}
          />
        </div>
      )}
    </div>
  );
}

const inputClassNameExport = inputClassName;
export { inputClassNameExport as formInputClassName };
