"""Remy cut-outs for memes: original art × cached isnet-anime mask → trimmed RGBA PNG.

uv run -q --with pillow --with numpy python scripts/meme/cutout.py 42 5 159 [--scale 2] [--out output/meme/cut]

Uses the masks `scripts/quest-art.py` caches in .cache/quest-art/masks (same template fallback for frames the model
missed), feathers the edge by one pixel, drops stray fragments below the main silhouette's size and optionally upscales
(Lanczos + light unsharp) so a bust can fill a 1080 px meme without going soft. Output is trimmed to its alpha bounds
with a small pad; the bottom edge is the original's bottom crop (the bust's cut line).
"""

import argparse
from pathlib import Path

import numpy as np
from PIL import Image, ImageFilter

ROOT = Path(__file__).resolve().parents[2]
SRC = ROOT / "media" / "remy"
CACHE = ROOT / ".cache" / "quest-art"


def mask(i):
    m = np.asarray(Image.open(CACHE / "masks" / f"{i}.png").convert("L")).astype(np.float32) / 255
    tmpl_path = CACHE / "template.npy"
    if tmpl_path.exists():
        tmpl = np.load(tmpl_path)
        core = tmpl > 0.7
        if (m[core] > 0.5).mean() < 0.6:
            m = np.maximum(m, (tmpl > 0.5).astype(np.float32))
        m = np.maximum(m, core.astype(np.float32))
    return m


def largest_blob(binary):
    """Keep connected components at least 3% the size of the largest (props stay, specks go)."""
    h, w = binary.shape
    labels = np.zeros((h, w), np.int32)
    sizes = [0]
    cur = 0
    for y in range(h):
        for x in range(w):
            if binary[y, x] and not labels[y, x]:
                cur += 1
                stack = [(y, x)]
                labels[y, x] = cur
                n = 0
                while stack:
                    cy, cx = stack.pop()
                    n += 1
                    for ny, nx in ((cy + 1, cx), (cy - 1, cx), (cy, cx + 1), (cy, cx - 1)):
                        if 0 <= ny < h and 0 <= nx < w and binary[ny, nx] and not labels[ny, nx]:
                            labels[ny, nx] = cur
                            stack.append((ny, nx))
                sizes.append(n)
    if cur == 0:
        return binary
    big = max(sizes)
    keep = np.array([s >= big * 0.03 for s in sizes])
    keep[0] = False
    return keep[labels]


def cut(i, scale):
    rgb = Image.open(SRC / f"Character{i}.webp").convert("RGB")
    m = mask(i)
    keep = largest_blob(m > 0.5)
    m = m * keep
    a = Image.fromarray((np.clip(m, 0, 1) * 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(0.6))
    im = rgb.copy()
    im.putalpha(a)
    if scale != 1:
        im = im.resize((im.width * scale, im.height * scale), Image.LANCZOS)
        rgbp, ap = im.convert("RGB").filter(ImageFilter.UnsharpMask(radius=2, percent=60, threshold=2)), im.getchannel("A")
        im = rgbp
        im.putalpha(ap)
    box = im.getchannel("A").point(lambda v: 255 if v > 8 else 0).getbbox()
    pad = 4 * scale
    x0, y0, x1, y1 = box
    return im.crop((max(0, x0 - pad), max(0, y0 - pad), min(im.width, x1 + pad), y1))


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("ids", nargs="+", type=int)
    ap.add_argument("--scale", type=int, default=2)
    ap.add_argument("--out", default=str(ROOT / "output" / "meme" / "cut"))
    a = ap.parse_args()
    out = Path(a.out)
    out.mkdir(parents=True, exist_ok=True)
    for i in a.ids:
        p = out / f"{i}.png"
        cut(i, a.scale).save(p, optimize=True)
        print(p)


if __name__ == "__main__":
    main()
