"""Audit GraceRun catalog against ParknShop (pns.hk) and write a CSV.

Uses Playwright. High match threshold so we do not invent SKUs.
Priority aisles: Fresh Food, Drinks, Snacks, Instant Noodles.
"""

from __future__ import annotations

import argparse
import csv
import json
import re
import sys
import time
from pathlib import Path

from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "scripts"))

from enrich_from_parknshop import (  # noqa: E402
    CACHE,
    PNS_TIMEOUT_MS,
    STEALTH_JS,
    UA,
    score_match,
    search_query,
)
from fill_prices_from_parknshop import search_pns_prices  # noqa: E402
from sanitize_product_text import clean_brand, clean_name  # noqa: E402

CATALOG = ROOT / "packages/shared/data/foodpanda-fusion-catalog.json"
OUT_CSV = ROOT / "packages/shared/data/parknshop-menu-audit.csv"
OUT_JSON = ROOT / "packages/shared/data/parknshop-menu-audit.json"

PNS_NOISE = re.compile(
    r"\s*\[[^\]]*\]\s*\((?:chilled|frozen)[^)]*\)",
    re.I,
)

PRIORITY_AISLES = {
    "instant noodles",
    "snacks",
    "chips",
    "confectionary",
    "crackers",
    "biscuits",
    "drinks",
    "hot drinks",
    "chilled drinks",
}
PRIORITY_SECTIONS = {"fresh food"}

MATCH_VERIFY = 0.52
MATCH_APPLY = 0.58


def flatten() -> list[dict]:
    data = json.loads(CATALOG.read_text(encoding="utf-8"))
    rows = []
    for cat in data.get("categories") or []:
        for sub in cat.get("subcategories") or []:
            for it in sub.get("items") or []:
                rows.append(
                    {
                        "section": cat["name"],
                        "aisle": sub["name"],
                        "name": it.get("name") or "",
                        "brand": it.get("brand") or "",
                        "price": it.get("price"),
                        "image": it.get("image") or "",
                    }
                )
    return rows


def is_priority(row: dict) -> bool:
    if row["section"].strip().lower() in PRIORITY_SECTIONS:
        return True
    return row["aisle"].strip().lower() in PRIORITY_AISLES


def tidy_pns_name(raw: str, brand: str | None) -> str:
    text = PNS_NOISE.sub("", raw or "").strip()
    text = re.sub(r"\s+", " ", text)
    return clean_name(text, brand) if text else text


def prices_close(a, b) -> bool:
    try:
        fa, fb = float(a), float(b)
    except (TypeError, ValueError):
        return False
    if fa <= 0 or fb <= 0:
        return False
    return abs(fa - fb) <= 0.05 or abs(fa - fb) / max(fa, fb) <= 0.02


