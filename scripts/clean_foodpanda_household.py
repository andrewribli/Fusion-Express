"""Clean Foodpanda Fusion household scrape into Firestore-ready JSON."""

from __future__ import annotations

import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
RAW = ROOT / "packages" / "shared" / "data" / "foodpanda-fusion-household.raw.json"
OUT = ROOT / "packages" / "shared" / "data" / "foodpanda-fusion-household.json"

BRANDS = [
    "Glad Lock",
    "Gladlock",
    "Glad",
    "Best Buy",
    "Magiclean",
    "Andrex",
    "ANDREX",
    "Tempo",
    "Virjoy",
    "VIRJOY",
    "Vinda",
    "VINDA",
    "Walch",
    "WALCH",
    "Watsons",
    "WATSONS",
    "Clorox",
    "CLOROX",
    "Dettol",
    "DETTOL",
    "Axion",
    "AXION",
    "Axe Plus",
    "AXE PLUS",
    "Axe",
    "Zenses",
    "ZENSES",
    "Pulppy",
    "Select",
    "Scott",
    "Castle",
    "Swashes",
    "C&S",
    "C&s",
]


def parse_price(value: object) -> float:
    if isinstance(value, (int, float)):
        return round(float(value), 2)
    text = str(value)
    match = re.search(r"(?:HK\s*\$?|HK\$)\s*(\d+(?:\.\d+)?)", text, re.I)
    if match:
        return round(float(match.group(1)), 2)
    match = re.search(r"(\d+(?:\.\d+)?)", text)
    if not match:
        raise ValueError(f"Could not parse price from {value!r}")
    return round(float(match.group(1)), 2)


def clean_name(name: str) -> str:
    name = re.sub(r"\s+", " ", name).strip()
    parts = name.split(" ")
    if len(parts) >= 2 and parts[0].casefold() == parts[1].casefold():
        parts = parts[1:]
    if parts and parts[0].upper() == "C&S":
        parts[0] = "C&S"
    elif parts and parts[0].isalpha() and parts[0].isupper() and len(parts[0]) > 3:
        parts[0] = parts[0].title()
    return " ".join(parts)


def parse_brand(name: str) -> str | None:
    lower = name.lower()
    for brand in BRANDS:
        if lower.startswith(brand.lower()):
            if brand.upper() in {"VIRJOY"}:
                return "Virjoy"
            if brand.upper() in {"VINDA"}:
                return "Vinda"
            if brand.upper() in {"ANDREX"}:
                return "Andrex"
            if brand.upper() in {"WALCH"}:
                return "Walch"
            if brand.upper() in {"WATSONS"}:
                return "Watsons"
            if brand.upper() in {"CLOROX"}:
                return "Clorox"
            if brand.upper() in {"DETTOL"}:
                return "Dettol"
            if brand.upper() in {"AXION"}:
                return "Axion"
            if brand.upper() in {"AXE PLUS", "AXE"}:
                return "Axe"
            if brand.upper() in {"ZENSES"}:
                return "Zenses"
            if brand.lower() in {"c&s", "c&s"}:
                return "C&S"
            if brand.lower() == "gladlock":
                return "Glad"
            return brand
    return None


def parse_unit(name: str) -> str:
    if re.search(r"\d+(?:\.\d+)?\s*ml\b", name, re.I):
        return "ml"
    if re.search(r"\d+(?:\.\d+)?\s*kg\b", name, re.I):
        return "kg"
    if re.search(r"\d+(?:\.\d+)?\s*g\b", name, re.I):
        return "g"
    if re.search(r"\d+\s*(?:rolls?|pcs?|pieces?|packs?|bags?|boxes?|sheets?)\b", name, re.I):
        return "pack"
    if re.search(r"\d+'S\b", name, re.I):
        return "pack"
    return "each"


def usable_image(image: str | None) -> str | None:
    if not image:
        return None
    if not image.startswith("http"):
        return None
    if "…" in image or "..." in image:
        return None
    return image


def slug(name: str) -> str:
    s = re.sub(r"[^a-z0-9]+", "-", name.lower()).strip("-")
    return s[:80]


def clean() -> list[dict]:
    raw_items = json.loads(RAW.read_text(encoding="utf-8"))
    seen: set[str] = set()
    out: list[dict] = []
    for i, row in enumerate(raw_items):
        name = clean_name(str(row["name"]))
        key = name.casefold()
        if key in seen:
            continue
        seen.add(key)
        payload: dict = {
            "id": slug(name),
            "name": name,
            "brand": parse_brand(name),
            "category": "Household Essentials",
            "price": parse_price(row.get("price")),
            "unit": parse_unit(name),
            "weightKg": 0.15,
            "sourceIndex": i,
        }
        image = usable_image(row.get("image"))
        if image:
            payload["image"] = image
        out.append(payload)
    return out


def main() -> None:
    items = clean()
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps(items, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    print(f"Wrote {len(items)} products to {OUT}")


if __name__ == "__main__":
    main()
