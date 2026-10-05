"""Organize FoodPanda Fusion Data.txt into a nested category catalog."""

from __future__ import annotations

import json
import re
from collections import defaultdict
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SRC = ROOT / "FoodPanda Fusion Data.txt"
OUT = ROOT / "packages" / "shared" / "data" / "foodpanda-fusion-catalog.json"
ASSIGNMENTS = ROOT / "packages" / "shared" / "data" / "foodpanda-fusion-assignments.json"

LB_KG = 0.45359237
OZ_KG = 0.028349523125

MAIN_ORDER = [
    "Meat & Seafood",
    "Household Essentials",
    "Snacks",
    "Drinks",
    "Instant Noodles & Pasta",
    "Canned & Packaged Goods",
    "Dairy & Eggs",
    "Frozen Foods",
    "Bakery & Bread",
    "Fruits & Vegetables",
    "Personal Care",
    "Other",
]

def parse_rows() -> list[dict]:
    text = SRC.read_text(encoding="utf-8", errors="replace")
    by_name: dict[str, dict] = {}
    for line in text.splitlines():
        if not line or line.startswith("(index)") or line.startswith("name\t"):
            continue
        parts = line.split("\t")
        if len(parts) < 5:
            continue
        name = parts[1].strip().strip("'").strip('"')
        price_raw = parts[2].strip().strip("'").strip('"')
        image = parts[4].strip().strip("'").strip('"')
        if not name or not re.match(r"^\d+(?:\.\d+)?$", price_raw):
            continue
        key = name.casefold()
        row = {
            "name": re.sub(r"\s+", " ", name).strip(),
            "price": parse_price(price_raw),
            "image": usable_image(image),
            "weight": parse_weight(name),
        }
        existing = by_name.get(key)
        if existing is None or (existing.get("image") is None and row.get("image")):
            by_name[key] = row
    return list(by_name.values())


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
        return round(qty * LB_KG, 3)
    if unit == "oz":
        return round(qty * OZ_KG, 3)
    if unit == "ml":
        return round(qty / 1000, 3)
    return None


def any_kw(name: str, *words: str) -> bool:
    n = name.lower()
    return any(w.lower() in n for w in words)


def has_word(name: str, *words: str) -> bool:
    return first_match(name, words) is not None


def first_match(name: str, words: tuple[str, ...] | list[str]) -> str | None:
    n = name.lower()
    for w in sorted(words, key=len, reverse=True):
        wl = w.lower().strip()
        if not wl:
            continue
        if " " in wl:
            if wl in n:
                return w
        elif re.search(rf"(?<![a-z0-9]){re.escape(wl)}(?![a-z0-9])", n):
            return w
    return None


NOODLE_WORDS = (
    "instant noodles",
    "instant noodle",
    "noodles",
    "noodle",
    "pasta",
    "ramen",
    "ramyun",
    "udon",
    "spaghetti",
    "macaroni",
    "linguine",
    "fusilli",
    "penne",
    "capellini",
    "lasagna",
    "somen",
    "soba",
    "vermicelli",
    "verm",
    "ndl",
    "bee hoon",
    "ho fan",
    "yi mein",
    "laksa",
    "pho",
    "chifferi",
    "angelhair",
)

MEAT_WORDS = (
    "meatball",
    "sausage",
    "chicken",
    "turkey",
    "salmon",
    "prawn",
    "shrimp",
    "lobster",
    "bacon",
    "beef",
    "pork",
    "lamb",
    "duck",
    "fish",
    "crab",
    "ham",
)

SNACK_WORDS = (
    "biscuit",
    "biscuits",
    "cookie",
    "cookies",
    "cracker",
    "chips",
    "chip",
    "crisps",
    "crisp",
    "candy",
    "gummy",
    "chocolate",
)

HOUSEHOLD_WORDS = (
    "toilet roll",
    "kitchen towel",
    "paper towel",
    "wet wipe",
    "garbage bag",
    "trash bag",
    "cling wrap",
    "aluminium foil",
    "aluminum foil",
    "dishwasher",
    "detergent",
    "laundry",
    "fabric softener",
    "disinfectant",
    "tissue",
    "wipes",
    "bleach",
)

