# BREAKING BALD — API notes (single source of truth for builder + composer)

Scouted from: `~/dev/filmkit/{README.md,core/lib.js,core/motion.js,core/audio.js}`,
`films/remy-bros/art.js`, `films/3000/{timeline,art,film,score}.js`, `films/fade-to-bald/art.js`,
`films/goldflow/art.js`, `films/good-bad-bald/art.js`, `.omp/skills/remy-media/{SKILL,lessons}.md`.
Every signature below is copied from source with `file:line`. Do not paraphrase from memory.

---

## 1. Render contract (filmkit)

- Film = `films/<name>/film.js` default export: `{ title, output, duration, prepare, shots, captions, captionStyles, flashes, score, audio, fonts, palette, variants, grid, lint }` (README:55-77).
- Shot `draw(ctx, lt, dur, t, overlay)` paints a transparent 1920×1080 canvas; `lt` = seconds into shot, `t` = film time. Anything on `overlay` composites AFTER bloom/grade/lens (only grain/flash/fade/letterbox apply after) — draw type there (README:80).
- `fx(lt, t)` returns post settings (README:81): `bgVoid/bgPaper/bgBlue/red, bloom, bloomThresh, bloomWide, halation, rays, lightX, lightY, rayDecay, rayDensity, streak, streakTint, aber, riso, crt, glitch, tvOff, exposure, contrast, sat, tint, lift, tonemap, warm, haze, hazeColor, grain, weave, letterbox (0–1 → 2.39:1 bars), vignette, flash, fade`.
- Pure functions of `t`: no `Math.random`, no `Date.now`, no frame-to-frame state. Use `hash(n)`/`rng(seed)`. `seek(t)` (optional async) runs before every frame for video media only.
- `audio: { seed, reverb, reverbGain, lufs, samples: { name: new URL('./x.wav', import.meta.url).href } }` (README:69).
- `flashes: [[absT, peak, decay], ...]` — full-frame white flashes; 3000 house rule: peak ≤ 0.24, decay ≤ 0.2 (timeline.js:34).
- CLI: `filmkit preview|stills|sheet|lint|render <slug>`; `sheet --video file.mp4` checks the ENCODED file; render with no command timeout; lint checks timeline contiguity, caption holds (default 3 s visible), safe area.

## 2. `filmkit/lib.js` — exact signatures

```js
export const W = 1920, H = 1080;                                   // lib.js:4-5
export const clamp = (x, a = 0, b = 1) => ...                       // lib.js:8
export const lerp = (a, b, t) => a + (b - a) * t;                   // lib.js:9
export const seg = (t, a, b) => clamp((t - a) / (b - a));           // lib.js:10
export const smooth = (t) => t * t * (3 - 2 * t);                   // lib.js:11
export const E = { inQuad, outQuad, inCubic, outCubic, inOutCubic,  // lib.js:12-29
  outQuart, outExpo, inExpo, inOutExpo, outBack, outElastic }
export function hash(n)            // lib.js:31  int seed → [0,1)
export function rng(seed)          // lib.js:38  → () => [0,1)
export const pick = (r, arr) => arr[Math.floor(r() * arr.length) % arr.length]; // lib.js:47
export function vnoise(x, seed = 0) // lib.js:48 smooth 1D value noise
export const spring = (t, k = 14, z = 0.35) => ...                  // lib.js:54
export function rgb(hex); export function mixHex(a, b, t);          // lib.js:57,61
export function alpha(hex, a);      // → 'rgba(r,g,b,a)'            // lib.js:65
export function shade(hex, k);      // multiply                      // lib.js:69
```

Fonts (lib.js:76-82): `F = { anton: 'Anton', mono: '"JetBrains Mono"', grot: '"Space Grotesk"', vt: 'VT323', serif: '"Cormorant Garamond"' }`.

```js
export function txt(ctx, s, x, y, o = {}) {                        // lib.js:84
  const { size = 48, font = F.anton, weight = '', color = '#ffffff',
          align = 'left', base = 'alphabetic', track = 0, alpha: a = 1 } = o;
  // SUPPORTED options (ACTUAL, complete list):
  //   size, font, weight, color, align, base, track, alpha,
  //   shadow (colour) + off (default size*0.03),
  //   glow (colour) + glowBlur (default size*0.35),
  //   stroke (colour) + strokeW (default 2)
  // alpha <= 0 → silent no-op return. weight is spliced verbatim into
  // ctx.font: 'italic 600' yields true italics.
}

export function measure(ctx, s, size, font = F.anton, track = 0, weight = '') // lib.js:113
// shapes: rrect(ctx,x,y,w,h,r) :124 · star(ctx,x,y,n,r1,r2,rot=0) :128
// cursor(ctx,x,y,s=1,fill,stroke) :139 · hand(ctx,x,y,px=5,fill,stroke) :179
// pixel: PALETTES.neon :197 · sprite(seed,pal='neon') :210 · SMILEY :307
// smileySprite(face,ink,bg,hi) :320 · pix(ctx,img,x,y,w,h=w) :339 (nearest)
```

