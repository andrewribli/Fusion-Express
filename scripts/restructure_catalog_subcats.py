"""Re-bucket foodpanda-fusion-catalog.json so no leaf has more than MAX_LEAF items."""

from __future__ import annotations

import json
import re
from collections import defaultdict
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SRC = ROOT / "packages" / "shared" / "data" / "foodpanda-fusion-catalog.json"
OUT = SRC
MAX_LEAF = 20

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


def flatten(catalog: dict) -> list[dict]:
    items: list[dict] = []

    def walk(nodes: list, main: str) -> None:
        for node in nodes:
            for it in node.get("items") or []:
                row = {
                    "name": it["name"],
                    "price": it["price"],
                    "category": main,
                }
                if it.get("image"):
                    row["image"] = it["image"]
                if it.get("weight") is not None:
                    row["weight"] = it["weight"]
                items.append(row)
            walk(node.get("subcategories") or [], main)

    for cat in catalog.get("categories") or []:
        walk(cat.get("subcategories") or [], cat["name"])
    return items


def meat_sub(name: str) -> str:
    n = name.lower()
    if first_match(
        n,
        (
            "dumpling",
            "wonton",
            "shaomai",
            "shao mai",
            "siu mai",
            "xiao long",
            "cheong fun",
            "bun",
        ),
    ):
        return "Other Meat"
    if first_match(n, ("sausage", "bacon", "ham", "meatball")):
        return "Sausages & Processed"
    if first_match(n, ("prawn", "shrimp", "salmon", "fish", "crab", "lobster")):
        return "Seafood"
    if first_match(n, ("chicken", "duck", "turkey", "wing", "wings")):
        return "Poultry"
    if first_match(n, ("pork",)):
        return "Pork"
    if first_match(n, ("beef", "lamb")):
        return "Beef & Lamb"
    return "Other Meat"


def meat_leaf(sub: str, name: str) -> str:
    n = name.lower()
    if sub == "Poultry":
        if first_match(n, ("wing", "wings")):
            return "Chicken Wings"
        if first_match(n, ("nugget",)):
            return "Nuggets"
        if first_match(n, ("salad chicken", "amatake")):
            return "Salad Chicken"
        if first_match(n, ("duck", "turkey")):
            return "Duck & Turkey"
        return "Other Poultry"
    if sub == "Seafood":
        if first_match(n, ("prawn", "shrimp")):
            return "Prawns & Shrimp"
        if first_match(n, ("salmon",)):
            return "Salmon"
        if first_match(n, ("ball",)):
            return "Fish Balls"
        if first_match(n, ("crab", "lobster")):
            return "Crab & Lobster"
        return "Other Seafood"
    if sub == "Pork":
        if first_match(n, ("dumpling", "wonton", "shaomai", "bun")):
            return "Pork Dumplings & Buns"
        if first_match(n, ("belly", "rib", "chop")):
            return "Pork Cuts"
        return "Other Pork"
    if sub == "Beef & Lamb":
        if first_match(n, ("dumpling", "ball")):
            return "Beef Dumplings & Balls"
        return "Beef & Lamb Cuts"
    if sub == "Other Meat":
        if first_match(n, ("wonton",)):
            return "Wontons"
        if first_match(n, ("dumpling",)):
            return "Dumplings"
        if first_match(n, ("shaomai", "shao mai", "siu mai")):
            return "Siu Mai"
        if first_match(n, ("bun", "cheong fun")):
            return "Buns & Rice Rolls"
        return "Other Meat Items"
    return sub


