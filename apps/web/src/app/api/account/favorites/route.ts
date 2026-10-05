import { NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { getCampusDishes } from "@/lib/meal-search/catalog";
import { getCatalogMenuItems } from "@/lib/catalog-products";
import {
  MAX_FAVORITES,
  normalizeFavoriteIds,
} from "@/lib/favorites";
import { collectionName } from "@/lib/constants";
import {
  AdminAuthError,
  getAdminDb,
  requireAuthFromRequest,
} from "@/lib/firebase-admin";

function knownCanteenIds(): Set<string> {
  const ids = new Set<string>();
  for (const campus of ["cuhk", "cityu"] as const) {
    for (const dish of getCampusDishes(campus)) {
      ids.add(`canteen:${dish.canteenId}:${dish.itemId}`);
      ids.add(`${dish.canteenId}:${dish.itemId}`);
    }
  }
  return ids;
}

let canteenCache: Set<string> | null = null;
let catalogCache: Set<string> | null = null;

function knownCatalogIds(): Set<string> {
  if (!catalogCache) {
    catalogCache = new Set(getCatalogMenuItems().map((item) => item.id));
  }
  return catalogCache;
}

function knownMenuIds(): Set<string> {
  if (!canteenCache) canteenCache = knownCanteenIds();
  return canteenCache;
}

async function itemExists(
  db: FirebaseFirestore.Firestore,
  itemId: string,
): Promise<boolean> {
  if (knownMenuIds().has(itemId) || knownCatalogIds().has(itemId)) {
    return true;
  }
  const products = collectionName("products");
  const snap = await db.collection(products).doc(itemId).get();
  if (snap.exists) return true;
  const byId = await db
    .collection(products)
    .where("id", "==", itemId)
    .limit(1)
    .get();
  return !byId.empty;
}

async function readFavorites(
  db: FirebaseFirestore.Firestore,
  uid: string,
): Promise<string[]> {
  const snap = await db.collection(collectionName("users")).doc(uid).get();
  return normalizeFavoriteIds(snap.data()?.favorites);
}

/**
 * GET — current favorites for the signed-in user.
 * POST — { itemId, action?: "toggle" | "add" | "remove" }
 */
export async function GET(request: Request) {
  try {
    const auth = await requireAuthFromRequest(request);
    const db = getAdminDb();
    if (!db) {
      return NextResponse.json({ error: "Service unavailable." }, { status: 503 });
    }
    const favorites = await readFavorites(db, auth.uid);
    return NextResponse.json({ favorites });
  } catch (err) {
    if (err instanceof AdminAuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    console.error("favorites get failed", err);
    return NextResponse.json({ error: "Could not load favorites." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const auth = await requireAuthFromRequest(request);
    const db = getAdminDb();
    if (!db) {
      return NextResponse.json({ error: "Service unavailable." }, { status: 503 });
    }

    const body = (await request.json()) as {
      itemId?: unknown;
      action?: unknown;
    };
    const itemId =
      typeof body.itemId === "string" ? body.itemId.trim() : "";
    if (!itemId || itemId.length > 200) {
      return NextResponse.json({ error: "itemId is required." }, { status: 400 });
    }

    const action =
      body.action === "add" || body.action === "remove" || body.action === "toggle"
        ? body.action
        : "toggle";

    const exists = await itemExists(db, itemId);
    if (!exists) {
      return NextResponse.json({ error: "Unknown menu item." }, { status: 400 });
    }

    const ref = db.collection(collectionName("users")).doc(auth.uid);
    const current = await readFavorites(db, auth.uid);
    const has = current.includes(itemId);
    let next = current;

    if (action === "add" || (action === "toggle" && !has)) {
      if (has) {
        return NextResponse.json({ favorites: current, favorited: true });
      }
      if (current.length >= MAX_FAVORITES) {
        return NextResponse.json(
          { error: `You can save up to ${MAX_FAVORITES} favorites.` },
          { status: 400 },
        );
      }
      next = [...current, itemId];
    } else {
      next = current.filter((id) => id !== itemId);
    }

    await ref.set(
      {
        favorites: next,
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true },
    );

    return NextResponse.json({
      favorites: next,
      favorited: next.includes(itemId),
    });
  } catch (err) {
    if (err instanceof AdminAuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    console.error("favorites write failed", err);
    return NextResponse.json(
      { error: "Couldn't save favorite. Try again." },
      { status: 500 },
    );
  }
}
