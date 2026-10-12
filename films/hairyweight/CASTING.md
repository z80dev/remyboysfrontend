# THE HAIRYWEIGHT CHAMPIONSHIP — CASTING

Verified by eye from rendered contact sheets in `output/_contact/` (near/far/orig), not picked blind.
All ids are quest ids. Lore check via `scripts/quest-bald.json` (240 bald ids): every hero-side id
below is hairy, the champ is listed bald. Palettes are exact `media/quest/art.json` row values
(art.json stores hex without `#`).

## The cast

| Role | Id | Epithet (broadcast name) | One-word reason | Hairy? |
|---|---|---|---|---|
| HERO (challenger) | **14** | **CRIMSON CROWN** | Pink-haired, clean | yes (crown, style 1) |
| CHAMP (Cabald champion) | **1217** | **PEARL SOUL** | Karate-gi brute | BALD (in list) |
| REFEREE | **46** | Silver Flow | White-shirt official | yes (flow, style 3) |
| CORNERMAN 1 | **202** | Cobalt Flow | USA-jersey cutman | yes (flow, style 3) |
| CORNERMAN 2 | **208** | Cobalt Crown | Cream-tee simple | yes (crown, style 1) |

## Palettes (art.json rows: skin / hair / shirt / bg / accent / eye)

- **14 HERO** — skin `#a07e63`, hair `#de9b9c` (pink — use for hair-tinted trails/glow), shirt `#0f0e13`, bg `#c1cdc5`, accent `#dd9292`, eye `#1d171c`, hairStyle 1, shades 0, type 3, bald 0, epithet "Crimson Crown"
- **1217 CHAMP** — skin `#a07e63`, hair `#a07e63` (= skin, bald), shirt `#dad6d3` (white gi), bg `#7288b0`, accent `#a48267`, eye `#1d1817`, hairStyle 0, shades 0, type 1, **bald 1**, epithet "Pearl Soul"
- **46 REFEREE** — skin `#a07e63`, hair `#6a7674` (silver), shirt `#f9f0f1` (white — reads as ref shirt), bg `#8d9564`, accent `#6a7373`, eye `#0f1315`, hairStyle 3, shades 0, type 0, bald 0, epithet "Silver Flow"
- **202 CORNERMAN 1** — skin `#c0aa98`, hair `#133f59`, shirt `#014c90` (blue jersey), bg `#9a9287`, accent `#014c90`, eye `#1d181a`, hairStyle 3, shades 0, type 2, bald 0, epithet "Cobalt Flow"
- **208 CORNERMAN 2** — skin `#a07e64`, hair `#7db0d5` (light blue), shirt `#e4dab2` (cream), bg `#5a7e6e`, accent `#7aaed5`, eye `#111215`, hairStyle 1, shades 0, type 2, bald 0, epithet "Cobalt Crown"

## Original 600x600 portraits (VS "tale of the tape" cards) — framing notes

All five originals exist (`media/remy/Character<i>.webp`, opaque RGB with photo backgrounds — always
frame them, never composite bare). Faces sit roughly mid-frame in every case; verified on
`output/_contact/finalists-orig.png`.

- **14** (`Character14.webp`): pink hair matches the sprite (identity-consistent). Face slightly left
  of center (~46% x), busy convenience-store shelf bg. Good bust: crop box centered near
  `(280, 310)` in the 600x600, e.g. a 420x420 bust at x=70..490 — keeps face on the upper-third
  line. Black tee's small white chest graphic stays below a tight bust crop or reads as a shirt logo.
- **1217** (`Character1217.webp`): best portrait of the set — bald head dead-center (~50% x), white
  gi + black belt V against dark ocean/coast bg, high contrast for a card. Center crop
  `(300, 300)` works; a 420x420 bust at x=90..510 avoids the basketball in the bottom-right corner.
- **46** (`Character46.webp`): face left-of-center (~44% x), poolside bg. Crop centered near
  `(265, 300)`; tighten to avoid the small green frog in the bottom-right. White shirt + silver bob
  reads instantly as an official.
