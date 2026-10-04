"""Merge FoodPanda scrapes into a catalog: every aisle category filled, max 50 each."""

from __future__ import annotations

import json
import re
from collections import defaultdict
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SOURCES = [
    ROOT / "FoodPanda Fusion Data.txt",
    ROOT / "FoodPanda Data2.txt",
]
OUT = ROOT / "packages" / "shared" / "data" / "foodpanda-fusion-catalog.json"
CAP = 50
MEAT_CAP = 100
MAX_LEAF = 20

CATEGORIES = [
    "Meat & Poultry",
    "Seafood",
    "Dairy & Eggs",
    "Frozen Foods",
    "Chilled Drinks",
    "Salads",
    "Household Essentials",
    "Toiletries",
    "Instant Noodles",
    "Rice & Noodles",
    "Drinks",
    "Coffee & Tea",
    "Snacks",
    "Bakery & Bread",
    "Canned Goods",
    "Condiments",
    "Fruits & Vegetables",
    "Other",
]


def first_match(name: str, words: tuple[str, ...]) -> str | None:
    n = name.lower()
    for w in sorted(words, key=len, reverse=True):
        wl = w.lower()
        if " " in wl:
            if wl in n:
                return w
        elif re.search(rf"(?<![a-z0-9]){re.escape(wl)}(?![a-z0-9])", n):
            return w
    return None


def parse_price(raw: str) -> float:
    return round(float(raw), 2)


def usable_image(image: str) -> str | None:
    if not image.startswith("http"):
        return None
    if any(bad in image for bad in ("…", "...", "(index)", "dhme(")):
        return None
    if "foodpanda.dhmedia.io" not in image and "images.deliveryhero.io" not in image:
        return None
    return image


def parse_weight(name: str) -> float | None:
    m = re.search(r"(\d+(?:\.\d+)?)\s*(kg|g|lbs?|oz|ml)\b", name, re.I)
    if not m:
        return None
    qty = float(m.group(1))
    unit = m.group(2).lower()
    if unit == "g":
        return round(qty / 1000, 3)
    if unit == "kg":
        return round(qty, 3)
    if unit.startswith("lb"):
        return round(qty * 0.45359237, 3)
    if unit == "oz":
        return round(qty * 0.028349523125, 3)
    if unit == "ml":
        return round(qty / 1000, 3)
    return None


def parse_file(path: Path) -> list[dict]:
    items: list[dict] = []
    if not path.exists():
        return items
    for line in path.read_text(encoding="utf-8", errors="replace").splitlines():
        if not line or line.startswith("(index)") or line.startswith("index)") or line.startswith("name\t"):
            continue
        parts = line.split("\t")
        if len(parts) < 5:
            continue
        name = parts[1].strip().strip("'").strip('"')
        price_raw = parts[2].strip().strip("'").strip('"')
        image = parts[4].strip().strip("'").strip('"')
        if not name or not re.match(r"^\d+(?:\.\d+)?$", price_raw):
            continue
        items.append(
            {
                "name": re.sub(r"\s+", " ", name).strip(),
                "price": parse_price(price_raw),
                "image": usable_image(image),
                "weight": parse_weight(name),
            }
        )
    return items


