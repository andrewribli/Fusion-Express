"""Build foodpanda-fusion-catalog.json from Product List Catalog.xlsx."""

from __future__ import annotations

import json
import re
from collections import defaultdict
from pathlib import Path

import openpyxl

ROOT = Path(__file__).resolve().parents[1]
XLSX = ROOT / "Product List Catalog.xlsx"
OUT = ROOT / "packages" / "shared" / "data" / "foodpanda-fusion-catalog.json"
ENRICHMENT = ROOT / "packages" / "shared" / "data" / "parknshop-enrichment.json"
OLD_CATALOG = OUT

MEAT_PARENT_SUBS = {"Meat", "Frozen Meat", "Seafood"}
MEAT_CLASSIFIED = ("Beef", "Pork", "Chicken", "Seafood", "Others")

SECTION_ORDER = ("Groceries", "Fresh Food")

GROCERIES_ALIASES = {
    "groceries",
    "non-refrigerated",
    "non refrigerated",
    "nonrefrigerated",
    "dry",
    "dry goods",
}
FRESH_FOOD_ALIASES = {
    "fresh food",
    "refrigerated",
    "chilled",
    "chilled & refrigerated",
}


def normalize_section(raw: object) -> str:
    label = str(raw).strip() if raw else "Groceries"
    key = " ".join(label.lower().replace("_", " ").replace("-", " ").split())
    compact = key.replace(" ", "")
    if key in GROCERIES_ALIASES or compact in {"nonrefrigerated", "drygoods"}:
        return "Groceries"
    if key in FRESH_FOOD_ALIASES or compact in {"freshfood", "refrigerated"}:
        return "Fresh Food"
    return label or "Groceries"


def normalize_subcategory(raw: object) -> str:
    label = str(raw).strip() if raw else ""
    return label or "Other"


def classify_meat_subcategory(name: str, subcategory: str) -> str:
    if subcategory == "Seafood":
        return "Seafood"
    if subcategory not in MEAT_PARENT_SUBS:
        return subcategory

    n = name.lower()
    seafood = (
        "fish",
        "salmon",
        "prawn",
        "shrimp",
        "seafood",
        "cuttlefish",
        "mackerel",
        "tuna",
        "crab",
        "sardine",
        "cod",
        "halibut",
        "pomfano",
        "fish ball",
        "fishball",
        "fish maw",
        "scallop",
        "abalone",
    )
    if any(k in n for k in seafood):
        return "Seafood"
    beef = ("beef", "angus", "steak", "ribeye", "striploin", "brisket", "patty", "ox ")
    if any(k in n for k in beef):
        return "Beef"
    pork = (
        "pork",
        "bacon",
        "ham",
        "sausage",
        "luncheon",
        "salami",
        "pancetta",
        "bratwurst",
        "streaky",
        "frank",
        "franks",
    )
    if any(k in n for k in pork):
        return "Pork"
    poultry = ("chicken", "duck", "turkey", "quail")
    if any(k in n for k in poultry):
        return "Chicken"
    return "Others"


def normalize_cache_key(name: str) -> str:
    return " ".join(re.sub(r"[^a-z0-9]+", " ", name.lower()).split())


def load_enrichment() -> dict[str, dict]:
    if not ENRICHMENT.exists():
        return {}
    data = json.loads(ENRICHMENT.read_text(encoding="utf-8"))
    return data.get("items") or {}


def parse_weight(raw: object) -> float | None:
    if raw is None:
        return None
    m = re.search(r"(\d+(?:\.\d+)?)\s*(kg|g|ml|l)\b", str(raw).strip(), re.I)
    if not m:
        return None
    qty = float(m.group(1))
    unit = m.group(2).lower()
    if unit == "g":
        return round(qty / 1000, 3)
    if unit == "kg":
        return round(qty, 3)
    if unit == "ml":
        return round(qty / 1000, 3)
    if unit == "l":
        return round(qty, 3)
    return None


def parse_multibuy(promo: object) -> tuple[float, int] | None:
    if promo is None:
        return None
    m = re.match(r"(\d+(?:\.\d+)?)\s*/\s*(\d+)", str(promo).strip())
    if not m:
        return None
    return float(m.group(1)), int(m.group(2))


