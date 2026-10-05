"use client";

import { runnerCollegeOptions } from "@fusion-express/shared/college-discount";

const inputClassName =
  "mt-1 w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-900";

export function RunnerCollegeSelect({
  id = "runner-college",
  value,
  onChange,
}: {
  id?: string;
  value: string;
  onChange: (collegeId: string) => void;
}) {
  const options = runnerCollegeOptions();
  return (
    <div>
      <label htmlFor={id} className="block text-xs font-medium text-gray-600">
        Your college
      </label>
      <select
        id={id}
        required
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className={inputClassName}
      >
        <option value="">Select your college</option>
        {options.map((option) => (
          <option key={option.id} value={option.id}>
            {option.label}
          </option>
        ))}
      </select>
      <p className="mt-2 text-xs font-medium text-amber-800">
        This is permanent. You can only change it by appealing to GraceRun.
      </p>
    </div>
  );
}
