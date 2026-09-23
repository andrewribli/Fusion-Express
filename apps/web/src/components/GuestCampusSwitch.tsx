"use client";

import Link from "next/link";
import { campusConfig } from "@fusion-express/shared/campus";
import { useUser } from "@/context/UserContext";

/** Signed-in users are locked to their signup campus; guests can hop to Ptero. */
export function GuestCampusSwitch() {
  const { user } = useUser();
  if (user && !user.isGuest && user.campus) return null;

  return (
    <p className="mt-8 text-center text-sm text-zinc-400">
      Not at CUHK?{" "}
      <Link
        href={campusConfig.cityu.channelHomePath}
        className="font-semibold text-[#ED1C24] underline underline-offset-2"
      >
        Switch to {campusConfig.cityu.name}
      </Link>
    </p>
  );
}
