"""Regenerate committed Remy Quest art: `npm run quest:art` (needs `uv` and `cwebp`; ffmpeg not required).

1. Cut-out masks: every original is segmented once with rembg's `isnet-anime` model (cached in .cache/quest-art/masks,
   ~40 min on a laptop CPU the first time). The collection shares one head/torso mesh, so a mean-mask template backs up
   the rare frames the model misses (veils, all-black outfits).
2. `sprites/<idx>.webp` (76x116) and `sprites/far/<idx>.webp` (52x79): full-body battle sprites -- area-reduced cut-out,
   saturation/contrast lift, median-cut palette, stray fragments dropped, generated hem + legs + shoes, hue-tinted
   dark outline.
3. `heads.webp` / `sides.webp`: 16px overworld heads (front / right profile). Real hair silhouette and colours from the
   art; the face is repainted with a clean skin ramp and hand-placed eyes, brows and mouth at the mesh's fixed feature
   positions, because a 16px downsample of anime eyes is mud. Both atlases share one 256-colour palette.
4. `art.json`: keeps each Remy's type, epithet and palette (written by quest-art.mjs), refreshes skin/hair samples from
   the cut-out and sets `bald` -- canon, because bald Remys are the Cabald. `scripts/quest-bald.json` is the reviewed
   roster (candidates flagged by the crown-vs-cheek detector in `analyze`, then checked by eye); without it the
   detector decides.
Everything is deterministic and idempotent.
"""

import json
import os
import subprocess
import sys
from collections import deque
from concurrent.futures import ProcessPoolExecutor, ThreadPoolExecutor
from pathlib import Path

