import type { Order, RunnerLocation } from "@/lib/types";
import { FUSION_COORDS } from "@/lib/constants";

const FRESH_LOCATION_MS = 15 * 60 * 1000;

function haversineKm(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number },
): number {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const R = 6371;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

/**
 * Show live map only after purchase when the runner has a fresh location
 * and appears to have left Fusion / be near campus delivery (not still at till).
 */
export function shouldShowLiveMap(order: Order): boolean {
  if (order.status !== "purchased") return false;
  const loc = order.runnerLocation;
  if (!loc) return false;
  const age = Date.now() - loc.updatedAt.getTime();
  if (age > FRESH_LOCATION_MS) return false;
  const fromFusion = haversineKm(
    { lat: loc.lat, lng: loc.lng },
    { lat: FUSION_COORDS.lat, lng: FUSION_COORDS.lng },
  );
  // After purchase, treat leaving Fusion (~>250m) as en-route toward destination.
  return fromFusion >= 0.25;
}

export function locationAgeMinutes(location?: RunnerLocation): number | null {
  if (!location) return null;
  return Math.max(
    0,
    Math.round((Date.now() - location.updatedAt.getTime()) / 60000),
  );
}