- **202** (`Character202.webp`): face ~48% x, casino bg. Center-ish crop `(285, 305)`. Jersey
  chest text is tiny; bust crop keeps it illegible (fine at card scale).
- **208** (`Character208.webp`): face ~46% x, red running-track bg with a smiley in the bottom-right
  corner. Crop centered `(275, 300)` and the smiley falls outside a 420-wide bust.

## Reject list (verified defects, do not cast)

- **42** — baked-in greatsword (default hero; unusable for boxing without blade-strip surgery).
- **9, 27, 54, 68, 1169B** — lightsaber/sword props.
- **10, 57, 82, 556B, 804B, 410B** — "MEH / HOW TO RUG101" / "THESE ARE KINDA LAME" text overlays.
- **389B, 224B** — "FAKE 2024" shirt text (mirror-print hazard).
- **61, 71, 79, 21, 1255B** — readable slogan shirts ("RIP ETHER DELTA", "I HATE BACON").
- **2, 45, 66, 67** — face fully covered (hood/keffiyeh).
- **15, 31, 214, 224(near), 410B, 744B** — head/face props (pie, phone, lollipop, aviators, M-glasses).
- **129B, 321B, 389B, 585B** — the "known-good hero ids" from past films are IN `quest-bald.json`:
  they are Cabald, not heroes. (585B/834B blue-tee balds would do as champ understudies.)
- **219B** — turned up in the far corner shortlist as bald; cut.
- **53, 63, 229** — stick/knife props at near scale.
- **48B, 5B, 0B** — bald (lore), excluded from hero pool by definition.

## Backups (also verified clean)

- HERO: **56** "Copper Flow" — blonde flow, light-blue top; orig is scrubs + stethoscope (doctor
  gag, frames fine). **80** — blonde flow, plain black tee, moody dark orig.
- CHAMP: **1249** "Copper Soul" — mustached bald brute, casino orig, frames well.
- CORNER: **255** (orange bowl, rainbow tee, "Copper Crown"), **210** (mint bowl, green tee).

## RIG NOTES (for the picture builder)

- Sprites draw via the stable shared rig: `import * as A from '../remy-bros/art.js'` (relative to
  `films/hairyweight/`), `const R = await A.loadRemy(id, far)` in `prepare()` — `far=false` for the
  near sprite, `true` for cornermen — then per frame
  `A.drawRemy(ctx, R, x, feet, { sx, sy, flip, lift, stride, lean, rot, glow, alpha, ... })`.
  **`(x, feet)` is the FOOT anchor, not the sprite's top-left.** At 2x use `sx: 2, sy: 2`.
- The rig splits generated legs at `legTop = 2 + 576/f + max(2, round(18/f))`, f=6 near / 9 far;
  feet come from silhouette alpha. Do not paste rigid stickers; do not hand-guess crop rects.
- Heads for HUD/nameplates: `const heads = await A.loadHeads(); A.headIcon(heads, id, k)`;
  atlas cell of id i is `((i % 67) * 16, floor(i / 67) * 16)` in `media/quest/heads.webp`.
- Originals for VS cards: `new URL('../../media/remy/Character14.webp', import.meta.url)` etc.
  Opaque — always draw inside a frame/panel/circle clip.
- Mirroring: none of the five carries readable text, so `flip: true` is safe for all (hero can face
  right, champ face left for the staredown). Hero 14's chest graphic is an abstract elephant/rose,
  not text; ref 46's chest graphic is abstract; champ 1217's gi has no print.
- Palette hooks: hero glow/trail `#de9b9c` (pink), champ aura `#dad6d3` (bone-white), ref accent
  `#f9f0f1`. Champ 1217 has a blue fringe remnant at the BACK of the head — bald from the front, do
  not "fix" it; corner 208/1249 likewise (coloured back-fringe is canonical Cabald).
- Broadcast names: hero enters as "CRIMSON CROWN", champ as "PEARL SOUL" (art.json epithets,
  uppercased).
