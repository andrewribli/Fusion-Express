"""Upsert verified ParknShop snack products into Firestore `products`.

Requires a Firebase Admin service account:
  FIREBASE_SERVICE_ACCOUNT_PATH=./firebase-service-account.json
  # or place firebase-service-account.json / *firebase-adminsdk*.json at repo root

Usage (from repo root):
  python scripts/import_parknshop_snacks_firestore.py
  FIRESTORE_PRODUCTS_COLLECTION=products_test python scripts/import_parknshop_snacks_firestore.py

This replaces snack/chips aisle docs that match the verified id list and writes
each product with category "Snacks".
"""

from __future__ import annotations

import json
import os
from pathlib import Path

import firebase_admin
from firebase_admin import credentials, firestore

ROOT = Path(__file__).resolve().parents[1]
DATA = ROOT / "packages" / "shared" / "data" / "parknshop-snacks-verified.json"
COLLECTION = os.environ.get("FIRESTORE_PRODUCTS_COLLECTION", "products")

# Legacy snack/chip names from older catalogs / live menus to soft-retire.
RETIRE_NAME_SUBSTRINGS = (
    "curry beef brisket potato chips",
    "typhoon shelter fried crab potato chips",
    "hot & spicy potato chips",
)


def find_service_account() -> Path:
    env = os.environ.get("FIREBASE_SERVICE_ACCOUNT_PATH", "")
    candidates: list[Path] = []
    if env:
        candidates.append(Path(env))
    candidates.append(ROOT / "firebase-service-account.json")
    candidates.extend(sorted(ROOT.glob("*firebase-adminsdk*.json")))
    for path in candidates:
        resolved = path if path.is_absolute() else ROOT / path
        if resolved.exists():
            return resolved
    raise SystemExit(
        "Missing Firebase service account JSON. "
        "Set FIREBASE_SERVICE_ACCOUNT_PATH or place firebase-service-account.json "
        "in the repo root, then re-run this script to update Firestore."
    )


def main() -> None:
    sa_path = find_service_account()
    snacks = json.loads(DATA.read_text(encoding="utf-8"))
    if not firebase_admin._apps:
        firebase_admin.initialize_app(credentials.Certificate(str(sa_path)))
    db = firestore.client()

    batch = db.batch()
    count = 0
    for index, item in enumerate(snacks):
        doc_id = item["id"]
        # Prefer bundled local image for UI (PNS CDN is geo-blocked outside HK).
        # Keep the verified ParknShop URL on `imagePns`.
        image = item.get("localImage") or item.get("displayImage") or item["image"]
        payload = {
            "id": doc_id,
            "name": f"{item['brand']} {item['name']}".replace("  ", " ").strip().rstrip("."),
            "brand": item["brand"],
            "price": item["price"],
            "category": "Snacks",
            "subcategory": "Snacks",
            "image": image,
            "imagePns": item["image"],
            "weightKg": item["weight"],
            "unit": item.get("unit") or "bag",
            "inStock": True,
            "priceType": "fixed",
            "sourceIndex": index,
            "pnsCode": item.get("pnsCode"),
            "pnsUrl": item.get("pnsUrl"),
            "sizeLabel": item.get("sizeLabel"),
        }
        if item.get("bulkDealPrice") is not None:
            payload["bulkDealPrice"] = item["bulkDealPrice"]
        if item.get("bulkDealQty") is not None:
            payload["bulkDealQty"] = item["bulkDealQty"]
        ref = db.collection(COLLECTION).document(doc_id)
        batch.set(ref, payload, merge=True)
        count += 1

    batch.commit()
    print(f"Upserted {count} verified snack docs into `{COLLECTION}`.")

    # Soft-retire known outdated chip names if present (mark out of stock).
    retired = 0
    for snap in db.collection(COLLECTION).stream():
        data = snap.to_dict() or {}
        name = str(data.get("name") or "").lower()
        if any(s in name for s in RETIRE_NAME_SUBSTRINGS):
            snap.reference.set({"inStock": False, "retired": True}, merge=True)
            retired += 1
    if retired:
        print(f"Marked {retired} legacy snack docs out of stock.")


if __name__ == "__main__":
    main()
