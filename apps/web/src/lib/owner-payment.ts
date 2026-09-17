export function ownerPaymentDetails(): {
  method: "PayMe" | "FPS";
  id: string;
} {
  const method =
    process.env.NEXT_PUBLIC_OWNER_PAYMENT_METHOD === "FPS" ? "FPS" : "PayMe";
  const id = process.env.NEXT_PUBLIC_OWNER_PAYME_ID?.trim() ?? "";
  return { method, id };
}
