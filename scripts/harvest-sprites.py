"""Cuts and packs Remy's Harvest art (.cache/harvest-art/raw, from scripts/harvest-art.py) into src/harvest/art/.

uv run -q --with pillow --with numpy python scripts/harvest-sprites.py

Sheets are split on fully transparent gaps (hero: three poses left to right; items: two rows of three), each sprite is
trimmed to its alpha bounds and scaled to its game size, then saved as WebP. Backgrounds and the title art are plain
resizes. public/harvest/card.png is the X card poster (600×600, like the Halloween one).
"""

from pathlib import Path

import numpy as np
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
RAW = ROOT / ".cache" / "harvest-art" / "raw"
OUT = ROOT / "src" / "harvest" / "art"
HERO = ["hero-idle", "hero-dizzy", "hero-cheer"]
ITEMS = [["corn", "golden", "gem"], ["squash", "beans", "rotten"]]


def runs(filled, min_gap):
    """[start, end) spans of True separated by at least min_gap False."""
    spans, start, gap = [], None, 0
    for i, f in enumerate(filled):
        if f:
            if start is None:
                start = i
            gap = 0
            end = i + 1
        elif start is not None:
            gap += 1
            if gap >= min_gap:
                spans.append((start, end))
                start = None
    if start is not None:
        spans.append((start, end))
    return spans


def split(img, axis, n, min_gap=12):
    a = np.asarray(img)[:, :, 3] > 24
    spans = runs(a.any(axis=axis), min_gap)
    spans = sorted(sorted(spans, key=lambda s: s[1] - s[0], reverse=True)[:n])
    if len(spans) != n:
        raise SystemExit(f"expected {n} parts, found {len(spans)}")
    return [img.crop((s, 0, e, img.height)) if axis == 0 else img.crop((0, s, img.width, e)) for s, e in spans]


def trim(img):
    a = np.asarray(img)[:, :, 3] > 8
    ys, xs = np.nonzero(a)
    return img.crop((xs.min(), ys.min(), xs.max() + 1, ys.max() + 1))


def save(img, name, height=None, width=None, quality=86):
    if height:
        img = img.resize((round(img.width * height / img.height), height), Image.LANCZOS)
    elif width:
        img = img.resize((width, round(img.height * width / img.width)), Image.LANCZOS)
    img.save(OUT / f"{name}.webp", "WEBP", quality=quality, method=6)
    print(f"{name}.webp {img.width}x{img.height} {(OUT / f'{name}.webp').stat().st_size // 1024} KB")


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    hero = Image.open(RAW / "hero.png").convert("RGBA")
    for name, part in zip(HERO, split(hero, 0, 3)):
        save(trim(part), name, height=360)
    items = Image.open(RAW / "items.png").convert("RGBA")
    for names, row in zip(ITEMS, split(items, 1, 2, min_gap=3)):
        for name, part in zip(names, split(row, 0, 3)):
            save(trim(part), name, height=180)
    save(trim(Image.open(RAW / "cabald.png").convert("RGBA")), "cabald", height=180)
    for bg in ("bg-day", "bg-night"):
        save(Image.open(RAW / f"{bg}.png").convert("RGB"), bg, width=1024, quality=82)
    card = Image.open(RAW / "card.png").convert("RGB")
    save(card, "title", width=1024, quality=84)
    (ROOT / "public" / "harvest").mkdir(parents=True, exist_ok=True)
    card.resize((600, 600), Image.LANCZOS).save(ROOT / "public" / "harvest" / "card.png", optimize=True)


if __name__ == "__main__":
    main()
