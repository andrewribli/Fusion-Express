"""
Import cleaned Foodpanda Fusion meat products into Firestore `products`.

Usage (from repo root):
  pip install firebase-admin
  set FIREBASE_SERVICE_ACCOUNT_PATH=./firebase-service-account.json
  python scripts/import_foodpanda_meat_firestore.py
"""

from __future__ import annotations

import json
import os
from pathlib import Path

import firebase_admin
from firebase_admin import credentials, firestore

ROOT = Path(__file__).resolve().parents[1]
DATA = ROOT / "packages" / "shared" / "data" / "foodpanda-fusion-meat.json"
COLLECTION = os.environ.get("FIRESTORE_PRODUCTS_COLLECTION", "products")


def main() -> None:
    sa = os.environ.get("FIREBASE_SERVICE_ACCOUNT_PATH", "firebase-service-account.json")
    sa_path = Path(sa)
    if not sa_path.is_absolute():
        sa_path = ROOT / sa_path
    if not sa_path.exists():
        raise SystemExit(
            f"Missing service account JSON at {sa_path}. "
            "Download it from Firebase Console → Project settings → Service accounts."
        )

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
