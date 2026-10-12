# MAD BALD: FURY FLOW — casting.md

Casting decision table + repaint specs + procedural prop art-direction for the
2D filmkit parody of Mad Max: Fury Road. **This file is the contract**: film.js
and art.js implement exactly the ids, zone names, hex pairs and export
signatures below. No film code lives here.

Lore: **HAIRY Remys are heroes, BALD Remys are the Cabald.** Every id below was
read off labelled contact sheets (helper `.omp/skills/remy-media/scripts/contact.py`,
sheets kept under `output/mad-bald/casting/`), cross-checked against
`scripts/quest-bald.json` (240 canonical bald ids), `media/quest/art.json` rows
(`[skin, hair, shirt, bg, accent, eye, hairStyle, shades, type, bald, epithet]`),
and file existence (`media/remy/Character<ID>.webp`, `media/quest/sprites[/far]/<ID>.webp`).
No id is guessed; every "as-seen-on-sheet" note is what the sheet actually shows.

Verification evidence written:
`output/mad-bald/casting/{heroes,bald-a,bald-b,far-check,finalists-near,orig-check}.png`
plus overview sheets `output/_contact/bald-near-{0,60,120,180}.png`,
`output/_contact/bald-far-0.png`, `output/_contact/hair-near-{0,80}.png`.

Scale facts (measured, `assets.md`): near sprite 76×116 RGBA, far 52×79 RGBA —
**far/near ratio 0.68**. Rig: `films/remy-bros/art.js` `loadRemy/drawRemy`
(foot anchor `(x, feet)` = `R.bottom + 1`; `legTop = 2 + 576/f + hem`, f=6 near /
9 far). Films import it read-only; repaints happen per-film in `prepare()` with
ImageData zone passes (ghoul pattern, below). Stage 1920×1080, sprites drawn
2.4–3.2× nearest.

---

## 1. CAST

Format follows `films/wizard-of-floz/timeline.js` CAST: `role: [id, src, understudy]`.
`B` = in `scripts/quest-bald.json` (verified). All primaries verified on
`output/mad-bald/casting/finalists-near.png` / `far-check.png`.

```js
const CAST = {
  // role:          [id,   src,    understudy]
  madRemy:          [42,   'near', 90],    // crimson bob + GREATSWORD slung viewer-left (yellow pommel); "Crimson Flow" hair 8a3c3b. Shorn in S1, REGROW S9.
  flowiosa:         [13,   'near', 80],    // B; blue bob, red lips (female read), navy tee w/ "CAT CIGS" chest print — print dies under harness strap.
  immortan:         [471,  'near', 452],   // B; pale dome, WHITE jacket with strung chest gear that reads as a breathing rig; small PINK crown tuft (see hazards).
  nux:              [808,  'near', 892],   // B; pale, GREEN side tufts + blond back patch, black pill-print tee, bright red GRIN — the young fanatic.
  wifeSeed:         [12,   'near', 80],    // long blonde mane + plain blue dress; carries the SEED POUCH. (The Splendid One.)
  wifeVeil:         [24,   'near', 84],    // yellow mane + blue sparkle dress, no props.
  wifeToes:         [70,   'near', 80],    // cyan mane, camo top, smiling — the cheerful one.
  doof:             [840,  'near', 347],   // B; open white shirt over bare chest; PURPLE aviators die under the procedural blindfold. u=347: flame-hem shirt doubles the fire motif.
  vuvalini1:        [46,   'far',  83],    // silver mane, white tee w/ small red-black print (illegible at far cut).
  vuvalini2:        [83,   'far',  46],    // silver mane, blue sweater w/ small chest print. Cross-understudies: if BOTH primaries ever fail they double — accepted, documented.
  warboy1:          [5,    'far',  834],   // B; yellow tee, tiny glyph print (abstract, mirror-safe). Classic Cabald body.
  warboy2:          [834,  'far',  389],   // B; cream hoodie, blue side tufts, near-plain.
  warboy3:          [585,  'far',  389],   // B; blue tee, white bird-circle print (near-symmetric, mirror-safe).
  warboy4:          [882,  'far',  389],   // B; black tee, pill-circle print (horizontally symmetric, mirror-safe).
  warboy5:          [458,  'far',  389],   // B; plain black tee — the clean spare.
  citadel1:         [233,  'near', 1217],  // B; purple sweater, white SPIRAL badge (symmetric, mirror-safe).
  citadel2:         [1217, 'near', 233],   // B; white karate gi + black belt — repaints to tattered rags.
  citadel3:         [908,  'far',  685],   // B; tiger camo — noise pattern, tint into crowd.
  citadel4:         [685,  'far',  908],   // B; teal shirt + tiny yellow hand prop — far-only, NO-FLIP (see hazards).
}
```

