"use client";

import { useMemo, useState } from "react";
import type {
  MenuOptionGroup,
  SelectedOptions,
} from "@fusion-express/shared/canteen-set-options";
import {
  optionSelectionsComplete,
  priceDeltaForSelections,
} from "@fusion-express/shared/canteen-set-options";
import { formatHkd } from "@/data/canteen/bf-menu";

type Props = {
  open: boolean;
  title: string;
  basePrice: number;
  groups: MenuOptionGroup[];
  onClose: () => void;
  onConfirm: (selected: SelectedOptions) => void;
};

export function CanteenSetOptionsModal({
  open,
  title,
  basePrice,
  groups,
  onClose,
  onConfirm,
}: Props) {
  const [selected, setSelected] = useState<SelectedOptions>({});
  const [step, setStep] = useState(0);

  const group = groups[step];
  const complete = optionSelectionsComplete(groups, selected);
  const total =
    basePrice + priceDeltaForSelections(groups, selected);

  const stepLabel = useMemo(
    () => `Step ${step + 1} of ${groups.length}`,
    [step, groups.length],
  );

  if (!open || !group) return null;

  function toggleChoice(groupId: string, choiceId: string, max: number) {
    setSelected((prev) => {
      const cur = prev[groupId] ?? [];
      if (max <= 1) {
        return { ...prev, [groupId]: [choiceId] };
      }
      if (cur.includes(choiceId)) {
        return { ...prev, [groupId]: cur.filter((id) => id !== choiceId) };
      }
      if (cur.length >= max) return prev;
      return { ...prev, [groupId]: [...cur, choiceId] };
    });
  }

  function next() {
    const picks = selected[group.id] ?? [];
    const min = group.min ?? (group.required === false ? 0 : 1);
    if (picks.length < min) return;
    if (step < groups.length - 1) {
      setStep((s) => s + 1);
      return;
    }
    if (complete) onConfirm(selected);
  }

  return (
    <div className="fixed inset-0 z-[80] flex items-end justify-center bg-black/40 p-4 sm:items-center">
      <div
        role="dialog"
        aria-modal
        aria-label={title}
        className="max-h-[85vh] w-full max-w-md overflow-auto rounded-2xl bg-white p-4 shadow-xl"
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
              {stepLabel}
            </p>
            <h2 className="mt-1 text-lg font-bold text-gray-900">{title}</h2>
            <p className="mt-1 text-sm text-gray-600">{group.label}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full px-2 py-1 text-sm text-gray-500 hover:bg-gray-100"
          >
            Close
          </button>
        </div>

        <div className="mt-4 space-y-2">
          {group.choices.map((choice) => {
            const picks = selected[group.id] ?? [];
            const active = picks.includes(choice.id);
            const delta = choice.priceDelta ?? 0;
            return (
              <button
                key={choice.id}
                type="button"
                onClick={() =>
                  toggleChoice(group.id, choice.id, group.max ?? 1)
                }
                className={`flex w-full items-center justify-between rounded-xl border px-3 py-3 text-left text-sm ${
                  active
                    ? "border-[#ED1C24] bg-red-50"
                    : "border-gray-200 bg-white hover:bg-gray-50"
                }`}
              >
                <span className="font-medium text-gray-900">{choice.label}</span>
                <span className="text-gray-600">
                  {delta === 0 ? "Free" : `+${formatHkd(delta)}`}
                </span>
              </button>
            );
          })}
        </div>

        <div className="mt-5 flex items-center justify-between gap-3">
          <p className="text-sm font-bold text-[#ED1C24]">
            {formatHkd(total)}
          </p>
          <div className="flex gap-2">
            {step > 0 ? (
              <button
                type="button"
                onClick={() => setStep((s) => s - 1)}
                className="rounded-xl border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700"
              >
                Back
              </button>
            ) : null}
            <button
              type="button"
              onClick={next}
              disabled={
                (selected[group.id] ?? []).length <
                (group.min ?? (group.required === false ? 0 : 1))
              }
              className="rounded-xl bg-[#ED1C24] px-4 py-2 text-sm font-semibold text-white disabled:bg-gray-300"
            >
              {step < groups.length - 1 ? "Next" : "Add to cart"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