def noodle_sub(name: str) -> str:
    n = name.lower()
    if first_match(
        n,
        (
            "spaghetti",
            "penne",
            "fusilli",
            "macaroni",
            "linguine",
            "lasagna",
            "capellini",
            "chifferi",
            "barilla",
            "de cecco",
            "sanremo",
            "san remo",
            "pasta",
        ),
    ) and not first_match(n, ("cup", "bowl", "instant")):
        return "Pasta"
    if first_match(n, ("pho", "laksa", "broth", "soup")) and not first_match(
        n, ("cup", "bowl", "ndl", "noodle")
    ):
        return "Noodle Soups & Broths"
    if first_match(n, ("tangle", "stir cup", "stir fried", "stired fried")):
        return "Instant Pasta"
    if first_match(n, ("udon", "somen", "soba", "vermicelli", "verm", "bee hoon", "ho fan")):
        return "Asian Noodles"
    if first_match(n, ("cup", "bowl", "mini cup")):
        return "Cup & Bowl Noodles"
    if first_match(n, ("sau tao",)) and not first_match(n, ("instant", "ndl", "demae")):
        return "Asian Noodles"
    return "Pack Noodles"


def noodle_leaf(sub: str, name: str) -> str:
    n = name.lower()
    if sub == "Cup & Bowl Noodles":
        if first_match(n, ("bowl",)):
            return "Bowl Noodles"
        return "Cup Noodles"
    if sub == "Pasta":
        if first_match(n, ("spaghetti", "linguine", "capellini")):
            return "Long Pasta"
        if first_match(n, ("penne", "fusilli", "macaroni", "chifferi")):
            return "Short Pasta"
        return "Other Pasta"
    if sub == "Asian Noodles":
        if first_match(n, ("udon",)):
            return "Udon"
        if first_match(n, ("somen", "soba")):
            return "Somen & Soba"
        if first_match(n, ("verm", "vermicelli", "bee hoon")):
            return "Vermicelli"
        return "Other Asian Noodles"
    if sub == "Pack Noodles":
        if first_match(n, ("nissin", "demae", "de-ma-e", "ndl")):
            return "Nissin & Demae"
        if first_match(n, ("shin", "nongshim", "samyang", "paldo", "korean")):
            return "Korean Packs"
        if first_match(n, ("doll", "sau tao", "indomie", "sedaap")):
            return "HK & SEA Packs"
        return "Other Pack Noodles"
    return sub


def dairy_sub(name: str) -> str:
    n = name.lower()
    if first_match(n, ("egg", "eggs")):
        return "Eggs"
    if first_match(n, ("tofu", "bean curd", "beancurd")):
        return "Tofu"
    if first_match(n, ("yoghurt", "yogurt", "yakult")):
        return "Yogurt"
    if first_match(n, ("cheese", "mozzarella", "cheddar", "parmesan", "fetta", "feta")):
        return "Cheese"
    if first_match(n, ("peanut butter", "butter", "spread")) and not first_match(
        n, ("milk",)
    ):
        return "Butter & Spreads"
    if first_match(n, ("soymilk", "soy milk", "soya milk", "vitasoy", "almond milk", "oat milk")):
        return "Plant Milk"
    if first_match(n, ("chocolate", "choco", "strawberry", "banana", "mango")) and first_match(
        n, ("milk",)
    ):
        return "Flavoured Milk"
    if first_match(n, ("milk",)):
        return "Fresh Milk"
    return "Other Dairy"


def dairy_leaf(sub: str, name: str) -> str:
    n = name.lower()
    if sub == "Eggs":
        if first_match(n, ("quail",)):
            return "Quail Eggs"
        if first_match(n, ("free range", "organic", "cage free")):
            return "Free-range Eggs"
        if first_match(n, ("brown",)):
            return "Brown Eggs"
        if first_match(n, ("white",)):
            return "White Eggs"
        if first_match(n, ("salted", "preserved")):
            return "Processed Eggs"
        return "Other Eggs"
    if sub == "Fresh Milk":
        if first_match(n, ("meiji",)):
            return "Meiji Milk"
        if first_match(n, ("nestle",)):
            return "Nestle Milk"
        if first_match(n, ("kowloon",)):
            return "Kowloon Dairy"
        if first_match(n, ("trappist", "shiny meadow", "freshjoy")):
            return "Local Fresh Milk"
        return "Other Fresh Milk"
    if sub == "Yogurt":
        if first_match(n, ("drink", "sipping", "yakult")):
            return "Drinking Yogurt"
        if first_match(n, ("greek",)):
            return "Greek Yogurt"
        return "Spoonable Yogurt"
    if sub == "Cheese":
        if first_match(n, ("slice", "hamburger")):
            return "Cheese Slices"
        if first_match(n, ("shred", "mozzarella", "cheddar")):
            return "Shredded Cheese"
        return "Other Cheese"
    if sub == "Tofu":
        if first_match(n, ("dessert",)):
            return "Dessert Tofu"
        if first_match(n, ("fry", "fried", "puff")):
            return "Fried Tofu"
        return "Fresh Tofu"
    return sub