Lore check (script-verified): heroes 42, 90, 13, 80, 12, 24, 70, 84, 46, 83 all
`bald: false`; Cabald 471, 452, 808, 892, 840, 347, 233, 1217, 5, 834, 585, 882,
458, 389, 908, 685 all `bald: true`.

**Mirroring (flip) policy per role**

| ids | flip verdict |
|---|---|
| 42 | Flip ONLY after `stripBlade` (verified pattern from pirates-cabald/hairtanic): the baked greatsword hugs the viewer-left edge with yellow pommel; unflipped cursive chest print ("My Sound Rocko") is tiny at 2.8× but reverses — prefer blade-on unflipped, blade-off flipped. |
| 13 | Never flip before the harness-strap repaint covers the "CAT CIGS" text. Bob silhouette is symmetric — female read survives flipping. |
| 471, 452, 808, 892, 840, 233, 1217 | Mirror-safe: prints are pills / spirals / plain cloth; 840's aviators are symmetric and hidden anyway. |
| 5, 834, 585, 882, 458, 389, 908 | Mirror-safe: glyph/circle/noise prints only (horde brief satisfied). |
| 46, 83 | Prints reverse at far cut but are sub-legible; rag repaint buries them. Acceptable. |
| 685 | NO-FLIP (yellow hand prop reads reversed). |

