import { colors as uiColors, FUSION_RED } from "@fusion-express/ui";

/** Matches www.gracerun.fit mobile shop chrome. */
export const colors = {
  fusion: FUSION_RED,
  orange: "#ff6a00",
  ink: "#111111",
  muted: "#6B7280",
  soft: "#9CA3AF",
  border: "#E5E7EB",
  page: "#F5F5F5",
  card: "#FFFFFF",
  imageBg: "#FAFAFA",
  ...uiColors,
} as const;
