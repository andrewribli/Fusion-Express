"use client";

import { isServiceOpen, SERVICE_HOURS } from "@/lib/constants";
import { ADMIN_ORDERING_NOTE } from "@/lib/order-window";

export function StoreHoursBanner({ isAdmin = false }: { isAdmin?: boolean }) {
  const open = isServiceOpen();

  return (
    <div
      className={`mt-3 flex items-start gap-3 rounded-2xl border px-3 py-2.5 ${
        open
          ? "border-green-200 bg-green-50"
          : "border-amber-200 bg-amber-50"
      }`}
    >
      <span
        className={`mt-0.5 inline-flex rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${
          open ? "bg-green-700 text-white" : "bg-amber-700 text-white"
        }`}
      >
        {open ? "Open now" : "Browsing only"}
      </span>
      <p className={`text-xs leading-snug ${open ? "text-green-900" : "text-amber-950"}`}>
        Student runners pick up at Fusion {SERVICE_HOURS.label}.{" "}
        {open
          ? "Runners are taking orders now — place one and a student on campus can accept it."
          : "Runners are offline until 8:00pm. You can still browse and fill a cart, or schedule a delivery during pickup hours."}
        {!open && isAdmin ? (
          <span className="mt-1 block font-medium">{ADMIN_ORDERING_NOTE}</span>
        ) : null}
      </p>
    </div>
  );
}
