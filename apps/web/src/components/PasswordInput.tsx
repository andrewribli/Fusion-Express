"use client";

import { useId, useState, type ComponentProps } from "react";

const defaultInputClassName =
  "mt-1 w-full rounded-xl border border-gray-200 bg-white px-4 py-3 pr-12 text-sm text-gray-900 placeholder:text-gray-400 focus:border-fusion-red focus:outline-none focus:ring-2 focus:ring-fusion-red/20";

function EyeIcon({ off }: { off: boolean }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-5 w-5"
      aria-hidden
    >
      {off ? (
        <>
          <path d="M3 3l18 18" />
          <path d="M10.6 10.6a2 2 0 0 0 2.8 2.8" />
          <path d="M9.9 5.2A9.8 9.8 0 0 1 12 5c5 0 9.3 3.1 11 7.5a12.3 12.3 0 0 1-2.2 3.3" />
          <path d="M6.7 6.7C4.2 8.2 2.3 10.5 1 12.5c1.6 3.4 5.1 7.5 11 7.5 1.8 0 3.4-.4 4.9-1.1" />
        </>
      ) : (
        <>
          <path d="M1 12.5C2.6 9.1 6.2 5 12 5s9.4 4.1 11 7.5c-1.6 3.4-5.2 7.5-11 7.5S2.6 15.9 1 12.5z" />
          <circle cx="12" cy="12.5" r="3" />
        </>
      )}
    </svg>
  );
}

export function PasswordInput({
  label,
  id,
  className,
  ...props
}: Omit<ComponentProps<"input">, "type"> & { label?: string }) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const [visible, setVisible] = useState(false);

  return (
    <div>
      {label ? (
        <label htmlFor={inputId} className="block text-xs font-medium text-gray-600">
          {label}
        </label>
      ) : null}
      <div className="relative">
        <input
          id={inputId}
          type={visible ? "text" : "password"}
          className={className ?? defaultInputClassName}
          {...props}
        />
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          className="absolute right-3 top-1/2 -translate-y-1/2 rounded-md p-1 text-gray-500 hover:text-gray-800 focus:outline-none focus:ring-2 focus:ring-fusion-red/30"
          aria-label={visible ? "Hide password" : "Show password"}
          aria-pressed={visible}
        >
          <EyeIcon off={visible} />
        </button>
      </div>
    </div>
  );
}