**Rejected on sheets** (keep for future casts): visor/face clutter 125, 651,
744, 931, 104; slogans 167/315 ("WHAT DOES DN404 MEAN"), 804 ("MEH HOW TO
RUG101"), 410 ("THESE ARE KINDA LAME"), 704/839/559 (text shirts); props 23/222/
368/845 (sabers/blades), 645 (oversized silver rig), 38 (skateboard), 9 (red
lightsaber), 29 (jelly-hood ambiguous silhouette), 26 (blue crown), 32 (granny
with sunglasses + blue lightsaber), 54 (saber).

---

## 2. REPAINT (ghoul pattern: per-id zones; pairs = [shadow, light])

One zone-classified `zoneRepaint(R, refs, ramps)` transform per actor family in
`prepare()` (copy of the verified wizard-of-floz `zoneRepaint` / pirates-cabald
`ghoulize` pattern): each pixel classifies to the nearest palette ref, zone
ramps remap by luminance, `L < 0.16` stays ink, zone `'skip'` keeps the pixel.
**Repaints recolour only — never alpha-erase** (the rig's `top/bottom/legTop`
foot anchors and stride split must survive untouched).

```js
export const REPAINT = {
  // MAD REMY 42 — the staged haircut (S1 shear → S9 regrow) is 3 states the film lerps.
  42: {
    // hairCut state machines, driven by shear param s (0 native → 1 fully shorn):
    //   s < 1/3  sides+burners only;  1/3..2/3 crown+bangs;  >= 2/3 full dome + stubble.
    hairSide:   ['#5c2e22', '#7a4030'],   // side-lock/burner zone recolour state (stub bridging hair->scalp)
    hairCrown:  ['#4a2418', '#5c2e22'],   // crown state
    scalp:      ['#241d18', '#3a2f26'],   // full-shorn state = REPAINT_SHARED.scalpStubble[0..1]
    stubbleDots: '#17110d',               // seeded 1px dither over the dome at s >= 2/3
    shirt:      ['#1f2f38', '#31434e'],   // teal tee -> ash-road drab (print drowns, gold pommel predicate survives)
    jeans:      ['#232b38', '#364254'],
  },
  // IMPERATOR FLOWIOSA 13 — she CHOSE the shave: flat dark scalp + stubble from day one.
  13: {
    scalp:      ['#241d18', '#3a2f26'],   // blue bob -> shorn dome (full, no staging)
    stubbleDots: '#17110d',
    grease:     '#14100c',                // flat war-paint bars stamped in the forehead band (2 bars, seeded jitter)
    top:        ['#181a1c', '#26282c'],   // navy tee -> near-black harness cloth (kills CAT CIGS print)
    strap:      '#3a2f26',                // chest strap that covers the print zone BEFORE any flip
    buckle:     '#cfd6de',                // chrome, from shared ramp
  },
  // IMMORTAN FLOW 471 — pallid tyrant; bib/mask/tubes/WIG are procedural, not baked.
  471: {
    skin:       ['#cfc4bd', '#e8ded6'],   // pallid scar-skin (covers the PINK crown tuft — see hazards)
    domeShade:  ['#b0a49c', '#cfc4bd'],   // crown band incl. tuft zone, stamped scar specks '#8e8b78'
    bib:        ['#1c1e22', '#2e3238'],   // white jacket -> gunmetal armor bib
    harness:    ['#5f6b78', '#9aa6b2'],   // strung chest gear -> chrome harness plates
    pants:      ['#22242a', '#34383f'],
  },
  // NUX 808 — white war paint + scars; the grin stays native (lips zone 'skip').
  808: {
    torsoPaint: ['#c9c5b8', '#e8e4da'],   // black tee + pill print -> bone-white war paint (print fully covered)
    tufts:      ['#241d18', '#3a2f26'],   // green/blond side tufts -> shorn stubble zones
    scars:      '#5a4a42',                // flat scarification strokes: chest V + forehead bolt, seeded
    grinKeep:   true,                     // lips zone skip — the red grin is the performance
  },
  // MANE WIVES — manes stay NATIVE (the hair IS the glory); only gowns go pale rag.
  12: { gown: ['#ddd5c4', '#f2ece0'], hem: '#b8ac8e' },   // blue dress -> ivory rag gown
  24: { gown: ['#ddd5c4', '#f2ece0'], hem: '#b8ac8e' },   // sparkle dress -> rag gown (sparkle noise survives as weave)
  70: { gown: ['#d5ccba', '#ece5d4'], hem: '#b0a488' },   // camo top -> slightly warmer rag (keeps her apart at distance)
  // VUVALINI — grey/white manes, dust-tan wraps.
  46: { mane: ['#b9c0c4', '#e2e6ea'], rags: ['#a89a80', '#cbbfa4'] },
  83: { mane: ['#c4cad0', '#eceff2'], rags: ['#a0937a', '#c2b498'] },
  // WAR BOY HORDE — 3 tint variants max, assigned round-robin over warboy1..5 + citadel3/4.
  5:   { tint: ['#b0aca0', '#d4d0c4'] },  // variant A pale-grey war paint
  834: { tint: ['#6b5a48', '#8a7460'] },  // variant B ash-brown
  585: { tint: ['#26282e', '#3a3e46'] },  // variant C charcoal
  882: { tint: ['#b0aca0', '#d4d0c4'] },  // A
  458: { tint: ['#6b5a48', '#8a7460'] },  // B
  389: { tint: ['#26282e', '#3a3e46'] },  // C
  // CITADEL EXTRAS — same 3 variants, no new ramps.
  233:  { tint: ['#b0aca0', '#d4d0c4'] },
  1217: { tint: ['#26282e', '#3a3e46'] }, // gi -> charcoal rags (belt zone -> '#14161a')
  908:  { tint: ['#6b5a48', '#8a7460'] },
  685:  { tint: ['#26282e', '#3a3e46'] }, // hand-prop zone tinted with the shirt so it reads as clutter
}
```

Zone-classification refs (nearest-colour anchors per id, measured from `art.json`
rows + sheet reads; the film passes these as `refs` to `zoneRepaint`):

- 42: hair `#8a3c3b`/`#a04a38` → hairSide/hairCrown/scalp by shear state; shirt teal `#2d3d49` family → shirt; jeans `#3a4258` → jeans; skin `#d0bdb1` skip; gold `#e0b050`-family pommel survives (predicate like ghoulize `keepGold`).
- 13: hair blue `#2a4a9c`-family → scalp; shirt navy `#20242e`-family + print reds → top; skin skip; lips red skip.
- 471: jacket whites `#e8e8ec`/`#d8d8de` → bib; chest-gear greys → harness; skin `#d8c8bc` → skin/domeShade by row band (crown band = y < top+14).
- 808: tee blacks `#141416` + print greens/whites → torsoPaint; tuft greens `#3a8a3c`/blonds `#d8c080` → tufts; lips red skip.
- 12/24/70: dress/top blues/camo-greens → gown; hair zones skip (native manes).
- 46/83: hair greys `#6a7674`/`#828385` → mane; shirt/sweater → rags.
- horde/extras: whole shirt zone → tint (nearest-ref on the tee family); skin skip.

---

## 3. REPAINT_SHARED

```js
export const REPAINT_SHARED = {
  rampOrder: 'pairs are [shadow, light] — ghoul-style mix(dark, light, L)',

  greatWig:     ['#c9cdd4', '#f4f6fa'],      // GREAT WIG mass, 2-stop; strands use fire-ramp-free silver. PROP, never baked (must rip + tumble).
  wigInk:       '#6a7078',

  fire:         ['#7a1e0e', '#e86a1e', '#ffc23c', '#fff2b0'], // flame-guitar / jet / valve-fire ramp, L stops 0/.45/.75/1
  tonic:        { shadow: '#0e6b58', mid: '#2fd6a8', light: '#8ffce0', glow: '#3fe8c0' }, // THE FLOW liquid: high-lum cyan-green reads on night blacks AND day oranges; glow only in night scenes
  warPaintWhite:['#c9c5b8', '#e8e4da'],      // Nux + horde body paint; deep scuff '#8e8b78'
  dustDay:      ['#b8823e', '#d9a55e', '#f2cf94'],            // plume shadow/mid/light
  dustNight:    ['#3c4658', '#556179', '#7a8ba3'],
  seed:         { pouch: ['#9a7a4a', '#c9a86b'], seeds: ['#5a7a26', '#7a9a3a', '#a8c45a'] },
  chrome:       ['#5f6b78', '#9aa6b2', '#cfd6de', '#e8edf2'], // mask, mech arm, harness, buckles
  scalpStubble: ['#241d18', '#3a2f26', '#5a463a'],           // shorn domes: base/stubble/edge
  mud:          ['#3a2c20', '#54432e', '#6e5a3c'],           // mud-flats ramp
  regrowLerp:   1.2,                       // seconds, scalp -> native crimson (42 S9), ghoul GHOUL_SHARED precedent
}
```

---

## 4. PROCEDURAL PROPS SPEC

All props bake in `prepare()` on integer-dimension canvases via the
`pixels()/blob()` discipline of `films/remy-bros/art.js`: five-stop ramps
(outline/shadow/base/light/highlight), Bayer + seeded dither, puff seams,
lit/shaded faces. **No flat rectangles.** Light direction: key from upper-left
(sun over the driver-side shoulder), consistent with the sprite's baked shading.
Determinism: seeded `hash`/`rng` only; per-frame painters are pure functions of
(t, params). Ground anchor convention: every vehicle/prop canvas keeps a 2px ink
ground line at `y = h-2`; wheels touch it; riders stand at deck height derived
from the same canvas, so one `groundY` parks the whole stack.

**WAR RIG tanker** — `warRig(k)` native 760×260, drawn 1.6–2.2× (1216–1672px
wide on screen). Silhouette: cab-forward prime mover (tall chrome exhaust stacks,
rope-and-mud flank armour) + long fuel tanker (ribbed cylinders, ladder, "FLOW"
tonic hose manifold at the rear valve). Palette: hull `#1c1e22/#2e3238/#454a52`,
chrome trim shared ramp, rust streaks `#6e3818`, mud skirt `#3a2c20`, wheels
`#14161a` + `#454a52` hubs with seeded spoke dither. Wheels on ground line;
deck height = cab floor at native y≈150 → riders' `(x, feet)` = groundY −
150·k·bob. Driven by: chase (bob/pitch/wheel), spray (plumes), crash.

**INTERCEPTOR** — `interceptor(k)` native 380×130, drawn 1.6–2.2×
(608–836px). Faceted black muscle car: long bonnet, supercharger scoop through
the hood, tiny rear window, cut-down roof. `#14161a` base, `#26282c` panels,
`#454a52` highlights, chrome supercharger, mud `#3a2c20` rocker. Same ground
line; wheel param drives hub spokes. Driven by: chase, crash, spray.

**CITADEL rock towers + valves** — `citadel(w, h)` bake, native 720×560 drawn
1.2–1.6× as far skyline. Three carved rock towers with stacked tier ledges,
lit west faces (`#c9a86b → #e8cf9a`) and shaded east faces (`#6e5238 → #4a3424`),
seeded scree dither, valve crowns: green `#2f8a3c` pump heads + tonic pipes
(tonic ramp) running down the middle tower into the pour spout. Driven by:
spray (the FLOW pour at the spout), crowd beats.

**IMMORTAN MASK + harness** — `immortanMask(k)` native 90×70, drawn at actor
scale 2.8× anchored to 471's head box (`y: R.top .. R.top+30`, centred on
`R.cx`). Bone-white teeth plates (`#e8e4da`/`#c9c5b8`, ink seams), dark eye
socket band, transparent breathing tubes: two bezier strokes `rgba(159,166,178,0.55)`
with `rgba(232,237,242,0.8)` highlight line, running from the mask jaws back
over the shoulders — alpha-stroked, NOT baked into the sprite. Chest harness
plates (chrome ramp) overlay the repainted bib. Driven by: any Immortan beat;
tubes jitter ±1px with seeded phase (breathing), amplitude rises before the rip.