PERSONAL_WORDS = (
    "toothpaste",
    "toothbrush",
    "mouthwash",
    "shampoo",
    "conditioner",
    "body wash",
    "shower gel",
    "deodorant",
    "face mask",
    "band aid",
    "pregnancy test",
    "pampers",
    "whisper",
    "merries",
    "diaper",
    "nappy",
    "tampon",
    "sanitary",
)

DAIRY_WORDS = (
    "yoghurt",
    "yogurt",
    "yakult",
    "cheese",
    "butter",
    "soymilk",
    "soy milk",
    "eggs",
    "egg",
    "milk",
    "tofu",
)

DRINK_WORDS = (
    "coconut water",
    "green tea",
    "ice tea",
    "milk tea",
    "sparkling",
    "smoothie",
    "coffee",
    "juice",
    "soda",
    "cola",
    "coke",
    "pepsi",
    "sprite",
    "fanta",
    "beer",
    "wine",
    "latte",
    "tea",
    "water",
)

BAKERY_WORDS = (
    "baguette",
    "croissant",
    "bread",
    "toast",
    "muffin",
    "waffle",
    "cake",
    "bun",
)

PRODUCE_WORDS = (
    "strawberry",
    "blueberry",
    "watermelon",
    "asparagus",
    "mushroom",
    "broccoli",
    "spinach",
    "lettuce",
    "avocado",
    "cucumber",
    "vegetable",
    "banana",
    "orange",
    "tomato",
    "carrot",
    "cabbage",
    "garlic",
    "ginger",
    "onion",
    "apple",
    "grape",
    "mango",
    "lemon",
    "peach",
    "celery",
    "fruit",
    "pear",
    "kiwi",
    "lime",
    "corn",
)

CANNED_WORDS = (
    "peanut butter",
    "soy sauce",
    "oyster sauce",
    "olive oil",
    "canola oil",
    "cooking oil",
    "ketchup",
    "mayonnaise",
    "vinegar",
    "canned",
    "sauce",
    "flour",
    "jam",
    "oil",
    "rice",
)


def is_noodle_or_pasta(name: str) -> bool:
    return first_match(name, NOODLE_WORDS) is not None and not has_word(name, "toothpaste")


def classify(name: str) -> tuple[str, str]:
    """Return (category, why) using only tokens in the product name."""
    if is_noodle_or_pasta(name):
        token = first_match(name, NOODLE_WORDS) or "noodle"
        return (
            "Instant Noodles & Pasta",
            f"Name contains '{token}', which maps to Instant Noodles & Pasta.",
        )

    snack = first_match(name, SNACK_WORDS)
    if snack and not has_word(name, "milk", "yoghurt", "yogurt"):
        return "Snacks", f"Name contains '{snack}', which maps to Snacks."

    household = first_match(name, HOUSEHOLD_WORDS)
    if household and not first_match(name, SNACK_WORDS):
        return (
            "Household Essentials",
            f"Name contains '{household}', which maps to Household Essentials.",
        )

    personal = first_match(name, PERSONAL_WORDS)
    if personal:
        return "Personal Care", f"Name contains '{personal}', which maps to Personal Care."

    if first_match(name, ("ice cream", "frozen")):
        token = first_match(name, ("ice cream", "frozen"))
        return "Frozen Foods", f"Name contains '{token}', which maps to Frozen Foods."

    dairy = first_match(name, DAIRY_WORDS)
    if dairy:
        return "Dairy & Eggs", f"Name contains '{dairy}', which maps to Dairy & Eggs."

    meat = first_match(name, MEAT_WORDS)
    if meat:
        return (
            "Meat & Seafood",
            f"Name contains '{meat}', which is on the Meat & Seafood keyword list.",
        )

    drink = first_match(name, DRINK_WORDS)
    if drink and not (drink.lower() == "water" and "watermelon" in name.lower()):
        return "Drinks", f"Name contains '{drink}', which maps to Drinks."

    bakery = first_match(name, BAKERY_WORDS)
    if bakery:
        return "Bakery & Bread", f"Name contains '{bakery}', which maps to Bakery & Bread."

    produce = first_match(name, PRODUCE_WORDS)
    if produce and not first_match(name, SNACK_WORDS) and not has_word(name, "juice", "jam", "chip", "chips"):
        return (
            "Fruits & Vegetables",
            f"Name contains '{produce}', which maps to Fruits & Vegetables.",
        )

    canned = first_match(name, CANNED_WORDS)
    if canned:
        return (
            "Canned & Packaged Goods",
            f"Name contains '{canned}', which maps to Canned & Packaged Goods.",
        )

    return "Other", "Name does not clearly match any category keyword."


