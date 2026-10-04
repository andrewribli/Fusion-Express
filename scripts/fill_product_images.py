"""Find real pack shots for catalog items missing photos.

Sources: Bing image search, Wikimedia Commons, Wikipedia, Open Food Facts.
Skips Unsplash / stock grocery / aisle photos.
"""

from __future__ import annotations

import json
import re
import time
import urllib.parse
import urllib.request
from concurrent.futures import ThreadPoolExecutor, as_completed
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
CATALOG = ROOT / "packages/shared/data/foodpanda-fusion-catalog.json"
MENU = ROOT / "packages/shared/data/menu.json"
OUT = ROOT / "packages/shared/data/product-image-overrides.json"

UA = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36"
    )
}

STOP = {
    "the", "and", "for", "with", "from", "pack", "packs", "piece", "pieces",
    "pcs", "pc", "save", "hong", "kong", "original", "extra", "large", "small",
    "jumbo", "mini", "style", "flavoured", "flavored", "flavour", "flavor",
    "new", "set", "twin", "lite", "added", "of", "in",
}

PREFERRED = (
    "hktvmall.com",
    "images.hktvmall.com",
    "cdn-media.hktvmall.com",
    "foodpanda.dhmedia.io",
    "images.deliveryhero.io",
    "pns.hk",
    "parknshop",
    "wellcome.com",
    "openfoodfacts.org",
    "images.openfoodfacts.org",
    "images.openbeautyfacts.org",
    "images.openproductsfacts.org",
)

REJECT_HOST = (
    "unsplash.com",
    "pexels.com",
    "pixabay.com",
    "gettyimages",
    "istockphoto",
    "shutterstock",
    "placehold.co",
    "wsimg.com",
)


def tokens(name: str) -> list[str]:
    raw = re.findall(r"[a-zA-Z]{3,}|[0-9]{2,}", name.lower())
    return [t for t in raw if t not in STOP]


def overlap(a: list[str], b: list[str]) -> int:
    return len(set(a) & set(b))


def get_bytes(url: str, timeout: int = 20) -> bytes | None:
    try:
        req = urllib.request.Request(url, headers=UA)
        with urllib.request.urlopen(req, timeout=timeout) as r:
            return r.read()
    except Exception:
        return None


def get_json(url: str) -> dict | list | None:
    raw = get_bytes(url)
    if not raw:
        return None
    try:
        return json.loads(raw.decode("utf-8", "replace"))
    except Exception:
        return None


def walk_catalog(data: dict) -> list[dict]:
    items: list[dict] = []

    def walk(nodes):
        for n in nodes or []:
            items.extend(n.get("items") or [])
            walk(n.get("subcategories"))

    for c in data.get("categories") or []:
        walk(c.get("subcategories"))
    return items


def rank_url(url: str) -> int:
    u = url.lower()
    if any(h in u for h in REJECT_HOST):
        return -1
    for i, host in enumerate(PREFERRED):
        if host in u:
            return 100 - i
    if u.endswith((".jpg", ".jpeg", ".png", ".webp")) or ".jpg?" in u or ".png?" in u:
        return 10
    return 5


def bing_images(name: str) -> str | None:
    queries = [
        f"{name} site:medias.pns.hk",
        f"{name} site:pns.hk",
        f"{name} site:hktvmall.com",
        f"{name} site:openfoodfacts.org",
        f"{name} site:foodpanda.hk",
    ]
    qtok = tokens(name)
    for q in queries:
        url = "https://www.bing.com/images/search?" + urllib.parse.urlencode(
            {"q": q, "qft": "+filterui:photo-photo", "form": "IRFLTR"}
        )
        raw = get_bytes(url, timeout=18)
        if not raw:
            continue
        html = raw.decode("utf-8", "replace")
        urls = re.findall(r"murl&quot;:&quot;(https?:.*?)&quot;", html)
        best = None
        best_rank = 0
        for img in urls[:20]:
            img = img.replace("\\u0026", "&")
            rank = rank_url(img)
            if rank < 90:
                continue
            score = rank + overlap(qtok, tokens(urllib.parse.unquote(img))) * 4
            if score > best_rank:
                best_rank = score
                best = img
        if best:
            return best
    return None


