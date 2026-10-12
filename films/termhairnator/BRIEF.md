# THE TERMHAIRNATOR — VERIFIED-API HANDBOOK

Every signature below was read out of shipped source (file:line). Do not guess past it.
Sources: `filmkit/core/{lib,captions,post,audio,runtime,lint,timeline,motion}.js`,
`films/remy-bros/art.js`, `films/3000/{film,art,timeline,score}.js`,
`films/fade-to-bald/{art,film}.js`, `films/{baldshank,star-flows}/art.js`.

## RIG API (films/remy-bros/art.js — stable, import as `../remy-bros/art.js`)

- `await loadRemy(i, far)` → `{ c, sil, w, h, legTop, cx, top, bottom }` (art.js:43-60).
  Loads `media/quest/sprites/[far/]<i>.webp`. NEAR rigs: 6-row sheet, hero `42.webp` is
  **76×116 px native** (72×96 body + 2 px pad + 3 px hem; `legTop = 2+96+3 = 101`).
  FAR rigs: 9-row sheet, 52×79. `sil` = white silhouette (hit/flash tint via `white: true`).
- `drawRemy(ctx, R, x, feet, o)` (art.js:76-111). **(x, feet) = bottom-centre of the painted
  content** — `place()` translates to (x, feet), rotates (`rot`, about the feet), then draws
  anchored at (centre, bottom+1). Options:
  - `lift: [l, r]` px each leg raised; `stride: [l, r]` px each leg shifted sideways
    (legs split at `R.cx`; l = sprite-left half, r = right).
  - `lean` — top shear, `dx = (legTop − y) * lean` (0.2 ≈ 20 px lean at native).
  - `flip`, `rot`, `upside`, `alpha`, `white`, `glow` (colour) + `glowA`, `sx`, `sy`.
  - **sx/sy are multipliers of native pixels.** At 1080p 3000 draws near rigs at
    sx=sy 2.1–3.0 (3000/film.js:111,291,625) → ~290–350 px tall heroes. Keep sx === sy.
  - Set `ctx.imageSmoothingEnabled = false` before every call (3000/film.js:32-35).
- `crownY(rig, feet, sy)` = `feet − (bottom−top+1)*sy + 7*sy` — screen-y of the head top
  (3000/art.js:332); capes/hats hang from `crownY(...) + 44*sy` (shoulders).
- Poses: `walkCyc(ph, amp=5)` → `{lift,stride,lean}`; `stand = {lift:[2,0],stride:[1,0],lean:0.02}`
  (3000/art.js:469-474); phase ≈ `g * steps-per-sec`.
- `await loadHeads()` → heads.webp Image (16 px cells, 67/row); `headIcon(atlas, i, k=1)`
  → 16k×16k canvas (art.js:121-128).
- `contactShadow(ctx, x, feetY, w, k=0.4)` — ellipse ground shadow (3000/art.js:956-963).
- Scratch canvases: reuse is fine but clear fully each frame (remy-bros art.js:62-72
  `getScratch`; fade-to-bald art.js:536-551 `_refl`, 564-583 `_dk` are cleared singletons).

## FILM CONTRACT + SHOT-DRAW WIRING (runtime.js:5-10, 99-126; 3000/film.js:935-1015)

```js
export default {
  title: 'THE TERMHAIRNATOR', output: 'termhairnator.mp4', duration: DUR,
  async prepare() { /* await loads into a module-level S = {} (read-only in draw) */ },
  shots: SHOTS.map((sh) => ({
    name: sh.name, t0: sh.t0, t1: sh.t1,
    draw(ctx, lt, dur, t, overlay) { /* dispatch on sh.name; lt = t - sh.t0 */ },
    fx(lt, t) { return { letterbox: 1.0, bloom: 0.10, bloomThresh: 0.9, ... } },
  })),
  captions: CAPTIONS,
  captionStyles: { serif: {...}, machine: {...}, machineWarm: {...} }, // REQUIRED, see below
  flashes: FLASHES, score,
  audio: { seed: 8, reverb: 1.4, reverbGain: 0.22, lufs: -14 },
  lint: { captionHold: 3, safe: { margin: 0.05, letterbox: true } },
}
```
- `draw(ctx, lt, dur, t, overlay)` — `ctx` = 1920×1080 scene (cleared for you, runtime.js:103-107);
  `overlay` is a proxy canvas drawn AFTER grade so type stays crisp (post.js:217-218) — the
  3000 kick-word slams paint here (3000/film.js:314-316). Wrap shot bodies in the `cam()`
  save/translate/scale/restore pattern (3000/film.js:36-41).
- `flashes` are automatic: `fx.flash = max(fx.flash, peak·exp(−(t−ft)/decay))` (runtime.js:120-123).
  Never hand-set `fx.flash` for these.
