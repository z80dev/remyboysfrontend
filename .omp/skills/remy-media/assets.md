# Remy assets: what exists, what each is good for

All paths are relative to the repo root `/Users/z80/dev/remyboysfrontend`. From a film module (`films/<name>/*.js`) reach them with `new URL('../../media/…', import.meta.url).href`. Facts below were measured on the files (`ffprobe`, Pillow), not guessed.

## The lore in one line
There are 4,490 Remys (ids 0–4489). **Remys with hair are the heroes. Bald Remys are "the Cabald", the villains.** `scripts/quest-bald.json` is the canonical list: `{ note, bald: [240 ids] }`. Any id **not** in `bald` has hair. Hero #42 (red hair, sword, Eiffel Tower background) is the default protagonist. Bald #5 (yellow tee) and #1217 are frequent villains.

## Inventory

| Path | What it is | Size | Good for | Not for |
|---|---|---|---|---|
| `media/remy/Character<i>.webp` (i = 0–4489) | The original artwork: 3D-ish anime chibi bust renders | 600×600, **opaque RGB** with photo/scene backgrounds | Portraits, VS cards, cut-ins, "profile" frames, wall-of-Remys grids, thumbnails, cinematic close-ups | Sprites (no alpha: you cannot composite them onto a scene without a frame) |
| `media/quest/sprites/<i>.webp` | "Near" full-body pixel sprite: cut-out body + generated hem + pants + shoes, 2 px pad | 76×116 RGBA | Main characters at 960×540, close action | — |
| `media/quest/sprites/far/<i>.webp` | "Far" cut of the same sprite | 52×79 RGBA | Crowds, enemies, small heroes, distant actors | Close-ups |
| `media/quest/heads.webp` | 16 px front-facing head atlas, 67 columns: cell of id i = x `(i % 67) * 16`, y `floor(i / 67) * 16` | 1072×1088 RGBA | HUD icons, lives counters, flags, map markers, tiny crowds, chat avatars | Anything larger than ~4× |
| `media/quest/sides.webp` | Same layout, right-facing profile heads | 1072×1088 | Side-scrolling tiny actors, flip for left | — |
| `media/quest/minis.webp` | 32 px quantised portrait atlas (67 columns, 32 px cells), area-sampled from the originals | 2144×2176 | Mosaics, "wall of 4,490" counts, portrait grids at small size | Cut-outs (has backgrounds) |
| `media/quest/art.json` | `{ v, cols: 67, count: 4490, rows }`; row i = `[skin, hair, shirt, bg, accent, eye, hairStyle, shades, type, bald, epithet]` (hex colours without `#`; hairStyle 0 bald / 1 crown / 3 flow / 4 hat; shades 0/1; bald 0/1; epithet e.g. "Aqua Crown") | — | Palette-matched effects (hair-coloured trails, tinted glows), name plates ("PEARL SOUL"), filtering by hair style or colour | — |
| `media/halloween/<tokenId>.webp` | Halloween Remys (separate collection, 239 files, **token ids are NOT quest ids**) | 1024×1024 opaque | Seasonal portraits / cards | Mixing with quest ids |
| `node_modules/@fontsource/press-start-2p/files/press-start-2p-latin-400-normal.woff2` | 8-bit pixel font | — | Game HUDs, title cards, pixel text (draw at 8/16/24/32 px only) | Long reading text |
| `node_modules/@fontsource/pixelify-sans/files/pixelify-sans-latin-{400,500,600,700}-normal.woff2` | Softer pixel font | — | Readable retro captions, dialogue boxes | — |
| `~/dev/filmkit/core/fonts/` | Anton, JetBrains Mono, Space Grotesk, VT323, Cormorant Garamond (available as `F.anton` … in `filmkit/lib.js`) | — | Explainers, cinematic titles, captions | — |

`scripts/quest-art.py` (read its docstring) explains how the sprites were cut: rembg mask → area-reduce by factor **f = 6 (near) / 9 (far)** of the 432×576 body crop → median-cut palette → generated hem + legs + shoes → tinted dark outline. That is why the rig can split legs from body: `legTop = PAD(2) + 576/f + hem` where `hem = max(2, round(18/f))`, and the legs split left/right at the body centre column `PAD + floor(432/f / 2)`. `loadRemy` in `films/remy-bros/art.js` computes exactly this.

## Choosing Remys (do this, don't pick ids blind)

Many sprites carry **meme text overlays** ("WHAT DOES DN404 MEAN", "THESE ARE KINDA LAME", "MEH / HOW TO RUG101") or **big props** (wings, boards, swords, lightsabers, laptops) that read badly as characters. Several bald ids have a coloured fringe at the back of the head; that is fine (still bald from the front). Look before you choose:

```sh
SK=.omp/skills/remy-media/scripts
uv run -q --with pillow python $SK/contact.py --kind bald --src near --n 80          # 80 Cabald sprites, labelled
uv run -q --with pillow python $SK/contact.py --kind hair --src near --start 1000 --n 80
uv run -q --with pillow python $SK/contact.py --src orig --ids 42,5,1217,2637        # original renders
uv run -q --with pillow python $SK/contact.py --src head --ids 42,5,1217 --cols 3    # 16 px heads at 6×
```

Each writes `output/_contact/<kind>-<src>-<start>.png` (or `--out`). **Read the PNG** with the read tool. Labels show the id and `B` for bald. Reject ids with text overlays, props that cover the face, or a near-skin hair colour that reads as bald at 1×. Note the chosen ids with a one-word reason in a comment in your film.

Quick checks from the shell:

```sh
python3 -c "import json;b=set(json.load(open('scripts/quest-bald.json'))['bald']);print([(i, i in b) for i in (42,5,1217)])"
python3 -c "import json;r=json.load(open('media/quest/art.json'))['rows'];print(r[42])"
```

A quick ffmpeg alternative (no labels; drawtext is NOT compiled into this machine's ffmpeg, so use contact.py when you need ids):

```sh
ffmpeg -v error -y -pattern_type glob -i 'media/quest/sprites/far/10[0-9].webp' -vf "scale=156:237:flags=neighbor,tile=10x1" -frames:v 1 -update 1 /tmp/row.png
```

## Using the assets in code

- Sprites through the rig (preferred): `import * as A from '../remy-bros/art.js'` then `await A.loadRemy(id, far)` in `prepare()` and `A.drawRemy(ctx, R, x, feet, opts)` per frame. See `SKILL.md` § Assets, cropping and rigs for the verified signature.
- Heads: `const heads = await A.loadHeads(); const icon = A.headIcon(heads, id, k)` → a `16k×16k` canvas.
- Originals: `const i = new Image(); i.src = new URL('../../media/remy/Character42.webp', import.meta.url).href; await i.decode();` in `prepare()`, then `ctx.drawImage(i, x, y, w, h)` in `draw`. Always frame them (border, panel, circle clip): they have backgrounds.
- Remy-run style generated cars, Galaremy ships, Pokéremy back sprites etc. are built from these same sources procedurally in each film's `art.js`; read those files for ideas, import only from `films/remy-bros/art.js` (the stable shared rig), never from a film that is still being edited.
