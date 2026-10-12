# BREAKING BALD — casting (verified by eye, 2026-10-12)

Every id below was eyeballed on generated contact sheets (`output/_contact/bb-*.png`) before casting.
No meme-text overlays, no face-covering props among the picks. Bald membership verified against
`scripts/quest-bald.json` (contact.py prints `B` from the same canonical list).

## Final cast

| Role | id | Source | Reason | Quirks |
|---|---|---|---|---|
| WALTLIKE / HEISENBALD (lead) | **42** | near sprite (+ far, head, orig) | canonical | hair `893c3b` red flow; sword at his left side and a mini sidekick bottom-right of the ORIGINAL portrait — crop portraits centre-right; baldify (below) turns him into HEISENBALD; draw porkpie + goatee + shades as art.js costume pieces (see "Heisenbald look", below) |
| JESSE "PINKMAN" | **186** | near sprite (+ far, head, orig) | pinkest | hair `de9c9c` candy-pink crop, big expressive eyes, plain blue `3e56b1` tee; original portrait has a pink graffiti-arcade background — very Jesse, frame it |
| GUS-LIKE KINGPIN ("GUS") | **1217** | near sprite (+ far, head, orig) | polished | immaculate white `dad6d3` gi + black belt, stern clean face; original portrait = white gi against a seaside city — born kingpin. No shades flag — draw thin rimless glasses in art.js if needed |
| GUS ALTERNATE (Los Pollos yellow) | **5** | near sprite | classic | canonical villain, yellow `dccc5e` tee; original = Wall Street bull backdrop; grey side-fringe stays visible from the side — fine (still bald from the front) |
| HANK-LIKE RIVAL (flow-enforcement agent) | **28** | near sprite (+ orig) | confident | blue `203e75` flow, plain navy `062465` sweater, cocky grin; original = neon arcade |
| HANK ALTERNATE | **77** | near sprite (+ orig) | scowl | teal flow, white tee, stern brows; original = supermarket aisle (funny DEA stakeout vibe) |
| CABALD HENCHMAN 1 | **129** | near/far sprite | clean | black `000000` tee, white headband fringe, easy grin |
| CABALD HENCHMAN 2 | **183** | near/far sprite | grin | black tee w/ small blue tag; tiny gold item at hip (harmless at far size) |
| CABALD HENCHMAN 3 | **458** | near/far sprite | blank | plain black tee, gold fringe, dead stare — hood-crew default |
| CABALD HENCHMAN 4 | **564** | near/far sprite | scowl | plain black tee, angry brows |
| CABALD HENCHMAN 5 | **808** | near/far sprite | pill | green-white PILL capsule printed on black tee — accidentally perfect for the FLOW crew |
| CABALD HENCHMAN 6 | **892** | near/far sprite | grins | green capsule tee, tan fringe, menacing grin |
| Polished lieutenant (opt.) | **452** | near sprite | tuxedo | black tux + bow tie, but holds playing cards (small prop) — use for the "dinner negotiation" beat only |

Henchmen all read as one clean black-tee crew for hooded silhouette shots; far cuts (`media/quest/sprites/far/<id>.webp`) for crowd rows.

## The baldify technique (proven, copy this)

**File: `films/fade-to-bald/art.js`, exported `baldify(R, skinHex)`** (the-shine has an equivalent
`baldify(R, skinHex, hairHex)` that already runs on #42 itself for its mirror twist — precedent that
this exact repaint works on our hero sprite).

What it does, operating on the rig `R` from `films/remy-bros/art.js` `loadRemy(id, far)`:

1. Copies the near sprite onto a fresh canvas, grabs its ImageData.
2. Scans only the hair band `y = R.top … R.top+64` (flow locks drape to the jaw).
3. Classifies hair pixels: alpha ≥ 8, luminance ≥ 40 (keeps true dark outlines), and EXCLUDES the
   centre face column (`|x − R.cx| ≤ 9` below `R.top+24`) so eyes/mouth survive.
4. Remaps every hair pixel onto a narrow skin-shade ramp like a real scalp:
   base `fr = min(235, sr*1.08)`, `fg = min(232, sg*1.08)`, `fb = min(229, sb*0.99·1.08)` from the
   character's own skin hex; luminance-scaled multiplier `m = 0.9 + 0.12·u` (edge pixels `0.6` so the
   outline locks stay dark), tiny +4/+3 highlight on non-edges.

