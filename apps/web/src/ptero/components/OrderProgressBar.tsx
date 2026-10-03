import { TRACKING_STEPS, getStepIndex, type OrderStatus } from "@/ptero/lib/types";

export function OrderProgressBar({ status }: { status: OrderStatus }) {
  const current = getStepIndex(status);
  return (
    <ol className="flex items-center gap-1">
      {TRACKING_STEPS.map((step, index) => {
        const done = index <= current && status !== "cancelled";
        return (
          <li key={step.status} className="flex flex-1 flex-col items-center gap-1">
            <span
              className="h-1.5 w-full rounded-full"
              style={{ backgroundColor: done ? "#ED1C24" : "#e5e7eb" }}
            />
            <span
              className="text-[10px] font-medium"
              style={{ color: done ? "#ED1C24" : "#9ca3af" }}
            >
              {step.label}
            </span>
          </li>
        );
      })}
    </ol>
  );
}
