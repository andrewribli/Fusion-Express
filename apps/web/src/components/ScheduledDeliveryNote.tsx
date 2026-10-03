import { formatScheduledLabel } from "@/lib/order-window";

export function ScheduledDeliveryNote({
  at,
  tone = "light",
}: {
  at?: Date | null;
  tone?: "light" | "dark";
}) {
  if (!at) return null;
  const className =
    tone === "dark"
      ? "text-sm font-semibold text-amber-200"
      : "text-sm font-semibold text-[#ED1C24]";
  return <p className={className}>Scheduled for {formatScheduledLabel(at)}</p>;
}