For #42 pass his palette skin `#d0bdb1`. The result is the shaved Cabald lord; keep the un-baldified
`R` around for the pre-shave scenes (fade-to-bald peels a baked wig off the same way — see its
`bakeWig(hue)` if we want a "hair falls out in the shower" gag).

### Heisenbald look (porkpie + shades)

No clean hairy id carries both a hat and shades (queried all 4490 rows: `hairStyle 4 AND shades 1` →
empty; every `shades 1` hairy sprite is either McDonald's-logo shades, ski goggles, or a face-covering
hood — all rejected). The look must be drawn: baldify #42, then paint the black porkpie (`#0b0b0b`
dome + band), thin black shades and a goatee as art.js costume layers, hat anchored at the scalp top
(fade-to-bald's `bakeWig` shows the anchor pattern: 48×46 canvas, cap underside centre).

## Palette notes for art.js (from art.json rows)

| id | skin | hair | shirt | accent | eye | epithet | costume hook |
|---|---|---|---|---|---|---|---|
| 42 (Walt/Heisenbald) | `d0bdb1` | `893c3b` | `2d3d49` | `24293e` | `1d1815` | Crimson Flow | hazmat suit = `f7d33c`-ish yellow over rig; porkpie/shades/goatee `#0b0b0b`; BLUE FLOW glow keyed to `#63c5ff` |
| 186 (Jesse) | `c0aa98` | `de9c9c` | `3e56b1` | `3e56b1` | `1b1714` | Crimson Crown | keep pink hair + blue tee; hazmat yellow partner suit |
| 1217 (Gus) | `a07e63` | `a07e63` (=skin, bald) | `dad6d3` | `a48267` | `1d1817` | Pearl Soul | white gi; rimless glasses `#d9dde2`; yellow `#dccc5e` chicken-shop accent (matches id 5's tee) |
| 28 (Hank) | `a07f63` | `203e75` | `062465` | `062465` | `0e1822` | Cobalt Flow | navy = badge/DEA navy accents |
| henchmen 129/183/458/564/808/892 | `685240`/`a07e64`/`c0aa98` | =skin (bald) | `000000`–`050407` | — | — | Midnight/Copper Soul | uniform black tees; silhouette pass = flat `#0a0a0f` |

## Rejected notable candidates (one line each)

- **45** — full black hood + face covering; striking shadow-figure but the hood is his hair (he's HAIRY, not Cabald) and no face to animate.
- **2726** — black top hat + red face-scrawl tattoos; too busy for the lead.
- **17** — actual black porkpie-shaped crown + lavender tee, but carries a lightsaber and chest text.
- **123 / 744 / 2855 / 954-family** — McDonald's-logo shades; meme contamination.
- **1444** — huge night-vision binoculars cover the whole face.
- **995** — pink ski goggles + mohawk; wrong genre.
- **121** — great coral-pink hair but camo shirt + sword prop (186 is the same pink without the baggage).
- **4322 / 653** — pastel-pink FROG-HOOD reads adorable (Jesse-in-a-pink-hoodie alt) but hood ≠ hair; 653 also carries a baguette.
- **71 / 122 / 1416 / 2100** — "GET ME IN" / "LIL SHID" / "I HATE BACON" text overlays.
- **222 / 23 / 368** — swords / lightsabers (fine lore-wise, terrible for close-ups).
- **5 as lead-Gus** — kept as alternate; the yellow tee is on-brand but 1217's white gi reads ten times more menacing.

## Contact sheets produced (re-run if needed)

```
SK=.omp/skills/remy-media/scripts
uv run -q --with pillow python $SK/contact.py --src near --ids 42,995,2726,105,4357,45,71,122,123,340,1019,1510,2848,2227,866,708,1416,4252 --out output/_contact/bb-heisenbald.png
uv run -q --with pillow python $SK/contact.py --src near --ids 31,186,218,305,557,654,805,935,954,1051,1268,1419,2054,2100,4322,653 --out output/_contact/bb-jesse2.png
uv run -q --with pillow python $SK/contact.py --src near --ids 5,1217,744,1444,2855,482,1344,2602,2673 --out output/_contact/bb-gus.png
uv run -q --with pillow python $SK/contact.py --src near --ids 129,183,452,458,564,808,882,892,952,222 --cols 5 --out output/_contact/bb-hench2.png
uv run -q --with pillow python $SK/contact.py --src near --ids 17,22,6,48,75,77,79,26,28,35 --cols 5 --out output/_contact/bb-hank.png
uv run -q --with pillow python $SK/contact.py --src orig --ids 42,186,1217,5,28,77 --cols 3 --out output/_contact/bb-orig.png
```
