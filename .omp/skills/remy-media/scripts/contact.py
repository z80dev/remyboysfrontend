"""Contact sheet of Remys with id labels, for choosing characters by eye. Run from the repo root:

  uv run -q --with pillow python .omp/skills/remy-media/scripts/contact.py [--kind hair|bald|all]
      [--src near|far|orig|halloween|head|side] [--ids 1,2,3] [--start 0] [--n 80] [--cols 10] [--out sheet.png]

near/far = media/quest/sprites[/far]/<i>.webp (transparent, upscaled 3x NEAREST), orig = media/remy/Character<i>.webp
(600x600 opaque renders, downscaled), halloween = media/halloween/<id>.webp (separate token ids, not quest ids),
head/side = 16 px cells of media/quest/heads.webp / sides.webp (index i -> column i % 67, row i // 67, upscaled 6x).
--kind filters by scripts/quest-bald.json (listed = bald = Cabald). Default output: output/_contact/<kind>-<src>-<start>.png.
Then READ the PNG and reject ids with meme text overlays or big props for character work.
"""

import argparse
import json
from pathlib import Path

from PIL import Image, ImageDraw

ap = argparse.ArgumentParser()
ap.add_argument("--kind", default="all", choices=["hair", "bald", "all"])
ap.add_argument("--src", default="near", choices=["near", "far", "orig", "halloween", "head", "side"])
ap.add_argument("--ids", default="")
ap.add_argument("--start", type=int, default=0)
ap.add_argument("--n", type=int, default=80)
ap.add_argument("--cols", type=int, default=10)
ap.add_argument("--out", default="")
a = ap.parse_args()

bald = set(json.load(open("scripts/quest-bald.json"))["bald"])
if a.src == "halloween":
    pool = sorted(int(p.stem) for p in Path("media/halloween").glob("*.webp"))
else:
    pool = list(range(4490))
if a.ids:
    ids = [int(s) for s in a.ids.split(",")]
else:
    if a.src != "halloween" and a.kind != "all":
        pool = [i for i in pool if (i in bald) == (a.kind == "bald")]
    ids = [i for i in pool if i >= a.start][: a.n]

atlas = None
if a.src in ("head", "side"):
    atlas = Image.open(f"media/quest/{'heads' if a.src == 'head' else 'sides'}.webp").convert("RGBA")


def load(i):
    if a.src == "near":
        return Image.open(f"media/quest/sprites/{i}.webp").convert("RGBA").resize((228, 348), Image.NEAREST)
    if a.src == "far":
        return Image.open(f"media/quest/sprites/far/{i}.webp").convert("RGBA").resize((156, 237), Image.NEAREST)
    if a.src == "orig":
        return Image.open(f"media/remy/Character{i}.webp").convert("RGBA").resize((240, 240), Image.LANCZOS)
    if a.src == "halloween":
        return Image.open(f"media/halloween/{i}.webp").convert("RGBA").resize((240, 240), Image.LANCZOS)
    x, y = (i % 67) * 16, (i // 67) * 16
    return atlas.crop((x, y, x + 16, y + 16)).resize((96, 96), Image.NEAREST)


tiles = [load(i) for i in ids]
tw = max(t.width for t in tiles)
th = max(t.height for t in tiles) + 18
rows = -(-len(tiles) // a.cols)
sheet = Image.new("RGBA", (a.cols * tw, rows * th), (40, 44, 60, 255))
d = ImageDraw.Draw(sheet)
for k, (i, t) in enumerate(zip(ids, tiles)):
    x, y = (k % a.cols) * tw, (k // a.cols) * th
    sheet.alpha_composite(t, (x + (tw - t.width) // 2, y + 16))
    d.text((x + 3, y + 2), f"{i}{' B' if i in bald and a.src != 'halloween' else ''}", fill=(255, 226, 122, 255))
out = Path(a.out or f"output/_contact/{a.kind}-{a.src}-{a.start}.png")
out.parent.mkdir(parents=True, exist_ok=True)
sheet.convert("RGB").save(out)
print(out, f"{len(ids)} tiles")