- Hit-stop wiring per shot: `const { g, stop, sl } = CLOCK.warp(lt)` — actor paths keyed on
  **g** (world), shake + sparks + impact glows keyed on **real t** so they move through the
  freeze (`shakeXY(t, amp)`, 3000/film.js:42-45, 463), in-freeze growth keyed on **sl**
  (heartbeat pulses 3000/film.js:806; crash fireball per cue sheet). `sl` is a SIBLING of
  `stop` — never `stop.sl`. Compare stops by `stop.g === EV.x`, or use `stop != null`.

## CAPTIONS (filmkit/core/captions.js — read whole file before styling)

- Core styles ONLY: `caption, sub, title, kicker, lower, type` (captions.js:22-29).
  **`'serif'`, `'machine'`, `'machineWarm'` do NOT exist** — our CAPTIONS reference them, so
  film.js MUST declare them in `captionStyles` or load throws (runtime.js:91, captions.js:41).
- Option keys (style or per-caption override): `font, size, weight, color, align, x, y,
  lineHeight, track, anim, in, out, rise, drift, cps, glow, glowBlur, shadow`
  (captions.js:11-20, 66-67). Plus per-caption: `span: true` (cross a cut), `minHold`, `id`.
- `anim`: `'rise' | 'fade' | 'line' | 'type' | 'cut'` (captions.js:96-137).
  **`'slam'` is NOT supported** — unknown anims fall through to a plain hard cut-in
  (captions.js:135-136). For the f1/c1/card slams either accept the cut-on, or draw them as
  PICTURE with `slam(ctx, text, x, y, p, { from, shake, size, font, color, track, glow,
  glowBlur, alpha, flash })` from `filmkit/motion.js` (motion.js:70-87) like 3000's kick
  words (3000/film.js:201-220). Typewriter HUD text: `typed(s, t, cps)` (motion.js:31-34)
  or core `type` style (`cps` key).
- Proven custom styles: serif narrator = `3000/timeline.js:532-535` —
  `{ font: F.serif, weight: 'italic 600', size: 32, color: '#e8d5ae', x: 960, y: 200,
  align: 'center', lineHeight: 1.3, track: 1, anim: 'fade', in: .4, out: .4, glow:'#000',
  glowBlur: 10 }`. Noir VO/dialogue = fade-to-bald/film.js:772-800. Machine mono = same
  shape with `font: F.mono` ('JetBrains Mono'), a weight of 700 and `track: 2+`.
- Fonts: `F.anton`, `F.mono` ('JetBrains Mono'), `F.grot` ('Space Grotesk'), `F.vt` (VT323),
  `F.serif` ('Cormorant Garamond', has italic) — core, preloaded (lib.js:76-82,
  runtime.js:17-24). Extra fonts via `film.fonts`.
- Lint: fully-visible = `[t0+in(+typing), t1−out]`, must hold ≥ 3 s (or `minHold`) inside its
  shot and never cross the cut unless `span` (lint.js:48-63); boxes also checked against
  5 % safe margin and letterbox bars (lint.js:67-77).

## FX / POST KEYS (post.js:11-26 FX_DEFAULTS; verified shipped values)

| key | meaning / range | shipped example |
|---|---|---|
| `letterbox` | 0..1; **1.0 = exact 2.39:1 bars** at any canvas (post.js:223-226) | `1.0` 3000:983; `0.8` fade-to-bald:734 |
| `bloom` / `bloomThresh` | glow amount 0.06–0.13 / threshold 0.85–0.9 | 3000 every shot |
| `bloomWide`, `halation` | wide-bloom mix 0.6 default / warm halation | defaults fine |
| `rays`, `lightX/Y`, `rayDecay/Density` | god rays (weight + light pos 0..1) | unused in 3000/ftb |
| `streak`, `streakTint` | anamorphic horizontal streak | unused; key exists |
| `aber` | chromatic aberration | `0.004` during freeze (ftb club, film.js:751) |
| `grain` | film grain | 0.012–0.015 (3000), 0.05–0.065 (ftb noir) |
| `vignette` | **default 1 = ON**; 0 = off; >1 heavier | 0.42–0.6 (3000), 1.0–1.18 (ftb) |
| `sat`, `contrast` | 1 = neutral | `sat 1.04–1.06` (3000); `sat 0.8, contrast 1.06` (ftb) |
| `tint`, `lift`, `warm`, `exposure`, `tonemap` | grade | `tint [0.88,0.96,1.12]` cool (ftb:734); `warm 0.08–0.16` (3000) |
| `haze`, `hazeColor` | volumetric fbm haze | `haze 0.05` (3000 wolf:985) |
| `crt`, `glitch`, `riso`, `weave`, `tvOff` | screen looks | prologue CRT flicker is better painted in-shot |
| `flash`, `fade` | whitewash / black wash | flash is AUTO from `flashes`; don't set |
| `bgVoid/bgPaper/bgBlue/red` | procedural backdrop under transparent px | leave 0 — we paint full-frame |