def load_old_images() -> dict[str, str]:
    if not OLD_CATALOG.exists():
        return {}
    data = json.loads(OLD_CATALOG.read_text(encoding="utf-8"))
    images: dict[str, str] = {}

    def walk(nodes: list) -> None:
        for node in nodes:
            for item in node.get("items") or []:
                img = item.get("image")
                name = (item.get("name") or "").strip().lower()
                if img and name:
                    images[name] = img
            walk(node.get("subcategories") or [])

    walk(data.get("categories") or [])
    return images


def match_image(name: str, images: dict[str, str]) -> str | None:
    key = name.strip().lower()
    if key in images:
        return images[key]
    for old_name, url in images.items():
        if key in old_name or old_name in key:
            return url
    return None


def main() -> None:
    # Capture images from previous catalog before overwrite.
    images = load_old_images()
    enrichment = load_enrichment()

    wb = openpyxl.load_workbook(XLSX, read_only=True, data_only=True)
    ws = wb["Sheet1"]
    rows = list(ws.iter_rows(values_only=True))

    buckets: dict[str, dict[str, list[dict]]] = defaultdict(lambda: defaultdict(list))
    matched = 0
    enriched_images = 0
    enriched_prices = 0

    for row in rows[1:]:
        if not row or len(row) < 6 or not row[2]:
            continue
        name = str(row[2]).strip()
        brand = str(row[1]).strip() if row[1] else None
        price = row[3]
        category = normalize_section(row[4] if len(row) > 4 else None)
        subcategory = normalize_subcategory(row[5] if len(row) > 5 else None)
        subcategory = classify_meat_subcategory(name, subcategory)
        weight = parse_weight(row[6] if len(row) > 6 else None)
        multibuy = parse_multibuy(row[7] if len(row) > 7 else None)
        image = match_image(name, images)
        enrich = enrichment.get(normalize_cache_key(name), {})
        if enrich.get("image"):
            image = enrich["image"]
            enriched_images += 1
        elif image:
            matched += 1

        item_price = float(price) if price is not None else 0.0
        if enrich.get("price") is not None:
            item_price = float(enrich["price"])
            enriched_prices += 1

        item: dict = {
            "name": name,
            "price": item_price,
            "category": category,
            "subcategory": subcategory,
        }
        if brand:
            item["brand"] = brand
        if image:
            item["image"] = image
        if weight is not None:
            item["weight"] = weight
        if multibuy is not None:
            item["bulkDealPrice"] = multibuy[0]
            item["bulkDealQty"] = multibuy[1]

        buckets[category][subcategory].append(item)

    catalog = {"categories": []}
    for cat_name in SECTION_ORDER:
        subs = buckets.get(cat_name, {})
        node = {"name": cat_name, "subcategories": []}
        for sub_name in sorted(subs.keys(), key=lambda s: (-len(subs[s]), s)):
            node["subcategories"].append(
                {"name": sub_name, "items": subs[sub_name]}
            )
        catalog["categories"].append(node)

    # Keep any unexpected top-level categories from the sheet.
    for cat_name, subs in sorted(buckets.items()):
        if cat_name in SECTION_ORDER:
            continue
        node = {"name": cat_name, "subcategories": []}
        for sub_name in sorted(subs.keys(), key=lambda s: (-len(subs[s]), s)):
            node["subcategories"].append(
                {"name": sub_name, "items": subs[sub_name]}
            )
        catalog["categories"].append(node)

    OUT.write_text(
        json.dumps(catalog, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )
    total = sum(len(v) for c in buckets.values() for v in c.values())
    with_image = sum(
        1
        for c in buckets.values()
        for items in c.values()
        for it in items
        if it.get("image")
    )
    with_price = sum(
        1
        for c in buckets.values()
        for items in c.values()
        for it in items
        if it.get("price", 0) > 0
    )
    meat_counts = {
        sub: len(buckets.get("Fresh Food", {}).get(sub, []))
        + len(buckets.get("Groceries", {}).get(sub, []))
        for sub in MEAT_CLASSIFIED
    }
    print(
        f"Wrote {OUT} ({total} items, {with_image} with images, {with_price} with price)"
    )
    print(
        f"Images: {enriched_images} from enrichment, {matched} from previous catalog"
    )
    print(f"Prices from enrichment: {enriched_prices}")
    print(f"Meat subcategories: {meat_counts}")


if __name__ == "__main__":
    main()
