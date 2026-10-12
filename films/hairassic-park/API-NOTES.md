# HAIRASSIC PARK — verified API notes (all signatures read from source, 2026-10-12)

Import core as `filmkit/lib.js`, `filmkit/motion.js`, `filmkit/core/audio.js`; rig as `../remy-bros/art.js`.

## (a) lib + motion signatures

`~/dev/filmkit/core/lib.js`:
- `W=1920, H=1080` (L5); `clamp(x, a=0, b=1)` (L8); `lerp(a,b,t)` (L9); `seg(t,a,b)` = clamp((t−a)/(b−a)) (L10); `smooth(t)` (L11)
- `E.inQuad/outQuad/inCubic/outCubic/inOutCubic/outQuart/outExpo/inExpo/inOutExpo/outBack/outElastic(t)` (L12-29); `spring(t, k=14, z=0.35)` (L54)
- `hash(n)` → [0,1) (L31); `rng(seed)` → `() => [0,1)` (L38); `pick(r, arr)` (L47); `vnoise(x, seed=0)` (L48)
- colour: `rgb(hex)`, `mixHex(a,b,t)`, `alpha(hex,a)`, `shade(hex,k)` (L57-72)
- `F = { anton:'Anton', mono:'"JetBrains Mono"', grot:'"Space Grotesk"', vt:'VT323', serif:'"Cormorant Garamond"' }` (L76). Films add fonts via `film.fonts: [{family, url, weight}]`.
- `txt(ctx, s, x, y, o={})` (L84): o = `{size=48, font=F.anton, weight='', color='#fff', align='left', base='alphabetic', track=0, alpha=1, shadow, off, glow, glowBlur=size*0.35, stroke, strokeW=2}`
- `measure(ctx, s, size, font=F.anton, track=0, weight='')` → px width (L113)
- shapes: `rrect(ctx,x,y,w,h,r)`, `star(ctx,x,y,n,r1,r2,rot=0)`, `cursor`, `hand`, `pix` (L124-342)

`~/dev/filmkit/core/motion.js` (all take explicit progress p 0..1 or time; no internal state):
- `lineIn(ctx, s, x, y, pIn, o={}, pOut=0)` — clip-window rise, o.size default 100 (L6)
- `typed(s, t, cps=22)` → substring (L20)
- `typewriter(ctx, s, x, y, lt, o={})` — o `{cps=24, size=44, font=F.mono, weight=500, caret...}`; returns chars shown (L148)
- `slam(ctx, text, x, y, p, o={})` — o `{size=150, font, color='#fff', from=2.2, shake=0, track=0, glow, glowBlur, alpha, flash}`; draws centered at x,y (L70)
- `chip(ctx, x, y, w, h, label, p, o={})` — o `{color, active, activeColor, fill, size=26, font=F.mono, textColor, lineWidth=2, glow, overlay}` (L90)
- `flowArrow(ctx, x0, y0, x1, y1, p, o={})` — o `{bend, bendY, color='#b8ff5a', width=5, dashed, head=20, packet, phase, packetSize=8, glow}` (L121)
- `counter(ctx, from, to, p, x, y, o={})` → value; o `{prefix, suffix, size=72, font=F.anton, ...}` (L172)
- `stamp(ctx, s, x, y, o={})` — o `{size=140, p=1, color='#ff2e4d', seed=7, rot=-0.18, alpha}` (L54)
- `underline(ctx, x, y, w, p, o={})` (L162)

## (b) remy-bros rig (`films/remy-bros/art.js`)

- `loadRemy(i, far)` (L43) → `{ c, sil, w, h, legTop, cx, top, bottom }`; `c` sprite canvas, `sil` = white silhouette (glows/flashes), near cut f=6 (~76×116), far f=9. `top`/`bottom` = first/last opaque row.
- `drawRemy(ctx, R, x, feet, o={})` (L76) — `x,feet` = ground point; opts:
  | opt | effect |
  |---|---|
  | `lift: [l, r]` | raise each leg px (run cycles) |
  | `stride: [l, r]` | shift each leg px forward/back |
  | `lean` | shear top rows sideways (3px bands) |
  | `flip` | mirror horizontally |
  | `rot` | rotate about feet anchor (place() L104: pivot = x, feet) |
  | `sx, sy` | scale (nearest-neighbour crisp: set `ctx.imageSmoothingEnabled=false`) |
  | `upside` | flip vertically about own height |
  | `alpha` | global alpha |
  | `glow` / `glowA` | colour + strength of 2px outline halo behind sprite |
  | `white` | draw silhouette instead of sprite (hit flash) |
