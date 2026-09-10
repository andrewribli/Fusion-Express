"""Fill catalog images and missing prices from ParknShop (pns.hk).

Uses Playwright to search pns.hk (urllib gets 403). Checkpoints progress to
packages/shared/data/parknshop-enrichment.json and patches the catalog JSON.

Usage:
  python -m pip install playwright openpyxl
  python -m playwright install chromium
  python scripts/enrich_from_parknshop.py
  python scripts/enrich_from_parknshop.py --limit 50
  python scripts/enrich_from_parknshop.py --only-missing-price
"""

from __future__ import annotations

import argparse
import json
import re
import time
import urllib.parse
import urllib.request
from difflib import SequenceMatcher
from pathlib import Path

import openpyxl
from playwright.sync_api import sync_playwright

from sanitize_product_text import clean_brand, clean_name, is_unknown

STEALTH_JS = """
Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
window.chrome = { runtime: {} };
"""

UA = (
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
    "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36"
)

ROOT = Path(__file__).resolve().parents[1]
XLSX = ROOT / "Product List Catalog.xlsx"
CATALOG = ROOT / "packages/shared/data/foodpanda-fusion-catalog.json"
CACHE = ROOT / "packages/shared/data/parknshop-enrichment.json"
OVERRIDES = ROOT / "packages/shared/data/product-image-overrides.json"

STOP = {
    "the", "and", "for", "with", "from", "unknown", "pack", "packaged",
    "product", "variant", "cut", "tray", "pieces", "piece", "pcs", "pc",
    "chilled", "frozen", "select", "facings", "facing", "visible", "second",
    "whole", "style", "prepared", "marinated", "mixed", "blue", "white",
    "left", "right", "pale", "pink", "yellow", "brown", "green", "purple",
    "netted", "mini", "jumbo", "herb", "seasoned", "original", "smoked",
    "basil", "flavor", "flavour", "flavoured", "flavored",
}

MEAT_SUBS = {"meat", "frozen meat"}
PNS_TIMEOUT_MS = 20_000
FOODPANDA_SOURCES = [
    ROOT / "FoodPanda Fusion Data.txt",
    ROOT / "FoodPanda Data2.txt",
]


def tokens(text: str) -> set[str]:
    return {
        t
        for t in re.findall(r"[a-z0-9]{3,}", text.lower())
        if t not in STOP
    }


def classify_meat(name: str, brand: str | None) -> str:
    n = f"{brand or ''} {name}".lower()
    if any(w in n for w in ("plant-based", "plant based", "meat zero", "vegetarian", "vegan")):
        return "Others"
    if any(w in n for w in ("salmon", "prawn", "shrimp", "fish", "seafood", "abalone", "duck leg", "confit duck")):
        return "Seafood"
    if any(w in n for w in ("chicken", "poultry", "wing", "thigh", "breast", "drumstick")):
        return "Chicken"
    if any(w in n for w in ("beef", "steak", "striploin", "angus", "grain fed", "hot pot beef", "halal beef")):
        return "Beef"
    if any(w in n for w in ("pork", "belly", "spare rib", "sparerib", "mince", "ground pork", "collar", "sausage", "bacon", "ham", "patty")):
        return "Pork"
    return "Others"


def search_query(brand: str | None, name: str) -> str:
    clean = re.sub(r"\bunknown\b", "", name, flags=re.I)
    clean = re.sub(r"\b(cut|variant|product|facings?|facing)\b.*$", "", clean, flags=re.I)
    clean = re.sub(r"\s+", " ", clean).strip()
    if brand and brand.lower() not in ("unknown",):
        bl = brand.lower()
        nl = clean.lower()
        if not nl.startswith(bl) and bl not in nl:
            clean = f"{brand} {clean}".strip()
    return clean[:120] if clean else name[:120]


def score_match(query: str, brand: str | None, hit_name: str) -> float:
    qtok = tokens(query)
    htok = tokens(hit_name)
    if not qtok or not htok:
        return 0.0
    overlap = len(qtok & htok) / max(len(qtok), 1)
    ratio = SequenceMatcher(None, query.lower(), hit_name.lower()).ratio()
    score = overlap * 0.65 + ratio * 0.35
    if brand and brand.lower() not in ("unknown",) and brand.lower() in hit_name.lower():
        score += 0.15
    if "select" in (brand or "").lower() and "select" in hit_name.lower():
        score += 0.1
    return score