## 3. `filmkit/motion.js` — exact signatures

```js
export function lineIn(ctx, s, x, y, pIn, o = {}, pOut = 0);        // motion.js:6  clip-window rise/fall; o.size ?? 100 clips the window
export function typed(s, t, cps = 22);                              // motion.js:20 pure string slice, returns ''
export function stamp(ctx, s, x, y, o = {});                        // motion.js:54 CENTER-anchored eroded stamp. o: { size=140, p (0..1 slam progress), color='#ff2e4d', seed=7, rot=-0.18, alpha }
export function slam(ctx, text, x, y, p, o = {});                   // motion.js:70 CENTER, base 'middle'. o: { from=2.2, shake=0, alpha, size=150, font=F.anton, color='#fff', track=0, glow, glowBlur, flash (white full-frame only while q<0.12) }
export function chip(ctx, x, y, w, h, label, p, o = {});            // motion.js:90 (x,y) is the PILL CENTER. o: { alpha, glow, glowBlur=24, active, activeColor, color='#b8ff5a', fill, lineWidth=2, size=26, font=F.mono, weight 700, textColor, track=1, overlay (draw label on another ctx) }
export function flowArrow(ctx, x0, y0, x1, y1, p, o = {});          // motion.js:121 o: { bend, bendY (quadratic ctrl offsets), color='#b8ff5a', width=5, glow, glowBlur=18, dashed (true|[12,10]-style), head=20, packet (bool), phase, packetSize=8 }
export function typewriter(ctx, s, x, y, lt, o = {});               // motion.js:148 lt = local seconds. o: { cps=24, size=44, font=F.mono, weight=500, color='#fff', align='left', base='middle', track=0, caret (false disables after done), caretColor, caretGap=4, caretWidth=3, caretHeight=24 }. Returns n chars shown.
export function underline(ctx, x, y, w, p, o = {});                 // motion.js:162 o: { color='#b8ff5a', width=4, alpha, glow, glowBlur=12 }
export function counter(ctx, from, to, p, x, y, o = {});            // motion.js:172 outCubic roll. o: { prefix='', suffix='', size=72, font=F.anton, color='#fff', align='left', base='middle', track=0 }. Returns value.
```

## 4. `filmkit/core/audio.js` — the kit

Kit factory (audio.js:9): `createKit(ac, opts)`; `opts.seed ?? 4242`, `opts.reverb ?? 3.2` (s), `opts.reverbShape ?? 3.2`, `opts.reverbGain ?? 0.55`, `opts.samples` (decoded buffers). Film passes them via `audio: { seed, reverb, reverbGain, samples }` (audio.js:763 `createKit(ac, { ...film.audio, samples })`). Master gain 0.8 → compressor (thr −16, ratio 4) → destination; shared convolution reverb; score peak-normalised to −1 dBFS (audio.js:794).

**EVERY instrument call is POSITIONAL. No instrument takes an options object. NO instrument exposes gain/pan — mixes are baked in.** The single exception is `sample`. All are deferred wrappers (audio.js:679 `defer`): called top-level in `score(kit)` they enqueue `{t, fn}` events (audio.js:678 `at(t, fn)`).

