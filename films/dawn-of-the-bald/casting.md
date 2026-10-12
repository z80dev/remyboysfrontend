# DAWN OF THE BALD — casting.md

Casting decisions for the Romero siege parody. **This file is the record of the
ruling**: `timeline.js` `CAST` is patched from the table below and every module
(film.js/art.js/horde.js/score.js/QA) reads ids ONLY from that table. No film
code lives here.

Lore: **HAIRY Remys are the living, BALD Remys are the horde.** Hero #42 is
canon (fixed). Every id below was read off labelled contact sheets
(`.omp/skills/remy-media/scripts/contact.py`, run from repo root), then
cross-checked against `scripts/quest-bald.json` (240 canonical bald ids) and
`media/quest/art.json` rows `[skin, hair, shirt, bg, accent, eye, hairStyle,
shades, type, bald, epithet]`. No id is guessed.

Sheets reviewed (all READ before ruling):
`output/_contact/bald-near-{0,80,160}.png` (+q0–q3 crops), `all-orig-0.png`,
`anchor2-orig.png`, `anchor3-orig.png`, `anchor-near-check.png`,
`curls-near.png`, `curls2-near.png`, `perm2-near.png`, and the labelled
finalist sheet `dotb-bald-finalists.png` (top/bot crops) that locked every bald
pick below.

---

## 1. FINAL CAST (patched into timeline.js CAST)

`B` = verified in `scripts/quest-bald.json`. Hair/shirt hex from `art.json`.

| id  | role       | reason    | hair hex  | shirt hex | notes |
|-----|------------|-----------|-----------|-----------|-------|
| 42  | HERO       | canon     | `893c3b`  | `2d3d49`  | "Crimson Flow", hs3; sword. Not in quest-bald (living). |
| 834 | FRINGE  B  | nervous   | `c0aa98`  | `d5d5d5`  | "Pearl Soul". Plain grey sweatshirt, arms down, cleanest bald front; reads ordinary guy. Drawn hair overlay + newsboy cap go on top; hair sheds in S4/S5. |
| 1242| FRIEND  B  | neighbor  | `685340`  | `829acb`  | "Cobalt Soul". Soft-blue tee w/ white bird print, smiling — the S2 turn. Shirt distinct from FRINGE. |
| 158 | CURLS      | young mop | `ff9553`  | `babccc`  | "Copper Crown", hs1 crown. Big warm-orange mop, light grey sweatshirt, friendly read, no props. |
| 1889| PERM       | elder     | `ccc6ae`  | `eeeeee`  | "Copper Flow", hs3. Silver-cream hair + mustache, white top, arms down — the last perm in Hairham. |
| 392 | ANCHOR     | newscast  | `292b2f`  | `000000`  | "Midnight Flow", hs3. 600x600 orig (`media/remy/Character392.webp`): neat black bob, black tee, dead-on camera, pale plaza bg — reads desk newsman; near sprite matches for the on-set rig. |

### HORDE_NEAR (12, all B — near sprites, clean fronts, no overlays)

| id   | shirt hex | read |
|------|-----------|------|
| 1217 | `dad6d3`  | white karate gi — best silhouette in the crowd |
| 174  | `efedeb`  | white tee, small orange print + headband stub |
| 980  | `f8e5e5`  | white tee, purple cursive print |
| 233  | `b26bea`  | purple tee, white circle print |
| 321  | `6d3231`  | maroon tee, small portrait print |
| 585  | `839bcc`  | light-blue tee, white bird circle |
| 456  | `a06564`  | red/white splatter print |
| 554  | `24252e`  | navy tee, small red box print |
| 129  | `000000`  | black tee, smiling — friendly corpse |
| 555  | `151314`  | plain black tee |
| 347  | `0b0d0f`  | black tee, flame hem (on genre) |
| 690  | `ffe99a`  | yellow tee, small text print (illegible at scale) |

### HORDE_FAR (20, all B — depth rows, tiny; no heavy overlays)

| ids |
|-----|
| 5 (`dccc5e`), 142 (`eeeeee`), 152 (`68604a`), 183 (`050407`), 219 (`17181a`), 307 (`f9f0f1`), 382 (`f8e6e3`), 458 (`000000`), 564 (`050407`), 582 (`000000`), 645 (`a9abba`), 704 (`fee99a`), 808 (`000000`), 882 (`000000`), 892 (`000000`), 1017 (`0f0e13`), 1061 (`19283a`), 1249 (`829acb`), 908 (`8a7057` camo), 685 (`5e7372`) |

