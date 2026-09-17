"""Insert 50 ParknShop-verified items into the bundled catalog.

Prices, names, sizes, and images were read from the ParknShop product API
(api.pns.hk) on 2026-09-13. Do not invent prices in this file.
"""

from __future__ import annotations

import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
CATALOG = ROOT / "packages/shared/data/foodpanda-fusion-catalog.json"

# section, subcategory, brand, name, price, size, image, pns code
ITEMS = [
    # Instant Noodles (4)
    ("Groceries", "Instant Noodles", "Nissin", "Cup Noodle - Spicy Beef 75g", 9.5, "75G", "https://medias.pns.hk/publishing/PNSHK-157732-front-prodcat.jpg?version=1732763635", "BP_157732"),
    ("Groceries", "Instant Noodles", "Nissin", "Cup Noodles - Seafood 72g", 9.5, "72G", "https://medias.pns.hk/publishing/PNSHK-110653-front-prodcat.jpg?version=1732715691", "BP_110653"),
    ("Groceries", "Instant Noodles", "Nissin", "Cup Noodles - Spicy Seafood 75g", 9.5, "75G", "https://medias.pns.hk/publishing/PNSHK-118681-front-prodcat.jpg?version=1732721376", "BP_118681"),
    ("Groceries", "Instant Noodles", "Nissin", "Big Cup Noodles - Seafood 100g", 13.5, "100G", "https://medias.pns.hk/publishing/PNSHK-369506-front-prodcat.jpg?version=1732856367", "BP_369506"),
    # Drinks (5)
    ("Groceries", "Drinks", "Coca-Cola", "Original Coca-Cola 8 x 330ml", 40.0, "330MLX8", "https://medias.pns.hk/publishing/PNSHK-114639-front-prodcat.jpg?version=1787921184", "BP_114639"),
    ("Groceries", "Drinks", "Sprite", "Sprite Lemon-Lime Soda 500ml", 10.5, "500ML", "https://medias.pns.hk/publishing/PNSHK-185771-front-prodcat.jpg?version=1788351854", "BP_185771"),
    ("Groceries", "Drinks", "Pocari", "Ion Supply Drink 500ml", 11.0, "500ML", "https://medias.pns.hk/publishing/PNSHK-125853-front-prodcat.jpg", "BP_125853"),
    ("Groceries", "Drinks", "Vita", "Vita Lemon Tea 250ml x 6", 25.0, "250MLX6", "https://medias.pns.hk/publishing/PNSHK-185711-front-prodcat.jpg?version=1744374427", "BP_185711"),
    ("Groceries", "Drinks", "Watsons", "Watsons Distilled Water 280ml", 4.5, "280ML", "https://medias.pns.hk/publishing/PNSHK-157910-front-prodcat.jpg?version=1758111739", "BP_157910"),
    # Snacks (5) — chips stay in Chips, the rest in Snacks
    ("Groceries", "Chips", "Calbee", "Ethnicans Potato Chips 25g", 7.5, "25G", "https://medias.pns.hk/publishing/PNSHK-128088-front-prodcat.jpg?version=1732737806", "BP_128088"),
    ("Groceries", "Chips", "Calbee", "Hot & Spicy Potato Chips 55g", 16.0, "55G", "https://medias.pns.hk/publishing/PNSHK-128089-front-prodcat.jpg?version=1760098849", "BP_128089"),
    ("Groceries", "Snacks", "Lotte", "Almond Pepero 32g", 12.0, "32G", "https://medias.pns.hk/publishing/PNSHK-105651-front-prodcat.jpg?version=1732701583", "BP_105651"),
    ("Groceries", "Snacks", "Oreo", "Vanilla Cookies 236g", 23.5, "236.25G", "https://medias.pns.hk/publishing/PNSHK-161007-front-prodcat.jpg?version=1773318011", "BP_161007"),
    ("Groceries", "Snacks", "Kimnori", "Seasoned Seaweed Original 4g x 3", 13.0, "4GX3", "https://medias.pns.hk/publishing/PNSHK-476755-front-prodcat.jpg?version=1785241544", "BP_476755"),
    # Dairy & Eggs (4)
    ("Fresh Food", "Dairy", "Shin Kigen Ran", "Japanese White Eggs 10s", 32.0, "10S", "https://medias.pns.hk/publishing/PNSHK-359118-front-prodcat.jpg", "BP_359118"),
    ("Fresh Food", "Dairy", "Yakult", "Probiotic Drink 5 x 100ml", 15.9, "5X100ML", "https://medias.pns.hk/publishing/PNSHK-190742-front-prodcat.jpg", "BP_190742"),
    ("Fresh Food", "Dairy", "Hokkaido", "Specially Select 3.6 Milk 1L", 33.0, "1L", "https://medias.pns.hk/publishing/PNSHK-194697-front-prodcat.jpg?version=1724070021", "BP_194697"),
    ("Fresh Food", "Dairy", "Yakult", "Low Sugar High Fibre Probiotic Drink 5 x 100ml", 19.9, "100MLX5", "https://medias.pns.hk/publishing/PNSHK-495608-front-prodcat.jpg?version=1736252661", "BP_495608"),
    # Bread & Bakery (5)
    ("Groceries", "Bread & Bakery", "Garden", "Sandwich Bread 8 slices", 13.5, "8 SLICES", "https://medias.pns.hk/publishing/PNSHK-120029-front-prodcat.jpg?version=1745497326", "BP_120029"),
    ("Groceries", "Bread & Bakery", "Garden", "Life Bread Protein 14 slices", 18.5, "14SLICES", "https://medias.pns.hk/publishing/PNSHK-129496-front-prodcat.jpg?version=1745498050", "BP_129496"),
    ("Groceries", "Bread & Bakery", "Garden", "Life Bread 14 slices", 15.0, "14SLICES", "https://medias.pns.hk/publishing/PNSHK-120007-front-prodcat.jpg?version=1745497491", "BP_120007"),
    ("Groceries", "Bread & Bakery", "Garden", "Life Bread Wheat 14 slices", 18.5, "14SLICES", "https://medias.pns.hk/publishing/PNSHK-120008-front-prodcat.jpg?version=1745497529", "BP_120008"),
    ("Groceries", "Bread & Bakery", "Garden", "Crustless Sandwich Bread 6 slices", 11.5, "6 SLICES", "https://medias.pns.hk/publishing/PNSHK-185784-front-prodcat.jpg?version=1745583843", "BP_185784"),
    # Rice & Noodles (5)
    ("Groceries", "Rice & Noodles", "Imperial Banquet", "Premium Thai Fragrant Rice 8kg", 105.0, "8KG", "https://medias.pns.hk/publishing/PNSHK-174238-front-prodcat.jpg?version=1732766510", "BP_174238"),
    ("Groceries", "Rice & Noodles", "Imperial Banquet", "Pearl Rice 5kg", 63.5, "5KG", "https://medias.pns.hk/publishing/PNSHK-103396-front-prodcat.jpg?version=1732700826", "BP_103396"),
    ("Groceries", "Rice & Noodles", "Sau Tao", "Shanghai Noodles 340g", 11.0, "340G", "https://medias.pns.hk/publishing/PNSHK-114080-front-prodcat.jpg", "BP_114080"),
    ("Groceries", "Rice & Noodles", "Select", "Sichuan Noodles 340g", 10.0, "340G", "https://medias.pns.hk/publishing/PNSHK-377093-front-prodcat.jpg?version=1732860359", "BP_377093"),
    ("Groceries", "Rice & Noodles", "Select", "Guo Qiao Rice Vermicelli 200g x 3", 27.8, "200GX3", "https://medias.pns.hk/publishing/PNSHK-380686-front-prodcat.jpg?version=1732843514", "BP_380686"),
    # Canned Goods (4)
    ("Groceries", "Canned Goods", "Sajo", "Luncheon Meat 340g", 24.0, "340G", "https://medias.pns.hk/publishing/PNSHK-387188-front-prodcat.jpg?version=1733366648", "BP_387188"),
    ("Groceries", "Canned Goods", "Imperial Banquet", "Chopped Ham and Pork 340g", 34.9, "340G", "https://medias.pns.hk/publishing/PNSHK-437381-front-prodcat.jpg?version=1732906589", "BP_437381"),
    ("Groceries", "Canned Goods", "Imperial Banquet", "Spiced Pork Cubes 142g", 18.0, "142G", "https://medias.pns.hk/publishing/PNSHK-486179-front-prodcat.jpg?version=1733290111", "BP_486179"),
    ("Groceries", "Canned Goods", "Imperial Banquet", "Sliced Pork in Sichuan Style 198g", 17.0, "198G", "https://medias.pns.hk/publishing/PNSHK-442448-front-prodcat.jpg?version=1732929127", "BP_442448"),
    # Condiments & Sauces (5)
    ("Groceries", "Condiments", "Kewpie", "Mayonnaise 300g", 30.0, "300G", "https://medias.pns.hk/publishing/PNSHK-184830-front-prodcat.jpg?version=1747398121", "BP_184830"),
    ("Groceries", "Condiments", "Tabasco", "Sriracha Sauce 256ml", 27.0, "256ML", "https://medias.pns.hk/publishing/PNSHK-410779-front-prodcat.jpg", "BP_410779"),
    ("Groceries", "Seasonings", "Maggi", "Seasoning 200ml", 16.5, "200ML", "https://medias.pns.hk/publishing/PNSHK-106250-front-prodcat.jpg", "BP_106250"),
    ("Groceries", "Seasonings", "Lee Kum Kee", "Black Bean Garlic Sauce 226g", 18.0, "226G", "https://medias.pns.hk/publishing/PNSHK-111962-front-prodcat.jpg", "BP_111962"),
    ("Groceries", "Sauces", "Lee Kum Kee", "Seasoned Soy Sauce for Seafood 410ml", 13.0, "410ML", "https://medias.pns.hk/publishing/PNSHK-152023-front-prodcat.jpg", "BP_152023"),
    # Frozen Food (5)
    ("Fresh Food", "Frozen Food", "Doll", "Shrimp Shao Mai 10s", 20.0, "10S", "https://medias.pns.hk/publishing/PNSHK-120886-front-prodcat.jpg", "BP_120886"),
    ("Fresh Food", "Frozen Food", "Select", "Xiao Long Bao 480g", 35.0, "480G", "https://medias.pns.hk/publishing/PNSHK-303049-front-prodcat.jpg", "BP_303049"),
    ("Fresh Food", "Frozen Food", "Pulmuone", "Juicy Steamed Dumplings 150g", 19.0, "150G", "https://medias.pns.hk/publishing/PNSHK-396480-front-prodcat.jpg?version=1748002910", "BP_396480"),
    ("Fresh Food", "Frozen Food", "Select", "Mixed Vegetables 500g", 40.0, "500G", "https://medias.pns.hk/publishing/PNSHK-131022-front-prodcat.jpg", "BP_131022"),
    ("Fresh Food", "Frozen Food", "Dreyer's", "Chocolate Twist Cone Multipack 3s", 60.0, "3S", "https://medias.pns.hk/publishing/PNSHK-394558-front-prodcat.jpg?version=1756729824", "BP_394558"),
    # Fresh Food (4)
    ("Fresh Food", "Fruit", "Yuan Xiang", "Fuji Apple", 5.9, "EACH", "https://medias.pns.hk/publishing/PNSHK-37157-front-prodcat.jpg", "BP_37157"),
    ("Fresh Food", "Vegetables", "Mr. Vegetable", "Prepack Tomatoes", 9.9, "1LB", "https://medias.pns.hk/publishing/PNSHK-55421-front-prodcat.jpg", "BP_55421"),
    ("Fresh Food", "Vegetables", "", "Broccoli", 6.9, "EACH", "https://medias.pns.hk/publishing/PNSHK-45554-front-prodcat.jpg", "BP_45554"),
    ("Fresh Food", "Vegetables", "Mr. Vegetable", "Prepack Carrots 1kg", 10.9, "1KG", "https://medias.pns.hk/publishing/PNSHK-05279-front-prodcat.jpg?version=1732698459", "BP_05279"),
    # Toiletries & Essentials (4)
    ("Groceries", "Toiletries", "Tempo", "Petit Handkerchief 18s", 26.9, "18S", "https://medias.pns.hk/publishing/PNSHK-199406-front-prodcat.jpg?version=1785241278", "BP_199406"),
    ("Groceries", "Toiletries", "Darlie", "Toothpaste 75g", 8.0, "75G", "https://medias.pns.hk/publishing/PNSHK-110794-front-prodcat.jpg", "BP_110794"),
    ("Groceries", "Toiletries", "Vinda", "Golden Supreme Facial Tissue 6s", 27.0, "6S", "https://medias.pns.hk/publishing/PNSHK-345666-front-prodcat.jpg?version=1732835816", "BP_345666"),
    ("Groceries", "Household", "Vinda", "Kitchen Towel 6 rolls", 34.0, "6S", "https://medias.pns.hk/publishing/PNSHK-426508-front-prodcat.jpg?version=1741782759", "BP_426508"),
]


