// SPIDER-REM — casting notes. Every id below was picked off a generated contact sheet
// (output/_contact/*.png) and READ by eye; rig facts verified against films/remy-bros/art.js.

## Cast (quest ids; `bald` list = scripts/quest-bald.json, palettes = media/quest/art.json rows)

```js
export const CAST = {
  hero:    42,  // SPIDER-REM — 'Crimson Flow': auburn hair #893c3b, fierce grin, lanky near sprite. BAKED-IN SWORD, see below.
  villain: 458, // THE DANDRUFF GOBLIN — 'Midnight Soul': angriest slanted brows of the 60 bald tiles, plain black long-sleeve, red shoes, clean silhouette.
  villain2: 564,// GOBLIN underling / second-angle — angry brows + tiny forehead scar-mark, black tee, small orange chest logo only.
  dapper:  452, // spare Cabald (tuxedo + bow tie, angry; holds a small phone)
  civilian: 24, // rescued bystander — 'Gold Flow': blonde-gold bob (#acab06), oversized blue sweater, soft round face; literally gold-haired, on-theme
  civilian2: 12,// alt bystander — 'Cobalt Crown': longer blonde bob, same cozy blue-sweater vibe
}
```

## HERO — 42 (near sprite verified)
- Non-bald (`42 not in quest-bald.bald`), hairStyle 3 'flow', epithet 'Crimson Flow'. Near sprite (76×116) reads lanky and
  agile: narrow legs, dynamic fierce grin, good for web-swinging poses via `drawRemy` lift/stride/lean.
- **Prop issue:** the sword is BAKED into `media/quest/sprites/42.webp` (blade on the sprite-left, tip at ground).
  `A.loadRemy` just loads the PNG and computes legTop/cx — there is NO option to hide props. Mitigations, in order of preference:
  1. Wrap it in the gag: draw a golden hair-web strand over the blade (drawn after `drawRemy`, tint `#e8cf7e`).
  2. Clip it: `ctx.save(); ctx.beginPath(); ctx.rect(x - R.w, feet - R.h + headH, R.w * 2, R.h - headH); ctx.clip();`
     before `drawRemy` — the blade lives below the waist on the left ~18 px; `R.top`/`R.legTop` give the rows.
  3. Use `A.headCrop(R)` for close-ups (head only, no sword) or the far cut `A.loadRemy(42, true)` (52×79, sword shrinks).
- Colour anchors from art.json row 42: skin `#d0bdb1`, hair `#893c3b` (auburn, NOT golden), shirt `#2d3d49`, accent `#8d3b3b`.
  Title says "golden" webs: tint hair-web strands gold `#e8cf7e` (goldflow's heroGold trick) rather than `#893c3b`,
  or lean into the radioactivity joke and keep trails auburn.

## VILLAIN — ranked from the 60-tile bald sheet (output/_contact/bald-near-0.png) + 10-tile close-up
1. **458** — strongest scowl in the set (deep slanted brows), plain black top, red shoes; only a thin blue back-fringe that
   vanishes front-on. Cleanest menacing silhouette, no props, no slogans. (Precedent: goldflow already cast 458 as a Cabald guard.)
2. **564** — equally angry brows plus a small forehead scar/vein mark = very goblin-ish; black tee, tiny orange chest logo
   (negligible at 1×). Pale skin `#c0aa98` contrasts nicely against 458's dark `#685240` if both appear on the glider.
3. **452** — angry brows in a black tuxedo + bow tie; a dapper Cabald. Small phone in one hand is the only flaw.
- Rejected on sight: 23 & 222 (katanas), 368 & 845 (lightsabers), 468 (big shades hide the scowl), 129 (smiling = not menacing),
  307 (busy album-cover chest print), 167/315 ('WHAT DOES DN404 MEAN' overlay), 410 ('THESE ARE KINDA LAME'), 804 ('MEH / HOW TO RUG101'),
  645 (giant pill prop). Canon villains 5 (yellow 'RARI' slogan tee) and 1217 (calm judo gi) read villain-adjacent but not goblin.

## CIVILIAN / EXTRA
- **24** 'Gold Flow' — small-reading, cute: round face, blonde-gold bob, oversized blue sweater, calm eyes. Hair `#acab06`
  is literally gold; the rescued bystander being gold-haired sells the "great hair" theme.
- **12** 'Cobalt Crown' — same cozy energy, longer blonde bob (hairStyle 1 crown). Either works alone; 24 preferred.
- Alt if you want maximum cute: 36 wears a pink animal-paw hood but the hoodie carries slogan text — avoid for clean shots.

## Loading and drawing (verified against films/remy-bros/art.js — do not import from any other film)

```js
import * as A from '../remy-bros/art.js';

// prepare(): near sprites are 76×116, far are 52×79; foot anchor at (x, feet).
S.hero    = await A.loadRemy(CAST.hero, false);     // false = near 76×116, true = far 52×79
S.villain = await A.loadRemy(CAST.villain, false);
S.civ     = await A.loadRemy(CAST.civilian, false);
const heads = await A.loadHeads();                  // resolves ../../media/quest/heads.webp

// per frame: drawRemy(ctx, R, x, feet, o). REAL option names (art.js:75-111):
//   lift:[l,r]      raise left/right leg (px)
//   stride:[l,r]    slide left/right leg horizontally (px)
//   lean            shear upper body per 3px row (swing lean)
//   flip            mirror horizontally
//   sx, sy          scale x/y
//   rot             rotate around the foot anchor (radians)
//   upside          flip vertically (hang from a web!)
//   alpha           global alpha
//   glow            outline colour (e.g. '#e8cf7e')  — plus glowA for its alpha
//   white           true = draw the white silhouette (R.sil) instead of the sprite (hit flash)
A.drawRemy(ctx, S.villain, 700, 300, { flip: true, rot: 0.2, glow: '#d8e44a', glowA: 0.8 });      // goblin on glider
A.drawRemy(ctx, S.hero, 480, 420, { lift: [6, 0], stride: [0, 4], lean: 0.15, sx: 1, sy: 1 });    // mid-swing
A.drawRemy(ctx, S.hero, 480, 420, { upside: true, white: true, alpha: 0.9 });                     // web-hang flash

// Head-only crop of a sprite rig (art.js:114): 44px-tall top slice — good for kicked "shell" gags.
const bareHead = A.headCrop(S.villain);
```

## HUD head icons — heads.atlas cell formula (art.js:124-128, matches assets.md)
`media/quest/heads.webp` is 16 px cells, 67 columns (1072×1088). Cell of id `i`:
`x = (i % 67) * 16`, `y = Math.floor(i / 67) * 16`. `A.headIcon(heads, i, k)` returns a `16k × 16k` canvas:

```js
const heroIcon = A.headIcon(heads, 42, 3);     // 48×48 HUD portrait
const gobIcon  = A.headIcon(heads, 458, 3);
// manual, if you need to draw straight from the atlas:
ctx.drawImage(heads, (42 % 67) * 16, Math.floor(42 / 67) * 16, 16, 16, dx, dy, 48, 48);
```
Verified readable on the head sheet: 42 shows the auburn fringe clearly; 458/564/452 read as distinct bald pates.

## Originals (cut-ins / VS cards) — opaque 600×600, always frame them
`new URL('../../media/remy/Character42.webp', import.meta.url)` → decode in prepare, draw inside a panel.
Characters: 42 (Eiffel Tower bg, sword visible), 458/564/452 (plain studio bgs), 24/12 (scene bgs).