def commons_url(title: str) -> str | None:
    url = "https://commons.wikimedia.org/w/api.php?" + urllib.parse.urlencode(
        {
            "action": "query",
            "titles": title,
            "prop": "imageinfo",
            "iiprop": "url|mime",
            "iiurlwidth": 640,
            "format": "json",
        }
    )
    data = get_json(url)
    if not isinstance(data, dict):
        return None
    for page in data.get("query", {}).get("pages", {}).values():
        info = (page.get("imageinfo") or [{}])[0]
        if not str(info.get("mime") or "").startswith("image/"):
            continue
        return info.get("thumburl") or info.get("url")
    return None


def search_commons(name: str) -> str | None:
    qtok = tokens(name)
    if not qtok:
        return None
    url = "https://commons.wikimedia.org/w/api.php?" + urllib.parse.urlencode(
        {
            "action": "query",
            "list": "search",
            "srsearch": " ".join(qtok[:7]),
            "srnamespace": 6,
            "srlimit": 6,
            "format": "json",
        }
    )
    data = get_json(url)
    if not isinstance(data, dict):
        return None
    best = None
    best_score = 0
    for hit in data.get("query", {}).get("search", []):
        title = hit.get("title") or ""
        if not title.lower().startswith("file:"):
            continue
        if title.lower().endswith((".pdf", ".djvu")) or ".djvu" in title.lower():
            continue
        blob = title.lower()
        if any(
            bad in blob
            for bad in (
                "dictionary",
                "shelves",
                "supermarket",
                "map of",
                "production",
                "anatomy",
                "illustration",
                "köhler",
                "kohler",
            )
        ):
            continue
        blob = title.lower()
        score = overlap(qtok, tokens(title)) * 2
        if qtok[0] in blob:
            score += 3
        if score > best_score:
            best_score = score
            best = title
    if best_score < 5 or not qtok or qtok[0] not in (best or "").lower():
        return None
    return commons_url(best)


def search_wikipedia(name: str) -> str | None:
    qtok = tokens(name)
    url = "https://en.wikipedia.org/w/api.php?" + urllib.parse.urlencode(
        {
            "action": "query",
            "generator": "search",
            "gsrsearch": " ".join(qtok[:6]),
            "gsrlimit": 4,
            "prop": "pageimages",
            "piprop": "thumbnail",
            "pithumbsize": 640,
            "format": "json",
        }
    )
    data = get_json(url)
    if not isinstance(data, dict):
        return None
    best = None
    best_score = 0
    for page in (data.get("query", {}).get("pages") or {}).values():
        thumb = (page.get("thumbnail") or {}).get("source")
        if not thumb:
            continue
        score = overlap(qtok, tokens(page.get("title") or "")) * 3
        if qtok and qtok[0] in (page.get("title") or "").lower():
            score += 3
        if score > best_score:
            best_score = score
            best = thumb
    if best_score < 3:
        return None
    return best


def search_off(name: str) -> str | None:
    qtok = tokens(name)
    if not qtok:
        return None
    queries = [" ".join(qtok[:7]), " ".join(qtok[:4]), " ".join(qtok[:2])]
    best = None
    best_score = 0
    for q in queries:
        url = "https://world.openfoodfacts.org/cgi/search.pl?" + urllib.parse.urlencode(
            {
                "search_terms": q,
                "search_simple": 1,
                "action": "process",
                "json": 1,
                "page_size": 8,
            }
        )
        data = get_json(url)
        if not isinstance(data, dict):
            continue
        for p in data.get("products") or []:
            img = p.get("image_url") or p.get("image_front_url")
            if not img:
                continue
            pname = p.get("product_name") or ""
            brands = p.get("brands") or ""
            blob = f"{pname} {brands}".lower()
            score = overlap(qtok, tokens(pname)) * 3 + overlap(qtok, tokens(brands)) * 2
            if qtok[0] in blob:
                score += 4
            if score > best_score:
                best_score = score
                best = img
        if best_score >= 6:
            break
    if best_score < 6:
        return None
    return best