def extract_hits(page, *, require_image: bool = True) -> list[dict]:
    hits: list[dict] = []
    seen: set[str] = set()
    links = page.locator('a[href*="/p/"]')
    count = links.count()
    for i in range(count):
        link = links.nth(i)
        try:
            href = link.get_attribute("href") or ""
            if not href or href in seen:
                continue
            name = (link.inner_text(timeout=1000) or "").strip()
            if len(name) < 8:
                continue
            card = link.locator(
                "xpath=ancestor::*[contains(@class,'product') or contains(@class,'item')][1]"
            )
            if card.count() == 0:
                card = link.locator("xpath=ancestor::div[4]")
            img = card.locator('img[src*="medias.pns.hk"]').first
            image = img.get_attribute("src") or "" if img.count() else ""
            if require_image and not image:
                continue
            card_text = card.inner_text(timeout=1000) if card.count() else name
            prices = re.findall(r"\$([0-9]+(?:\.[0-9]{2})?)", card_text or "")
            price = None
            for raw in prices:
                val = float(raw)
                if 1 <= val <= 5000:
                    price = val
                    break
            seen.add(href)
            hits.append(
                {
                    "name": name,
                    "href": href,
                    "image": image or None,
                    "price": price,
                }
            )
        except Exception:
            continue
    return hits


def load_foodpanda_images() -> dict[str, str]:
    images: dict[str, str] = {}
    for path in FOODPANDA_SOURCES:
        if not path.exists():
            continue
        for line in path.read_text(encoding="utf-8", errors="replace").splitlines():
            if not line or line.startswith("(index)") or line.startswith("name\t"):
                continue
            parts = line.split("\t")
            if len(parts) < 5:
                continue
            name = parts[1].strip().strip("'").strip('"')
            image = parts[4].strip().strip("'").strip('"')
            if name and image.startswith("http"):
                images[name.lower()] = image
    return images


def fuzzy_image(name: str, brand: str | None, pool: dict[str, str]) -> str | None:
    key = name.lower()
    if key in pool:
        return pool[key]
    qtok = tokens(f"{brand or ''} {name}")
    best = None
    best_score = 0.0
    for other, url in pool.items():
        score = len(qtok & tokens(other)) / max(len(qtok), 1)
        if score > best_score:
            best_score = score
            best = url
    return best if best_score >= 0.45 else None


def search_pns(page, query: str) -> list[dict]:
    url = "https://www.pns.hk/en/search?q=" + urllib.parse.quote(query)
    page.goto(url, wait_until="domcontentloaded", timeout=45000)
    page.wait_for_timeout(3000)
    try:
        page.wait_for_selector('img[src*="medias.pns.hk"]', timeout=15000)
    except Exception:
        return []
    hits = extract_hits(page)
    if hits:
        return hits
    # Retry with shorter query (brand + first few words).
    short = " ".join(query.split()[:5])
    if short != query:
        url = "https://www.pns.hk/en/search?q=" + urllib.parse.quote(short)
        page.goto(url, wait_until="domcontentloaded", timeout=45000)
        page.wait_for_timeout(3000)
        hits = extract_hits(page)
    return hits


def best_hit(query: str, brand: str | None, hits: list[dict]) -> dict | None:
    if not hits:
        return None
    ranked = sorted(
        hits,
        key=lambda h: score_match(query, brand, h.get("name") or ""),
        reverse=True,
    )
    top = ranked[0]
    if score_match(query, brand, top.get("name") or "") < 0.18:
        return None
    return top


def load_catalog_items() -> list[dict]:
    data = json.loads(CATALOG.read_text(encoding="utf-8"))
    items: list[dict] = []

    def walk(nodes, section: str):
        for node in nodes or []:
            for it in node.get("items") or []:
                items.append({**it, "section": section, "sheetSub": node.get("name")})
            walk(node.get("subcategories"), section)

    for cat in data.get("categories") or []:
        walk(cat.get("subcategories"), cat.get("name") or "")
    return items