- `loadHeads()` → heads atlas Image (L121); `headIcon(atlas, i, k=1)` → 16k×16k canvas, 67 columns (L124)
- `canvas(w, h)` helper (imageSmoothing off, L7); `headCrop(R)` (L114); also `PAL`, `cloud`, `bush`, `sky`, `mountains`, `hills`, `ground`, blocks, `pipe`, `coin`, `castle`, `flag`, `blob(w,h,circles,shades,opts)` (L145).

## (c) audio kit — ALL POSITIONAL (core/audio.js; deferred via kit.at)

`score(kit)`; MIDI notes; `kit.hz(m)` = 440·2^((m−69)/12) (L7). Defaults shown:
- Electronic: `kick(t, g=1)` L91 · `clap(t, g=0.5)` L107 · `hat(t, g=0.12, dur=0.045)` L123 · `crash(t, g=0.22)` L133 · `bass(t, m, dur, g=0.35, type='sawtooth', cut=700)` L143 · `pluck(t, m, g=0.08, cut=3200, dur=0.22, type='sawtooth')` L161 · `pad(t, notes, dur, g=0.05, cut=1600, atk=0.4)` L176 · `bell(t, f, g=0.12, dur=1.2, ratio=3.5, index=3)` L194 · `impact(t, g=0.8, low=55)` L206 · `riser(t0, t1, g=0.18)` L223 · `sweepDown(t, dur, f0, f1, g=0.3, type='sine')` L249 · `tick(t, g=0.08, f=3000)` L258 · `blip(t, f, g=0.07, dur=0.08, type='square')` L269 · `glitch(t0, dur, g=0.08)` L276 · `drone(t0, t1, notes, g=0.05, cut=500)` L288
- Cinematic: `braam(t, notes, dur=3, g=0.3, bright=1)` L321 · `taiko(t, g=0.8, f=62)` L347 · `strings(t, notes, dur=4, g=0.05, atk=1.2, rel=1.5, cut=2600)` L365 · `choir(t, notes, dur=4, g=0.05, vowel='a', atk=1.4, rel=1.8)` L394 (vowel 'a'|'o'|'u') · `piano(t, m, g=0.18, dur=4)` L424 · `sub(t, g=0.6, f0=90, f1=28, dur=2.5)` L445 · `swell(t0, t1, g=0.25, top=9000)` L454
- Foley: `rain(t0, t1, g=0.12)` L467 · `thunder(t, g=0.5, dur=4.5)` L494 · `wind(t0, t1, g=0.15, f0=400, f1=1600)` L512 · `glass(t, g=0.3, spread=1.4)` L531 · `clunk(t, g=0.5)` L562 · `hiss(t, dur=1, g=0.12)` L586 · `heartbeat(t, g=0.5)` L598 · `crowd(t0, t1, g=0.15)` L608 · `whoosh(t, dur=0.8, g=0.2, f0=300, f1=3500)` L629 · `flutter(t0, t1, g=0.12)` L644
- Samples: `sample(t, name, {gain=1, pan=0, width=0, rate=1, offset=0, dur, send=0})` L665 — the ONLY options-object call; needs `audio.samples = {name: url}`.
- Low level: `kit.osc(type, f, t, dur)` L81, `kit.noise(t, dur)` L73, `kit.env(param, t, a, peak, d, sustain=0, rel=0, hold=0)` L66, `kit.out(node, gain=1, send=0, pan=0, width=0)` L43 (send→reverb, width=Haas), `kit.at(t, fn)` L678, `kit.R` (seeded rng from `audio.seed`, L10), `kit.events`.
- Film side: `audio: { seed, reverb=3.2, reverbGain=0.55, lufs=-14, samples }` (L22-32, README L69).

## (d) captions — fields + hold rules (core/captions.js, README L101-140)

- Style data (L11): `{ font, size, weight, color, align, x, y, lineHeight, track, anim, in, out, rise=16, drift=0, cps=28, glow, glowBlur, shadow }` or `draw(ctx, cap, style, t)`. `anim`: 'rise'|'fade'|'line'|'type'|'cut' (L12). Any field overridable per caption.
- Core styles (L18-28): `caption` base (grot 40, y930, in .5 out .3) · `sub` (30, y986) · `title` (anton 132, y540, line, in .7 out .5, track 2) · `kicker` (mono 26, y430, fade, track 6) · `lower` (left x140 y860) · `type` (mono 34, typewriter). NOTE core sub/kicker sizes < 32px floor — override size explicitly (3000/timeline.js L522-529).
- Caption fields: `{ id, text, t0, t1, style, x, y, size, minHold, span }`; `text` = string (`\n` lines) | array of lines | `[[text, colour], …]` spans.
- Hold rule: fully visible = `[t0 + in (+ typing), t1 − out]`; must hold ≥ `minHold ?? --hold ?? lint.captionHold ?? 3` s before its shot's cut; may not cross a cut unless `span: true`; must end inside the film (README L116, cli/commands/lint.mjs L24).
- 3000 house pattern (films/3000/timeline.js L532-589): lanes narrator y200 · title y540 · sub y660 · kicker y430 · speech y856; chains touch exactly (out of one = t0 of next); visible ≥ 3.0 (end card 3.5 via `minHold: 3.5`); every size ≥ 32; italic via `weight: 'italic 600'` (injected into canvas font string).