import numpy as np
from PIL import Image, ImageEnhance, ImageFilter

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / "public/images"
OUT = ROOT / "public/quest"
CACHE = ROOT / ".cache/quest-art"
MASKS = CACHE / "masks"
COUNT = 4490
COLS = 67
ROWS = -(-COUNT // COLS)
DARK = np.array([26, 18, 40], np.float32)
WARM = np.array([255, 246, 208], np.float32)
WHITE = np.array([255, 255, 255], np.float32)

# Sprites: an area reduction of a fixed crop (the mesh never moves), plus generated legs and a 2px outline margin.
# NEAR (6x) is the battle/menu size; FAR (9x, exactly 2/3) is the distant foe on short landscape screens -- reduced
# from the source rather than from NEAR, so faces keep their eyes.
X0, Y0, CW, CH, PAD = 84, 24, 432, 576, 2
NEAR, FAR = 6, 9
# Heads: 340px box around the skull, chin at the bottom row.
HX, HY, HS = 130, 80, 340


def mix(a, b, t):
    return np.asarray(a, np.float32) * (1 - t) + np.asarray(b, np.float32) * t


def shade(c, k):
    return mix(c, DARK, -k) if k < 0 else mix(c, WARM, k)


def load(i):
    rgb = np.asarray(Image.open(SRC / f"Character{i}.webp").convert("RGB")).astype(np.float32)
    m = np.asarray(Image.open(MASKS / f"{i}.png").convert("L").resize((600, 600), Image.BILINEAR)).astype(np.float32) / 255
    return rgb, m


def median(rgb, m, x0, y0, x1, y1):
    px = rgb[y0:y1, x0:x1].reshape(-1, 3)
    keep = m[y0:y1, x0:x1].reshape(-1) > 0.6
    return np.median(px[keep], 0) if keep.sum() > 8 else None


def components(op):
    h, w = op.shape
    lab = np.zeros((h, w), np.int32)
    sizes = [0]
    for y in range(h):
        for x in range(w):
            if not op[y, x] or lab[y, x]:
                continue
            n = len(sizes)
            lab[y, x] = n
            q = deque([(y, x)])
            s = 0
            while q:
                cy, cx = q.popleft()
                s += 1
                for ny, nx in ((cy + 1, cx), (cy - 1, cx), (cy, cx + 1), (cy, cx - 1)):
                    if 0 <= ny < h and 0 <= nx < w and op[ny, nx] and not lab[ny, nx]:
                        lab[ny, nx] = n
                        q.append((ny, nx))
            sizes.append(s)
    return lab, sizes


def neighbours(a):
    """4-neighbour shifts without wrap-around."""
    for dy, dx in ((0, 1), (0, -1), (1, 0), (-1, 0)):
        s = np.zeros_like(a)
        ys = slice(max(dy, 0), a.shape[0] + min(dy, 0))
        yd = slice(max(-dy, 0), a.shape[0] + min(-dy, 0))
        xs = slice(max(dx, 0), a.shape[1] + min(dx, 0))
        xd = slice(max(-dx, 0), a.shape[1] + min(-dx, 0))
        s[ys, xs] = a[yd, xd]
        yield s


def quantize(rgb, colors, sat, con):
    img = Image.fromarray(np.clip(rgb, 0, 255).astype(np.uint8))
    img = ImageEnhance.Contrast(ImageEnhance.Color(img).enhance(sat)).enhance(con)
    return np.asarray(img.quantize(colors=colors, method=Image.Quantize.MEDIANCUT, kmeans=4).convert("RGB")).astype(np.float32)


def reduce(rgb, m, x0, y0, w, h, ow, oh):
    c = rgb[y0 : y0 + h, x0 : x0 + w]
    a = m[y0 : y0 + h, x0 : x0 + w]
    pm = np.asarray(Image.fromarray(np.clip(c * a[..., None], 0, 255).astype(np.uint8)).resize((ow, oh), Image.BOX)).astype(np.float32)
    al = np.asarray(Image.fromarray((a * 255).astype(np.uint8)).resize((ow, oh), Image.BOX)).astype(np.float32) / 255
    return pm / np.maximum(al[..., None], 1e-3), al


def legs(f):
    k = 6 / f
    return max(2, round(3 * k)), round(10 * k), max(2, round(3 * k))


def sprite(i, rgb, m, f):
    h, w = CH // f, CW // f
    k6 = 6 / f
    hem, pants_n, shoe_n = legs(f)
    col, al = reduce(rgb, m, X0, Y0, CW, CH, w, h)
    op = al >= 0.5
    lab, sizes = components(op)
    big = int(np.argmax(sizes))
    keep = np.array([k == big or (k > 0 and s >= 0.2 * sizes[big]) for k, s in enumerate(sizes)], bool)
    op &= keep[lab]
    q = quantize(col, 20, 1.25, 1.12)
    out = np.zeros((h + hem + pants_n + shoe_n + 2 * PAD, w + 2 * PAD, 4), np.float32)
    out[PAD : PAD + h, PAD : PAD + w, :3] = q
    out[PAD : PAD + h, PAD : PAD + w, 3] = op * 255

    def put(x, y, c):
        out[y, PAD + x, :3] = c
        out[y, PAD + x, 3] = 255

    # Torso run through the body centre on the bottom row: the hem and legs hang from it.
    row = op[h - 1]
    cx = w // 2
    left, right = cx - round(12 * k6), cx + round(12 * k6)
    if row[cx]:
        left = right = cx
        while left > 0 and row[left - 1]:
            left -= 1
        while right < w - 1 and row[right + 1]:
            right += 1
    y0 = PAD + h
    for r in range(hem):
        inset = 1 if r == hem - 1 else 0
        for x in range(left + inset, right + 1 - inset):
            put(x, y0 + r, shade(q[h - 1, x], -0.12 * (r + 1)))
    rs = np.random.default_rng(i)
    pants = np.array([[0x33, 0x45, 0x62], [0x2A, 0x2E, 0x3A], [0x4A, 0x5A, 0x7A], [0x5C, 0x4A, 0x3A]][rs.integers(0, 4)], np.float32)
    shoe = np.array([[0xF4, 0xF1, 0xE8], [0x22, 0x22, 0x2A], [0xD8, 0x3A, 0x3A], [0xF4, 0xF1, 0xE8]][rs.integers(0, 4)], np.float32)
    pw = max(round(10 * k6), min(right - left - round(7 * k6), round(18 * k6)))
    pl = cx - pw // 2
    gap = max(1, round(2 * k6))
    legw = (pw - gap) // 2
    top = y0 + hem
    for r in range(pants_n):
        for leg in (0, 1):
            for k in range(legw):
                c = shade(pants, 0.2) if k == 0 else shade(pants, -0.3) if k == legw - 1 else pants
                put(pl + leg * (legw + gap) + k, top + r, shade(c, -0.25) if r == 0 else c)
    top += pants_n
    for r in range(shoe_n):
        for leg in (0, 1):
            xs = pl + leg * (legw + gap) - (1 if leg == 0 else 0)
            for k in range(legw + 1):
                c = shoe if r < shoe_n - 1 else shade(shoe, -0.55)
                if r == 0 and 0 < k < legw and shoe.mean() < 200:
                    c = shade(shoe, 0.25)
                if k == (0 if leg == 0 else legw):
                    c = shade(c, -0.2)
                put(xs + k, top + r, c)
    solid = out[..., 3] > 0
    near = np.zeros_like(solid)
    acc = np.zeros(solid.shape + (3,), np.float32)
    cnt = np.zeros(solid.shape, np.float32)
    for s, c in zip(neighbours(solid), neighbours(out[..., :3])):
        near |= s
        acc += c * s[..., None]
        cnt += s
    edge = near & ~solid
    out[edge, :3] = (acc / np.maximum(cnt, 1)[..., None])[edge] * 0.25 + DARK * 0.75
    out[edge, 3] = 255
    return out.astype(np.uint8)


def head(rgb, m, skin, hair, bald, eye, shades, profile):
    s = 16
    mm = m.copy()
    mm[420:, :] = 0
    col, al = reduce(rgb, mm, HX, HY, HS, HS, s, s)
    op = al >= 0.45
    q = quantize(col, 8, 1.3, 1.0)
    out = np.zeros((s, s, 4), np.float32)
    out[..., :3] = q
    out[..., 3] = op * 255
    face = op if bald else np.linalg.norm(q - skin, axis=2) < np.minimum(np.linalg.norm(q - hair, axis=2), 70)
    lo, hi = shade(skin, -0.28), shade(skin, 0.22)
    for y in range(s):
        for x in range(s):
            if op[y, x] and face[y, x]:
                out[y, x, :3] = hi if bald and y <= 4 and 5 <= x <= 8 else lo if x <= 3 or y >= 14 else skin
    if profile and not bald:
        # The back of the head is hair from the side.
        for y in range(13):
            for x in range(8):
                if op[y, x]:
                    out[y, x, :3] = hair if y < 12 else shade(hair, -0.3)
        out[10:12, 6, :3] = lo

    def put(x, y, c):
        if 0 <= x < s and 0 <= y < s:
            out[y, x, :3] = c
            out[y, x, 3] = 255

    iris = np.asarray(eye, np.float32)
    deep = mix(iris, DARK, 0.5)

    def eye_at(x0, y0, w):
        for k in range(w):
            put(x0 + k, y0, DARK)
        put(x0, y0 + 1, DARK)
        put(x0 + 1, y0 + 1, WHITE)
        for k in range(2, w):
            put(x0 + k, y0 + 1, iris)
        put(x0, y0 + 2, deep)
        for k in range(1, w):
            put(x0 + k, y0 + 2, iris)
        for k in range(w):
            put(x0 + k, y0 + 3, deep if k != w - 1 else DARK)

    def shades_at(x0, x1):
        for x in range(x0, x1 + 1):
            put(x, 9, DARK)
            put(x, 10, np.array([40, 34, 60], np.float32))
            put(x, 11, DARK)
        put(x0 + 1, 10, np.array([150, 170, 220], np.float32))

    mouth = shade(skin, -0.65)
    if profile:
        for k in range(4):
            put(10 + k, 8, DARK)
        if shades:
            shades_at(10, 14)
        else:
            eye_at(11, 9, 3)
        put(13, 13, mouth)
        put(14, 11, skin)
    else:
        for k in range(5):
            put(4 + k, 7 if k == 0 else 8, DARK)
        for k in range(3):
            put(11 + k, 8, DARK)
        if shades:
            shades_at(4, 14)
        else:
            eye_at(5, 9, 3)
            eye_at(11, 9, 3)
        put(9, 13, mouth)
        put(10, 13, mouth)
    solid = out[..., 3] > 0
    inner = np.zeros_like(solid)
    for n in neighbours(solid):
        inner |= solid & ~n
    out[inner, :3] = mix(out[inner, :3], DARK, 0.6)
    return out.astype(np.uint8)


def analyze(i):
    rgb, m = load(i)
    tmpl = np.load(CACHE / "template.npy")
    # The model occasionally bites into a head whose skin matches the backdrop, or misses a veil/black-on-black frame
    # entirely. The collection shares one mesh, so the region nearly every Remy covers (the mean mask's core) is always
    # body; frames the model mostly missed fall back to the wider silhouette.
    core = tmpl > 0.7
    if (m[core] > 0.5).mean() < 0.6:
        m = np.maximum(m, (tmpl > 0.5).astype(np.float32))
    m = np.maximum(m, core.astype(np.float32))
    skin = median(rgb, np.ones_like(m), 262, 348, 318, 366)
    cheek = median(rgb, np.ones_like(m), 385, 335, 420, 352)
    if cheek is not None:
        skin = (skin + cheek) / 2
    crown = median(rgb, m, 230, 110, 370, 165)
    # A bald crown is the cheeks' exact hue and brightness and shades smoothly; platinum or blonde hair on pale skin
    # comes close in colour but is slightly off-hue or carries strand texture. Hoods/veils fail "is it skin at all".
    plausible = skin[0] > skin[2] + 15 and skin[0] >= skin[1] - 5
    bald = False
    if crown is not None and plausible:
        chroma = float(np.abs(crown / max(crown.sum(), 1) - skin / max(skin.sum(), 1)).max())
        lum = rgb.mean(2)
        blur = np.asarray(Image.fromarray(lum.astype(np.uint8)).filter(ImageFilter.GaussianBlur(3))).astype(np.float32)
        area = m[110:170, 230:370] > 0.6
        texture = float(np.abs(lum - blur)[110:170, 230:370][area].mean()) if area.any() else 99
        bald = chroma < 0.008 and abs(float(crown.mean() - skin.mean())) < 10 and texture < 3
    hair = crown if crown is not None else skin
    return i, rgb, m, skin, hair, bald


def work(i, eye, shades, canon):
    i, rgb, m, skin, hair, bald = analyze(i)
    if canon is not None:
        bald = i in canon
    Image.fromarray(sprite(i, rgb, m, NEAR)).save(CACHE / "sprites" / f"{i}.png")
    Image.fromarray(sprite(i, rgb, m, FAR)).save(CACHE / "sprites" / f"far{i}.png")
    front = head(rgb, m, skin, hair, bald, eye, shades, False)
    side = head(rgb, m, skin, hair, bald, eye, shades, True)
    return i, bald, skin.round().astype(int).tolist(), hair.round().astype(int).tolist(), front, side


def segment():
    MASKS.mkdir(parents=True, exist_ok=True)
    todo = [i for i in range(COUNT) if not (MASKS / f"{i}.png").exists()]
    if not todo:
        return
    from rembg import new_session, remove

    session = new_session("isnet-anime")
    for n, i in enumerate(todo):
        im = Image.open(SRC / f"Character{i}.webp").convert("RGB")
        remove(im, session=session, only_mask=True).save(MASKS / f"{i}.png")
        if n % 100 == 0:
            print(f"Segmented {n}/{len(todo)}", flush=True)


def template():
    path = CACHE / "template.npy"
    if path.exists():
        return
    acc = np.zeros((600, 600), np.float64)
    for i in range(COUNT):
        acc += np.asarray(Image.open(MASKS / f"{i}.png").convert("L").resize((600, 600), Image.BILINEAR)) / 255
    np.save(path, (acc / COUNT).astype(np.float32))


def webp(src, dst):
    subprocess.run(["cwebp", "-quiet", "-lossless", "-z", "9", "-exact", str(src), "-o", str(dst)], check=True)


def hexc(c):
    return "".join(f"{max(0, min(255, int(v))):02x}" for v in c)


def main():
    segment()
    template()
    (CACHE / "sprites").mkdir(parents=True, exist_ok=True)
    (OUT / "sprites/far").mkdir(parents=True, exist_ok=True)
    data = json.loads((OUT / "art.json").read_text())
    rows = data["rows"]
    eyes = [[int(r[5][k : k + 2], 16) for k in (0, 2, 4)] for r in rows]
    # The canonical Cabald roster: detector candidates (see analyze) reviewed by eye, since platinum hair on pale skin
    # and hats defeat any colour test. Without the file, the detector's verdict stands.
    canon_path = ROOT / "scripts/quest-bald.json"
    canon = set(json.loads(canon_path.read_text())["bald"]) if canon_path.exists() else None
    heads = np.zeros((ROWS * 16, COLS * 16, 4), np.uint8)
    sides = np.zeros_like(heads)
    with ProcessPoolExecutor(max_workers=os.cpu_count()) as pool:
        futures = [pool.submit(work, i, eyes[i], bool(rows[i][7]), canon) for i in range(COUNT)]
        for n, f in enumerate(futures):
            i, bald, skin, hair, front, side = f.result()
            y, x = (i // COLS) * 16, (i % COLS) * 16
            heads[y : y + 16, x : x + 16] = front
            sides[y : y + 16, x : x + 16] = side
            r = rows[i]
            r[0], r[1] = hexc(skin), hexc(hair) if not bald else hexc(skin)
            r[9] = int(bald)
            if bald:
                r[6] = 0
            elif r[6] == 0:
                r[6] = 1
            color, _, kind = r[10].rpartition(" ")
            if bald and kind != "Shades":
                r[10] = f"{color} Soul"
            elif not bald and kind == "Soul":
                r[10] = f"{color} Crown"
            if n % 500 == 0:
                print(f"Built {n}/{COUNT}", flush=True)
    with ThreadPoolExecutor(max_workers=os.cpu_count()) as pool:
        list(pool.map(lambda i: webp(CACHE / "sprites" / f"{i}.png", OUT / "sprites" / f"{i}.webp"), range(COUNT)))
        list(pool.map(lambda i: webp(CACHE / "sprites" / f"far{i}.png", OUT / "sprites/far" / f"{i}.webp"), range(COUNT)))
    for name, arr in (("heads", heads), ("sides", sides)):
        # One shared 256-colour palette lets lossless WebP index the atlas: a third of the size, visually identical.
        pal = np.asarray(Image.fromarray(arr[..., :3]).quantize(colors=256, method=Image.Quantize.MEDIANCUT, kmeans=2).convert("RGB"))
        out = np.dstack([pal, arr[..., 3]])
        out[arr[..., 3] == 0] = 0
        tmp = CACHE / f"{name}.png"
        Image.fromarray(out).save(tmp)
        webp(tmp, OUT / f"{name}.webp")
    (OUT / "art.json").write_text(json.dumps(data, separators=(",", ":")))
    print(json.dumps({"bald": sum(r[9] for r in rows), "count": COUNT}))


if __name__ == "__main__":
    sys.exit(main())