def snack_sub(name: str) -> str:
    n = name.lower()
    if first_match(n, ("chip", "chips", "crisp", "calbee", "pringles")):
        return "Chips & Crisps"
    if first_match(n, ("biscuit", "cookie", "cracker", "oreo", "ritz", "wafer")):
        return "Biscuits & Cookies"
    if first_match(n, ("candy", "chocolate", "kitkat", "gummy", "choco pie")):
        return "Candy & Chocolate"
    if first_match(n, ("nut", "almond", "cashew", "peanut", "raisin", "dried")):
        return "Nuts & Dried Fruit"
    if first_match(n, ("cake", "roll", "madeleine", "pastry", "pound")):
        return "Cakes & Pastries"
    if first_match(n, ("kellogg", "cereal", "muesli", "granola", "frosties")):
        return "Cereal"
    return "Other Snacks"


def drink_sub(name: str) -> str:
    n = name.lower()
    if first_match(n, ("beer", "wine", "sake", "cabernet", "heineken", "asahi", "1664")):
        return "Alcohol"
    if first_match(n, ("pocari", "gatorade", "red bull", "lucozade", "energy")):
        return "Energy & Sports Drinks"
    if first_match(n, ("coke", "coca", "sprite", "fanta", "pepsi", "soda")):
        return "Soft Drinks"
    if first_match(n, ("juice", "nectar")):
        return "Juices"
    if first_match(n, ("tea", "coffee", "latte", "nescafe")):
        return "Tea & Coffee"
    if first_match(n, ("water", "sparkling", "coconut")):
        return "Water"
    return "Other Drinks"


def household_sub(name: str) -> str:
    n = name.lower()
    if first_match(n, ("tissue", "toilet", "towel", "paper")):
        return "Paper Products"
    if first_match(n, ("laundry", "detergent", "softener")):
        return "Laundry"
    if first_match(n, ("wipe", "bleach", "disinfectant", "spray")):
        return "Cleaning Supplies"
    if first_match(n, ("foil", "cling", "bag", "wrap")):
        return "Kitchenware"
    if first_match(n, ("soap", "shampoo", "deodorant")):
        return "Personal Care"
    if first_match(n, ("battery", "lightbulb", "bulb")):
        return "Batteries & Lightbulbs"
    return "Other Household"


def frozen_sub(name: str) -> str:
    n = name.lower()
    if first_match(n, ("ice cream",)):
        return "Ice Cream"
    if first_match(n, ("dumpling", "wonton", "gyoza", "dim sum")):
        return "Frozen Dumplings"
    if first_match(n, ("chicken", "nugget", "fish finger", "pork", "beef")):
        return "Frozen Meat"
    if first_match(n, ("pizza", "bagel", "paratha", "tortilla")):
        return "Frozen Bakery"
    if first_match(n, ("blueberry", "strawberry", "mango", "edamame")):
        return "Frozen Fruit & Veg"
    return "Other Frozen"


def bakery_sub(name: str) -> str:
    n = name.lower()
    if first_match(n, ("cake", "muffin", "croissant", "waffle", "pastry")):
        return "Pastries"
    if first_match(n, ("bun",)):
        return "Buns"
    if first_match(n, ("bread", "toast", "loaf", "baguette")):
        return "Bread"
    return "Other Bakery"