## (e) fx values that worked (`fx(lt, t)` per shot)

- 3000 (films/3000/film.js L982-993): `letterbox: 1.0` + `bloom 0.06–0.14, bloomThresh 0.86–0.9, vignette 0.42–0.6, grain 0.012–0.015, warm 0.08–0.16, sat 1.04–1.06, haze 0.05`.
- the-shine night grade (films/the-shine/film.js L681-695): `letterbox 0.8, vignette 0.95–1.28, sat 0.45–0.68, tint: [0.9, 0.96, 1.14], streak 0.12, aber 0.0006–0.0009, haze + hazeColor: [0.28, 0.18, 0.12], exposure −0.12→0, fade: seg(...)`.
- star-flows space look (films/star-flows/film.js L12-35): `bloom 0.12, bloomThresh 0.62, letterbox 1, vignette 1, grain 0.012`; blast ramps `bloom 0.14 + peak*0.24`; aber 0.0018 inside hit-stops.
- remy-kong CRT game look (films/remy-kong/film.js L14): `{ bloom 0.32, bloomThresh 0.62, crt 0.2, vignette 0.7, grain 0.014, aber 0.0009, sat 1.08, contrast 1.04 }`.
- hairassic template (films/hairassic-park/film.js L129/L133): vs `{bloom .3, bloomThresh .8, vignette .7, grain .015}`; duel `{bloom .14, bloomThresh .9, crt .12, vignette .55, grain .012}`.
- Rule of thumb: keep bloom ≤ 0.14 + threshold ≥ 0.86 on painted stages (whitewashed-sky lesson, .omp/skills/remy-media/lessons.md L14); full defaults in `~/dev/filmkit/core/post.js` `FX_DEFAULTS`.

## (f) 3000 letterbox + painted-stage pattern

- Band math (films/3000/timeline.js L538-540): visible band = 1920/2.39 = 803 px → bars (1080−803)/2 = **138** → band y **[138, 942]**. `export const BAR = 138` (films/3000/art.js L12).
- `bars(ctx)` (films/3000/art.js L1028): paints `#060402` `fillRect(-OS, -OS, W+2OS, BAR+OS)` and `(…, H−BAR, BAR+OS)` — called LAST in every draw so nothing bleeds. `OS = 220` overscan (L11); bakes drawn at `drawImage(bake, -OS, -OS)`.
- Camera: `cam(ctx, k, cx, cy, sx, sy)` = translate(960+sx, 540+sy) → scale(k,k) → translate(−cx,−cy) (3000 film.js L36-41). Shake real-time: `shakeXY(t, amp)` uses `hash(floor(t*90))` (L42-45).
- Painted backgrounds baked ONCE in prepare: `S.bake = await ART.build()` (3000 film.js L939-941); captions stay in [180, 900]; `lint: { captionHold: 3, safe: { margin: 0.05, letterbox: true } }` (L1014).
- Score/caption integration: cue-sheet timeline.js exports SHOTS/CAPTIONS/FLASHES/`makeClock`; per-shot clock `warp(lt)` → `{g, stop, sl}`, `filmT(g)`, `abs(g) = t0 + filmT(g)` (timeline.js L152-169). Impacts/particles age on REAL t so they move through freezes; actors on g. Flashes `[absT, peak, decay]`, peaks ≤ 0.24 (L594-604).

## (g) Giant-creature bake (films/remy-kong)

- Big rig: `ART.kong = await A.loadSprite(1217, { far: true, k: 2 })` (game.js L18). `loadSprite(i, { far=false, k=1 })` (films/remy-kong/art.js L34): rescales the source sprite by k (k<1 smooth + hard alpha re-threshold at a≥110; k≥1 nearest) and returns the SAME rig struct with legTop/cx scaled ×k — feed straight to `drawRemy`.
- Staging (game.js L332-403): `translate(fx + tremble, feet − 79)` → `rotate(angle)` → `translate(0, 79)` (rotation pivot 79px above feet) → `drawRemy(x, R, 0, 0, o)` in local coords. Procedural arms drawn as chunky pixel limbs in 2 passes (dark outline pass, fill pass) from shoulder anchors (L307-324). Pose = `kongState(g)` pure switch (idle/pound/throw/fall/down). Tremble `Math.round(sin(lt*90)*2)` on real lt (L367). White flash: `white: dt < 0.05` (L357).
- Lesson: rotation needs ground-support radius at sideways angles; never clamp centre only (lessons.md L26).