def neighbor_image(name: str, catalog_images: dict[str, str]) -> str | None:
    qtok = tokens(name)
    if not qtok:
        return None
    best = None
    best_score = 0
    for other, img in catalog_images.items():
        if other == name:
            continue
        otok = tokens(other)
        if not otok or qtok[0] != otok[0]:
            continue
        shared = set(qtok) & set(otok)
        score = len(shared)
        if score < 3:
            continue
        if score < 4 and not (shared - set(qtok[:2])):
            continue
        if score > best_score:
            best_score = score
            best = img
    if best_score < 3:
        return None
    return best


def find_image(
    name: str, catalog_images: dict[str, str]
) -> tuple[str, str | None, str]:
    img = neighbor_image(name, catalog_images)
    if img:
        return name, img, "catalog"
    img = search_off(name)
    if img:
        return name, img, "off"
    img = bing_images(name)
    if img:
        return name, img, "bing"
    img = search_commons(name)
    if img:
        return name, img, "commons"
    return name, None, ""


def collect_needed() -> tuple[list[str], dict[str, str]]:
    names: list[str] = []
    catalog_images: dict[str, str] = {}
    catalog = json.loads(CATALOG.read_text(encoding="utf-8"))
    for item in walk_catalog(catalog):
        if item.get("image"):
            catalog_images[item["name"]] = item["image"]
        else:
            names.append(item["name"])
    menu = json.loads(MENU.read_text(encoding="utf-8"))
    for item in menu.get("items") or []:
        image = item.get("image") or ""
        if (not image) or ("unsplash" in image) or ("placehold.co" in image):
            names.append(item["name"])
    seen: set[str] = set()
    out: list[str] = []
    for n in names:
        if n not in seen:
            seen.add(n)
            out.append(n)
    return out, catalog_images


def main() -> None:
    existing: dict[str, str] = {}
    if OUT.exists():
        existing = json.loads(OUT.read_text(encoding="utf-8"))
    needed, catalog_images = collect_needed()
    needed = [n for n in needed if n not in existing]
    print(f"Need images for {len(needed)} products ({len(existing)} already saved)")
    stats: dict[str, int] = {}
    misses: list[str] = []
    workers = 4
    with ThreadPoolExecutor(max_workers=workers) as pool:
        futs = [pool.submit(find_image, name, catalog_images) for name in needed]
        done = 0
        for fut in as_completed(futs):
            name, img, src = fut.result()
            done += 1
            if img:
                existing[name] = img
                stats[src] = stats.get(src, 0) + 1
                print(f"[{done}/{len(needed)}] {src}: {name}")
            else:
                misses.append(name)
                print(f"[{done}/{len(needed)}] MISS: {name}")
            if done % 20 == 0:
                OUT.write_text(
                    json.dumps(existing, ensure_ascii=False, indent=2) + "\n",
                    encoding="utf-8",
                )
    OUT.write_text(json.dumps(existing, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    catalog = json.loads(CATALOG.read_text(encoding="utf-8"))

    def patch(nodes):
        for n in nodes or []:
            for it in n.get("items") or []:
                if not it.get("image") and it["name"] in existing:
                    it["image"] = existing[it["name"]]
            patch(n.get("subcategories"))

    for c in catalog.get("categories") or []:
        patch(c.get("subcategories"))
    CATALOG.write_text(json.dumps(catalog, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print("stats", stats, "saved", len(existing), "misses", len(misses))
    if misses:
        (ROOT / "scripts" / "_image_misses.txt").write_text(
            "\n".join(misses), encoding="utf-8"
        )


if __name__ == "__main__":
    import sys

    try:
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    except Exception:
        pass
    main()
