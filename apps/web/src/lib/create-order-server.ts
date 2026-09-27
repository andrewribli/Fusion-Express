"use client";

import { getAuthClient } from "@/lib/firebase";

export type ServerOrderResult = {
  id: string;
  sourceId: string;
  deliveryBase: number;
  deliverySurcharge: number;
  deliveryTotal: number;
  deliveryFee: number;
  total: number;
};

/** Places an order. The server prices delivery and ignores any fee in the body. */
export async function createOrderOnServer(
  body: Record<string, unknown>,
): Promise<ServerOrderResult> {
  const auth = getAuthClient();
  const token = await auth.currentUser?.getIdToken();
  if (!token) throw new Error("Sign in to place an order.");
  const { deliveryFee: _fee, deliveryBase: _base, deliverySurcharge: _surcharge, deliveryTotal: _quoted, total: _total, ...rest } =
    body;
  void _fee;
  void _base;
  void _surcharge;
  void _quoted;
  void _total;
  const res = await fetch("/api/orders/create", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(rest),
  });
  const data = (await res.json().catch(() => ({}))) as Partial<ServerOrderResult> & {
    error?: string;
  };
  if (!res.ok || !data.id) {
    throw new Error(data.error || "Could not place order.");
  }
  return data as ServerOrderResult;
}
