"""Extract Fusion shelf photos from Google Drive zips to web JPEGs."""

from __future__ import annotations

import zipfile
from io import BytesIO
from pathlib import Path

import pillow_heif
from PIL import Image

pillow_heif.register_heif_opener()

ROOT = Path(__file__).resolve().parents[1]
ZIPS = (
    ROOT / "Fusion Photos 2 (Popular Items).zip",
    ROOT / "Fusion Menu-20260908T181753Z-1-001.zip",
)
OUT = ROOT / "apps" / "web" / "public" / "images" / "catalog"


def slug(name: str) -> str:
    return Path(name).stem.lower().replace("_", "-")


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    written = 0
    skipped = 0

    for zpath in ZIPS:
        if not zpath.exists():
            print(f"skip missing zip: {zpath.name}")
            continue
        with zipfile.ZipFile(zpath) as zf:
            for entry in zf.namelist():
                base = Path(entry).name
                if not base.upper().endswith(".HEIC"):
                    continue
                out_name = f"{slug(base)}.jpg"
                out_path = OUT / out_name
                if out_path.exists():
                    skipped += 1
                    continue
                raw = zf.read(entry)
                img = Image.open(BytesIO(raw)).convert("RGB")
                img.save(out_path, "JPEG", quality=86, optimize=True)
                written += 1
                print(f"wrote {out_name}")

    print(f"done: {written} new, {skipped} already present, {len(list(OUT.glob('*.jpg')))} total")


if __name__ == "__main__":
    main()
