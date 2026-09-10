"""Enrich Product List Catalog.xlsx items with ParknShop images and prices."""

from __future__ import annotations

import argparse
import json
import re
import sys
import time
import urllib.parse
from datetime import UTC, datetime
from difflib import SequenceMatcher
from pathlib import Path

import openpyxl
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
XLSX = ROOT / "Product List Catalog.xlsx"
CACHE = ROOT / "packages" / "shared" / "data" / "parknshop-enrichment.json"

sys.path.insert(0, str(ROOT / "scripts"))
from fill_product_images import load_fallback_index, lookup_web_only  # noqa: E402

CHECKPOINT_EVERY = 10
PNS_HOME = "https://www.pns.hk/en/"


def normalize_name(name: str) -> str:
    s = re.sub(r"[^a-z0-9]+", " ", name.lower())
    return " ".join(s.split())


def name_score(query: str, candidate: str) -> float:
    nq, nc = normalize_name(query), normalize_name(candidate)
    if not nq or not nc:
        return 0.0
    if nq == nc:
        return 1.0
    if nq in nc or nc in nq:
        return 0.93
    return SequenceMatcher(None, nq, nc).ratio()


def extract_weight_tokens(name: str) -> set[str]:
    return set(re.findall(r"\d+(?:\.\d+)?\s*(?:g|kg|ml|l|oz|lb|pcs?|pieces?)", name.lower()))


def pick_best_product(query: str, products: list[dict]) -> dict | None:
    if not products:
        return None
    q_weights = extract_weight_tokens(query)
    best: dict | None = None
    best_score = 0.55
    for product in products:
        pname = product.get("name") or ""
        score = name_score(query, pname)
        p_weights = extract_weight_tokens(pname)
        if q_weights and p_weights:
            if q_weights & p_weights:
                score += 0.08
            elif q_weights != p_weights:
                score -= 0.12
        if score > best_score:
            best_score = score
            best = product
    return best


def parse_pns_price(product: dict) -> float | None:
    for key in ("elabPromoPrice", "price"):
        val = product.get(key)
        if isinstance(val, dict) and val.get("value") is not None:
            return round(float(val["value"]), 2)
    return None


def parse_pns_image(product: dict) -> str | None:
    for key in ("images", "galleryImages"):
        images = product.get(key) or []
        for img in images:
            url = img.get("url") if isinstance(img, dict) else img
            if url and "medias.pns.hk" in url and "front-prodcat" in url:
                return url
    thumb = product.get("thumbnail")
    if isinstance(thumb, dict) and thumb.get("url"):
        return thumb["url"]
    return None


def load_workbook_rows() -> list[dict]:
    for attempt in range(5):
        try:
            wb = openpyxl.load_workbook(XLSX, read_only=True, data_only=True)
            break
        except PermissionError:
            if attempt == 4:
                raise
            time.sleep(2)
    ws = wb["Sheet1"]
    rows = list(ws.iter_rows(values_only=True))
    products: list[dict] = []
    for row in rows[1:]:
        if not row or len(row) < 6 or not row[2]:
            continue
        products.append(
            {
                "name": str(row[2]).strip(),
                "brand": str(row[1]).strip() if row[1] else None,
                "excelPrice": float(row[3]) if row[3] is not None else None,
                "category": str(row[4]).strip() if row[4] else "Groceries",
                "subcategory": str(row[5]).strip() if row[5] else "Other",
            }
        )
    return products


def load_cache() -> dict:
    if CACHE.exists():
        return json.loads(CACHE.read_text(encoding="utf-8"))
    return {"items": {}, "stats": {}, "updatedAt": None}