**GREAT WIG** — `greatWig(k, phase)` native 120×90. Worn state (phase 0):
white/silver horsehair mane draped over the dome (`greatWig` ramp, `wigInk`
strand lines, seeded flyaway strands). Tumble states (phase 0..1): strands
separate into 3–5 clumps whose offsets/rotations are pure functions of phase +
seeded hashes — the wig rips off and tumbles in wind, never baked on. Driven by:
**rip** (the S-setpiece), regrow-adjacent crowd gag.

**FLAME GUITAR + speaker wall** — `flameGuitar(k)` native 150×56 at 2.8×
(~420px): slab body wrapped in redhide `#7a1e0e/#a03a16`, chrome neck, headstock
that IS the flame nozzle (fire ramp). `speakerWall(k)` native 420×300 at ~1.4×:
stacked amps/drums with cloth grilles (seeded weave dither), red-valve tube
trim. Doof (840) draws with the blindfold mask; guitar strap anchors at his
torso. Driven by: chase (flame jet + wall stack bob), crash.

**POLE-CAT bendy poles** — `poleCat(k, bend)` native 26×150, 8–10 instanced on
the rig deck: graphite pole `#26282e/#454a52`, red rag pennant `#a03a16/#7a1e0e`,
bend ∈ [-1, 1] as a seeded quadratic bow (no integration). Riders' hands pin
the base at deck height. Driven by: chase (bend oscillates with speed), crash.