def classify(name: str) -> str:
    n = name.lower()

    if first_match(
        n,
        (
            "shampoo",
            "toothpaste",
            "toothbrush",
            "deodorant",
            "pampers",
            "whisper",
            "merries",
            "diaper",
            "face mask",
            "band aid",
            "pregnancy test",
            "body wash",
            "mouthwash",
        ),
    ):
        return "Toiletries"

    if first_match(
        n,
        (
            "tissue",
            "toilet roll",
            "wet wipe",
            "wipes",
            "detergent",
            "laundry",
            "dishwasher",
            "dishwash",
            "floor cleaner",
            "disinfectant",
            "bleach",
            "magiclean",
            "vinda",
            "virjoy",
            "tempo",
            "dettol",
            "clorox",
            "swipe",
            "mr muscle",
            "axe ",
            "finish ",
            "febreze",
            "airwick",
            "sawaday",
            "scotch brite",
            "garbage bag",
            "cling wrap",
            "aluminium foil",
        ),
    ):
        return "Household Essentials"

    if first_match(
        n,
        (
            "ice cream",
            "ice bar",
            "ice cube",
            "haagen",
            "häagen",
            "dreyer",
            "drumstick",
            "melona",
            "yukimi",
            "cornetto",
            "popsicle",
            "frozen",
            "dumpling",
            "wonton",
            "gyoza",
            "shaomai",
            "siu mai",
        ),
    ):
        return "Frozen Foods"

    if first_match(n, ("salad", "coleslaw", "mesclun", "garden salad")):
        return "Salads"

    if first_match(
        n,
        (
            "instant noodle",
            "instant noodles",
            "ramen",
            "ramyun",
            "ndl",
            "cup noodle",
            "bowl noodle",
            "nissin",
            "indomie",
            "demae",
            "de-ma-e",
            "shin ramyun",
            "samyang",
            "spaghetti",
            "penne",
            "fusilli",
            "linguine",
            "pasta",
            "macaroni",
            "barilla",
        ),
    ):
        return "Instant Noodles"

    if first_match(
        n,
        (
            "jasmine rice",
            "fragrant rice",
            "pearl rice",
            "koshihikari",
            "akitakomachi",
            "japonica",
            "sushi rice",
            "hom mali",
        ),
    ) or (
        "rice" in n
        and "kg" in n
        and not first_match(n, ("cracker", "snack", "noodle", "milk", "vinegar"))
    ):
        return "Rice & Noodles"

    if first_match(n, ("udon", "somen", "soba", "vermicelli", "bee hoon", "sau tao")) and not first_match(
        n, ("cup", "instant", "ndl")
    ):
        return "Rice & Noodles"

    if first_match(n, ("coffee", "nescafe", "nescafé", "tea bag", "tea bags", "loose tea")) and not first_match(
        n, ("milk tea", "lemon tea", "ice tea", "drink")
    ):
        return "Coffee & Tea"

    if first_match(
        n,
        (
            "soy sauce",
            "oyster sauce",
            "ketchup",
            "mayonnaise",
            "chilli sauce",
            "chili sauce",
            "hot sauce",
            "vinegar",
            "sesame oil",
            "condiment",
        ),
    ):
        return "Condiments"

    if first_match(
        n,
        (
            "canned",
            "del monte",
            "spam",
            "sardine",
            "tuna in",
            "kernel corn",
            "chickpea",
            "lentil",
            "baked bean",
        ),
    ):
        return "Canned Goods"

    if first_match(n, ("prawn", "shrimp", "salmon", "fish", "crab", "lobster", "seafood")) and not first_match(
        n, ("noodle", "ndl", "sauce", "ball snack")
    ):
        return "Seafood"

    if first_match(n, ("pork", "beef", "chicken", "lamb", "turkey", "duck", "sausage", "bacon", "ham", "meatball")) and not first_match(
        n, ("noodle", "ndl", "egg", "bun")
    ):
        return "Meat & Poultry"

    if first_match(n, ("egg", "eggs", "milk", "yoghurt", "yogurt", "cheese", "butter", "tofu", "yakult")):
        if first_match(n, ("ice cream", "ice bar")):
            return "Frozen Foods"
        return "Dairy & Eggs"

    if first_match(n, ("pocari", "yakult", "vitasoy", "vita ", "minute maid", "chilled")):
        return "Chilled Drinks"

    if first_match(
        n,
        (
            "coke",
            "coca",
            "sprite",
            "fanta",
            "pepsi",
            "juice",
            "soda",
            "beer",
            "wine",
            "water",
            "smoothie",
        ),
    ):
        return "Drinks"

    if first_match(n, ("tea", "coffee", "latte")):
        return "Drinks"

    if first_match(n, ("chip", "biscuit", "cookie", "candy", "chocolate", "cracker", "snack", "kellogg", "cereal")):
        return "Snacks"

    if first_match(n, ("bread", "bun", "cake", "toast", "croissant", "waffle", "bakery")):
        return "Bakery & Bread"

    if first_match(
        n,
        (
            "apple",
            "banana",
            "orange",
            "grape",
            "mango",
            "tomato",
            "lettuce",
            "broccoli",
            "mushroom",
            "vegetable",
            "fruit",
            "onion",
            "carrot",
            "cabbage",
        ),
    ):
        return "Fruits & Vegetables"

    if first_match(n, ("sauce", "spread", "jam", "oil", "peanut butter", "flour", "oat")):
        return "Canned Goods"

    return "Other"