| Instrument (kit key) | Exact signature (audio.js line) | Arg notes |
|---|---|---|
| `kick` | `(t, g = 1)` :91 | — |
| `clap` | `(t, g = 0.5)` :107 | — |
| `hat` | `(t, g = 0.12, dur = 0.045)` :123 | dur s |
| `crash` | `(t, g = 0.22)` :133 | long wash (~2.6 s) |
| `bass` | `(t, m, dur, g = 0.35, type = 'sawtooth', cut = 700)` :143 | **m = MIDI**; type any osc string |
| `pluck` | `(t, m, g = 0.08, cut = 3200, dur = 0.22, type = 'sawtooth')` :161 | MIDI; two detuned oscs + LP sweep |
| `pad` | `(t, notes, dur, g = 0.05, cut = 1600, atk = 0.4)` :176 | **notes = MIDI array**; 3 detunes/note; width 0.7 |
| `bell` | `(t, f, g = 0.12, dur = 1.2, ratio = 3.5, index = 3)` :194 | **f in Hz** (not MIDI); the FM instrument (mod→car.frequency); random pan via R() |
| `impact` | `(t, g = 0.8, low = 55)` :206 | low = Hz pitch centre |
| `riser` | `(t0, t1, g = 0.18)` :223 | noise BP 300→7000 + saw 110→880, resolves at t1 |
| `sweepDown` | `(t, dur, f0, f1, g = 0.3, type = 'sine')` :249 | Hz |
| `tick` | `(t, g = 0.08, f = 3000)` :258 | f Hz (metal shink / crackle) |
| `blip` | `(t, f, g = 0.07, dur = 0.08, type = 'square')` :269 | f Hz |
| `glitch` | `(t0, dur, g = 0.08)` :276 | seeded random steps |
| `drone` | `(t0, t1, notes, g = 0.05, cut = 500)` :288 | MIDI array; LFO on LP; width 0.6 |
| `braam` | `(t, notes, dur = 3, g = 0.3, bright = 1)` :321 | MIDI array; tanh waveshaper (the only shaper; NOT exported as a helper) |
| `taiko` | `(t, g = 0.8, f = 62)` :347 | **f = Hz** (score passes 55/58/62 as pitch, not MIDI) |
| `strings` | `(t, notes, dur = 4, g = 0.05, atk = 1.2, rel = 1.5, cut = 2600)` :365 | MIDI array; delayed vibrato; width 0.85 |
| `choir` | `(t, notes, dur = 4, g = 0.05, vowel = 'a', atk = 1.4, rel = 1.8)` :394 | MIDI array; formants a/o/u; width 0.9 |
| `piano` | `(t, m, g = 0.18, dur = 4)` :424 | MIDI; AUTO-PAN by pitch `(m-64)/30` clamp ±0.6 |
| `sub` | `(t, g = 0.6, f0 = 90, f1 = 28, dur = 2.5)` :445 | Hz sweep |
| `swell` | `(t0, t1, g = 0.25, top = 9000)` :454 | reverse-cymbal, ends exactly at t1 |
| `rain` | `(t0, t1, g = 0.12)` :467 | bed + seeded drops |
| `thunder` | `(t, g = 0.5, dur = 4.5)` :494 | — |
| `wind` | `(t0, t1, g = 0.15, f0 = 400, f1 = 1600)` :512 | BP sweep + LFO |
| `glass` | `(t, g = 0.3, spread = 1.4)` :531 | shard sprinkle over `spread` s |
| `clunk` | `(t, g = 0.5)` :562 | thud + metallic ring partials |
| `hiss` | `(t, dur = 1, g = 0.12)` :586 | — |
| `heartbeat` | `(t, g = 0.5)` :598 | lub-dub pair (+0.26 s) per call |
| `crowd` | `(t0, t1, g = 0.15)` :608 | 3 BP bands |
| `whoosh` | `(t, dur = 0.8, g = 0.2, f0 = 300, f1 = 3500)` :629 | up-down BP sweep |
| `flutter` | `(t0, t1, g = 0.12)` :644 | 17 Hz gated noise |
| `sample` | `(t, name, { gain = 1, pan = 0, width = 0, rate = 1, offset = 0, dur, send = 0 } = {})` :665 | ONLY options-object instrument; `name` must be registered in `audio.samples`; throws if unknown |