def classify_main(name: str) -> str:
    return classify(name)[0]


def classify_sub(main: str, name: str) -> str:
    n = name.lower()

    if main == "Meat & Seafood":
        if any_kw(n, "prawn", "shrimp", "salmon", "fish", "crab", "lobster"):
            return "Seafood"
        if any_kw(n, "sausage", "bacon", "ham"):
            return "Sausages & Processed"
        if any_kw(n, "chicken", "duck", "turkey"):
            return "Poultry"
        if any_kw(n, "beef", "lamb"):
            return "Beef & Lamb"
        if any_kw(n, "pork"):
            return "Pork"
        if any_kw(n, "meatball"):
            return "Sausages & Processed"
        return "Other Meat"

    if main == "Household Essentials":
        if any_kw(n, "detergent", "laundry", "softener", "bleach"):
            return "Laundry"
        if any_kw(n, "wipe", "clorox", "dettol", "walch", "cleanser", "disinfectant", "cif", "magiclean", "dishwash", "axion", "axe"):
            return "Cleaning Supplies"
        if any_kw(n, "foil", "cling", "bag", "glad", "wrap"):
            return "Kitchenware"
        if any_kw(n, "tissue", "toilet", "towel", "paper", "tempo", "vinda", "virjoy", "andrex"):
            return "Paper Products"
        return "Household Other"

    if main == "Drinks":
        if any_kw(n, "beer", "wine", "cabernet", "heineken", "asahi", "carlsberg"):
            return "Alcohol"
        if any_kw(n, "red bull", "monster", "lucozade", "energy", "gatorade", "pocari"):
            return "Energy Drinks"
        if any_kw(n, "juice", "nectar", "minute maid", "oasis", "ribena"):
            return "Juices"
        if any_kw(n, "water", "evian", "perrier", "sparkling", "distilled", "dasani"):
            return "Water"
        if any_kw(n, "tea", "coffee", "latte", "oolong"):
            return "Tea & Coffee"
        if any_kw(n, "coke", "coca", "pepsi", "sprite", "fanta", "soda", "7-up", "schweppes"):
            return "Soft Drinks"
        return "Other Drinks"

    if main == "Snacks":
        if any_kw(n, "kellogg", "cereal", "muesli", "granola", "frosties", "coco pops"):
            return "Cereal"
        if any_kw(n, "chip", "crisp", "pringles", "lays", "calbee", "potato"):
            return "Chips"
        if any_kw(n, "biscuit", "cookie", "cracker", "wafer", "oreo"):
            return "Biscuits"
        if any_kw(n, "candy", "gummy", "gummi", "chocolate", "kitkat", "choco pie"):
            return "Candy"
        if any_kw(n, "nut", "almond", "cashew", "pistachio", "peanut", "walnut"):
            return "Nuts"
        if any_kw(n, "raisin", "dried"):
            return "Dried Fruit"
        return "Other Snacks"

    if main == "Dairy & Eggs":
        if has_word(n, "egg", "eggs"):
            return "Eggs"
        if any_kw(n, "yoghurt", "yogurt", "yakult"):
            return "Yogurt"
        if any_kw(n, "cheese", "butter"):
            return "Cheese & Butter"
        if any_kw(n, "tofu", "bean curd", "beancurd"):
            return "Tofu"
        return "Milk"

    if main == "Frozen Foods":
        if any_kw(n, "ice cream", "magnum", "cornetto", "haagen"):
            return "Ice Cream"
        if any_kw(n, "pizza", "bagel", "waffle", "pancake", "tortilla", "pastry", "bread", "cheesecake"):
            return "Frozen Bakery"
        if any_kw(n, "nugget", "wing", "chicken", "fish finger"):
            return "Frozen Meat"
        if any_kw(n, "dumpling", "xiao long", "shao mai", "siu mai", "dim sum", "tong yuen", "bun", "cheong fun"):
            return "Dim Sum & Dumplings"
        return "Other Frozen"

    if main == "Instant Noodles & Pasta":
        if any_kw(
            n,
            "pasta",
            "spaghetti",
            "macaroni",
            "linguine",
            "fusilli",
            "penne",
            "lasagna",
            "barilla",
            "de cecco",
            "san remo",
            "la molisana",
            "colavita",
            "capellini",
            "chifferi",
        ):
            return "Pasta"
        if any_kw(n, "udon", "pho", "vermicelli", "bee hoon", "ho fan", "somen", "soba", "sau tao"):
            return "Asian Noodles"
        return "Instant Noodles"

    if main == "Canned & Packaged Goods":
        if any_kw(n, "sauce", "ketchup", "mayo", "oil", "vinegar", "soy"):
            return "Sauces & Oils"
        if any_kw(n, "rice", "flour", "sugar", "salt", "cereal", "oat"):
            return "Pantry Staples"
        if any_kw(n, "can", "tin", "spam", "tuna", "sardine", "soup"):
            return "Canned Food"
        return "Packaged Other"

    if main == "Bakery & Bread":
        if any_kw(n, "cake", "muffin", "croissant", "pastry"):
            return "Pastries"
        return "Bread"

    if main == "Fruits & Vegetables":
        if any_kw(n, "apple", "banana", "orange", "grape", "berry", "mango", "pear", "melon", "kiwi", "fruit"):
            return "Fruit"
        return "Vegetables"

    if main == "Personal Care":
        if any_kw(n, "shampoo", "conditioner", "body wash", "shower", "soap"):
            return "Hair & Body"
        if any_kw(n, "toothpaste", "toothbrush", "mouthwash"):
            return "Oral Care"
        return "Personal Other"

    return "General"


