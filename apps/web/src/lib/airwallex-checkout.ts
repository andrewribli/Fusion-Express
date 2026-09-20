"use client";

/**
 * Redirect to Airwallex Hosted Payment Page.
 * Omitting `methods` shows every payment method activated on the Airwallex
 * account for this currency (cards, FPS, PayMe, etc.).
 */
export async function redirectToAirwallexCheckout(opts: {
  intentId: string;
  clientSecret: string;
  currency: string;
  env: "demo" | "prod";
  successUrl: string;
}): Promise<void> {
  const Airwallex = await loadAirwallexJs();
  await Promise.resolve(
    Airwallex.init({
      env: opts.env,
      origin: window.location.origin,
    }),
  );

  Airwallex.redirectToCheckout({
    env: opts.env,
    mode: "payment",
    intent_id: opts.intentId,
    client_secret: opts.clientSecret,
    currency: opts.currency,
    country_code: "HK",
    successUrl: opts.successUrl,
  });
}

type AirwallexSdk = {
  init: (opts: { env: string; origin: string }) => Promise<void> | void;
  redirectToCheckout: (opts: Record<string, unknown>) => void;
};

function readSdkFromWindow(): AirwallexSdk | null {
  const w = window as unknown as {
    AirwallexComponentsSDK?: AirwallexSdk;
    Airwallex?: AirwallexSdk;
  };
  return w.AirwallexComponentsSDK ?? w.Airwallex ?? null;
}

async function loadAirwallexJs(): Promise<AirwallexSdk> {
  const existingSdk = readSdkFromWindow();
  if (existingSdk?.redirectToCheckout) return existingSdk;

  await new Promise<void>((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(
      'script[data-airwallex-sdk="1"]',
    );
    if (existing) {
      existing.addEventListener("load", () => resolve());
      existing.addEventListener("error", () =>
        reject(new Error("Airwallex.js failed to load")),
      );
      return;
    }
    const script = document.createElement("script");
    script.src = "https://checkout.airwallex.com/assets/elements.bundle.min.js";
    script.async = true;
    script.dataset.airwallexSdk = "1";
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Airwallex.js failed to load"));
    document.head.appendChild(script);
  });

  const sdk = readSdkFromWindow();
  if (!sdk?.redirectToCheckout) {
    throw new Error("Airwallex.js loaded but redirectToCheckout is missing.");
  }
  return sdk;
}