## (h) Rain pattern (the-shine) — FOUND

- `rain(ctx, t, k, wind=-160)` (films/the-shine/art.js L560-572): `n = round(90*k)` drops in ONE batched `beginPath`; x/y from `hash(i…)` wrapped by modulo over `(LW+240)/(LH+140)`; each segment `(px,py)→(px+wind*0.02, py+11)`; stroke `rgba(158,178,222, 0.16+0.1k)`, lineWidth 1. Pure in t.
- `rainWin(ctx, rect, t, k)` (L574): same idea clipped inside a rect (windows).
- Also available: `fog(ctx, t, y0, h, seed, alpha)` via `vnoise` (L588); lightning bolt (L540s); 3000 `blizzard(ctx, t, n, {wind=340})` slanted streaks + snow (films/3000/art.js L804), `ashFall` (L789), `emberRise` (L828), and `razorStorm` seeded analytic stream — O(visible) seed window `i0..i1`, density thinning, gravity tagging, NO alpha-pop culling (L849-951) — the house particle pattern.

## (i) CLI (verified in ~/dev/filmkit/bin/filmkit.mjs + cli/commands/*)

- Commands (bin L34): `list · new · preview · stills · sheet · lint · render`. Common: `--project <dir>`, `--variant <name>`.
- `render <film> [--from s] [--to s] [--fps 60] [--workers 2] [--crf 18] [--preset slow] [--maxrate 16M] [--out file] [--force] [--no-audio] [--lufs -14 | --no-loudnorm]` (cli/commands/render.mjs L24-27, L66-73, L86): `--from`/`--to` are FILM SECONDS (from ≥ 0 and < duration; to > from, clamped to duration) — the partial-window fix flags. `--force` required to overwrite. Render starts its own internal server (no `--port` needed — that flag is preview-only, render.mjs L47, preview.mjs L8). Renders take minutes: run without a command timeout.
- `stills <film> <t1,t2,…> | --scenes [--out dir]` (stills.mjs L16-26) → output/<film>/stills/t012.50.png.
- `sheet <film> [--rows 6] [--video file.mp4] [--out dir]` (sheet.mjs L16-29) — `--video` builds the sheet from the RENDERED MP4; use it to check the final file.
- `lint <film> [--hold 3] [--json]` (lint.mjs L13) — exit 1 on errors.
- mp4check (project-side, NOT a filmkit command): `bash .omp/skills/remy-media/scripts/mp4check.sh <file.mp4> [start=0] [seconds=4]` (.omp/skills/remy-media/SKILL.md L147).

## (j) Gotchas

1. Audio args are strictly POSITIONAL — no options objects (only `kit.sample`). Wrong arity silently shifts meaning (e.g. `pad(t, notes, dur)` 3rd arg is dur not gain).
2. No `Math.random`/`Date.now`/frame-carried state anywhere — `hash(n)`/`rng(seed)` only (README L82; determinism test).
3. Clear aux canvases every frame: the 960×540 low-res stage persists between frames — repaint EVERY pixel before shake (`films/hairassic-park/film.js` L63-64; lessons.md L148). Scratch allocations must fit the largest pose and be cleared (remy-bros/art.js L62-72; lessons.md L101).
4. AAC overshoots −1 dBTP: inspect the DECODED final MP4 (loudness.json + mp4check), not the WAV; correct via audio-only remux with video copied, then re-measure (lessons.md L181-182).
5. In warp results `sl` is a SIBLING of `stop` — read `w.sl`, never `w.stop.sl` (3000/timeline.js L26-29). An event at a stop's g lands at the START of the freeze.
6. `destination-out` on a scene canvas erases ALL painted layers — draw annuli with evenodd subpaths or isolate on a scratch (lessons.md L66).
7. evenodd iris: `moveTo(cx + r, cy)` BEFORE `arc(...)`, or you get a wedge (hairassic film.js L84-89).
8. Captions must belong to the shot containing t0, not cross cuts (unless `span`), and clear `minHold` (default 3 s) fully visible BEFORE the cut — includes fades and typing time.
9. Overlay text only: draw type on the 5th `overlay` arg so bloom/grade/lens don't blur it (README L80).
10. Low-res pixel type: 16px minimum on the 960×540 stage (Press Start 2P; hairassic film.js L15); caption rows ≥ 32px at 1080p.
11. Read palette at draw time (variants re-assign it before prepare) — never copy into module constants (README L130).
12. Camera moves need overscan: paint bakes at −OS or edges show; keep foreground dressing off the story beat (lessons.md L146, raiders film.js L615).
