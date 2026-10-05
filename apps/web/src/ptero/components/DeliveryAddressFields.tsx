"use client";

import {
  CITYU_COMPOUND_NAMES,
  formatDeliveryAddress,
  getHallsForCompound,
  getLobbyForHall,
  type CityUCompound,
} from "@/ptero/config/locations";
import { ZONE_LABELS, getDeliveryZone } from "@/ptero/lib/delivery";

const selectClassName =
  "mt-1 w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-900 focus:border-fusion-red focus:outline-none focus:ring-2 focus:ring-fusion-red/20 disabled:bg-gray-50 disabled:text-gray-400";

const inputClassName =
  "mt-1 w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-900 placeholder:text-gray-400 focus:border-fusion-red focus:outline-none focus:ring-2 focus:ring-fusion-red/20";

export { inputClassName as formInputClassName };

export function DeliveryAddressFields({
  compound,
  hall,
  lobby,
  onCompoundChange,
  onHallChange,
  onLobbyChange,
  required = true,
}: {
  compound: string;
  hall: string;
  lobby: string;
  onCompoundChange: (value: string) => void;
  onHallChange: (value: string) => void;
  onLobbyChange: (value: string) => void;
  required?: boolean;
}) {
  const halls = compound ? getHallsForCompound(compound as CityUCompound) : [];
  const zone = compound ? getDeliveryZone(compound) : null;

  return (
    <div className="space-y-3">
      <div>
        <label htmlFor="compound" className="block text-xs font-medium text-gray-600">
          Residence area
        </label>
        <select
          id="compound"
          required={required}
          value={compound}
          onChange={(e) => {
            onCompoundChange(e.target.value);
            onHallChange("");
            onLobbyChange("");
          }}
          className={selectClassName}
        >
          <option value="">Select compound</option>
          {CITYU_COMPOUND_NAMES.map((name) => (
            <option key={name} value={name}>
              {name}
            </option>
          ))}
        </select>
        {zone && (
          <p className="mt-1 text-[11px] text-gray-500">{ZONE_LABELS[zone]}</p>
        )}
      </div>

      <div>
        <label htmlFor="hall" className="block text-xs font-medium text-gray-600">
          Hall
        </label>
        <select
          id="hall"
          required={required}
          value={hall}
          disabled={!compound}
          onChange={(e) => {
            const next = e.target.value;
            onHallChange(next);
            onLobbyChange(getLobbyForHall(next));
          }}
          className={selectClassName}
        >
          <option value="">
            {compound ? "Select hall" : "Select compound first"}
          </option>
          {halls.map((name) => (
            <option key={name} value={name}>
              {name}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label htmlFor="lobby" className="block text-xs font-medium text-gray-600">
          Lobby
        </label>
        <input
          id="lobby"
          required={required}
          value={lobby}
          onChange={(e) => onLobbyChange(e.target.value)}
          placeholder="Select a hall to pre-fill"
          className={inputClassName}
        />
      </div>

      {compound && hall && (
        <p className="text-xs text-gray-500">
          Deliver to {formatDeliveryAddress(compound, hall)} · {lobby || getLobbyForHall(hall)}
        </p>
      )}
    </div>
  );
}
