import {
  formatHkdAmount,
  type DeliveryFeeQuote,
} from "@fusion-express/shared/delivery-pricing";

export function DeliveryQuote({
  quote,
  large = false,
  fromLabel,
}: {
  quote: DeliveryFeeQuote;
  large?: boolean;
  /** Pickup shop, so the delivery row names the restaurant it was priced from. */
  fromLabel?: string;
}) {
  const amount =
    quote.pending
      ? `from HK$${formatHkdAmount(quote.total)}`
      : quote.available === false
        ? "—"
        : `HK$${formatHkdAmount(quote.total)}`;
  const detail =
    quote.available === false
      ? quote.unavailableMessage
      : quote.pending
        ? "Confirmed at checkout from this shop and your hall."
        : quote.pricing === "cityu-tier" && quote.hallName
          ? `HK$${formatHkdAmount(quote.base)} store base + HK$${formatHkdAmount(quote.surcharge)} (${quote.hallName})`
          : quote.pricing === "cityu-tier"
            ? `HK$${formatHkdAmount(quote.base)} store base, before the hall surcharge.`
            : quote.pricing === "cityu-hall12-legacy"
              ? `Hall 12 keeps today's HK$${formatHkdAmount(quote.total)} fee. It is not on a CityU hall tier.`
              : null;

  return (
    <div>
      <div
        className={
          large
            ? "flex justify-between text-base font-semibold text-gray-900"
            : "flex justify-between text-sm text-gray-600"
        }
      >
        <span>Delivery</span>
        <span>{amount}</span>
      </div>
      {fromLabel && quote.available !== false ? (
        <p className="mt-1 text-xs font-normal text-gray-500">From {fromLabel}</p>
      ) : null}
      {detail ? (
        <p className="mt-1 text-xs font-normal text-gray-500">{detail}</p>
      ) : null}
      {quote.pricing === "cuhk-graph" && quote.available !== false && !quote.pending ? (
        <p className="mt-1 text-xs font-normal text-gray-500">
          Est. — confirmed at delivery
        </p>
      ) : null}
    </div>
  );
}
