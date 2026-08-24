import type { OrderStatus } from "@/lib/types";
import { TRACKING_STEPS, getStepIndex } from "@/lib/order-status";

interface OrderProgressBarProps {
  status: OrderStatus;
}

export function OrderProgressBar({ status }: OrderProgressBarProps) {
  const currentIndex = getStepIndex(status);

  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
      <ol className="space-y-0">
        {TRACKING_STEPS.map((step, index) => {
          const isComplete = index <= currentIndex;
          const isLast = index === TRACKING_STEPS.length - 1;

          return (
            <li key={step.status} className="relative flex gap-4">
              {!isLast && (
                <span
                  className={`absolute left-[15px] top-8 h-[calc(100%-8px)] w-0.5 ${
                    index < currentIndex ? "bg-green-500" : "bg-gray-200"
                  }`}
                  aria-hidden
                />
              )}
              <div className="relative z-10 shrink-0">
                {isComplete ? (
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-green-500 text-white shadow-sm">
                    <svg
                      className="h-4 w-4"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={3}
                      aria-hidden
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                  </div>
                ) : (
                  <div className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-gray-300 bg-white">
                    <div className="h-2.5 w-2.5 rounded-full bg-gray-300" />
                  </div>
                )}
              </div>
              <div className={`pb-6 ${isLast ? "pb-0" : ""}`}>
                <p
                  className={`text-sm font-semibold ${
                    isComplete ? "text-gray-900" : "text-gray-400"
                  }`}
                >
                  {step.label}
                </p>
                {index === currentIndex && (
                  <p className="mt-0.5 text-xs text-fusion-red">Current status</p>
                )}
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