def produce_sub(name: str) -> str:
    n = name.lower()
    if first_match(
        n,
        (
            "apple",
            "banana",
            "orange",
            "grape",
            "berry",
            "mango",
            "pear",
            "melon",
            "kiwi",
            "fruit",
            "plum",
        ),
    ):
        return "Fruit"
    if first_match(n, ("mushroom", "champignon", "crimini")):
        return "Mushrooms"
    if first_match(n, ("tomato", "cucumber", "lettuce", "salad")):
        return "Salad Veg"
    if first_match(n, ("onion", "garlic", "ginger", "chili", "chilli")):
        return "Aromatics"
    return "Vegetables"


def canned_sub(name: str) -> str:
    n = name.lower()
    if first_match(n, ("sauce", "ketchup", "mayo", "soy", "vinegar")):
        return "Sauces"
    if first_match(n, ("oil",)):
        return "Oils"
    if first_match(n, ("jam", "spread", "syrup", "honey", "peanut butter", "preserve")):
        return "Spreads"
    if first_match(n, ("rice", "flour", "sugar", "salt", "oat")):
        return "Pantry Staples"
    if first_match(n, ("soup", "canned", "spam", "tuna", "sardine")):
        return "Canned Food"
    return "Other Packaged"


def personal_sub(name: str) -> str:
    n = name.lower()
    if first_match(n, ("pampers", "merries", "diaper", "nappy")):
        return "Diapers"
    if first_match(n, ("whisper", "sanitary", "laurier")):
        return "Feminine Care"
    if first_match(n, ("mask",)):
        return "Face Masks"
    if first_match(n, ("toothpaste", "mouthwash", "parodontax")):
        return "Oral Care"
    return "Other Personal Care"


def other_sub(name: str) -> str:
    n = name.lower()
    if first_match(n, ("oil", "spread", "syrup")):
        return "Pantry Oddments"
    if first_match(n, ("test", "mask", "aid")):
        return "Health Odds"
    return "Uncategorized"


def assign_sub(main: str, name: str) -> str:
    fn = {
        "Meat & Seafood": meat_sub,
        "Instant Noodles & Pasta": noodle_sub,
        "Dairy & Eggs": dairy_sub,
        "Snacks": snack_sub,
        "Drinks": drink_sub,
        "Household Essentials": household_sub,
        "Frozen Foods": frozen_sub,
        "Bakery & Bread": bakery_sub,
        "Fruits & Vegetables": produce_sub,
        "Canned & Packaged Goods": canned_sub,
        "Personal Care": personal_sub,
        "Other": other_sub,
    }.get(main)
    return fn(name) if fn else "Other"


def assign_leaf(main: str, sub: str, name: str) -> str:
    if main == "Meat & Seafood":
        return meat_leaf(sub, name)
    if main == "Instant Noodles & Pasta":
        return noodle_leaf(sub, name)
    if main == "Dairy & Eggs":
        return dairy_leaf(sub, name)
    return sub


def split_chunks(label: str, items: list[dict]) -> list[tuple[str, list[dict]]]:
    items = sorted(items, key=lambda x: x["name"].lower())
    if len(items) <= MAX_LEAF:
        return [(label, items)]
    out: list[tuple[str, list[dict]]] = []
    total = (len(items) + MAX_LEAF - 1) // MAX_LEAF
    for i in range(0, len(items), MAX_LEAF):
        chunk = items[i : i + MAX_LEAF]
        part = i // MAX_LEAF + 1
        start = chunk[0]["name"][0].upper()
        end = chunk[-1]["name"][0].upper()
        span = start if start == end else f"{start}–{end}"
        name = f"{label} {part}/{total} ({span})"
        out.append((name, chunk))
    return out


def split_oversized(label: str, items: list[dict]) -> list[tuple[str, list[dict]]]:
    return split_chunks(label, items)


