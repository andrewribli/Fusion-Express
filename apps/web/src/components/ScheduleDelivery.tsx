"use client";

import { useEffect } from "react";
import {
  ADMIN_ORDERING_NOTE,
  immediateOrderDecision,
  scheduleDateBounds,
  type OrderVenue,
} from "@/lib/order-window";

export function ScheduleDelivery({
  venue,
  isAdmin,
  mode,
  date,
  time,
  onMode,
  onDate,
  onTime,
  error,
}: {
  venue: OrderVenue;
  isAdmin: boolean;
  mode: "now" | "schedule";
  date: string;
  time: string;
  onMode: (mode: "now" | "schedule") => void;
  onDate: (value: string) => void;
  onTime: (value: string) => void;
  error: string | null;
}) {
  const bounds = scheduleDateBounds();
  const nowDecision = immediateOrderDecision(venue, { isAdmin: false });
  const deliverNowLocked = nowDecision.closed && !isAdmin;

  useEffect(() => {
    if (deliverNowLocked && mode === "now") onMode("schedule");
  }, [deliverNowLocked, mode, onMode]);

  return (
    <fieldset className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
      <legend className="text-sm font-semibold text-gray-900">When should we deliver?</legend>
      <div className="mt-3 flex flex-col gap-2">
        <label className="flex items-start gap-2 text-sm text-gray-800">
          <input
            type="radio"
            name="delivery-timing"
            className="mt-1"
            checked={mode === "now"}
            disabled={deliverNowLocked}
            onChange={() => onMode("now")}
          />
          <span>
            <span className="font-semibold">Deliver now</span>
            {deliverNowLocked ? (
              <span className="mt-0.5 block text-xs text-amber-800">
                {nowDecision.message}
              </span>
            ) : null}
          </span>
        </label>
        <label className="flex items-center gap-2 text-sm text-gray-800">
          <input
            type="radio"
            name="delivery-timing"
            checked={mode === "schedule"}
            onChange={() => onMode("schedule")}
          />
          <span className="font-semibold">Schedule</span>
        </label>
      </div>
      {mode === "schedule" ? (
        <div className="mt-3 grid grid-cols-2 gap-2">
          <label className="text-xs font-medium text-gray-600">
            Date
            <input
              type="date"
              required
              min={bounds.min}
              max={bounds.max}
              value={date}
              onChange={(event) => onDate(event.target.value)}
              className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2 text-sm text-gray-900"
            />
          </label>
          <label className="text-xs font-medium text-gray-600">
            Time
            <input
              type="time"
              required
              value={time}
              onChange={(event) => onTime(event.target.value)}
              className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2 text-sm text-gray-900"
            />
          </label>
          <p className="col-span-2 text-xs text-gray-500">
            Times are Hong Kong time. Delivery fee stays the same.
          </p>
        </div>
      ) : null}
      {isAdmin && nowDecision.closed ? (
        <p className="mt-3 text-sm font-medium text-gray-800">{ADMIN_ORDERING_NOTE}</p>
      ) : null}
      {error ? <p className="mt-3 text-sm font-medium text-amber-900">{error}</p> : null}
    </fieldset>
  );
}