def classify_leaf(main: str, sub: str, name: str) -> str | None:
    n = name.lower()
    if main == "Meat & Seafood":
        if sub == "Pork":
            if any_kw(n, "belly"):
                return "Pork Belly"
            if any_kw(n, "chop", "collar"):
                return "Pork Chops"
            if any_kw(n, "minced", "mince"):
                return "Minced Pork"
            if any_kw(n, "rib"):
                return "Pork Ribs"
            return "Other Pork"
        if sub == "Beef & Lamb":
            if any_kw(n, "minced", "mince"):
                return "Minced Beef"
            if any_kw(n, "steak", "ribeye", "sirloin", "rump"):
                return "Steaks"
            if any_kw(n, "lamb"):
                return "Lamb"
            return "Other Beef"
        if sub == "Poultry":
            if any_kw(n, "wing"):
                return "Chicken Wings"
            if any_kw(n, "breast"):
                return "Chicken Breast"
            if any_kw(n, "thigh", "drum"):
                return "Thighs & Drumsticks"
            if any_kw(n, "duck"):
                return "Duck"
            return "Other Poultry"
        if sub == "Seafood":
            if any_kw(n, "prawn", "shrimp"):
                return "Prawns"
            if any_kw(n, "salmon"):
                return "Salmon"
            if any_kw(n, "ball"):
                return "Fish Balls"
            return "Other Seafood"
        return sub
    if main == "Dairy & Eggs" and sub == "Eggs":
        if any_kw(n, "quail"):
            return "Quail Eggs"
        if any_kw(n, "salted", "preserved"):
            return "Processed Eggs"
        if any_kw(n, "brown"):
            return "Brown Eggs"
        if any_kw(n, "white"):
            return "White Eggs"
        return "Other Eggs"
    if main == "Dairy & Eggs" and sub == "Milk":
        if any_kw(n, "chocolate", "choco", "strawberry", "mango"):
            return "Flavoured Milk"
        if any_kw(n, "soy", "almond", "oat"):
            return "Plant Milk"
        if any_kw(n, "skim"):
            return "Skimmed Milk"
        return "Fresh & UHT Milk"
    if main == "Frozen Foods" and sub == "Dim Sum & Dumplings":
        if any_kw(n, "wonton"):
            return "Wontons"
        if any_kw(n, "gyoza"):
            return "Gyoza"
        if any_kw(n, "dumpling"):
            return "Dumplings"
        return "Other Dim Sum"
    if main == "Instant Noodles & Pasta" and sub == "Instant Noodles":
        if any_kw(n, "cup", "bowl"):
            return "Cup & Bowl Noodles"
        if any_kw(n, "doll"):
            return "Doll"
        return "Pack Noodles"
    if main == "Instant Noodles & Pasta" and sub == "Pasta":
        if any_kw(n, "spaghetti", "linguine", "capellini"):
            return "Long Pasta"
        if any_kw(n, "penne", "fusilli", "macaroni", "chifferi", "elbow"):
            return "Short Pasta"
        return "Other Pasta"
    if main == "Canned & Packaged Goods" and sub == "Packaged Other":
        if any_kw(n, "spread", "jam", "butter", "syrup", "honey", "preserve"):
            return "Spreads"
        return "Other Packaged"
    return sub