Low level (returned on kit, audio.js:680-715): `ac` (OfflineAudioContext), `R` (seeded rng — the kit's ONLY randomness, use it for seeded variation), `hz(m)` (module export too, audio.js:7: `440 * 2^((m-69)/12)`), `osc(type, f, t, dur)` :81, `noise(t, dur)` :73, `env(param, t, a, peak, d, sustain = 0, rel = 0, hold = 0)` :66, `out(node, gain = 1, send = 0, pan = 0, width = 0)` :43 (width = Haas spread for sustained beds), `master`, `verb`, `at(t, fn)`, `events`, `samples` (the decoded buffers, `kit.samples.name` is an AudioBuffer).

- Custom voices: schedule with `kit.at(t, () => {...})` so nodes are created just in time; build explicit envelopes; exponential ramps need positive endpoints. FM = carrier osc + modulator osc → gain → `carrier.frequency`. `ac.createPeriodicWave(real, imag)` duty-cycle voices are film-local (see `.omp/skills/remy-media/templates/film/score.js`, `films/remy-bros/score.js`) — nothing in core.
- `renderScore(film, rate = 48000)` :751 decodes samples, runs `score(kit)`, flushes events in 0.5 s windows. **Because events are sorted and flushed in order, schedule everything TOP-LEVEL in `score(kit)`; nested `kit.at` registration was a real flush bug in 3000 (score.js:4-7 — "kit.at() is not used at all").**
- `spliceBuffer(buf, segments)` :803 — variant splice with 4 ms fades.

## 5. Rig — `films/remy-bros/art.js`

```js
export const canvas = (w, h) => { ... imageSmoothingEnabled = false }   // art.js:7
export async function loadRemy(i, far) {                                // art.js:43
  // loads ../../media/quest/sprites/[far/]<i>.webp  (f = far ? 9 : 6)
  // bodyH = 576/f, bodyW = 432/f, PAD = 2, hem = max(2, round(3*6/f))
  // alpha-scans top/bottom, builds white silhouette 'sil' (source-in #fff)
  return { c, sil, w, h,
           legTop: PAD + bodyH + hem,        // NEAR f=6 → legTop 101, FAR f=9 → 68
           cx: PAD + Math.floor(bodyW / 2),  // NEAR 38, FAR 26
           top, bottom };                    // opaque bounds (feet = bottom+1)
}
export function drawRemy(ctx, R, x, feet, o = {}) {                     // art.js:76
  // (x, feet) = FOOT ANCHOR (feet line), not top-left. M = 6 margin.
  // o (FULL list + defaults):
  //   lift:   [l, r] = [0, 0]   px each leg rises (source rows shift up)
  //   stride: [l, r] = [0, 0]   px each leg offsets horizontally
  //   lean:   0                 body shear: strips of 3px shift dx = (legTop - y) * lean
  //   flip:   false             mirror about the foot anchor
  //   sx, sy: 1, 1              scale (draw at 2.3–3.0 for 1080p painted stages)
  //   rot:    0                 rotate about (x, feet)
  //   upside: false             invert vertically (shifts up by body height)
  //   alpha:  1
  //   glow:   colour string     8-offset silhouette stamp behind, tinted
  //   glowA:  1                 glow opacity multiplier
  //   white:  false             draw R.sil (white silhouette) instead of R.c (hit flash)
}
```

Internals that matter (art.js:76-111): legs are split at `R.legTop` — left leg source `[0, legTop, R.cx, lh]`, right `[R.cx, legTop, R.w - R.cx, lh]`, `lh = R.h - R.legTop`; each drawn at `M + stride[i]`, `M + legTop - lift[i]`. Body above legTop is sheared in 3 px strips. `place()` anchors `ax = M + R.w / 2`, `ay = M + R.bottom + 1`, rounds `x`/`feet` to integers, and applies `scale((flip ? -1 : 1) * (o.sx ?? 1), (o.sy ?? 1) * (o.upside ? -1 : 1))`. Scratch canvases (`getScratch`, art.js:62) GROW but never shrink and are re-cleared per call.

Other exports: `headCrop(R)` :114 (44 px top strip — the kicked "shell"), `loadHeads()` :121 (heads.webp atlas Image), `headIcon(atlas, i, k = 1)` :124 (cell `(i % 67) * 16, Math.floor(i / 67) * 16`, 16k canvas), `PAL` :131 (game palette), `cloud/bush/sky/mountains/hills/ground/qBlock/usedBlock/brick/hardBlock/pipe/coin/castle/flag` :176-459 (pixel-prop bakers; `ground(w, h, pits)` cuts pits).

**Rule: any pixel repaint helper must return `{ ...R, c, sil: whiteSil(c, R.w, R.h) }` — rebuild the silhouette or `white:`/`glow:` show stale art.** (Pattern used by every 3000 repaint.)

## 6. Patterns worth copying from `films/3000` (104 s epic)

### 6.1 Timeline schema (timeline.js)
- `DUR` exact (104.0). `T = { shotName: t0, ... }` :115. `SHOTS = [{ name, t0, t1, desc }]` :127 — contiguous, covers [0, DUR).
- **Shot clock with hit-stops** (verbatim, timeline.js:152-169):
```js
export function makeClock(t0, stops = []) {   // stops: [{ g, d }] shot-local WORLD time
  const warp = (ts) => { let acc = 0
    for (const s of stops) {
      const rs = s.g + acc
      if (ts < rs) return { g: ts - acc, stop: null, sl: 0 }
      if (ts < rs + s.d) return { g: s.g, stop: s, sl: ts - rs }
      acc += s.d }
    return { g: ts - acc, stop: null, sl: 0 } }
  const filmT = (g) => { let acc = 0
    for (const s of stops) if (s.g < g) acc += s.d
    return g + acc }
  return { t0, stops, warp, filmT, abs: (g) => t0 + filmT(g) } }
```
- Units: `*_EV` tables are shot-local WORLD seconds `g` (map ONLY via `CLK.abs(g)`); `warp(lt)` takes the SHOT-LOCAL film time draw receives; `w.sl` is a SIBLING of stop (`w.sl`, never `w.stop.sl`, film.js:462); `MASTER` + flat constants are absolute film seconds.
- Musical grid: `SECTIONS = [{ name, t0, t1, bpm, beats, key, feel }]` :177 (per-shot tempo, no one BPM tiles the film); `b(name, bar, beat = 0)` :204 → absolute seconds of that beat; `barSec(name)` :208; `beatSec(name)` :209. Pinned downbeats land within 30 ms of `b(...)` (validated).
- `STOPS = { shotName: [{ g, d }, ...] }` :222. One named clock per shot :240-250.
- `MASTER = { everyCue: CLK.abs(EV), ... }` :382 — every value is `t0 + filmT(EV)`, never hand-added. Flat SCREAMING aliases :489-520 (`KICK_G`, `FREEZE_G`, ...). `CUES` :612 = composer quick table, every value ∈ MASTER.
- `CAPTIONS` :564 — film seconds, `{ id, text, t0, t1, style, x, y, size, anim, in, out, minHold?, font?, color?, track? }`. Text: string with `\n`, or array of lines; a line can be `[[text, colour], ...]` spans (timeline.js:574: `['This is madness!', ['Madness?', '#e05038']]`). Visible window = `[t0+in(+typing), t1−out]` ≥ 3.0 s (end card 3.5). Lane map: no same-lane overlap.
- `FLASHES = [[absT, peak, decay]]` :594 + `flashK(t)` :605. `SAFE = { letterbox: 1.0, bandY: [138, 942], captionYMin: 180, captionYMax: 900, minSize: 32 }` :540.
- `validate()` :661 — import-free, runs under bare node (`node --input-type=module -e 'import("./films/3000/timeline.js").then(m=>console.log(m.validate()))'`). Checks: structure/coverage, stops inside shots + mandated freeze table ±30 ms, EV tables finite/ordered/past-worldLen, MASTER derivability, caption holds/sizes/lanes/9-words/MASTER anchors, grid drift, flash limits, CUES ⊆ MASTER. Convention: `bad(PASS-CONDITION, msg)`.

### 6.2 film.js mapping (film.js)
- Module-level `const S = {}` filled in `prepare()` (film.js:29, 939-966): bakes + rigs. Rig chain: `S.leo = ART.cuirass(ART.stripLeftBlade(await load(42)))`; young = `ART.miniRig(ART.cuirass(ART.stripLeftBlade(...), {tint...}), 0.55)`.
- `shots: SHOTS.map((sh) => ({ ...sh, draw(ctx, lt, dur, t, overlay) { dispatch by sh.name }, fx: () => ({ letterbox: 1.0, bloom, bloomThresh, vignette, grain, warm, ... }) }))` (film.js:967-994).
- Camera: `cam(ctx, k, cx, cy, sx = 0, sy = 0)` = translate(960+sx,540+sy)·scale(k)·translate(−cx,−cy) (film.js:36). Shake: `shakeXY(t, amp)` = hash at `floor(t*90)` (film.js:42) — REAL time, so shake lives through freezes. Bakes drawn at `(−OS, −OS)` because they are baked with `OS=220` overscan (translate(OS, OS) inside the bake).
- Letterbox: BOTH `fx: { letterbox: 1.0 }` AND hard `ART.bars(ctx)` painted LAST in every draw (art.js:1028: fills `#060402` top/bottom bars incl. overscan so nothing bleeds).
- HUD/picture type: `kickWords(overlay, lt)` (film.js:201) slams big words via `motion.slam` on the overlay with `measure()` shrink-to-fit (`if (w0 > 1700) size = ...`) — these are PICTURE, never captions; all reading text is declarative CAPTIONS.
- Hit-stop use: actor poses gate on `stop != null && stop.g === EV` (frozen pose, film.js:243); `lurch = slamStop ? Math.sin(cl(sl / 0.3) * Math.PI) * 26 : 0` (film.js:475) — freeze interior choreography off `sl`. Impacts (dust/sparks/rings) age on REAL `t - MASTER.kick` so they bloom through the freeze (film.js:296-300).
- Slow-mo WITHOUT a stop: remap g in the draw fn — `crawlG = (g) => g < 5.2 ? g : g < 6.0 ? 5.2 + (g - 5.2) * 0.35 : 5.48 + (g - 6.0)` (film.js:459); laststand `wt` crawl + pin (film.js:759).
- Collision settle (no dead-stop clamp): `const over = Math.max(0, lin - wall); let x = wall + over * Math.exp(-over / 70)` (film.js:537-538).
- Fade-to-black / dim: `globalAlpha` rect over full frame incl. overscan (film.js:85-92, 819-826).

### 6.3 art.js painting (1585 lines)
- Overscan `OS = 220`, `BAR = 138` (art.js:11-12). `build()` :1559 awaits `document.fonts.load(...)` then returns 7 baked stages, each `canvas(W + 2*OS, H + 2*OS)` with `x.translate(OS, OS)`.
- Bake helpers: `skyGrad(x,w,h,stops,o)` :1038, `clouds(x,cx,cy,w,h,seed,base,lit,belly)` :1046 (puff masses + seams + belly shadow + lit tops), `ridge(x,w,baseY,amp,seed,col,colLit,colShade,hazeCol)` :1083 (lit/shaded faces + haze foot), `stoneWall` :1123, `groundTex(x,w,y0,y1,seed,base,hi,lo)` :1138 (gradient + 420 seeded dabs), `seaShimmer(ctx,yTop,yBot,t,col,seed=5)` :1154.
- Rig repaints (all return `{...R, c, sil}`): `stripLeftBlade(R)` :49 (per-scanline detached-run removal — removes hero 42's baked sword), `keepMain(R)` :80 (largest 4-connected alpha component), `trimStray(R)` :110, `cuirass(R, {tint,hi,deep})` :129 (baked armour over torso print), `gildXerxes(R)` :178 (per-pixel crown band → skin = proper baldify by luminance rules, then gold ornaments), `silkRobe(R)` :226 (dark neutral remap + pink→gold trim), `queenClean(R)` :258, `wickerMass(R, {shield})` :286 (cool pixels → desaturated bronze-grey mass), `miniRig(R, k)` :320 (downscale rig, ALL rig fields scaled, smoothing ON).
- `crownY(rig, feet, sy) = feet - (rig.bottom - rig.top + 1) * sy + 7 * sy` :332 — scalp line for head-anchored props.
- Props: `cape(ctx, x, shY, s, t, seed, col, {k, gust, kick, dir, len, wid, torn})` :337 (drawn BEHIND sprite, anchored at shoulders `crownY + 44*sy`; seeded sine billow, never integrates), `spear(ctx, x, y, ang, s, {len=150})` :394 (grip anchor, ang 0 = vertical tip up), `hoplon(ctx,x,y,s,{r=26,rot})` :434, `comb(ctx,x,y,rot,s)` :458, `walkCyc(ph, amp=5)` :469 → `{lift, stride, lean:0.05}` (phases per actor: `walkCycF(ph + i*0.7, 6)`), `stand` :473, `torch` :476, `immortalMask(ctx,x,cy,s,t,glint)` :503, `wigOffer(ctx,x,y,s,riseK,t)` :562, `barbershopPole(ctx,x,yBase,s,t,glowK)` :595, procedural `wolf(ctx,x,y,s,ph,{dir,crouch,bald,snap,moving})` :662.
- Analytic particles (immutable, seeded, position from age — no integration): `emberSingle(ctx, g, period)` :774, `ashFall(ctx, g, n, seed, {t, windX})` :789, `blizzard(ctx, t, n, {wind})` :804, `emberRise(ctx, t, n, seed, {y0, y1})` :828, and **`razorStorm(ctx, now, {life, rate, density, seed, dip:{at,k}, roofY, roofX0, roofX1, windX})`** :849 — O(visible): only seeds whose spawn window covers `now` are touched (`i0 = floor((now - life) * rate)`); at a story beat the `dip` TAGS airborne glyphs with ~3x gravity so the sky empties physically, no alpha-pop culling; roof-plane deflection with sparks.
- Impact fx (age on real t): `contactShadow(ctx,x,feetY,w,k=0.4)` :956, `dustBurst(ctx,x,y,age,seed,{life=0.8,n=14,spread=190,col})` :965, `sparkBurst(ctx,x,y,age,seed)` :985 (0.3 s), `shockRing(ctx,x,y,age,life=0.4,col)` :999, `glint(ctx,cx,cy,s,k)` :1012 (4-point, alpha = sin(k·π)), `bars(ctx)` :1028.

### 6.4 score.js consumption
- Header discipline (score.js:15-38): silence windows inside every freeze are listed explicitly; combat drives STOP ≥ 0.45 s before each kill stop so taiko tails < 1% at the stop; resume battery exactly at `STOP.g + d` (`KICK_RESUME = KICK + STOPS.emissary[0].d` :60); last cue 100.6 + 3.2 reverb ≤ 103.9 cardEnd — tail math printed in the header.
- Every cue top-level, registration order == time order (score.js:4-7). Grid from `beatSec(name)`; loops like `for (let t = s0; t < s1 - 1e-9; t += Q) taiko(t, g, f)`.
- Freeze interior gets ONLY tiny sounds: `sub(KICK + 0.065, 0.45, 65, 28, 0.5); hiss(KICK + 0.065, 0.45, 0.07)` (score.js:147-148). Heartbeats inside the hurl freeze are film-time MASTER entries (whitelisted in validate), not EV-table events.
- QA pattern: post-draft gain `duck(g, t)` multiplies kick/bass ×0.71 inside two measured windows, cue times unchanged (score.js:74-81). `audio: { seed: 3000, reverb: 1.4, reverbGain: 0.22 }` (film.js:1013).

## 7. Sibling-film painters worth stealing for BREAKING BALD

- **Baldify (hair→scalp repaint)** — `films/fade-to-bald/art.js:41` `baldify(R, skinHex)`: peels the hair band (`y < R.top + 64`), skips the face column (`y >= top+24 && |xx-cx| <= 9`) and dark outlines (`L < 40`), repaints the rest to a skin ramp keyed on the char's own skin tone (`m = edge ? 0.6 : 0.9 + 0.12*u` by luminance). Returns `{...R, c}` (NOTE: no sil rebuild there — rebuild it yourself if you need white/glow).
- **Duotone grade on a rig** — fade-to-bald `duo(R, hue, k=0.55)` :18 (`saturation`→grey, `color`→hue at alpha k, `multiply` vertical gradient); goldflow `gild(R, k=0.8)` :17 (same chain, gold). `silhouette(R, color)` :8 (source-in flat colour, pose rig kept).
- **Wig** — fade-to-bald `bakeWig(hue)` :77 (48×46 canvas: cap dome + 5 seeded locks + shine band, anchored at cap underside centre) and `drawWig(ctx, wig, cx, cy, rot, alpha=1, flip=false)` :644. good-bad-bald `bakeToupee()` :2302 (western toupee gag). 3000 `wigOffer` :562 (wig on a cushion, `riseK` float-in). 3000 `gildXerxes` :178 is the reference for "make an existing rig properly bald + ornamental".
- **Desert** — BEST: `films/good-bad-bald/art.js` `mesaLayer(x, w, baseY, minH, maxH, seed, col, o)` :198 (Path2D buttes+flats; `o.striate` sediment bands + warm left-face wash; `o.avoid=[x0,x1]` keeps a sun disc clear) and `paintSand(x, w, h, hY, c0, c1, c2, seed)` :248 (gradient + perspective wind ripples via `vnoise` + speckle). Palette `PW` :7 (sand/sandHi/sandLo/sandShadow, 3-light-level mesa ramps). Bakes: `paintDawn` :473 / `paintTitle` :530 / `paintFin` :587 (sun-low-LEFT, long shadows RIGHT — keep one light direction). Also `mad-bald/art.js:1257` `dunes(mode, k=1)` + `:1597` `sandstorm(w,h,seed)` (live dust wall), and `raiders-of-the-lost-hair/art.js:2040/2089` `dunesFarBake`/`dunesNearBake` (two-plane parallax dunes).
- **Glass/crystal** — fade-to-bald `framePortrait(img, hue, k, w, h)` :368 (frame + diagonal glass-sheen gradient with a hard stop at 0.28/0.29); fade-to-bald `bakeOffice` :217 window glass = dark fill + frame strokes (glass content painted live); goldflow `vial(x, cx, cy, s, t, glow)` :536 (glass vessel: gradient fill + white core streak + additive pulse ring); goldflow `searchlight(x, ox, oy, ang, len, alpha)` :565 (gradient beam wedge). hairpera/art.js:1265,1482 has crystal debris/drops glitter. Light shafts: fade-to-bald `spotlight(ctx,cx,topY,floorY,r,t,a=0.16,motes=true)` :488, `doorShaft` :519, `slats` :473, `warmGlow` :553, and the scratch-isolated `darkness(ctx, a, holes)` :565 (destination-out NEVER on the scene canvas).
- **Other handies** — fade-to-bald `reflect(ctx, cx, feetY, t, drawFn, a=0.14)` :536 (scratch-isolated mirrored reflection, `scale(1,-0.52)`, `lighter`), `chips(ctx, events, worldT, color, n=10)` :606 (canonical analytic particle burst from `{g,x,y,seed}` events), `neon(...)` :440 (per-letter tube flicker + one dead letter), `flick(t,seed,hz=24)` :393, `rainLayers` :395, `loadOrig(id)` :668 (`media/remy/Character<id>.webp`, 600×600 OPAQUE — frame it, don't paste it). goldflow `razor(x,cx,cy,rot,s,color)` :458, `goldHead(heads,i,k,color)` :44, `titleDraw(ov,text,cx,cy,k,bandX)` :657 (engraved shadow pass + gold gradient face + `source-atop` sheen band), `ribbonY/ribbon` :479-498 (shared-path flowing hair ribbon).

## 8. Known gotchas

1. **Positional audio args.** Every kit instrument is positional (`kit.taiko(t, 0.9, 58)` = time, gain, Hz). `{ gain }` objects throw nothing — they silently become wrong args. Only `kit.sample` takes an options object. No instrument takes `pan` (piano auto-pans; use `kit.out` on custom voices).
2. **Never start a statement with `[`.** Semicolon-free house style — a line beginning `[` glues onto the previous expression. 3000 writes `;(byLane[y] ||= []).push(c)` (timeline.js:788).
3. **Letterbox safe bands.** 2.39:1 bars = 138 px; visible band y [138, 942]; captions y ∈ [180, 900]; every caption size ≥ 32 px at 1080p (=16 px at 960×540). Paint hard `bars(ctx)` LAST in every shot AND set `fx.letterbox`; set `lint: { safe: { letterbox: true } }` so overlay type under bars is flagged.
4. **chip is center-anchored** — `(x, y)` is the pill CENTRE and the label sits at (0, 1) inside it. slam/stamp are also centre/middle anchored. lineIn/typewriter/counter take baseline/middle per `o.base`.
5. **Hit-stop cue shift.** Stop durations push later events: a naive local `8.4` after a 0.3 s stop lands at film 53.7, not 53.4 — 3000 stores `kill1: 8.1` (= film − t0 − prior stops). Events scheduled AT a stop's `g` fire at the START of the freeze (equality is intentional); resumed intervals must add the stop `d` explicitly; use `w.sl` (sibling), never `w.stop.sl`. Composer: schedule accents at `MASTER.x`, resumes at `MASTER.x + STOPS.shot[i].d`, and keep mixes dead ≥0.45 s before a stop.
6. **Flash grey-soup.** Full-frame flashes: peak ≤ 0.24, decay ≤ 0.2 (lint-checked in 3000); `slam`'s `flash` option only fires while q < 0.12; never desaturate a whole act; keep bloom ≤ ~0.14 with `bloomThresh ≥ 0.88` on bright skies/paper (SKILL.md:99) — a whitewashed sky was the original film's famous defect.
7. **Stale aux canvases.** The runtime clears only its own main/overlay canvases — every persistent scratch/bake must be reset per use (transform, composite op, alpha, full clear) and allocated for the LARGEST pose (a reused 700×120 scratch clipped a 196 px truck in remy-run). Clear/repaint the full frame including overscan BEFORE shake translates the camera (SonicSol lesson). Letterbox bars painted last hide nothing that bleeds.
8. **NaN is a silent no-op.** `txt` returns when `alpha <= 0`; painters do `if (k <= 0.02) return` — a NaN progress/guard skips drawing without throwing. Guard divisions; a helper called with wrong arity "fails visually, not loudly" (OutrunSol). Use `FILMKIT_DEBUG=1` for real stacks.
9. **Fractional pixel dims break terrain** — round canvas/ImageData dimensions, floor pixel coords. `evenodd` iris needs `moveTo(cx+r, cy)` before `arc` or a wedge appears. `destination-out` on a scene canvas erases ALL painted layers — isolate masks on their own scratch (annulus via outer + reversed inner subpath + `fill('evenodd')`).
10. **Caption discipline.** Fully-visible ≥ 3 s before the shot's cut (no crossing unless `span: true`); chain rides 0.2/0.15 minimum; dialogue that can't fit gets stacked/condensed (3000 deviation note), not shortened holds. Type that matters goes on `overlay` or declarative captions — lint cannot judge imperative HUD text.
11. **Silhouette rebuild.** Any pixel repaint must rebuild `sil` (`whiteSil`) or `white:`/`glow:` draws the pre-edit art.
12. **Score scheduling.** Top-level calls only (no nested `kit.at` — flush bug); all times in SECONDS via timeline constants, never hand-added delays; reverb tails must resolve before DUR (last cue + longest tail ≤ end); AAC overshoots −1 dBTP — measure the decoded MP4, not the WAV.

---

### Composer quick-start for this film
Import the film's `timeline.js` only; schedule with `MASTER.*` / `b(section, bar, beat)` / `beatSec(name)`; every instrument call positional per the table in §4; silence inside every hit-stop except (optionally) one sub/hiss; resumes at stop + d; write the tail math in the score.js header like 3000 does. Request `audio: { seed, reverb: 1.2-1.6, reverbGain: 0.2-0.25 }` from the builder.