Final-shader order (post.js:205-226): grade → **overlay composite (218)** → grain → flash →
fade → **letterbox bars (223-226)**. Bars are painted OVER overlay pixels.

## LETTERBOX — exact mechanism (verified)

`fx.letterbox` is a scalar; bar height `= letterbox · 0.5 · (1 − (W/2.39)/H) · H`
(post.js:224) → **138 px bars at 1.0 on 1920×1080; safe band y ∈ [138, 942]**.
- 3000 sets `letterbox: 1.0` in every shot's `fx` (3000/film.js:982-993) AND paints manual
  bars last in each shot — `ART.bars(ctx)`, `BAR = 138`, colour #060402, covering the ±220
  overscan so camera moves never bleed (3000/art.js:11-12, 1027-1034). Copy both halves.
- Keep captions in y [180, 900] (3000/timeline.js SAFE comment); the runtime also
  `scanLetterbox()`-lints imperative overlay pixels under bars (runtime.js:201-221,
  lint.js:79-81) — only fires when letterbox > 0 and overlay was touched.

## SCORE KIT (filmkit/core/audio.js)

`createKit(ac, { seed=4242, reverb=3.2, reverbShape=3.2, reverbGain=0.55, samples })`
(audio.js:9-33). Render normalises to −1 dBFS then CLI loudnorm targets `audio.lufs`
(default −14) and muxes AAC 256k (audio.js:788-798; render.mjs:73,124). Kit keys
(audio.js:680-715) — all instrument times are ABSOLUTE film seconds:
- `kick(t, g=1)`, `taiko(t, g=0.8, f=62)`, `impact(t, g=0.8, low=55Hz)`, `sub(t, g=.6, f0=90, f1=28, dur=2.5)`
- `braam(t, notes, dur=3, g=.3, bright=1)`, `strings(t, notes, dur=4, g=.05, atk=1.2, rel=1.5, cut=2600)`
- `pad(t, notes, dur, g=.05, cut=1600, atk=.4)`, `choir(t, notes, dur=4, g=.05, vowel='a', atk, rel)`
- `piano(t, m, g=.18, dur=4)`, `pluck(t, m, g=.08, cut=3200, dur=.22, type)`, `bass(t, m, dur, g=.35, type, cut)`
- `bell(t, fHz, g=.12, dur=1.2, ratio=3.5, index=3)` — **Hz, not MIDI** (audio.js:194; 3000
  calls `bell(t, hz(69))`, score.js:95)
- `riser(t0, t1, g)`, `swell(t0, t1, g, top)`, `whoosh(t, dur=.8, g=.2, f0=300, f1=3500)`
- `rain(t0, t1, g=.12)` (bed + droplets), `thunder(t, g=.5, dur=4.5)`, `wind(t0, t1, g, f0, f1)`
- `glass(t, g, spread)`, `clunk(t, g)`, `hiss(t, dur, g)`, `heartbeat(t, g)`, `crash(t, g)`,
  `hat`, `clap`, `tick(t, g, f)`, `blip(t, f, g, dur, type)`, `glitch(t0, dur, g)`,
  `sweepDown(t, dur, f0, f1, g, type)`, `crowd(t0, t1, g)`, `flutter(t0, t1, g)`,
  `sample(t, name, {gain,pan,width,rate,offset,dur,send})`
- Custom voice primitives: `kit.osc(type, fHz, t, dur)`, `kit.noise(t, dur)`,
  `kit.env(param, t, a, peak, d, sustain=0, rel=0, hold=0)` (audio.js:66-72),
  `kit.out(node, gain=1, send=0..1 reverb, pan=−1..1, width=0..1 Haas)` (audio.js:43-65),
  `kit.at(t, fn)`, `kit.hz(midi)`, `kit.R()` (seeded rng), `kit.ac`, `kit.verb`.
- **Shared-clock rule:** import `./timeline.js` and schedule from `MASTER.*` / `b(shot,bar)` /
  `beatSec` — never hand-add t0, never re-derive downbeats. Freeze resumes are
  `MASTER.x + <stop d>` (3000/score.js:61-65). Register EVERY cue top-level in `score(kit)`;
  do not call `kit.at()` from inside a scheduled callback (flush-window bug — 3000
  score.js:5-9 learned this the hard way). End-card: last cue + reverb tail must finish
  before 100.0 (`audio.reverb` shortens the shared tail; see timeline SECTIONS.endcard).

## RAIN / NEON / LIGHTNING — proven patterns

