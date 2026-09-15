"use client";

import { useRef } from "react";

export function FileDropzone({
  label,
  hint,
  file,
  onFile,
}: {
  label: string;
  hint?: string;
  file?: File;
  onFile: (file: File) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <div>
      <p className="text-sm font-semibold text-white">{label}</p>
      {hint ? <p className="text-xs text-[#c4c4c4]">{hint}</p> : null}
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        className="mt-2 flex min-h-24 w-full flex-col items-center justify-center rounded-xl border border-dashed border-white/25 bg-[#2a2a2a] px-3 py-4 text-sm text-[#f5f5f5]"
      >
        {file ? file.name : "Tap to choose a photo"}
      </button>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(event) => {
          const chosen = event.target.files?.[0];
          if (chosen) onFile(chosen);
        }}
      />
    </div>
  );
}
