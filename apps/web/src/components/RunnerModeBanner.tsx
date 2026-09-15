"use client";

import Link from "next/link";
import { useUser } from "@/context/UserContext";

export function RunnerModeBanner() {
  const { setMode } = useUser();

  return (
    <div className="border-b border-lakers-gold/30 bg-lakers-navy px-4 py-2 text-center text-xs text-white/90">
      Runner mode is on.{" "}
      <Link
        href="/"
        onClick={() => setMode("customer")}
        className="font-semibold text-lakers-gold underline"
      >
        Switch to shopping
      </Link>
    </div>
  );
}