def rank(item: dict) -> tuple:
    return (0 if item.get("image") else 1, item["name"].lower())


def cap_for(main: str) -> int:
    return MEAT_CAP if main == "Meat & Poultry" else CAP


def cap_category(items: list[dict], main: str) -> list[dict]:
    return sorted(items, key=rank)[: cap_for(main)]


def sub_for(main: str, name: str) -> str:
    n = name.lower()
    if main == "Frozen Foods":
        if first_match(n, ("ice cream", "drumstick", "haagen", "dreyer", "cone")):
            return "Ice Cream"
        if first_match(n, ("ice bar", "melona", "stick")):
            return "Ice Bars"
        if first_match(n, ("dumpling", "wonton")):
            return "Dumplings"
        return "Other Frozen"
    if main == "Household Essentials":
        if first_match(n, ("tissue", "toilet", "paper")):
            return "Paper Products"
        if first_match(n, ("laundry", "detergent", "attack")):
            return "Laundry"
        if first_match(n, ("wipe", "disinfectant", "cleaner", "bleach")):
            return "Cleaning Supplies"
        return "Kitchen & Other"
    if main == "Instant Noodles":
        if first_match(n, ("cup", "bowl")):
            return "Cup & Bowl"
        if first_match(n, ("pasta", "spaghetti", "penne")):
            return "Pasta"
        return "Pack Noodles"
    if main == "Rice & Noodles":
        if first_match(n, ("rice",)):
            return "Rice"
        return "Dried Noodles"
    if main == "Seafood":
        return "Seafood"
    if main == "Meat & Poultry":
        if first_match(n, ("chicken", "duck", "turkey")):
            return "Poultry"
        if first_match(n, ("pork",)):
            return "Pork"
        if first_match(n, ("beef", "lamb")):
            return "Beef & Lamb"
        return "Other Meat"
    if main == "Dairy & Eggs":
        if first_match(n, ("egg",)):
            return "Eggs"
        if first_match(n, ("yoghurt", "yogurt")):
            return "Yogurt"
        if first_match(n, ("cheese",)):
            return "Cheese"
        if first_match(n, ("tofu",)):
            return "Tofu"
        return "Milk"
    if main == "Drinks" or main == "Chilled Drinks":
        if first_match(n, ("tea", "coffee")):
            return "Tea & Coffee Drinks"
        if first_match(n, ("juice",)):
            return "Juices"
        if first_match(n, ("beer", "wine")):
            return "Alcohol"
        return "Soft Drinks & Water"
    if main == "Snacks":
        if first_match(n, ("chip",)):
            return "Chips"
        if first_match(n, ("chocolate", "candy")):
            return "Candy"
        return "Other Snacks"
    if main == "Toiletries":
        if first_match(n, ("pampers", "diaper", "merries")):
            return "Diapers"
        return "Personal Care"
    if main == "Fruits & Vegetables":
        if first_match(n, ("apple", "banana", "orange", "grape", "mango", "fruit")):
            return "Fruit"
        return "Vegetables"
    if main == "Canned Goods":
        if first_match(n, ("sauce", "spread", "jam")):
            return "Spreads & Sauces"
        return "Canned & Dry Goods"
    if main == "Condiments":
        return "Sauces & Oils"
    if main == "Coffee & Tea":
        return "Coffee & Tea"
    if main == "Bakery & Bread":
        return "Bakery"
    if main == "Household Essentials":
        return "Household"
    if main == "Salads":
        return "Salads"
    if main == "Rice & Noodles":
        return "Rice & Noodles"
    return "Other"