def item_payload(it: dict, subcategory: str) -> dict:
    out = {
        "name": it["name"],
        "price": it["price"],
        "category": it["category"],
        "subcategory": subcategory,
    }
    if it.get("image"):
        out["image"] = it["image"]
    if it.get("weight") is not None:
        out["weight"] = it["weight"]
    return out


def build_tree(items: list[dict]) -> dict:
    by_main: dict[str, list[dict]] = defaultdict(list)
    for it in items:
        by_main[it["category"]].append(it)

    categories = []
    for main in MAIN_ORDER:
        pool = by_main.get(main, [])
        if not pool:
            continue
        by_sub: dict[str, list[dict]] = defaultdict(list)
        for it in pool:
            by_sub[assign_sub(main, it["name"])].append(it)

        subcats = []
        for sub_name, sub_items in sorted(by_sub.items(), key=lambda x: (-len(x[1]), x[0])):
            if len(sub_items) <= MAX_LEAF:
                subcats.append(
                    {
                        "name": sub_name,
                        "items": [item_payload(it, sub_name) for it in sub_items],
                    }
                )
                continue

            by_leaf: dict[str, list[dict]] = defaultdict(list)
            for it in sub_items:
                by_leaf[assign_leaf(main, sub_name, it["name"])].append(it)

            if len(by_leaf) == 1 and next(iter(by_leaf)) == sub_name:
                leaves = split_oversized(sub_name, sub_items)
                nested = [
                    {"name": label, "items": [item_payload(it, label) for it in group]}
                    for label, group in leaves
                ]
                subcats.append({"name": sub_name, "subcategories": nested})
                continue

            nested = []
            for leaf_name, leaf_items in sorted(
                by_leaf.items(), key=lambda x: (-len(x[1]), x[0])
            ):
                if len(leaf_items) <= MAX_LEAF:
                    nested.append(
                        {
                            "name": leaf_name,
                            "items": [item_payload(it, leaf_name) for it in leaf_items],
                        }
                    )
                else:
                    for label, group in split_oversized(leaf_name, leaf_items):
                        nested.append(
                            {
                                "name": label,
                                "items": [item_payload(it, label) for it in group],
                            }
                        )
            subcats.append({"name": sub_name, "subcategories": nested})

        categories.append({"name": main, "subcategories": subcats})
    return {"categories": categories}


def max_leaf(data: dict) -> tuple[int, list[str]]:
    biggest = 0
    over: list[str] = []

    def walk(path: str, node: dict) -> None:
        nonlocal biggest
        if "items" in node:
            n = len(node["items"])
            biggest = max(biggest, n)
            if n > MAX_LEAF:
                over.append(f"{path} ({n})")
        for child in node.get("subcategories") or []:
            walk(f"{path} > {child['name']}", child)

    for cat in data["categories"]:
        walk(cat["name"], cat)
    return biggest, over


def count_items(node: dict) -> int:
    if "items" in node:
        return len(node["items"])
    return sum(count_items(ch) for ch in node.get("subcategories") or [])


def main() -> None:
    catalog = json.loads(SRC.read_text(encoding="utf-8"))
    items = flatten(catalog)
    data = build_tree(items)
    OUT.write_text(json.dumps(data, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    biggest, over = max_leaf(data)
    print(f"Wrote {OUT} ({len(items)} items)")
    print(f"Largest leaf: {biggest}")
    if over:
        print("OVER LIMIT:")
        for line in over:
            print(" ", line)
    for cat in data["categories"]:
        print(f"  {cat['name']}: {count_items(cat)}")
        for sub in cat["subcategories"]:
            n = count_items(sub)
            kids = sub.get("subcategories")
            if kids:
                bits = ", ".join(f"{k['name']} ({count_items(k)})" for k in kids)
                print(f"    {sub['name']} [{n}]: {bits}")
            else:
                print(f"    {sub['name']} ({n})")


if __name__ == "__main__":
    main()
