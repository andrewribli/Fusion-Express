"use client";

import { useState } from "react";
import { isLobbyArrivalActive, pingLobbyArrival } from "@/lib/orders";
import { notifyOrderEvent } from "@/lib/notify-push";
import type { Order } from "@/lib/types";

/** Runner trust pack: buzz the customer that you're at their lobby. */
export function LobbyPingButton({
  order,
  dark = false,
}: {
  order: Order;
  dark?: boolean;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const canPing =
    order.status === "accepted" ||
    order.status === "assigned" ||
    order.status === "purchased";
  if (!canPing) return null;

  const already = isLobbyArrivalActive(order);
  const className = dark
    ? "flex min-h-11 w-full items-center justify-center rounded-xl border border-amber-400/40 bg-amber-950/40 text-sm font-semibold text-amber-100 disabled:opacity-50"
    : "flex min-h-11 w-full items-center justify-center rounded-xl border border-amber-300 bg-amber-50 text-sm font-semibold text-amber-950 disabled:opacity-50";

  async function onPing() {
    setBusy(true);
    setError("");
    try {
      await pingLobbyArrival(order.id);
      notifyOrderEvent(order.id, "lobby");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not send lobby ping.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-1">
      <button
        type="button"
        disabled={busy}
        onClick={() => void onPing()}
        className={className}
      >
        {busy
          ? "Sending…"
          : already
            ? "Ping again — I'm at lobby"
            : "I'm at lobby"}
      </button>
      {error ? (
        <p className={`text-xs ${dark ? "text-red-300" : "text-red-700"}`}>
          {error}
        </p>
      ) : (
        <p className={`text-xs ${dark ? "text-[#c4c4c4]" : "text-gray-500"}`}>
          Sends a push and shows a banner on the customer's track screen.
        </p>
      )}
    </div>
  );
}