Shirt hexes in parens; mix of whites/yellows/navy/blacks/brown keeps depth rows
from banding. 685 is far-only (small yellow hand prop — see risks).

---

## 2. VERIFICATION OUTPUT (script-verified)

```
PASS - all 38 ids distinct
PASS - FRINGE != FRIEND
PASS - bald roles all in quest-bald.json (34 ids)
PASS - CURLS/PERM/ANCHOR/HERO NOT bald
PASS - counts: near=12 far=20
bald pool size: 240
ALL CHECKS PASS
```

`node --input-type=module -e "import('./films/dawn-of-the-bald/timeline.js')"`
imports clean: timeline self-check passes (29 shots, 100.0 s), CAST values as
above.

---

## 3. REJECTED NOTABLES (keep for future casts)

- **Meme text overlays (wholesale reject):** 167, 315 ("WHAT DOES DN404 MEAN"),
  410 ("THESE ARE KINDA LAME"), 556, 804 ("MEH HOW TO RUG101"), 224, 763
  ("D.A.R.E."), 1260 ("I HATE BACON").
- **Shades/visors:** 125, 225, 410, 468, 651, 744, 882-lookalikes, 931, 952,
  1034, 1065, 1120, 1188.
- **Props/weapons over face or in hand:** 23 (sword + rifle), 222 (katana),
  287 (white rig), 368/452 (tux + cards — the "yellow jersey" I expected at 452
  was actually the tux; caught on the labelled finalist sheet), 482/845/1115
  (lightsabers), 471 (camera straps), 1377 (baguette), 1061 (pizza box, kept
  out of near), 685 (pizza slice — far only).
- **PERM rejects:** all "Pearl/Silver Flow" pale-skin ids (4390, 3734, 966,
  1501, 3550, 4091, 1627) — the light hs3 hair renders as a floor-length
  hair-cloak that buries the face; ghost read, unusable. 1889 (mustache,
  visible face) beat 168 (black tee, no mustache) and 3636 (camo armor).
- **CURLS rejects:** 398/1838/1673/1597 (text shirts/shades), 4162 (Master
  Sword), 85/15/193 (cake-on-head), 29/284 (frog hood), 54 (saber). 158 beat
  2366 (gold bob, softer volume) and 37 (tie-dye).
- **ANCHOR rejects:** 88, 126, 187, 398, 448, 466 (meme text), 137 (bat),
  231 (sword), 173/435 (cake hat), 480 (bucket hat + saber), 508 (trucker cap),
  505 (text tee), 254/131 (sponsor jerseys). 392 beat 490 (blue bob, temple bg)
  and 52 (blond, Tuscan bg) on "sits behind a desk" energy.

---

## 4. CASTING RISKS

1. **834 (FRINGE) colored dome-rim stubs.** Like most Cabald sprites it has
   faint colored arcs at the dome edge; the procedural hair overlay + newsboy
   cap must cover the full rim band, or blue stubs peek out during the S4
   hat-blow ring reveal.
2. **1889 (PERM) reads "young face, old hair".** The elder read is carried
   entirely by the silver-cream hair + mustache; keep S4 permWalk framing on
   the hair (the gleam glint at 51.4 already does this).
3. **392 (ANCHOR) orig background is a pale casino plaza, not a studio.** As a
   small framed desk portrait it reads fine; do not full-frame it. Also crop
   away the bottom corners (tiny clutter figures, per mad-bald hazard 13
   precedent for orig renders).
4. **392's hair hex `292b2f` is near-black, not blue** — under the CRT chroma
   tears in s1.degrade it may pick up the broadcast blue; QA the recede beat.
5. **158 (CURLS) is hs1 crown, not hs3 flow.** Brief preferred flow; the crown
   renders as a bigger, warmer mop than any clean hs3 candidate (all clean hs3
   warm flows had text shirts or props). Visual wins.
6. **Several near horde ids share the black-tee template** (129/555/347 +
   far-row blacks). If film.js tints the horde, spread tints across ids, not
   per-role, or the left of frame goes mono-dark.
7. **Template reuse across films:** 5, 458, 585, 233, 1217, 908, 685, 834 also
   appear in mad-bald's cast with repaints. No conflict (per-film repaint in
   prepare()), but QA should verify dawn-of-the-bald loads its own sprites, not
   a cached repainted atlas.
