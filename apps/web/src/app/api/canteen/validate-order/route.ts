import { NextResponse } from "next/server";
import { closedBanner, isOpen } from "@/lib/openingHours";
import { isOrderableCanteen } from "@/lib/canteenConfig";
import {
  isDrinkAddonItemId,
  parseDrinkAddonId,
} from "@/lib/canteen/drink-addon";
import {
  AdminAuthError,
  callerIsAdmin,
  requireAuthFromRequest,
} from "@/lib/firebase-admin";
import {
  immediateOrderDecision,
  parseScheduledFor,
  scheduledOrderDecision,
  venueForCanteenId,
  type WindowDecision,
} from "@/lib/order-window";

async function withAdminBypass(
  request: Request,
  decision: WindowDecision,
  reopen: (isAdmin: boolean) => WindowDecision,
): Promise<WindowDecision> {
  if (decision.allowed || !decision.bypassable) return decision;
  const header = request.headers.get("authorization") ?? "";
  if (!header.startsWith("Bearer ")) return decision;
  try {
    const auth = await requireAuthFromRequest(request);
    if (!(await callerIsAdmin(auth.uid, auth.idToken))) return decision;
    return reopen(true);
  } catch (err) {
    if (err instanceof AdminAuthError) return decision;
    throw err;
  }
}

/**
 * GET ?id=sorazen → { open, banner, status }
 * POST body: { canteenId, itemIds, scheduledFor? }
 * Hours and holiday closes are skipped only for an /admins/{uid} caller.
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
  let body: { canteenId?: string; itemIds?: string[]; scheduledFor?: unknown };
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

  const venue = venueForCanteenId(canteenId);
  const scheduled = parseScheduledFor(body.scheduledFor);
  if (scheduled === "invalid") {
    return NextResponse.json({ error: "Pick a valid delivery time." }, { status: 400 });
  }
  const now = new Date();
  const decision = await withAdminBypass(
    request,
    scheduled
      ? scheduledOrderDecision(venue, scheduled, { isAdmin: false, now })
      : immediateOrderDecision(venue, { isAdmin: false, at: now }),
    (isAdmin) =>
      scheduled
        ? scheduledOrderDecision(venue, scheduled, { isAdmin, now })
        : immediateOrderDecision(venue, { isAdmin, at: now }),
  );
  if (!decision.allowed) {
    return NextResponse.json(
      { error: decision.message ?? closedBanner(canteenId) },
      { status: 400 },
    );
  }

  const mains = itemIds.filter(
    (id) => id.startsWith(`canteen:${canteenId}:`) && !isDrinkAddonItemId(id),
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
      const hasMain = itemIds.some(
        (id) =>
          id === mainId ||
          (id.endsWith(`:${parsed.mainItemId}`) &&
            id.startsWith(`canteen:${canteenId}:`) &&
            !isDrinkAddonItemId(id)),
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
