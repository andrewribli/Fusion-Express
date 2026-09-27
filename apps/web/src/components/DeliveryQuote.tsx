import {
  formatDeliveryQuote,
  formatHkdAmount,
  type DeliveryFeeQuote,
} from "@fusion-express/shared/delivery-pricing";

export function DeliveryQuote({
  quote,
  large = false,
}: {
  quote: DeliveryFeeQuote;
  large?: boolean;
}) {
  return (
    <div className={large ? "text-lg font-semibold leading-snug text-gray-900" : "text-sm text-gray-600"}>
      <p>{formatDeliveryQuote(quote)}</p>
      {quote.pricing === "cityu-hall12-legacy" ? (
        <p className="mt-1 text-xs font-normal text-gray-500">
          Hall 12 keeps today&apos;s HK${formatHkdAmount(quote.total)} fee. It is not on a CityU hall tier.
        </p>
      ) : null}
    </div>
  );
}