def patch_catalog(cache: dict[str, dict]) -> None:
    data = json.loads(CATALOG.read_text(encoding="utf-8"))

    def walk(nodes):
        for node in nodes or []:
            for it in node.get("items") or []:
                key = it["name"]
                hit = cache.get(key)
                if not hit:
                    continue
                if hit.get("image"):
                    it["image"] = hit["image"]
                if hit.get("price") is not None and (it.get("price") in (None, 0, 0.0) or not it.get("price")):
                    it["price"] = hit["price"]
                if hit.get("subcategory"):
                    it["subcategory"] = hit["subcategory"]
            walk(node.get("subcategories"))

    for cat in data.get("categories") or []:
        walk(cat.get("subcategories"))
    CATALOG.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

    overrides: dict[str, str] = {}
    if OVERRIDES.exists():
        overrides = json.loads(OVERRIDES.read_text(encoding="utf-8"))
    for name, hit in cache.items():
        if hit.get("image"):
            overrides[name] = hit["image"]
    OVERRIDES.write_text(json.dumps(overrides, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def patch_excel(cache: dict[str, dict]) -> None:
    if not XLSX.exists():
        return
    wb = openpyxl.load_workbook(XLSX)
    ws = wb["Sheet1"]
    rows = list(ws.iter_rows(min_row=2))
    for row in rows:
        name_cell = row[2]
        if not name_cell.value:
            continue
        name = str(name_cell.value).strip()
        hit = cache.get(name)
        if not hit:
            continue
        if hit.get("price") is not None and row[3].value is None:
            row[3].value = hit["price"]
        if hit.get("subcategory") and row[5].value in (None, "Meat", "Frozen Meat"):
            row[5].value = hit["subcategory"]
        if hit.get("image") and len(row) > 11:
            row[11].value = hit["image"]
    try:
        wb.save(XLSX)
    except PermissionError:
        print(f"Warning: could not save {XLSX} (file may be open in Excel)")


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--limit", type=int, default=0)
    parser.add_argument("--only-missing-price", action="store_true")
    parser.add_argument("--delay", type=float, default=1.0)
    parser.add_argument(
        "--headless",
        action="store_true",
        help="Use headless Chromium (often blocked by pns.hk; prefer xvfb-run without this flag)",
    )
    parser.add_argument(
        "--web-only",
        action="store_true",
        help="Skip ParknShop browser search; use FoodPanda + web image fallbacks only",
    )
    args = parser.parse_args()

    fp_images = load_foodpanda_images()
    cache: dict[str, dict] = {}
    if CACHE.exists():
        cache = json.loads(CACHE.read_text(encoding="utf-8"))

    items = load_catalog_items()
    todo: list[dict] = []
    for it in items:
        name = it["name"]
        if name in cache and cache[name].get("image") and (
            not args.only_missing_price or cache[name].get("price") is not None or it.get("price")
        ):
            continue
        if args.only_missing_price and it.get("price") not in (None, 0, 0.0):
            if name in cache and cache[name].get("image"):
                continue
        todo.append(it)

    if args.limit:
        todo = todo[: args.limit]

    print(f"Enriching {len(todo)} products ({len(cache)} already cached)")

    stats = {"matched": 0, "images": 0, "prices": 0, "miss": 0}

    browser = context = page = None
    playwright_ctx = None
    if not args.web_only:
        playwright_ctx = sync_playwright().start()
        browser = playwright_ctx.chromium.launch(
            headless=args.headless,
            args=["--disable-blink-features=AutomationControlled", "--no-sandbox"],
        )
        context = browser.new_context(
            user_agent=UA,
            locale="en-HK",
            viewport={"width": 1365, "height": 900},
        )
        context.add_init_script(STEALTH_JS)
        page = context.new_page()
        page.set_default_timeout(PNS_TIMEOUT_MS)

    try:
        for i, it in enumerate(todo, 1):
            name = it["name"]
            brand = it.get("brand")
            sub = (it.get("subcategory") or it.get("sheetSub") or "").strip()
            query = search_query(brand, name)
            meat_sub = None
            if sub.lower() in MEAT_SUBS or sub.lower() == "frozen meat":
                meat_sub = classify_meat(name, brand)

            hit = None
            if page is not None:
                try:
                    hits = search_pns(page, query)
                    hit = best_hit(query, brand, hits)
                except Exception as exc:
                    print(f"[{i}/{len(todo)}] ERR {name}: {exc}")

            entry: dict = cache.get(name, {})
            if hit:
                stats["matched"] += 1
                if hit.get("image"):
                    entry["image"] = hit["image"]
                    stats["images"] += 1
                if hit.get("price") is not None and it.get("price") in (None, 0, 0.0):
                    entry["price"] = hit["price"]
                    stats["prices"] += 1
                pns_name = hit.get("name") or ""
                entry["pnsName"] = pns_name
                entry["pnsUrl"] = hit.get("href")
                if is_unknown(brand) and pns_name:
                    entry["pnsBrand"] = clean_brand(pns_name.split()[0])
                if "unknown" in name.lower() and pns_name:
                    entry["resolvedName"] = clean_name(
                        name, entry.get("pnsBrand"), it.get("subcategory"), pns_name=pns_name
                    )
                print(f"[{i}/{len(todo)}] PNS {name} -> {pns_name[:60]}")
            else:
                fallback = fuzzy_image(name, brand, fp_images)
                source = "foodpanda"
                if not fallback:
                    try:
                        from fill_product_images import find_image

                        _, fallback, src = find_image(name, fp_images)
                        source = src or "web"
                    except Exception:
                        fallback = None
                if fallback:
                    entry["image"] = fallback
                    entry["imageSource"] = source
                    stats["images"] += 1
                    print(f"[{i}/{len(todo)}] {source.upper()} {name}")
                else:
                    stats["miss"] += 1
                    print(f"[{i}/{len(todo)}] MISS {name} ({query})")

            if meat_sub:
                entry["subcategory"] = meat_sub
            cache[name] = entry

            if i % 10 == 0:
                CACHE.write_text(json.dumps(cache, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
                patch_catalog(cache)
            time.sleep(args.delay)
    finally:
        if browser is not None:
            browser.close()
        if playwright_ctx is not None:
            playwright_ctx.stop()

    CACHE.write_text(json.dumps(cache, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    patch_catalog(cache)
    patch_excel(cache)
    print("done", stats, "cache", len(cache))


if __name__ == "__main__":
    main()
