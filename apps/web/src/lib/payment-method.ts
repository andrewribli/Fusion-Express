export type PaymentMethod = "PayMe" | "FPS";

const STORAGE_KEY = "gracerun_payment_method";

export function loadPaymentMethod(): PaymentMethod {
  if (typeof window === "undefined") return "PayMe";
  const stored = localStorage.getItem(STORAGE_KEY);
  return stored === "FPS" ? "FPS" : "PayMe";
}

export function savePaymentMethod(method: PaymentMethod): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, method);
}
