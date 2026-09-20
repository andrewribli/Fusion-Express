import "server-only";
import { createHmac, timingSafeEqual } from "crypto";

export type AirwallexEnv = "sandbox" | "production";

export type AirwallexCustomerInfo = {
  email?: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
};

export type CreatePaymentIntentResult = {
  id: string;
  clientSecret: string;
  amount: number;
  currency: string;
  status: string;
  merchantOrderId: string;
};

type TokenCache = {
  token: string;
  expiresAtMs: number;
};

let tokenCache: TokenCache | null = null;

export function getAirwallexEnv(): AirwallexEnv {
  const raw = (process.env.AIRWALLEX_ENV ?? "production").trim().toLowerCase();
  return raw === "sandbox" || raw === "demo" ? "sandbox" : "production";
}

export function airwallexApiBase(env: AirwallexEnv = getAirwallexEnv()): string {
  // Demo/sandbox host for test keys; live keys authenticate on api.airwallex.com.
  return env === "sandbox"
    ? "https://api-demo.airwallex.com"
    : "https://api.airwallex.com";
}

/** Airwallex.js `env` for Hosted Payment Page. */
export function airwallexJsEnv(env: AirwallexEnv = getAirwallexEnv()): "demo" | "prod" {
  return env === "sandbox" ? "demo" : "prod";
}

function requireCredentials(): { clientId: string; apiKey: string } {
  const clientId = process.env.AIRWALLEX_CLIENT_ID?.trim();
  const apiKey = process.env.AIRWALLEX_API_KEY?.trim();
  if (!clientId || !apiKey) {
    throw new Error("Airwallex is not configured (missing CLIENT_ID or API_KEY).");
  }
  return { clientId, apiKey };
}

async function getAccessToken(): Promise<string> {
  const now = Date.now();
  if (tokenCache && tokenCache.expiresAtMs > now + 60_000) {
    return tokenCache.token;
  }

  const { clientId, apiKey } = requireCredentials();
  const res = await fetch(`${airwallexApiBase()}/api/v1/authentication/login`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-client-id": clientId,
      "x-api-key": apiKey,
    },
    body: "{}",
  });
  const data = (await res.json()) as {
    token?: string;
    expires_at?: string;
    message?: string;
    code?: string;
  };
  if (!res.ok || !data.token) {
    throw new Error(
      `Airwallex login failed (${res.status}): ${data.message ?? data.code ?? "unknown"}`,
    );
  }

  const expiresAtMs = data.expires_at
    ? Date.parse(data.expires_at)
    : now + 25 * 60_000;
  tokenCache = { token: data.token, expiresAtMs };
  return data.token;
}

async function airwallexFetch<T>(
  path: string,
  init: RequestInit & { json?: unknown } = {},
): Promise<T> {
  const token = await getAccessToken();
  const headers: Record<string, string> = {
    Authorization: `Bearer ${token}`,
    ...(init.headers as Record<string, string> | undefined),
  };
  let body = init.body;
  if (init.json !== undefined) {
    headers["Content-Type"] = "application/json";
    body = JSON.stringify(init.json);
  }
  const res = await fetch(`${airwallexApiBase()}${path}`, {
    ...init,
    headers,
    body,
  });
  const data = (await res.json().catch(() => ({}))) as T & {
    message?: string;
    code?: string;
  };
  if (!res.ok) {
    throw new Error(
      `Airwallex ${path} failed (${res.status}): ${data.message ?? data.code ?? "unknown"}`,
    );
  }
  return data;
}

function splitName(fullName?: string): { firstName?: string; lastName?: string } {
  const trimmed = fullName?.trim();
  if (!trimmed) return {};
  const parts = trimmed.split(/\s+/);
  if (parts.length === 1) return { firstName: parts[0] };
  return { firstName: parts[0], lastName: parts.slice(1).join(" ") };
}

/**
 * Create an Airwallex Payment Intent for an order.
 * Returns client_secret so the browser can open Hosted Payment Page (FPS / PayMe).
 */
