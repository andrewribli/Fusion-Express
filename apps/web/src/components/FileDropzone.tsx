"use client";

import { useId, useState } from "react";

export function FileDropzone({
  label,
  hint,
  file,
  onFile,
  accept = "image/*",
}: {
  label: string;
  hint: string;
  file?: File;
  onFile: (file: File) => void;
  accept?: string;
}) {
  const id = useId();
  const [dragOver, setDragOver] = useState(false);

  function takeFile(list: FileList | null) {
    const next = list?.[0];
    if (next) onFile(next);
  }

  return (
    <div className="space-y-2">
      <p className="text-sm font-semibold text-gray-800">{label}</p>
      <label
        htmlFor={id}
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          takeFile(e.dataTransfer.files);
        }}
        className={`flex min-h-[150px] cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed px-5 py-6 text-center transition ${
          dragOver
            ? "border-[#ED1C24] bg-[#ED1C24]/15"
            : file
              ? "border-green-500 bg-green-50"
              : "border-[#C4A574] bg-[#FFF8EE]"
        }`}
      >
        <input
          id={id}
          type="file"
          accept={accept}
          className="sr-only"
          onChange={(e) => {
            takeFile(e.target.files);
            e.target.value = "";
          }}
        />
        <p
          className={`max-w-[16rem] text-sm font-semibold leading-snug ${
            file ? "text-green-800" : "text-[#5C4033]"
          }`}
        >
          {file ? file.name : hint}
        </p>
        {file ? (
          <p className="mt-1 text-xs font-medium text-green-700">
            Ready — click to replace
          </p>
        ) : (
          <p className="mt-2 text-xs text-[#8A6A4F]">PNG or JPG</p>
        )}
      </label>
    </div>
  );
}
