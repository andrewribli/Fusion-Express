"""
Import cleaned Foodpanda Fusion household products into Firestore `products`.

Usage (from repo root):
  python scripts/clean_foodpanda_household.py
  python scripts/import_foodpanda_household_firestore.py
"""

from __future__ import annotations

import json
import os
from pathlib import Path

import firebase_admin
from firebase_admin import credentials, firestore

ROOT = Path(__file__).resolve().parents[1]
DATA = ROOT / "packages" / "shared" / "data" / "foodpanda-fusion-household.json"
COLLECTION = os.environ.get("FIRESTORE_PRODUCTS_COLLECTION", "products")


def find_service_account() -> Path:
    env = os.environ.get("FIREBASE_SERVICE_ACCOUNT_PATH", "")
    candidates = []
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
        "Set FIREBASE_SERVICE_ACCOUNT_PATH or place firebase-service-account.json in the repo root."
    )


def main() -> None:
    sa_path = find_service_account()
    items = json.loads(DATA.read_text(encoding="utf-8"))
    if not firebase_admin._apps:
        firebase_admin.initialize_app(credentials.Certificate(str(sa_path)))
    db = firestore.client()

    batch = db.batch()
    count = 0
    for item in items:
        doc_id = item["id"]
        payload = {k: v for k, v in item.items() if v is not None}
        payload["inStock"] = True
        payload["priceType"] = "fixed"
        ref = db.collection(COLLECTION).document(doc_id)
        batch.set(ref, payload, merge=True)
        count += 1
        if count % 400 == 0:
            batch.commit()
            batch = db.batch()
            print(f"Wrote {count}…")
    batch.commit()
    print(f"Done. Upserted {count} docs into `{COLLECTION}`.")


if __name__ == "__main__":
    main()
