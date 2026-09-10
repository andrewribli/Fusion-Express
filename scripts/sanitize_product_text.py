"""Strip placeholder 'Unknown' text from catalog brands and product names."""

from __future__ import annotations

import re

UNKNOWN = re.compile(r"\bunknown\b", re.I)
NOISE_PARENS = re.compile(
    r"\([^)]*(?:unknown|unclear|partial|obscured|variant|label|facings?|facing|right-edge|left-edge|second)[^)]*\)",
    re.I,
)
TRAILING_NOISE = re.compile(
    r",\s*(?:cut|variant|product)\s*$",
    re.I,
)


def is_unknown(value: object | None) -> bool:
    if value is None:
        return True
    return str(value).strip().lower() in {"", "unknown", "?"}


def clean_brand(brand: object | None) -> str | None:
    if is_unknown(brand):
        return None
    text = str(brand).strip()
    text = UNKNOWN.sub("", text)
    text = re.sub(r"\s+", " ", text).strip(" ,-")
    return text or None


def clean_name(
    name: str,
    brand: str | None = None,
    subcategory: str | None = None,
    *,
    pns_name: str | None = None,
) -> str:
    if pns_name and not is_unknown(pns_name):
        candidate = str(pns_name).strip()
        candidate = re.sub(r"\s+", " ", candidate).strip()
        if len(candidate) >= 4:
            return candidate

    text = str(name).strip()
    text = NOISE_PARENS.sub("", text)
    text = UNKNOWN.sub("", text)
    text = TRAILING_NOISE.sub("", text)
    text = re.sub(r"\s+", " ", text).strip(" ,-")

    b = clean_brand(brand)
    if b and text.lower().startswith(b.lower()):
        rest = text[len(b) :].strip(" -")
        if len(rest) >= 4:
            text = rest

    if len(text) >= 4:
        return text[0].upper() + text[1:] if text else text

    if subcategory and not is_unknown(subcategory):
        return str(subcategory).strip()

    return "Item"