def weight_kg(size: str) -> float | None:
    s = size.upper().replace(" ", "").replace("'", "")
    patterns = [
        (r"^([0-9]+(?:\.[0-9]+)?)G(?:X([0-9]+))?$", lambda m: float(m.group(1)) * int(m.group(2) or 1) / 1000),
        (r"^([0-9]+)X([0-9]+(?:\.[0-9]+)?)G$", lambda m: int(m.group(1)) * float(m.group(2)) / 1000),
        (r"^([0-9]+(?:\.[0-9]+)?)KG$", lambda m: float(m.group(1))),
        (r"^([0-9]+(?:\.[0-9]+)?)ML(?:X([0-9]+))?$", lambda m: float(m.group(1)) * int(m.group(2) or 1) / 1000),
        (r"^([0-9]+)X([0-9]+)ML$", lambda m: int(m.group(1)) * int(m.group(2)) / 1000),
        (r"^([0-9]+(?:\.[0-9]+)?)L$", lambda m: float(m.group(1))),
    ]
    for pat, fn in patterns:
        m = re.fullmatch(pat, s)
        if m:
            return round(fn(m), 3)
    return None


def find_sub(data: dict, section: str, sub: str) -> dict:
    for cat in data["categories"]:
        if cat["name"] != section:
            continue
        for node in cat.get("subcategories") or []:
            if node["name"] == sub:
                node.setdefault("items", [])
                return node
        node = {"name": sub, "items": []}
        cat.setdefault("subcategories", []).append(node)
        return node
    raise SystemExit(f"missing section {section}")


def main() -> None:
    data = json.loads(CATALOG.read_text(encoding="utf-8"))
    existing = set()
    for cat in data["categories"]:
        for sub in cat.get("subcategories") or []:
            for item in sub.get("items") or []:
                existing.add((item.get("brand", "").lower(), item["name"].lower()))
                existing.add(item["name"].lower())

    added = 0
    for section, sub, brand, name, price, size, image, code in ITEMS:
        if name.lower() in existing or (brand.lower(), name.lower()) in existing:
            print("skip duplicate", name)
            continue
        node = find_sub(data, section, sub)
        row = {
            "name": name,
            "price": price,
            "category": section,
            "subcategory": sub,
            "image": image,
            "pnsCode": code,
        }
        if brand:
            row["brand"] = brand
        weight = weight_kg(size)
        if weight is not None:
            row["weight"] = weight
        node["items"].append(row)
        added += 1
    CATALOG.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print("added", added, "of", len(ITEMS))


if __name__ == "__main__":
    main()