- **Analytic rain columns:** `rainLayers(ctx, t, k=1, wind=-110)` — 3 parallax layers,
  hash-seeded drops wrapped by modulo, slant `wind/900·len·3`, single path per layer
  (fade-to-bald/art.js:395-419). Authored in 960×540 stage coords (LW/LH constants) —
  port the constants or draw inside a 2× stage. Ground splashes: `splashes(ctx, t, y, k, seed)`
  (art.js:421-437). Rain is `t`-driven, so it keeps falling through hit-stops (good).
- **Puddle neon smear:** `reflect(ctx, cx, feetY, t, drawFn, a=0.14)` — pose painted into a
  cleared scratch, blitted mirrored `scale(1, −0.52)` with `lighter` + 2 px wobble
  (fade-to-bald/art.js:536-551). Vertical smeared gradients: `cityGlow` (art.js:656-666),
  `warmGlow` radial (553-561), `neon(ctx, text, x, y, size, t, seed, col, align)` tube
  letters with flicker quanta + one dead letter, double fill pass (440-470).
- **Lightning:** `lightningBolt(x, t, k, sx, { variant, endY })` (baldshank/art.js:2439-2468)
  — `rng(floor(sx·10)+variant)` makes ONE bolt shape, redrawn per frame; 3 strokes
  (7 px @ .95, 3 px @ .5, 2 px @ .4, `lighter`) + radial ground-flash at the foot; `k` is the
  lifecycle 0..1. Pair with a FLASHES entry + a 1-frame sky wash. Electric arcs (our time
  bubble): same seeded-polyline trick bent around a circle; explosion glow:
  `hairNova` rings + radial core in `lighter` (star-flows/art.js:148-198); two-pass glow
  lines: `drawBolt` (star-flows/art.js:201-231). Darkness with light holes must be
  scratch-isolated `destination-out` (fade-to-bald/art.js:564-583).

## PITFALLS (top 15)

1. **ASI:** house style is no-semicolon (biome default; matches 3000/termhairnator files).
   NEVER start a line with `[`, `(`, or a template literal — `foo()\n[1,2]` parses as
   `foo()[1,2]`.
2. **Math.random / Date ban** everywhere (lint + reverse-seek SHA256 proofs,
   lessons.md:110,148). Use `hash(n)`, `rng(seed)`, `kit.R()`, and vnoise.
3. `style: 'serif'|'machine'|'machineWarm'` must be declared in `captionStyles` or the film
   fails at LOAD (runtime.js:91); `anim: 'slam'` silently renders as a plain cut (captions.js:135).
4. Caption hold floor: visible window after in/out ≥ 3.0 s (3.5 end card) and fully before
   the shot cut — validate() in timeline checks it; lint re-checks against the render.
5. Letterbox safe band: nothing readable in y < 138 or y > 942 at `letterbox: 1.0`; the post
   pipeline draws bars OVER the overlay (post.js:218-226).
6. Hit-stop clock: `sl` exists only during a stop and is a sibling of `stop` — freeze-frame
   animation keys on `sl`, impacts/sparks/shake on real `t`, actors on `g`. Mixing these up
   either freezes the world twice or animates during stillness.
7. g values are BACK-COMPUTED: every earlier stop's d shifts later film times. Never "fix" a
   film-time miss by hand-adding offsets — re-solve g (t0 + g + Σ earlier d = target) and let
   validate() pin it (3000 "kill g" lesson, timeline.js:50-61).
8. Score: all cues top-level in `score(kit)`; nested `kit.at()` registration misses the
   0.5 s flush windows (audio.js:765-785). Also `bell` takes Hz — wrap MIDI in `kit.hz`.
9. Reverb tails outlive the last cue: with default reverb 3.2 s, schedule nothing after
   ~96.5 s unless `audio.reverb` is shortened; timeline requires all tails done by 100.0.
10. Stale aux canvases: clear the WHOLE scratch (including overscan) every frame, before
    applying camera translate; size scratches for the largest pose (lessons.md:101,148).
11. `destination-out` on the scene erases every layer beneath — isolate masks/glows/darkness
    in their own scratch (lessons.md:66; fade-to-bald `darkness`).
12. `imageSmoothingEnabled` resets when a canvas is resized — re-set it before every
    drawRemy/blit; keep `sx === sy` or the pixel rig smears.
13. HUD/CRT text is PICTURE on `overlay`: mono ≥ 24 px at 1080p (LOOK.hud), red-on-near-black,
    hand-inspect every read — lint cannot judge imperative type (lessons.md:123).
14. AAC true-peak overshoots the loudnorm target — verify the DECODED AAC of the final mp4
    (−14 LUFS default), never just the WAV (lessons.md:181-182).
15. Shots must tile [0, DUR) exactly (lint errors on gap/overlap), cuts land on
    `grid.bar` if declared, and `prepare()` bakes everything (molten pool, chrome endoskeleton,
    letterboxed stage) — no asset loads or canvas creation inside draw.
