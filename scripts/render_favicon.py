"""Render favicon.svg to PNG icon assets."""
from __future__ import annotations

import io
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
WEB = ROOT / "apps" / "web" / "public"
SVG = WEB / "favicon.svg"


def main() -> None:
    try:
        import cairosvg
    except ImportError:
        subprocess.check_call([sys.executable, "-m", "pip", "install", "cairosvg", "-q"])
        import cairosvg
    from PIL import Image

    svg = SVG.read_bytes()
    targets = [
        (512, WEB / "images" / "gracerun-icon.png"),
        (32, WEB / "favicon-32.png"),
        (180, WEB / "apple-touch-icon.png"),
    ]
    for size, dest in targets:
        png = cairosvg.svg2png(bytestring=svg, output_width=size, output_height=size)
        Image.open(io.BytesIO(png)).convert("RGBA").save(dest)
        print(dest.name, dest.stat().st_size)


if __name__ == "__main__":
    main()