def image_kind(url: str) -> str:
    u = (url or "").lower()
    if "medias.pns.hk" in u:
        return "pns"
    if u.startswith("/images/catalog"):
        return "drive"
    if "unsplash" in u or "placehold" in u:
        return "generic"
    if u.startswith("http"):
        return "other"
    return "none"


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--priority-only", action="store_true")
    parser.add_argument("--limit", type=int, default=0)
    parser.add_argument("--delay", type=float, default=0.45)
    parser.add_argument("--apply", action="store_true")
    args = parser.parse_args()

    cache = json.loads(CACHE.read_text(encoding="utf-8")) if CACHE.exists() else {}
    rows = flatten()
    if args.priority_only:
        rows = [r for r in rows if is_priority(r)]
    else:
        rows = sorted(rows, key=lambda r: (0 if is_priority(r) else 1, r["section"], r["aisle"]))
    if args.limit:
        rows = rows[: args.limit]

    print(f"Auditing {len(rows)} products")
    results = []

    with sync_playwright() as p:
        browser = p.chromium.launch(
            headless=False,
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

        for i, row in enumerate(rows, 1):
            brand = clean_brand(row["brand"]) if row["brand"] else None
            query = search_query(brand, row["name"])
            hit = None
            score = 0.0
            try:
                hits = search_pns_prices(page, query)
                if hits:
                    ranked = sorted(
                        hits,
                        key=lambda h: score_match(query, brand, h.get("name") or ""),
                        reverse=True,
                    )
                    top = ranked[0]
                    score = score_match(query, brand, top.get("name") or "")
                    if score >= MATCH_VERIFY:
                        hit = top
            except Exception as exc:
                print(f"[{i}/{len(rows)}] ERR {row['name'][:50]}: {exc}")

            pns_name = tidy_pns_name(hit.get("name") or "", brand) if hit else ""
            pns_price = hit.get("price") if hit else None
            pns_image = hit.get("image") if hit else None
            if pns_image and pns_image.startswith("//"):
                pns_image = "https:" + pns_image

            name_ok = bool(pns_name) and score >= 0.72
            price_ok = prices_close(row["price"], pns_price) if pns_price is not None else False
            has_pns_img = bool(pns_image) and "medias.pns.hk" in (pns_image or "")
            current_pns_img = image_kind(row["image"]) == "pns"

            corr_name = pns_name or row["name"]
            corr_price = pns_price if pns_price is not None else row["price"]
            corr_cat = f"{row['section']} / {row['aisle']}"
            corr_img = pns_image or row["image"]

            if not hit:
                status = "Needs Fix"
                corr_name = row["name"]
                corr_price = row["price"]
                corr_img = row["image"]
            elif name_ok and price_ok and (current_pns_img or not has_pns_img):
                status = "Verified"
                corr_name = row["name"]
                corr_price = row["price"]
                corr_img = row["image"]
            else:
                status = "Needs Fix"

            rec = {
                "Product Name (Current)": row["name"],
                "Product Name (Corrected)": corr_name,
                "Price (Current)": row["price"],
                "Price (Corrected)": corr_price,
                "Category (Current)": f"{row['section']} / {row['aisle']}",
                "Category (Corrected)": corr_cat,
                "Image URL (Current)": row["image"],
                "Image URL (Corrected)": corr_img,
                "Status": status,
                "brand": brand or "",
                "pnsScore": round(score, 3),
                "priority": is_priority(row),
            }
            results.append(rec)
            tag = "OK" if status == "Verified" else "FIX"
            print(f"[{i}/{len(rows)}] {tag} {score:.2f} {row['name'][:48]}")

            cache_key = f"{brand} {row['name']}".strip() if brand else row["name"]
            if hit and score >= MATCH_APPLY:
                entry = cache.get(cache_key) or cache.get(row["name"]) or {}
                entry["pnsName"] = hit.get("name")
                entry["pnsUrl"] = hit.get("href")
                if pns_price is not None:
                    entry["price"] = pns_price
                if pns_image:
                    entry["image"] = pns_image
                    entry["imageSource"] = "pns-audit"
                cache[row["name"]] = entry
                cache[cache_key] = entry

            if i % 15 == 0:
                CACHE.write_text(json.dumps(cache, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
                write_csv(results)
            time.sleep(args.delay)

        browser.close()

    CACHE.write_text(json.dumps(cache, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    write_csv(results)
    OUT_JSON.write_text(json.dumps(results, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    verified = sum(1 for r in results if r["Status"] == "Verified")
    print(f"done verified={verified} needs_fix={len(results) - verified}")

    if args.apply:
        apply_catalog(results)


def write_csv(results: list[dict]) -> None:
    fields = [
        "Product Name (Current)",
        "Product Name (Corrected)",
        "Price (Current)",
        "Price (Corrected)",
        "Category (Current)",
        "Category (Corrected)",
        "Image URL (Current)",
        "Image URL (Corrected)",
        "Status",
    ]
    with OUT_CSV.open("w", encoding="utf-8", newline="") as f:
        w = csv.DictWriter(f, fieldnames=fields, extrasaction="ignore")
        w.writeheader()
        w.writerows(results)


def apply_catalog(results: list[dict]) -> None:
    data = json.loads(CATALOG.read_text(encoding="utf-8"))
    by_key = {}
    for rec in results:
        if rec["pnsScore"] < MATCH_APPLY:
            continue
        if rec["Status"] != "Needs Fix":
            continue
        by_key[rec["Product Name (Current)"]] = rec

    patched = 0
    for cat in data.get("categories") or []:
        for sub in cat.get("subcategories") or []:
            for it in sub.get("items") or []:
                rec = by_key.get(it.get("name"))
                if not rec:
                    continue
                new_name = rec["Product Name (Corrected)"]
                new_price = rec["Price (Corrected)"]
                new_img = rec["Image URL (Corrected)"]
                if new_name:
                    it["name"] = new_name
                if new_price is not None:
                    it["price"] = float(new_price)
                if new_img and str(new_img).startswith("http") and "medias.pns.hk" in str(new_img):
                    it["image"] = new_img
                patched += 1
    CATALOG.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"patched catalog items: {patched}")


if __name__ == "__main__":
    main()
