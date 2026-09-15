"""Add items identified from Fusion/ParknShop shelf photos (Drive HEICs).

Prices are estimates from visible shelf tags (HKD). Images point at local
shelf photos under /images/catalog/drive-shelf-XX.jpg.
"""

from __future__ import annotations

import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
CATALOG = ROOT / "packages/shared/data/foodpanda-fusion-catalog.json"

# section, subcategory, brand, name, price, weight_kg|None, image
ITEMS: list[tuple[str, str, str, str, float, float | None, str]] = [
    # --- Shelf 01: chilled noodles / ready meals ---
    ("Fresh Food", "Frozen Food", "KERISOM", "Crab Sauce Noodles", 22.0, 0.3, "/images/catalog/drive-shelf-01.jpg"),
    ("Groceries", "Instant Noodles", "Hao Yi Shi", "Creamy Mushroom Spaghetti", 18.0, 0.25, "/images/catalog/drive-shelf-01.jpg"),
    ("Groceries", "Instant Noodles", "Hao Yi Shi", "Scallion Oil Noodles", 18.0, 0.25, "/images/catalog/drive-shelf-01.jpg"),
    ("Groceries", "Instant Noodles", "Hao Yi Shi", "White Sauce Mushroom Noodles", 18.0, 0.25, "/images/catalog/drive-shelf-01.jpg"),
    ("Groceries", "Instant Noodles", "Hao Yi Shi", "Satay Beef Noodles", 18.0, 0.25, "/images/catalog/drive-shelf-01.jpg"),
    ("Groceries", "Rice & Noodles", "", "Fresh Udon Pack", 18.0, 0.4, "/images/catalog/drive-shelf-01.jpg"),
    ("Groceries", "Rice & Noodles", "", "Inaniwa Style Udon", 39.5, 0.5, "/images/catalog/drive-shelf-01.jpg"),
    ("Fresh Food", "Beef", "", "Beef Brisket Broth Meal Kit", 39.9, 0.6, "/images/catalog/drive-shelf-01.jpg"),
    ("Fresh Food", "Others", "", "Sous Vide Confit Duck Leg", 20.0, 0.25, "/images/catalog/drive-shelf-01.jpg"),
    ("Fresh Food", "Frozen Food", "", "Frozen Pizza", 39.9, 0.4, "/images/catalog/drive-shelf-01.jpg"),
    # --- Shelf 02–05: fruit ---
    ("Fresh Food", "Fruit", "PureSpect", "USA Oranges 3pcs", 16.9, 0.6, "/images/catalog/drive-shelf-02.jpg"),
    ("Fresh Food", "Fruit", "Sunkist", "Lemons", 8.0, 0.15, "/images/catalog/drive-shelf-02.jpg"),
    ("Fresh Food", "Fruit", "", "Fresh Pineapple", 22.0, 1.2, "/images/catalog/drive-shelf-02.jpg"),
    ("Fresh Food", "Fruit", "", "Honey Pomelo", 15.8, 1.0, "/images/catalog/drive-shelf-02.jpg"),
    ("Fresh Food", "Fruit", "", "Dragon Fruit 3pcs", 16.0, 0.9, "/images/catalog/drive-shelf-03.jpg"),
    ("Fresh Food", "Fruit", "", "Crystal Pear 5pcs", 12.5, 0.8, "/images/catalog/drive-shelf-03.jpg"),
    ("Fresh Food", "Fruit", "", "Mango 3pcs", 21.0, 0.9, "/images/catalog/drive-shelf-03.jpg"),
    ("Fresh Food", "Fruit", "", "Avocado 3pcs", 26.8, 0.6, "/images/catalog/drive-shelf-03.jpg"),
    ("Fresh Food", "Fruit", "", "Kiwifruit 5pcs", 48.0, 0.5, "/images/catalog/drive-shelf-03.jpg"),
    ("Fresh Food", "Fruit", "", "Kiwifruit Pack", 39.9, 0.5, "/images/catalog/drive-shelf-03.jpg"),
    ("Fresh Food", "Fruit", "", "Golden Flat Peaches Box", 24.9, 0.5, "/images/catalog/drive-shelf-04.jpg"),
    ("Fresh Food", "Fruit", "Disney", "Honey Peaches Box", 19.9, 0.4, "/images/catalog/drive-shelf-04.jpg"),
    ("Fresh Food", "Fruit", "", "Japanese Peaches 2pcs", 88.0, 0.5, "/images/catalog/drive-shelf-04.jpg"),
    ("Fresh Food", "Fruit", "", "Papaya", 19.9, 0.8, "/images/catalog/drive-shelf-04.jpg"),
    ("Fresh Food", "Fruit", "", "Mini Watermelon", 22.9, 1.5, "/images/catalog/drive-shelf-04.jpg"),
    ("Fresh Food", "Fruit", "Viva", "Young Coconut Ready-to-Drink", 19.9, 0.8, "/images/catalog/drive-shelf-04.jpg"),
    ("Fresh Food", "Fruit", "Tekasya", "Purple Grapes Pack", 35.0, 0.5, "/images/catalog/drive-shelf-04.jpg"),
    ("Fresh Food", "Fruit & Berries", "", "Blueberries Pack", 32.0, 0.125, "/images/catalog/drive-shelf-05.jpg"),
    ("Fresh Food", "Fruit", "", "Persimmons 6pcs", 19.9, 0.8, "/images/catalog/drive-shelf-05.jpg"),
    ("Fresh Food", "Fruit", "", "Shine Muscat Grapes Pack", 25.0, 0.4, "/images/catalog/drive-shelf-05.jpg"),
    ("Fresh Food", "Fruit", "", "Golden Honey Peach 2pcs", 22.9, 0.4, "/images/catalog/drive-shelf-05.jpg"),
    ("Fresh Food", "Fruit", "", "Fuji Apple 4pcs Pack", 19.9, 0.7, "/images/catalog/drive-shelf-05.jpg"),
    # --- Shelf 06: Ohayo ice cream ---
    ("Fresh Food", "Frozen Food", "Ohayo", "Brulee Ice Cream", 45.0, 0.2, "/images/catalog/drive-shelf-06.jpg"),
    ("Fresh Food", "Frozen Food", "Ohayo", "Jersey Soft Serve Melon", 28.0, 0.15, "/images/catalog/drive-shelf-06.jpg"),
    ("Fresh Food", "Frozen Food", "Ohayo", "Jersey Soft Serve Vanilla", 28.0, 0.15, "/images/catalog/drive-shelf-06.jpg"),
    # --- Shelf 07: biscuits ---
    ("Groceries", "Biscuits", "McVitie's", "Ginger Nuts", 23.5, 0.25, "/images/catalog/drive-shelf-07.jpg"),
    ("Groceries", "Biscuits", "McVitie's", "Go Ahead Crispy Slices Apple", 18.5, 0.2, "/images/catalog/drive-shelf-07.jpg"),
    ("Groceries", "Biscuits", "McVitie's", "Go Ahead Crispy Slices Forest Fruit", 18.5, 0.2, "/images/catalog/drive-shelf-07.jpg"),
    ("Groceries", "Biscuits", "Oreo", "Mini Oreo", 11.9, 0.1, "/images/catalog/drive-shelf-07.jpg"),
    ("Groceries", "Biscuits", "Oreo", "Oreo Sandwich Cookies", 24.5, 0.27, "/images/catalog/drive-shelf-07.jpg"),
    ("Groceries", "Crackers", "Ritz", "Cheese Sandwiches Promo Pack", 49.0, 0.4, "/images/catalog/drive-shelf-07.jpg"),
    ("Groceries", "Crackers", "Ritz", "Lemon Sandwich Crackers", 24.5, 0.2, "/images/catalog/drive-shelf-07.jpg"),
    ("Groceries", "Biscuits", "Munchy's", "Le-mond Lemon Puff", 13.6, 0.15, "/images/catalog/drive-shelf-07.jpg"),
    ("Groceries", "Biscuits", "Select", "Assorted Biscuits", 36.9, 0.5, "/images/catalog/drive-shelf-07.jpg"),
    # --- Shelf 08: gum / candy ---
    ("Groceries", "Confectionary", "Hi-Chew", "Fruit Mix Chews", 17.9, 0.1, "/images/catalog/drive-shelf-08.jpg"),
    ("Groceries", "Confectionary", "Nimm2", "Smilegummi Sour", 11.0, 0.09, "/images/catalog/drive-shelf-08.jpg"),
    ("Groceries", "Confectionary", "Extra", "Sugarfree Gum Peppermint", 9.9, 0.05, "/images/catalog/drive-shelf-08.jpg"),
    ("Groceries", "Confectionary", "Extra", "Sugarfree Gum Spearmint", 9.9, 0.05, "/images/catalog/drive-shelf-08.jpg"),
    ("Groceries", "Confectionary", "Extra", "Sugarfree Gum Strawberry", 9.9, 0.05, "/images/catalog/drive-shelf-08.jpg"),
    ("Groceries", "Confectionary", "Eclipse", "Chewy Mints Peppermint", 9.0, 0.05, "/images/catalog/drive-shelf-08.jpg"),
    ("Groceries", "Confectionary", "Eclipse", "Chewy Mints Spearmint", 9.0, 0.05, "/images/catalog/drive-shelf-08.jpg"),
    # --- Shelf 09–10: chocolate ---
    ("Groceries", "Confectionary", "Cadbury", "Dairy Milk Chocolate Bar", 22.9, 0.2, "/images/catalog/drive-shelf-09.jpg"),
    ("Groceries", "Confectionary", "Toblerone", "Milk Chocolate", 15.5, 0.1, "/images/catalog/drive-shelf-09.jpg"),
    ("Groceries", "Confectionary", "Ritter Sport", "Chocolate Bar Assorted", 21.0, 0.1, "/images/catalog/drive-shelf-09.jpg"),
    ("Groceries", "Confectionary", "Hershey's", "Kisses Sharing Bag", 40.0, 0.3, "/images/catalog/drive-shelf-09.jpg"),
    ("Groceries", "Confectionary", "KitKat", "2-Finger Multipack", 20.9, 0.2, "/images/catalog/drive-shelf-09.jpg"),
    ("Groceries", "Confectionary", "Maltesers", "Sharing Bag", 34.1, 0.2, "/images/catalog/drive-shelf-09.jpg"),
    ("Groceries", "Confectionary", "Maltesers", "Party Bucket 465g", 94.9, 0.465, "/images/catalog/drive-shelf-10.jpg"),
    ("Groceries", "Confectionary", "Meiji", "Apollo Strawberry Chocolate", 20.9, 0.07, "/images/catalog/drive-shelf-10.jpg"),
    ("Groceries", "Confectionary", "Andes", "Creme de Menthe Thins", 24.9, 0.132, "/images/catalog/drive-shelf-10.jpg"),
    ("Groceries", "Confectionary", "Meiji", "Kinoko no Yama", 21.9, 0.074, "/images/catalog/drive-shelf-10.jpg"),
    ("Groceries", "Confectionary", "Meiji", "Macadamia Chocolate", 25.9, 0.09, "/images/catalog/drive-shelf-10.jpg"),
    ("Groceries", "Confectionary", "Meiji", "Almond Chocolate", 25.9, 0.088, "/images/catalog/drive-shelf-10.jpg"),
    ("Groceries", "Confectionary", "Kinder", "Bueno", 10.5, 0.043, "/images/catalog/drive-shelf-10.jpg"),
    ("Groceries", "Confectionary", "Kinder", "Joy Egg", 12.5, 0.02, "/images/catalog/drive-shelf-10.jpg"),
    # --- Shelf 11–13: chips ---
    ("Groceries", "Chips", "Lay's", "Sour Cream & Onion Potato Chips", 28.5, 0.15, "/images/catalog/drive-shelf-11.jpg"),
    ("Groceries", "Chips", "Lay's", "Classic Salted Potato Chips", 28.5, 0.15, "/images/catalog/drive-shelf-11.jpg"),
    ("Groceries", "Chips", "Lay's", "Korean Roasted Chicken Potato Chips", 28.5, 0.15, "/images/catalog/drive-shelf-11.jpg"),
    ("Groceries", "Chips", "Lay's", "Salted Egg Yolk Potato Chips", 28.5, 0.15, "/images/catalog/drive-shelf-11.jpg"),
    ("Groceries", "Chips", "Lay's", "Grilled Squid Sweet & Sour Potato Chips", 28.5, 0.15, "/images/catalog/drive-shelf-11.jpg"),
    ("Groceries", "Chips", "Lay's", "Barbecue Potato Chips", 28.5, 0.15, "/images/catalog/drive-shelf-11.jpg"),
    ("Groceries", "Chips", "Lay's", "Honey Butter Potato Chips", 28.5, 0.15, "/images/catalog/drive-shelf-11.jpg"),
    ("Groceries", "Chips", "Pringles", "Sour Cream & Onion", 14.0, 0.11, "/images/catalog/drive-shelf-11.jpg"),
    ("Groceries", "Chips", "Calbee", "Curry Beef Brisket Potato Chips", 13.0, 0.07, "/images/catalog/drive-shelf-12.jpg"),
    ("Groceries", "Chips", "Calbee", "Typhoon Shelter Fried Crab Potato Chips", 13.0, 0.07, "/images/catalog/drive-shelf-12.jpg"),
    ("Groceries", "Chips", "Calbee", "Calbee Honey Butter Potato Chips", 14.5, 0.07, "/images/catalog/drive-shelf-12.jpg"),
    ("Groceries", "Chips", "Calbee", "Hot & Spicy Potato Chips", 13.5, 0.07, "/images/catalog/drive-shelf-13.jpg"),
    ("Groceries", "Chips", "Calbee", "Prawn Crackers", 18.0, 0.1, "/images/catalog/drive-shelf-13.jpg"),
    ("Groceries", "Chips", "Calbee", "Pizza Potato Chips", 13.5, 0.07, "/images/catalog/drive-shelf-13.jpg"),
    ("Groceries", "Chips", "Cheetos", "Crunchy Cheese", 28.0, 0.15, "/images/catalog/drive-shelf-13.jpg"),
    ("Groceries", "Chips", "Cheetos", "Flamin' Hot", 28.0, 0.15, "/images/catalog/drive-shelf-13.jpg"),
    ("Groceries", "Chips", "Doritos", "Nacho Cheese", 28.0, 0.15, "/images/catalog/drive-shelf-13.jpg"),
    ("Groceries", "Chips", "Doritos", "Roasted Corn", 28.0, 0.15, "/images/catalog/drive-shelf-13.jpg"),
]


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
                existing.add(item["name"].strip().lower())

    added = 0
    skipped = 0
    for section, sub, brand, name, price, weight, image in ITEMS:
        key = name.strip().lower()
        if key in existing:
            skipped += 1
            continue
        row: dict = {
            "name": name,
            "price": price,
            "category": section,
            "subcategory": sub,
            "image": image,
        }
        if brand:
            row["brand"] = brand
        if weight is not None:
            row["weight"] = weight
        find_sub(data, section, sub)["items"].append(row)
        existing.add(key)
        added += 1
        print(f"+ {section}/{sub}: {name.encode('ascii', 'replace').decode()} @ ${price}")

    CATALOG.write_text(
        json.dumps(data, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )
    print(f"\nAdded {added}, skipped {skipped} duplicates.")


if __name__ == "__main__":
    main()