def save_cache(cache: dict) -> None:
    cache["updatedAt"] = datetime.now(UTC).isoformat()
    CACHE.parent.mkdir(parents=True, exist_ok=True)
    CACHE.write_text(json.dumps(cache, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def cache_key(name: str) -> str:
    return normalize_name(name)


def fetch_pns_search(page, query: str) -> list[dict]:
    q = urllib.parse.quote(f"{query}:mostRelevant")
    api = (
        "https://api.pns.hk/api/v2/pnshk/products/search?"
        f"fields=FULL&query={q}&pageSize=18&sort=mostRelevant&brandRedirect=true"
        "&ignoreSort=false&stockDeliveryMode=HomeDelivery&lang=en_HK&curr=HKD"
    )
    data = page.evaluate(
        """async (url) => {
          const resp = await fetch(url);
          if (!resp.ok) return { error: resp.status, products: [] };
          return await resp.json();
        }""",
        api,
    )
    if isinstance(data, dict) and data.get("error"):
        return []
    return (data or {}).get("products") or []


def enrich_browser(page, product: dict, delay: float, only_missing_price: bool) -> dict | None:
    key = cache_key(product["name"])
    existing = product.get("_existing") or {}
    if only_missing_price and existing.get("price"):
        return None

    search_query = product["name"]
    if product.get("brand") and product["brand"].lower() not in search_query.lower():
        search_query = f"{product['brand']} {product['name']}"

    products = fetch_pns_search(page, search_query)
    time.sleep(delay)
    if not products and product.get("brand"):
        products = fetch_pns_search(page, product["name"])
        time.sleep(delay)

    match = pick_best_product(product["name"], products)
    if not match:
        words = [w for w in re.split(r"\W+", product["name"]) if len(w) > 2][:6]
        if len(words) >= 3:
            short_query = " ".join(words)
            products = fetch_pns_search(page, short_query)
            time.sleep(delay)
            match = pick_best_product(product["name"], products)
    if not match:
        return None

    image = parse_pns_image(match)
    price = parse_pns_price(match)
    entry = {
        "name": product["name"],
        "subcategory": product["subcategory"],
        "category": product["category"],
        "pnsCode": match.get("code"),
        "pnsName": match.get("name"),
        "source": "pns",
    }
    if image and not (only_missing_price and existing.get("image")):
        entry["image"] = image
    if price is not None:
        entry["price"] = price
    elif product.get("excelPrice") is not None:
        entry["price"] = round(float(product["excelPrice"]), 2)
    if "image" not in entry and "price" not in entry:
        return None
    return entry


def enrich_web(product: dict, fallback_index: list[dict], only_missing_price: bool) -> dict | None:
    existing = product.get("_existing") or {}
    if only_missing_price and existing.get("price"):
        return None
    if not only_missing_price and existing.get("image") and existing.get("price"):
        return None

    hit = lookup_web_only(product["name"], fallback_index)
    if not hit:
        return None

    entry = {
        "name": product["name"],
        "subcategory": product["subcategory"],
        "category": product["category"],
        "source": hit.get("source", "fallback"),
    }
    if hit.get("image") and not (only_missing_price and existing.get("image")):
        entry["image"] = hit["image"]
    price = hit.get("price")
    if price is not None:
        entry["price"] = round(float(price), 2)
    elif product.get("excelPrice") and not existing.get("price"):
        entry["price"] = product["excelPrice"]
    if "image" not in entry and "price" not in entry:
        return None
    return entry


def merge_entry(cache: dict, entry: dict) -> None:
    key = cache_key(entry["name"])
    prev = cache["items"].get(key, {})
    merged = {**prev, **entry}
    if prev.get("subcategory") and entry.get("subcategory"):
        merged["subcategory"] = prev["subcategory"]
    cache["items"][key] = merged


def compute_stats(cache: dict, total: int) -> dict:
    items = cache.get("items", {})
    with_image = sum(1 for v in items.values() if v.get("image"))
    with_price = sum(1 for v in items.values() if v.get("price"))
    by_source: dict[str, int] = {}
    for v in items.values():
        src = v.get("source") or "unknown"
        by_source[src] = by_source.get(src, 0) + 1
    return {
        "totalProducts": total,
        "cachedItems": len(items),
        "withImage": with_image,
        "withPrice": with_price,
        "bySource": by_source,
    }


def run(args: argparse.Namespace) -> None:
    products = load_workbook_rows()
    cache = load_cache()
    fallback_index = load_fallback_index() if args.web_only else None
    processed = 0

    def attach_existing(prod: dict) -> dict:
        prod = dict(prod)
        prod["_existing"] = cache["items"].get(cache_key(prod["name"]), {})
        return prod

    if args.web_only:
        todo = []
        for prod in products:
            prod = attach_existing(prod)
            key = cache_key(prod["name"])
            existing = cache["items"].get(key, {})
            if args.only_missing_price:
                if not existing.get("price"):
                    todo.append(prod)
            elif not existing.get("image"):
                todo.append(prod)
        print(f"Web-only pass for {len(todo)} / {len(products)} products")
        for idx, prod in enumerate(todo, start=1):
            entry = enrich_web(prod, fallback_index or [], args.only_missing_price)
            if entry:
                merge_entry(cache, entry)
            processed += 1
            if processed % CHECKPOINT_EVERY == 0:
                cache["stats"] = compute_stats(cache, len(products))
                save_cache(cache)
                print(f"Checkpoint {processed}/{len(todo)}")
        cache["stats"] = compute_stats(cache, len(products))
        save_cache(cache)
        print(json.dumps(cache["stats"], indent=2))
        return

    todo = []
    for prod in products:
        prod = attach_existing(prod)
        key = cache_key(prod["name"])
        existing = cache["items"].get(key, {})
        if args.only_missing_price:
            if not existing.get("price"):
                todo.append(prod)
        elif not existing.get("image"):
            todo.append(prod)

    print(f"Browser pass for {len(todo)} / {len(products)} products")

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=args.headless)
        context = browser.new_context(
            viewport={"width": 1280, "height": 900},
            locale="en-HK",
        )
        page = context.new_page()
        page.goto(PNS_HOME, wait_until="domcontentloaded", timeout=90000)
        page.wait_for_timeout(3000)
        if "Access Denied" in page.title():
            browser.close()
            raise SystemExit("ParknShop returned Access Denied — rerun with --web-only")

        for idx, prod in enumerate(todo, start=1):
            try:
                entry = enrich_browser(page, prod, args.delay, args.only_missing_price)
                if entry:
                    merge_entry(cache, entry)
            except Exception as exc:  # noqa: BLE001
                print(f"Error on {prod['name'][:60]}: {exc}")
            processed += 1
            if processed % CHECKPOINT_EVERY == 0:
                cache["stats"] = compute_stats(cache, len(products))
                save_cache(cache)
                print(f"Checkpoint {processed}/{len(todo)}")
        browser.close()

    cache["stats"] = compute_stats(cache, len(products))
    save_cache(cache)
    print(json.dumps(cache["stats"], indent=2))


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--delay", type=float, default=0.8, help="Delay between PNS queries")
    parser.add_argument("--headless", action="store_true", help="Run Chromium headless")
    parser.add_argument("--web-only", action="store_true", help="Use Foodpanda files + Bing fallback")
    parser.add_argument(
        "--only-missing-price",
        action="store_true",
        help="Only fill prices for items still missing price",
    )
    args = parser.parse_args()
    run(args)


if __name__ == "__main__":
    main()
