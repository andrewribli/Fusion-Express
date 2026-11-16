"use client";

import { useState } from "react";
import { DeleteAccountModal } from "@/components/DeleteAccountModal";

export function DeleteAccountSection() {
  const [open, setOpen] = useState(false);
  return (
    <div className="mt-4 border-t border-gray-100 pt-4">
      <p className="text-xs text-gray-500">
        Permanently delete your GraceRun account and profile.
      </p>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="mt-2 text-sm font-semibold text-[#ED1C24]"
      >
        Delete account
      </button>
      <DeleteAccountModal open={open} onClose={() => setOpen(false)} />
    </div>
  );
}