export async function createPaymentIntent(
  orderId: string,
  amount: number,
  currency: string,
  customerInfo: AirwallexCustomerInfo & { fullName?: string } = {},
  opts?: { returnUrl?: string; requestId?: string },
): Promise<CreatePaymentIntentResult> {
  if (!(amount > 0)) {
    throw new Error("Payment amount must be greater than zero.");
  }

  const names =
    customerInfo.firstName || customerInfo.lastName
      ? {
          first_name: customerInfo.firstName,
          last_name: customerInfo.lastName,
        }
      : (() => {
          const split = splitName(customerInfo.fullName);
          return {
            first_name: split.firstName,
            last_name: split.lastName,
          };
        })();

  const returnUrl =
    opts?.returnUrl ??
    `${process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") || "https://gracerun.fit"}/checkout/payment-return?orderId=${encodeURIComponent(orderId)}`;

  const payload = {
    request_id: opts?.requestId ?? crypto.randomUUID(),
    amount: Math.round(amount * 100) / 100,
    currency: currency.toUpperCase(),
    merchant_order_id: orderId,
    return_url: returnUrl,
    // Prefer local HK wallets on Hosted Payment Page when enabled on the account.
    metadata: {
      gracerun_order_id: orderId,
      preferred_methods: "fps,payme",
    },
    ...(customerInfo.email || names.first_name || customerInfo.phone
      ? {
          customer: {
            ...(customerInfo.email ? { email: customerInfo.email } : {}),
            ...(names.first_name ? { first_name: names.first_name } : {}),
            ...(names.last_name ? { last_name: names.last_name } : {}),
            ...(customerInfo.phone ? { phone_number: customerInfo.phone } : {}),
          },
        }
      : {}),
  };

  const data = await airwallexFetch<{
    id: string;
    client_secret: string;
    amount: number;
    currency: string;
    status: string;
    merchant_order_id?: string;
  }>("/api/v1/pa/payment_intents/create", {
    method: "POST",
    json: payload,
  });

  if (!data.id || !data.client_secret) {
    throw new Error("Airwallex did not return a client_secret.");
  }

  return {
    id: data.id,
    clientSecret: data.client_secret,
    amount: data.amount,
    currency: data.currency,
    status: data.status,
    merchantOrderId: data.merchant_order_id ?? orderId,
  };
}

export async function retrievePaymentIntent(intentId: string): Promise<{
  id: string;
  status: string;
  amount: number;
  currency: string;
  merchantOrderId?: string;
}> {
  const data = await airwallexFetch<{
    id: string;
    status: string;
    amount: number;
    currency: string;
    merchant_order_id?: string;
  }>(`/api/v1/pa/payment_intents/${encodeURIComponent(intentId)}`, {
    method: "GET",
  });
  return {
    id: data.id,
    status: data.status,
    amount: data.amount,
    currency: data.currency,
    merchantOrderId: data.merchant_order_id,
  };
}

/**
 * Verify Airwallex webhook signature:
 * HMAC-SHA256(secret, x-timestamp + rawBody) === x-signature
 */
export function verifyAirwallexWebhookSignature(opts: {
  rawBody: string;
  timestamp: string | null;
  signature: string | null;
  secret?: string;
  /** Reject if timestamp is older than this (ms). Default 5 minutes. */
  toleranceMs?: number;
}): boolean {
  const secret = (opts.secret ?? process.env.AIRWALLEX_WEBHOOK_SECRET ?? "").trim();
  if (!secret) {
    // Fail closed once a secret is expected in production traffic.
    return false;
  }
  if (!opts.timestamp || !opts.signature) return false;

  const ts = Number(opts.timestamp);
  if (!Number.isFinite(ts)) return false;
  const age = Math.abs(Date.now() - ts);
  if (age > (opts.toleranceMs ?? 5 * 60_000)) return false;

  const expected = createHmac("sha256", secret)
    .update(opts.timestamp + opts.rawBody, "utf8")
    .digest("hex");

  try {
    const a = Buffer.from(expected, "utf8");
    const b = Buffer.from(opts.signature, "utf8");
    if (a.length !== b.length) return false;
    return timingSafeEqual(a, b);
  } catch {
    return false;
  }
}
