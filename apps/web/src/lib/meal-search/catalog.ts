/**
 * Campus dish indexes — loaded once from local TypeScript menus (not Firestore).
 * Firestore `canteens`/`menu` exists for seeds but live storefronts use these catalogs.
 *
 * TODO: if a campus index exceeds ~500 dishes, move matching to a server query
 * (no Elasticsearch / Algolia / new collection — keep filtering in-app).
 */

import { MENU as BF_MENU } from "@/data/canteen/bf-menu";
import { RESTAURANTS as CUHK_RESTAURANTS } from "@/data/canteen/restaurants";
import { SIMPLE_MENUS } from "@/data/canteen/simple-menu";
import { UC_MENU } from "@/data/canteen/uc-menu";
import { getCanteenMenu } from "@/ptero/config/canteen/menus";
import { RESTAURANTS as CITYU_RESTAURANTS } from "@/ptero/config/canteen/restaurants";
import { isCanteenOrderable } from "@/lib/meal-search/open-status";
import type { MealSearchCampus, SearchableDish } from "@/lib/meal-search/types";

let cuhkCache: SearchableDish[] | null = null;
let cityuCache: SearchableDish[] | null = null;

function pushDish(
  out: SearchableDish[],
  campus: MealSearchCampus,
  dish: Omit<SearchableDish, "key" | "campus" | "orderable">,
) {
  out.push({
    ...dish,
    key: `${dish.canteenId}:${dish.itemId}`,
    campus,
    orderable: isCanteenOrderable(campus, dish.canteenId),
  });
}

function buildCuhkIndex(): SearchableDish[] {
  const out: SearchableDish[] = [];
  const meta = new Map(
    CUHK_RESTAURANTS.map((r) => [r.id, r] as const),
  );

  const bf = meta.get("benjamin-franklin");
  if (bf) {
    for (const item of BF_MENU) {
      pushDish(out, "cuhk", {
        itemId: item.id,
        canteenId: bf.id,
        canteenName: bf.name,
        canteenShortName: bf.shortName,
        name: item.name,
        description: item.description ?? "",
        category: item.category,
        price: item.price,
        imageUrl: item.image || null,
      });
    }
  }

  for (const item of UC_MENU) {
    const r = meta.get("uc-canteen");
    if (!r) break;
    pushDish(out, "cuhk", {
      itemId: item.id,
      canteenId: r.id,
      canteenName: r.name,
      canteenShortName: r.shortName,
      name: item.nameZh ? `${item.name} (${item.nameZh})` : item.name,
      description: item.description ?? "",
      category: item.category,
      price: item.price,
      imageUrl: item.image ?? null,
    });
  }

  for (const [restaurantId, items] of Object.entries(SIMPLE_MENUS)) {
    const r = meta.get(restaurantId as (typeof CUHK_RESTAURANTS)[number]["id"]);
    if (!r) continue;
    for (const item of items) {
      pushDish(out, "cuhk", {
        itemId: item.id,
        canteenId: r.id,
        canteenName: r.name,
        canteenShortName: r.shortName,
        name: item.name,
        description: item.description ?? "",
        category: item.category,
        price: item.price,
        imageUrl: item.image || null,
      });
    }
  }

  // TODO: if count exceeds 500 for a server query.
  return out;
}

function buildCityuIndex(): SearchableDish[] {
  const out: SearchableDish[] = [];
  for (const r of CITYU_RESTAURANTS) {
    // Never mix campuses — CityU index only.
    for (const item of getCanteenMenu(r.id)) {
      pushDish(out, "cityu", {
        itemId: item.id,
        canteenId: r.id,
        canteenName: r.name,
        canteenShortName: r.shortName,
        name: item.name,
        description: item.description ?? "",
        category: item.category,
        price: item.price,
        imageUrl: item.imageUrl || null,
      });
    }
  }
  // TODO: if count exceeds 500 for a server query.
  return out;
}

/** Client-side load once; filter in memory. */
export function getCampusDishes(campus: MealSearchCampus): SearchableDish[] {
  if (campus === "cuhk") {
    if (!cuhkCache) cuhkCache = buildCuhkIndex();
    return cuhkCache;
  }
  if (!cityuCache) cityuCache = buildCityuIndex();
  return cityuCache;
}

export function campusMenuHref(
  campus: MealSearchCampus,
  canteenId: string,
  itemId: string,
): string {
  const base =
    campus === "cuhk" ? `/canteen/${canteenId}` : `/cityu/canteen/${canteenId}`;
  const params = new URLSearchParams({
    item: itemId,
    open: "1",
  });
  return `${base}?${params.toString()}`;
}