def format_item(item: dict, category: str, subcategory: str) -> dict:
    _main, why = classify(item["name"])
    out = {
        "name": item["name"],
        "price": item["price"],
        "category": category,
        "subcategory": subcategory,
        "why": why,
    }
    if item.get("image"):
        out["image"] = item["image"]
    if item.get("weight") is not None:
        out["weight"] = item["weight"]
    return out


def build_tree(items: list[dict]) -> dict:
    buckets: dict[str, list[dict]] = defaultdict(list)
    for item in items:
        main = classify_main(item["name"])
        buckets[main].append(item)

    categories = []
    for main in MAIN_ORDER:
        pool = buckets.get(main, [])
        if not pool:
            continue

        by_sub: dict[str, list[dict]] = defaultdict(list)
        for item in pool:
            by_sub[classify_sub(main, item["name"])].append(item)

        subcats = []
        for sub_name, sub_items in sorted(by_sub.items(), key=lambda x: (-len(x[1]), x[0])):
            if len(sub_items) > 20:
                by_leaf: dict[str, list[dict]] = defaultdict(list)
                for item in sub_items:
                    leaf = classify_leaf(main, sub_name, item["name"]) or sub_name
                    by_leaf[leaf].append(item)
                if len(by_leaf) == 1:
                    subcats.append(
                        {
                            "name": sub_name,
                            "items": [format_item(it, main, sub_name) for it in sub_items],
                        }
                    )
                    continue
                nested = []
                for leaf_name, leaf_items in sorted(
                    by_leaf.items(), key=lambda x: (-len(x[1]), x[0])
                ):
                    nested.append(
                        {
                            "name": leaf_name,
                            "items": [
                                format_item(it, main, leaf_name) for it in leaf_items
                            ],
                        }
                    )
                subcats.append({"name": sub_name, "subcategories": nested})
            else:
                subcats.append(
                    {
                        "name": sub_name,
                        "items": [format_item(it, main, sub_name) for it in sub_items],
                    }
                )

        entry: dict = {"name": main, "subcategories": subcats}
        categories.append(entry)

    return {"categories": categories}


def count_nodes(data: dict) -> tuple[int, int, int, int]:
    cats = data["categories"]
    sub_n = 0
    leaf_n = 0
    item_n = 0

    def walk_sub(node: dict) -> None:
        nonlocal sub_n, leaf_n, item_n
        if "subcategories" in node and "items" not in node:
            sub_n += 1
            for child in node["subcategories"]:
                walk_sub(child)
        elif "items" in node:
            leaf_n += 1
            item_n += len(node["items"])

    for cat in cats:
        for sub in cat["subcategories"]:
            walk_sub(sub)
    return len(cats), sub_n, leaf_n, item_n


def main() -> None:
    raw = parse_rows()
    assignments = []
    for item in raw:
        category, why = classify(item["name"])
        assignments.append({"name": item["name"], "category": category, "why": why})
    data = build_tree(raw)
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps(data, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    ASSIGNMENTS.write_text(
        json.dumps(assignments, indent=2, ensure_ascii=False) + "\n", encoding="utf-8"
    )
    c, s, l, i = count_nodes(data)
    print(f"Parsed {len(raw)} unique products from {SRC.name}")
    print(f"Wrote {OUT}")
    print(f"Wrote {ASSIGNMENTS}")
    print(f"Main categories: {c}")
    print(f"Nested subcategory groups: {s}")
    print(f"Leaf groups: {l}")
    print(f"Items in catalog: {i}")
    from collections import Counter

    counts = Counter(a["category"] for a in assignments)
    for cat in MAIN_ORDER:
        print(f"  - {cat}: {counts.get(cat, 0)}")
    print("\nSample assignments:")
    for row in assignments[:12]:
        print(f"  [{row['category']}] {row['name']}")
        print(f"    {row['why']}")


if __name__ == "__main__":
    main()
