import { getAuthClient } from "@fusion-express/shared/firebase";
import { webAssetOrigin } from "@fusion-express/shared/products";

async function authHeaders(): Promise<HeadersInit> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  try {
    const user = getAuthClient().currentUser;
    if (!user) return headers;
    const token = await user.getIdToken();
    headers.Authorization = `Bearer ${token}`;
  } catch (err) {
    console.error("Could not get ID token for email notify", err);
  }
  return headers;
}

async function postJson(path: string, body: unknown): Promise<void> {
  try {
    const res = await fetch(`${webAssetOrigin()}${path}`, {
      method: "POST",
      headers: await authHeaders(),
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      console.error("Email notify failed", path, res.status, text);
    }
  } catch (err) {
    console.error("Email notify failed", path, err);
  }
}

/** Fire-and-forget admin alert: new signup → hello@gracerun.fit (+ admin push). */
export function notifyNewUser(opts: {
  fullName: string;
  email: string;
  campus?: string;
  referralSource?: string;
  isRunner?: boolean;
}): void {
  void (async () => {
    try {
      // Fresh token so signup→notify never races Auth state.
      await getAuthClient().currentUser?.getIdToken(true);
    } catch (err) {
      console.error("notifyNewUser token refresh failed", err);
    }
    await postJson("/api/email/signup", {
      fullName: opts.fullName,
      email: opts.email.trim().toLowerCase(),
      campus: opts.campus,
      referralSource: opts.referralSource,
      isRunner: opts.isRunner,
    });
  })();
}

/** Fire-and-forget admin + roster alerts for a new order. */
export function notifyOrderPlaced(orderId: string): void {
  void postJson("/api/email/order-placed", { orderId });
}
