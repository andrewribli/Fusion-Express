"""Fallback image/price lookup from Foodpanda scrape files and Bing (site:medias.pns.hk)."""

from __future__ import annotations

import json
import re
import urllib.parse
from difflib import SequenceMatcher
from pathlib import Path

import requests

ROOT = Path(__file__).resolve().parents[1]
DATA = ROOT / "packages" / "shared" / "data"
OVERRIDES = DATA / "product-image-overrides.json"
MEAT = DATA / "foodpanda-fusion-meat.json"
HOUSEHOLD = DATA / "foodpanda-fusion-household.json"
HOUSEHOLD_RAW = DATA / "foodpanda-fusion-household.raw.json"
CATALOG = DATA / "foodpanda-fusion-catalog.json"

SESSION = requests.Session()
SESSION.headers.update(
    {
        "User-Agent": (
            "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 "
            "(KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
        )
    }
)


def normalize_name(name: str) -> str:
    s = re.sub(r"[^a-z0-9]+", " ", name.lower())
    return " ".join(s.split())


def similarity(a: str, b: str) -> float:
    na, nb = normalize_name(a), normalize_name(b)
    if not na or not nb:
        return 0.0
    if na == nb:
        return 1.0
    if na in nb or nb in na:
        return 0.92
    return SequenceMatcher(None, na, nb).ratio()


def load_fallback_index() -> list[dict]:
    rows: list[dict] = []

    if OVERRIDES.exists():
        overrides = json.loads(OVERRIDES.read_text(encoding="utf-8"))
        for name, image in overrides.items():
            rows.append({"name": name, "image": image, "price": None, "source": "override"})

    for path, source in (
        (MEAT, "foodpanda_meat"),
        (HOUSEHOLD, "foodpanda_household"),
    ):
        if not path.exists():
            continue
        for item in json.loads(path.read_text(encoding="utf-8")):
            rows.append(
                {
                    "name": item.get("name") or "",
                    "image": item.get("image"),
                    "price": item.get("price"),
                    "source": source,
                }
            )

    if HOUSEHOLD_RAW.exists():
        for item in json.loads(HOUSEHOLD_RAW.read_text(encoding="utf-8")):
            rows.append(
                {
                    "name": item.get("name") or "",
                    "image": item.get("image"),
                    "price": item.get("price"),
                    "source": "foodpanda_household_raw",
                }
            )

    if CATALOG.exists():
        catalog = json.loads(CATALOG.read_text(encoding="utf-8"))

        def walk(nodes: list) -> None:
            for node in nodes:
                for item in node.get("items") or []:
                    if item.get("image") and item.get("name"):
                        rows.append(
                            {
                                "name": item["name"],
                                "image": item["image"],
                                "price": item.get("price"),
                                "source": "catalog",
                            }
                        )
                walk(node.get("subcategories") or [])

        walk(catalog.get("categories") or [])

    return rows


def match_fallback(name: str, index: list[dict], min_score: float = 0.62) -> dict | None:
    best: dict | None = None
    best_score = min_score
    for row in index:
        score = similarity(name, row["name"])
        if score > best_score:
            best_score = score
            best = {**row, "matchScore": round(score, 3)}
    return best


def bing_pns_image(name: str) -> str | None:
    query = f"site:medias.pns.hk {name}"
    for base in (
        "https://www.bing.com/images/search",
        "https://html.duckduckgo.com/html/",
    ):
        if "duckduckgo" in base:
            url = base + "?" + urllib.parse.urlencode({"q": query})
        else:
            url = base + "?" + urllib.parse.urlencode({"q": query, "first": "1"})
        try:
            resp = SESSION.get(url, timeout=20)
            resp.raise_for_status()
        except requests.RequestException:
            continue

        for match in re.finditer(
            r"https://medias\.pns\.hk/publishing/[^\"'&\s<>]+",
            resp.text,
        ):
            candidate = match.group(0)
            if "front-prodcat" in candidate or "PNSHK-" in candidate:
                return candidate
    return None


def lookup_web_only(name: str, index: list[dict] | None = None) -> dict | None:
    index = index if index is not None else load_fallback_index()
    hit = match_fallback(name, index)
    if hit and hit.get("image"):
        return hit

    image = bing_pns_image(name)
    if image:
        return {"name": name, "image": image, "price": None, "source": "bing_pns", "matchScore": None}
    return None
