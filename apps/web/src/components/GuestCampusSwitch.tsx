"use client";

import Link from "next/link";
import { campusConfig } from "@fusion-express/shared/campus";
import { useUser } from "@/context/UserContext";
import {
  CITYU_COMING_SOON_LABEL,
  canAccessCityU,
} from "@/lib/betaAccess";

/** Signed-in users are locked to their signup campus; guests can hop to CityU. */
export function GuestCampusSwitch() {
  const { user } = useUser();
  if (user && !user.isGuest && user.campus) return null;

  if (!canAccessCityU(user?.email)) {
    return (
      <p className="mt-8 text-center text-sm text-zinc-400">
        Not at CUHK?{" "}
        <span
          className="group relative inline-flex cursor-default font-semibold text-[#ED1C24]/55"
          title={CITYU_COMING_SOON_LABEL}
          aria-label={`CityU — ${CITYU_COMING_SOON_LABEL}`}
        >
          Switch to {campusConfig.cityu.name}
          <span className="ml-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-zinc-500">
            · {CITYU_COMING_SOON_LABEL}
          </span>
          <span
            role="tooltip"
            className="pointer-events-none absolute bottom-full left-1/2 z-20 mb-2 hidden -translate-x-1/2 whitespace-nowrap rounded-lg bg-zinc-900 px-3 py-1.5 text-xs font-semibold text-white shadow-lg group-hover:block"
          >
            {CITYU_COMING_SOON_LABEL}
          </span>
        </span>
      </p>
    );
  }

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
