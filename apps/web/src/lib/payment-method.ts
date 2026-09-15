export type CustomerPaymentMethod = "PayMe" | "FPS";

const STORAGE_KEY = "fusion_payment_method";

export function loadPaymentMethod(): CustomerPaymentMethod {
  if (typeof window === "undefined") return "PayMe";
  const saved = window.localStorage.getItem(STORAGE_KEY);
  return saved === "FPS" ? "FPS" : "PayMe";
}

export function savePaymentMethod(method: CustomerPaymentMethod): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, method);
}
