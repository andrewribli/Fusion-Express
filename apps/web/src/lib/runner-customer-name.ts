import { getAuthClient } from "@/lib/firebase";

const cache = new Map<string, Promise<string>>();

/** Profile fullName for an order whose own name fields are empty. */
export function lookupRunnerCustomerName(orderId: string): Promise<string> {
  const cached = cache.get(orderId);
  if (cached) return cached;

  const pending = (async () => {
    try {
      const user = getAuthClient().currentUser;
      if (!user) return "";
      const token = await user.getIdToken();
      const res = await fetch("/api/runner/customer-name", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ orderId }),
      });
      if (!res.ok) return "";
      const data = (await res.json()) as { fullName?: string };
      return data.fullName?.trim() ?? "";
    } catch {
      return "";
    }
  })();

  cache.set(orderId, pending);
  return pending;
}