def split_leaves(label: str, items: list[dict]) -> list[tuple[str, list[dict]]]:
    items = sorted(items, key=lambda x: x["name"].lower())
    if len(items) <= MAX_LEAF:
        return [(label, items)]
    out = []
    total = (len(items) + MAX_LEAF - 1) // MAX_LEAF
    for i in range(0, len(items), MAX_LEAF):
        chunk = items[i : i + MAX_LEAF]
        part = i // MAX_LEAF + 1
        out.append((f"{label} {part}/{total}", chunk))
    return out


def payload(it: dict, sub: str) -> dict:
    out = {
        "name": it["name"],
        "price": it["price"],
        "category": it["category"],
        "subcategory": sub,
    }
    if it.get("image"):
        out["image"] = it["image"]
    if it.get("weight") is not None:
        out["weight"] = it["weight"]
    return out


def fill_empty(buckets: dict[str, list[dict]]) -> None:
    """Move leftovers into aisles that still have nobody."""
    drinks = buckets.get("Drinks", [])
    coffee = []
    rest_drinks = []
    for it in drinks:
        if first_match(it["name"], ("tea", "coffee", "latte", "nescafe")):
            coffee.append(it)
        else:
            rest_drinks.append(it)
    if coffee and not buckets.get("Coffee & Tea"):
        buckets["Coffee & Tea"] = coffee[:CAP]
        buckets["Drinks"] = rest_drinks

    donors = buckets.get("Other", [])
    rules = [
        ("Salads", ("lettuce", "cabbage", "cucumber", "tomato", "vegetable")),
        ("Chilled Drinks", ("ml", "drink", "tea", "juice", "vita")),
        ("Condiments", ("oil", "salt", "sugar", "sauce")),
        ("Rice & Noodles", ("noodle", "rice", "flour")),
        ("Seafood", ("fish", "prawn", "shrimp")),
        ("Meat & Poultry", ("pork", "chicken", "beef")),
    ]
    for dest, kws in rules:
        if buckets.get(dest):
            continue
        moved = []
        keep = []
        for it in donors:
            if first_match(it["name"], kws):
                moved.append(it)
            else:
                keep.append(it)
        if moved:
            buckets[dest] = moved[:CAP]
            donors = keep
    buckets["Other"] = donors


def main() -> None:
    by_name: dict[str, dict] = {}
    for src in SOURCES:
        for row in parse_file(src):
            key = row["name"].casefold()
            prev = by_name.get(key)
            if prev is None or (prev.get("image") is None and row.get("image")):
                by_name[key] = row
    raw = list(by_name.values())

    buckets: dict[str, list[dict]] = defaultdict(list)
    for it in raw:
        cat = classify(it["name"])
        it = {**it, "category": cat}
        buckets[cat].append(it)

    fill_empty(buckets)

    categories = []
    print(f"Parsed {len(raw)} unique products")
    for main in CATEGORIES:
        pool = cap_category(buckets.get(main, []), main)
        if not pool:
            print(f"  {main}: 0 (still empty)")
            continue
        by_sub: dict[str, list[dict]] = defaultdict(list)
        for it in pool:
            by_sub[sub_for(main, it["name"])].append(it)
        subcats = []
        for sub_name, sub_items in sorted(by_sub.items(), key=lambda x: (-len(x[1]), x[0])):
            if len(sub_items) <= MAX_LEAF:
                subcats.append(
                    {
                        "name": sub_name,
                        "items": [payload(it, sub_name) for it in sub_items],
                    }
                )
            else:
                nested = []
                for label, group in split_leaves(sub_name, sub_items):
                    nested.append(
                        {
                            "name": label,
                            "items": [payload(it, label) for it in group],
                        }
                    )
                subcats.append({"name": sub_name, "subcategories": nested})
        categories.append({"name": main, "subcategories": subcats})
        print(f"  {main}: {len(pool)}")

    OUT.write_text(
        json.dumps({"categories": categories}, indent=2, ensure_ascii=False) + "\n",
        encoding="utf-8",
    )
    print(f"Wrote {OUT}")


if __name__ == "__main__":
    main()
