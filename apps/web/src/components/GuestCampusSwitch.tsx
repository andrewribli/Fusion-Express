"use client";

import { campusConfig, type CampusId } from "@fusion-express/shared/campus";
import { useCampus } from "@/context/CampusContext";
import { useUser } from "@/context/UserContext";

/** Signed-in users are locked to their signup campus; guests can flip. */
export function GuestCampusSwitch() {
  const { user } = useUser();
  const { campus, setCampus } = useCampus();
  if (user && !user.isGuest && user.campus) return null;

  const other: CampusId = campus === "cityu" ? "cuhk" : "cityu";
  return (
    <p className="mt-8 text-center text-sm text-zinc-400">
      Not at {campusConfig[campus].name}?{" "}
      <button
        type="button"
        onClick={() => setCampus(other)}
        className="font-semibold text-[#ED1C24] underline underline-offset-2"
      >
        Switch to {campusConfig[other].name}
      </button>
    </p>
  );
}
