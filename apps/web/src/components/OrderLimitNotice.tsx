import { isOverOrderLimit, ORDER_LIMIT_MESSAGE } from "@/lib/constants";

export function OrderLimitNotice({ subtotal }: { subtotal: number }) {
  if (!isOverOrderLimit(subtotal)) return null;
  return (
    <p className="rounded-xl bg-red-50 px-3 py-2 text-xs font-semibold text-[#ED1C24]">
      {ORDER_LIMIT_MESSAGE}
    </p>
  );
}