**SEED POUCH** — `seedPouch(k)` native 40×36 at 2.8× (~112px) slung at
wifeSeed's hip (strap over shoulder, pouch at waist height): burlap `#9a7a4a/
#c9a86b` with weave dither, drawstring, spilled seeds in the 3-green seed ramp.
Driven by: the wife beats; pouch transfer is a named beat (seed).

**Clippers** — `clippers(k)` native 44×28 at 2.8×: chrome body (shared ramp),
dark teeth, tonic-green power dot. S1 shear prop — held near 42's head, NOT
touching (contact offsets derived from the rig's head box).

**Muzzle** — `muzzle(k)` native 56×22 at 2.8×: leather bit + head straps
`#3a2a18/#151009`, chrome ring. S1 gag on 42 until the shear; straps anchor
behind the ears (head box edges).

**Mech arm (Flowiosa)** — `mechArm(k, curl)` native 60×24 per pose, drawn at
actor scale OVER the sprite, anchored at her right shoulder (`R.cx+10, R.top+34`):
chrome cylinder segments (shared ramp, ink seams), elbow joint, two-finger claw;
curl ∈ [-1, 1] poses the elbow. PROP, never baked (brief). Driven by: chase,
crash brace.

**Dune layers** — `dunes(mode, k)` bakes two 2560×1080 overscan panels
(`'day' | 'night'`): 3 parallax dune bands (lit/shaded faces, belly shadows,
seam dither, distant haze), day = dustDay oranges into a bleached sky, night =
dustNight blue-greys under a star field (seeded 1px). Driven by: everything;
mode crossfades at the day/night turn (film lerp, not a prop state).

**Sandstorm with inner lightning** — `sandstorm(w, h, seed)` native 1200×1080
wall + per-frame bolt painter: brown wall (dustDay ramp, puff-seam front edge,
belly shadow), inner lightning = seeded polylines (fire ramp) at hash-chosen
times; bolts are pure functions of t. Driven by: storm chase act.

**Mud flats** — `mudFlats(w, h)` strip 2560×300: cracked mud (mud ramp, seeded
crack polylines, puddle glints `#8ffce0` at 8% where tonic drips). Ground-line
anchor for the crash act.

**Highway** — `highway(w, h)` strip 2560×260: two-lane blacktop `#1c1e22/#26282c`
with bleached centre dashes `#c9a86b`, seeded tar patches, edge rubble. The
default ground line for all wheels and feet.

---

## 5. art.js EXPORT CONTRACT

`films/mad-bald/art.js` provides exactly these named exports (imported by
`film.js`; `canvas/loadRemy/drawRemy/loadHeads/headIcon/PAL` come from
`../remy-bros/art.js` and are re-exported for convenience). All builders are
deterministic (seeded hash/rng; no `Math.random`, no wall-clock, no
frame-indexed state); all per-frame painters are pure functions of their
arguments.

```js
// --- re-exports of the stable rig ---
export { canvas, loadRemy, drawRemy, loadHeads, headIcon, headCrop, PAL } from '../remy-bros/art.js';
export { zoneRepaint } // (R, refs, ramps) -> canvas : ghoul-pattern zone pass (verified wizard-of-floz pattern)
                       //   plus keepMain / stripBlade / tint / whiteSil helpers re-implemented from pirates-cabald

// --- vehicles (bake in prepare, place per frame) ---
warRig(k)               // -> canvas 760k×260k. Tanker + cab side view; ground line y=h-2; deck prop baked.
drawRig(ctx, cnv, x, groundY, {bob, pitch, wheel})  // places the rig; wheel 0..1 = hub-spoke phase; bob/pitch px/deg
interceptor(k)          // -> canvas 380k×130k. Black V8 muscle car, ground line y=h-2.
drawCar(ctx, cnv, x, groundY, {bob, pitch, wheel, dust}) // dust>0 stamps a dustPlume at the rear wheel

// --- environment bakes ---
citadel(w, h)           // -> canvas. Rock towers + valve crowns + tonic pipes; far skyline.
dunes(mode, k)          // -> canvas 2560×1080. mode 'day'|'night'; 3 parallax bands + sky.
highway(w, h)           // -> canvas strip. Two-lane blacktop; THE ground line.
mudFlats(w, h)          // -> canvas strip. Cracked mud; crash-act ground line.
sandstorm(w, h, seed)   // -> canvas wall. Puff-seam dust wall; bolts drawn per frame by stormBolt().
stormBolt(ctx, x, y, t, seed) // pure fn of t: one lightning polyline, fire ramp; call at seeded event times.

// --- character-attached props (drawn over repainted rigs at actor scale) ---
immortanMask(k)         // -> canvas 90k×70k. Teeth mask + eye band; tubes are alpha strokes, jitter param at draw time.
drawMask(ctx, cnv, R, {breath})   // anchors to head box of rig R; breath 0..1 scales tube jitter.
greatWig(k, phase)      // -> canvas 120k×90k. phase 0 = worn; 0..1 = deterministic tumble clumps (rip event).
flameGuitar(k)          // -> canvas 150k×56k. Nozzle headstock; pair with flameJet().
flameJet(ctx, x, y, u, seed) // pure fn of u 0..1: fire-ramp jet plume (guitar + valve fires).
speakerWall(k)          // -> canvas 420k×300k. Amp/drum stack for the rig deck.
poleCat(k, bend)        // -> canvas 26k×150k. bend -1..1 quadratic bow; instance 8-10 on deck.
mechArm(k, curl)        // -> canvas 60k×24k. Flowiosa chrome arm; curl -1..1 elbow; drawn over sprite.
seedPouch(k)            // -> canvas 40k×36k. Burlap + seeds; slings at wifeSeed's hip.
clippers(k)             // -> canvas 44k×28k. S1 shear prop.
muzzle(k)               // -> canvas 56k×22k. S1 bit + straps.
tonicVial(k, fill)      // -> canvas 20k×34k. fill 0..1 = FLOW level (tonic ramp); Immortan harness detail.

// --- atmosphere (per frame, pure) ---
dustPlume(seed)         // -> canvas 220×160 puff (blob, puff seams, belly shadow); tint via dustDay/dustNight.
flowPour(ctx, x, y, h, u, seed) // pure fn of u: tonic-ramp pour stream + splash dots at seeded offsets.
```

22 exports + 6 rig re-exports + 4 repaint helpers. Grouped: vehicles
(warRig/drawRig/interceptor/drawCar), environment (citadel/dunes/highway/
mudFlats/sandstorm/stormBolt), attached props (immortanMask/drawMask/greatWig/
flameGuitar/flameJet/speakerWall/poleCat/mechArm/seedPouch/clippers/muzzle/
tonicVial), atmosphere (dustPlume/flowPour).

---

## 6. Hazard notes

1. **42's baked greatsword** hugs the viewer-left edge with a yellow pommel at
   the waist (verified near sprite + orig). Flip only after `stripBlade`; the
   cursive chest print reverses on flip but is sub-legible at 2.8×.
2. **13's "CAT CIGS" chest print** (verified on the orig render) is real text —
   it MUST die under the strap/top repaint before any flipped frame; never draw
   pre-repaint 13 near a mirror moment.
3. **471 is bald but has a small PINK crown tuft** (sheet-verified). The
   domeShade zone must include the crown band or he reads scalp-wounded.
4. **471's strung chest gear** reads as camera clutter unrepainted; the harness
   chrome repaint is what makes it a breathing rig.
5. **808's green side tufts + blond back patch**: the shave repaint must cover
   BOTH zones or Nux reads half-grown. 892 shares the grin template but has
   grey tufts — same zone, different ref.
6. **840's purple aviators**: the Doof blindfold must cover the full glasses
   band (≈ y `R.top+10..R.top+26`, both eye columns) or lenses read through.
7. **840's blue bikini top** under the open shirt — bandolier/chest-strap zone
   repaint covers it; otherwise the silhouette betrays the gag.
8. **Shave repaints recolour, never alpha-erase.** Erasing hair alpha changes
   `R.top` and the silhouette the rig's glow/hit masks use. The shorn bob keeps
   a bob-shaped outline — sell baldness with scalpStubble tone, stubble dither,
   dome shading, and (for Immortan) the GREAT WIG prop on top.
9. **Art templates repeat across ids** (mass-generated collection — 808/892
   share the grin template; several tees repeat). Crowd variety comes from the
   3 tint variants, not from id count.
10. **Far/near scale ratio 0.68** (52×79 vs 76×116). Never park a far sprite
    and a near sprite on the same ground line without a depth offset; grannies
    and horde live ≥160px above the primary ground line at 2.4×.
11. **Feet anchors**: `drawRemy` plants `R.bottom + 1` at `feet`; repaints must
    not touch the leg rows (below `legTop`) or stride/shear split smears.
12. **685's small yellow hand prop** — far-only, no-flip; tinted into the shirt
    so it reads as crowd clutter.
13. **42's orig render** (cut-in source) carries scene props: Eiffel Tower
    background, a mini figure bottom-right — portrait crops must avoid the
    corners; the sword is part of the render (fine for cut-ins).
14. **347 (Doof understudy) has a flame-hem shirt** — doubles the fire motif
    with the procedural flame guitar; acceptable, but tint it variant C if both
    appear in frame.
15. **Shared cross-understudies** (vuvalini1 ↔ vuvalini2, wifeSeed/wifeToes →
    80): if two primaries ever fail in the same scene the fallbacks collide.
    Accepted, documented, prefer fixing the primary.
16. **Slogan/prop ids rejected wholesale** (see CAST appendix): DN404/MEH/KINDA
    LAME slogans, all saber/blade carriers, visor faces, oversized rigs. If a
    replacement horde body is ever needed, re-run the contact helper — never
    promote an unverified id.
17. **Rig scratch canvases**: `drawRemy` uses shared scratch slots (0/1); any
    film-side per-frame ImageData work must use its own canvases, or glow
    passes will bleed between actors.
