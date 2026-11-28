"use client";

import {
  sharedCustomerPhone,
  telUrl,
  whatsAppMeUrl,
} from "@fusion-express/shared/contact";
import type { Order } from "@/lib/types";

/** Call / WhatsApp only when the customer opted in and phone was stamped. */
export function RunnerCustomerContact({
  order,
  dark = false,
}: {
  order: Order;
  dark?: boolean;
}) {
  const phone = sharedCustomerPhone(order);
  if (!phone) return null;
  const call = telUrl(phone);
  const wa = whatsAppMeUrl(phone);
  const btn = dark
    ? "flex min-h-11 flex-1 items-center justify-center rounded-xl border border-white/20 text-sm font-semibold text-white"
    : "flex min-h-11 flex-1 items-center justify-center rounded-xl border border-gray-200 bg-white text-sm font-semibold text-gray-900";

  return (
    <div className="flex gap-2">
      {call ? (
        <a href={call} className={btn}>
          Call
        </a>
      ) : null}
      {wa ? (
        <a href={wa} target="_blank" rel="noopener noreferrer" className={btn}>
          WhatsApp
        </a>
      ) : null}
    </div>
  );
}
