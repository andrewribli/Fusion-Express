import { NextResponse } from "next/server";
import { isOpen, closedBanner } from "@/lib/openingHours";
import { isOrderableCanteen } from "@/lib/canteenConfig";
import {
  isDrinkAddonItemId,
  parseDrinkAddonId,
} from "@/lib/canteen/drink-addon";

/**
 * GET ?id=sorazen → { open, banner, status }
 * POST body: { canteenId, itemIds: string[] } → validates hours + drink add-ons
 *   before client createOrder. Returns 400 if closed / invalid add-ons.
 */
export async function GET(request: Request) {
  const id = new URL(request.url).searchParams.get("id") ?? "";
  if (!id) {
    return NextResponse.json({ error: "Missing canteen id" }, { status: 400 });
  }
  const open = isOpen(id);
  return NextResponse.json({
    id,
    open,
    orderable: isOrderableCanteen(id),
    banner: open ? null : closedBanner(id),
  });
}

export async function POST(request: Request) {
  let body: { canteenId?: string; itemIds?: string[] };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const canteenId = body.canteenId?.trim() ?? "";
  const itemIds = Array.isArray(body.itemIds) ? body.itemIds : [];

  if (!canteenId) {
    return NextResponse.json({ error: "Missing canteenId" }, { status: 400 });
  }
  if (!isOrderableCanteen(canteenId)) {
    return NextResponse.json(
      { error: closedBanner(canteenId) || "This canteen is not orderable yet." },
      { status: 400 },
    );
  }
  if (!isOpen(canteenId)) {
    return NextResponse.json(
      { error: closedBanner(canteenId) },
      { status: 400 },
    );
  }

  const mains = itemIds.filter(
    (id) =>
      id.startsWith(`canteen:${canteenId}:`) &&
      !isDrinkAddonItemId(id),
  );
  const addons = itemIds.filter(isDrinkAddonItemId);

  for (const addonId of addons) {
    const parsed = parseDrinkAddonId(addonId);
    if (!parsed || parsed.restaurantId !== canteenId) {
      return NextResponse.json(
        { error: "Invalid drink add-on in cart." },
        { status: 400 },
      );
    }
    const mainId = `canteen:${canteenId}:${parsed.mainItemId}`;
    if (!mains.includes(mainId) && !itemIds.includes(mainId)) {
      // Main may use full cart id form canteen:rest:item
      const hasMain = itemIds.some(
        (id) =>
          id === mainId ||
          id.endsWith(`:${parsed.mainItemId}`) &&
            id.startsWith(`canteen:${canteenId}:`) &&
            !isDrinkAddonItemId(id),
      );
      if (!hasMain) {
        return NextResponse.json(
          {
            error:
              "Drink add-on requires its main item in the cart. Remove the add-on or add a main.",
          },
          { status: 400 },
        );
      }
    }
  }

  // At most one add-on per main
  const byMain = new Map<string, number>();
  for (const addonId of addons) {
    const parsed = parseDrinkAddonId(addonId);
    if (!parsed) continue;
    const key = parsed.mainItemId;
    byMain.set(key, (byMain.get(key) ?? 0) + 1);
    if ((byMain.get(key) ?? 0) > 1) {
      return NextResponse.json(
        { error: "Only one drink add-on per main item." },
        { status: 400 },
      );
    }
  }

  return NextResponse.json({ ok: true, canteenId, open: true });
}
