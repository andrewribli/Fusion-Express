import type { OrderStatus } from "@/lib/types";

const COMPACT_STEPS = [
  { id: "placed", label: "Placed" },
  { id: "accepted", label: "Accepted" },
  { id: "on_the_way", label: "On the way" },
  { id: "delivered", label: "Delivered" },
] as const;

function compactStepIndex(status: OrderStatus): number {
  if (status === "cancelled") return -1;
  if (status === "pending") return 0;
  if (status === "accepted") return 1;
  if (status === "purchased") return 2;
  // delivered / runner_paid / customer_paid
  return 3;
}

interface OrderProgressBarProps {
  status: OrderStatus;
}

/** Compact 4-state horizontal progress (not 7 grey dots). */
export function OrderProgressBar({ status }: OrderProgressBarProps) {
  const current = compactStepIndex(status);

  if (status === "cancelled") {
    return (
      <div className="rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
        Order cancelled
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-gray-100 bg-white px-3 py-4 shadow-sm">
      <ol className="flex items-start justify-between gap-1">
        {COMPACT_STEPS.map((step, index) => {
          const done = current >= index;
          const active = current === index;
          return (
            <li key={step.id} className="flex min-w-0 flex-1 flex-col items-center gap-1.5">
              <div className="flex w-full items-center">
                {index > 0 && (
                  <span
                    className="h-0.5 flex-1 rounded-full"
                    style={{ backgroundColor: current >= index ? "#ED1C24" : "#e5e7eb" }}
                    aria-hidden
                  />
                )}
                <span
                  className="flex h-3 w-3 shrink-0 rounded-full"
                  style={{
                    backgroundColor: done ? "#ED1C24" : "#d1d5db",
                    boxShadow: active ? "0 0 0 4px rgba(237,28,36,0.18)" : "none",
                  }}
                  aria-current={active ? "step" : undefined}
                />
                {index < COMPACT_STEPS.length - 1 && (
                  <span
                    className="h-0.5 flex-1 rounded-full"
                    style={{
                      backgroundColor: current > index ? "#ED1C24" : "#e5e7eb",
                    }}
                    aria-hidden
                  />
                )}
              </div>
              <span
                className="max-w-full truncate text-center text-[11px] font-semibold"
                style={{ color: done ? "#111111" : "#9ca3af" }}
              >
                {step.label}
              </span>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
