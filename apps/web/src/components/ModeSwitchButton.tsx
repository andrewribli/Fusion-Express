"use client";

import { useRouter } from "next/navigation";
import { useUser } from "@/context/UserContext";
import { homeForMode } from "@/lib/nav";
import type { AppMode } from "@/lib/roles";

/**
 * Uber-style mode toggle. Shown whenever the account can leave the current
 * mode (dual-role, or any runner returning to shopping).
 */
export function ModeSwitchButton({
  className = "",
  label,
}: {
  className?: string;
  label?: string;
}) {
  const router = useRouter();
  const { canSwitchModes, canRunnerMode, mode, setMode } = useUser();

  const next: AppMode = mode === "runner" ? "customer" : "runner";

  if (mode === "customer" && !canRunnerMode && !canSwitchModes) return null;

  const text =
    label ??
    (next === "runner" ? "Switch to Runner" : "Switch to Customer");

  return (
    <button
      type="button"
      onClick={() => {
        setMode(next);
        router.push(homeForMode(next));
      }}
      className={
        className ||
        (mode === "runner"
          ? "rounded-full bg-[#ED1C24] px-2.5 py-1.5 text-xs font-semibold text-white"
          : "rounded-full bg-red-50 px-2.5 py-1.5 text-xs font-semibold text-[#ED1C24]")
      }
    >
      {text}
    </button>
  );
}
