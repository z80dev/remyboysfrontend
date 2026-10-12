# TERMHAIRNATOR — inter-module contracts (director-owned; builders code to THIS)

Source of truth: `timeline.js` (validated). Cast: `casting.md`. Verified APIs: `BRIEF.md`.
Repo style: NO semicolons, never start a line with `[` (ASI lesson). Pure functions of time only.

## Stage & coordinates
- 1920x1080, 2.39:1 letterbox → safe action/text band y ∈ [138, 942]; keep faces/text centers in [180, 880] when practical.
- Ground lines (foot anchors): playground 880 · alley 900 · street 930 · chase 930 · foundry catwalk 870 · epilogue 920.
- Scales: hero near-rig sx≈2.1; machine near-rig sx≈2.5 (taller, heavier); bystanders far-rig sx≈1.6. Tune ±10% for composition, keep proportions consistent across shots.

## art.js — split: `env.js` + `actors.js` (director writes the `art.js` facade)

```js
// art.js (facade, director-owned):
import * as ENV from './env.js'
import * as ACT from './actors.js'
export const loadEnv = ENV.loadEnv       // bakes backdrops + env state
export const loadActors = ACT.loadActors // loads rigs, bakes chrome/props/type
export async function loadArt() { const [env, actors] = await Promise.all([ENV.loadEnv(), ACT.loadActors()]); return { ...env, ...actors } }
```

### env.js — exports
`export async function loadEnv()` → `{ bgPlayground, bgAlley, bgStreet, bgFoundry, bgDawn, drawRain, drawLightning, drawScorch, drawMolten, drawSparks, drawFire, drawSteam, drawSmoke, bars }`
- Backdrops: baked 1920×1080 canvases (night ash playground + swing-set silhouette; steel-blue rain alley with dumpster/mop/door; neon street with "FLOW CUTS" scissor+comb sign, WIG-MART gag, wet pavement; foundry catwalks + chains + molten pool mouth + cooled steel panel; foundry exterior at dawn with pavement crack). Coherent light direction, outline/shadow/base/highlight ramps, seeded texture — NOT flat fills.
- Passes (pure in t): `drawRain(ctx, t, o{slant, density, wind})`; `drawLightning(ctx, lt, o{seed})` (sphere + seeded bolt fans, glow cools over ~1.5 s); `drawScorch(ctx, lt)` (cooling ring, orange→dark); `drawMolten(ctx, t, o{glow, rect})` (pool surface shimmer + drifting sparks, analytic+seeded); `drawSparks(ctx, worldT, events)` (impact fans, `age = worldT - g`, skip outside lifetime); `drawFire(ctx, x, groundY, t, size)`; `drawSteam/drawSmoke(ctx, x, y, t0, t)`; `bars(ctx)` (letterbox 138px, overscan-covering, painted LAST — BRIEF §letterbox).

### actors.js — exports
`export async function loadActors()` → `{ hero, machineFlesh, bystanderA, bystanderB, heads, drawMachine, drawSwordSlash, drawSprout, drawSapling, drawBike, drawCat, hudText, hudBracket, hudScanlines, drawTitle, drawEndcard }`
- Rigs per casting.md (42 near, 347 near, 11/191 far). `drawMachine(ctx, x, feet, o)` — THE money asset: `o = { flesh: 0..1, pose: 'crouch'|'rise'|'stand'|'walk'|'stride'|'kneel'|'sink'|'thumbs', phase, eye: {on: 0..1, warm: 0..1}, burn: 0..1 (left side flesh burns away → chrome half-skull + arm), arm: 'shaver'|'down'|'retracted', core: 0..1 (chest seam glow), sink: 0..1, flip, lean, scale, glow }`. Chrome = procedural endoskeleton (skull + red lens, rib/chest seam, limb plates, shaver gauntlet) with coherent ramps; flesh blend = rig sprite under, chrome revealed by (1-flesh)/burn mask on viewer-left.
- `drawSwordSlash(ctx, x, y, r0, r1, a0, a1, u)` white-hot arc trail; `drawSprout(ctx, x, y, grow, sway)`; `drawSapling(ctx, x, y, grow)`; `drawBike(ctx, x, groundY, o{lean, flip, wheelSpin, headlight, wrecked})`; `drawCat(ctx, x, y, t)`; HUD helpers (mono ≥24px #ff5a5a, bracket, scanline band); `drawTitle(ctx, lt)` steel Anton slam + dust; `drawEndcard(ctx, lt)` card/kicker/credit + red eye dot on the A.

## score.js — exports
```js
export function score(kit)  // complete 100.0s original score; imports timeline SECTIONS/MASTER/CLOCK/b/motifs
```
- Every cue time = `CLOCK.<shot>.abs(EV)` or `b(section, bar, beat)` — never hand-added.
- Voices: braam (SHEDNET motif), servo whir (saw pitch-ramp), scan blips (square), engine drone (saw+noise grind), anvil clangs (FM), scandal sting (drop-to-one-sine), tuba-bonk headbutt, core gutter ticks, SPROUT bell chime (3 notes G5-B5-D6), warm pad/piano/strings FLOW theme (C major, epilogue only), rain bed (filtered noise), thunder + sub-drop, fire crackle, molten sizzle, boot quarters (wet stone vs metal grating — differentiate), heartbeat pair optional during coreStab freeze via sl.
- Hit-sync: titleSlam 2.5 · lightning 11.0 · eyeIgnite 15.5 · lockSting 26.0 · crash 44.5 · walkOut 46.0 · clash1 62.0 · hairGrab 66.0 · coreStab 72.0 · sprout 74.5 · steelClose 82.0 · cardSlam 94.0. Stops: sl-time cues inside freezes (riser during gate-dive freeze, explosion bloom across crash freeze).
- Loudness: target house default (−14 LUFS / −1 dBTP); leave headroom for impacts; avoid bass masking the FLOW theme; intentional ending (hymn resolves by 99.4).

## film.js — the assembly
- Default export per film contract (keys per BRIEF.md verification). `prepare()` awaits `loadArt()`.
- 7 shots from timeline SHOTS (names 1:1). Each draw: `const w = CLOCK.<name>.warp(lt)` → use `w.g` for world, `w.sl` for shake/flash/particles inside freezes, `t` for ambient shimmer.
- Choreography positions derive from immutable paths/lookup tables (bike x(t) with integrated speed, sink descent eased, strand drift analytic ballistic-ish float).
- Captions: timeline CAPTIONS adapted to VERIFIED player option keys (BRIEF.md). If 'machine'/'machineWarm'/'serif' styles don't exist as player styles, render that caption as picture in draw() (mono/red glitch vs mono/amber; serif = Cormorant) — declared in film.js comments, hand-inspected.
- Flashes: timeline FLASHES wired the house way (3000 pattern).
- fx per shot from LOOK.fx; letterbox mechanism per BRIEF.md (3000's exact method).
- Registers film in nothing else; folder stays self-contained (imports only remy-bros rig + own modules + filmkit libs).

## Ownership
- art agent owns art.js ONLY. score agent owns score.js ONLY. film agent owns film.js ONLY. Director owns timeline.js + this file. Cross-file fixes get reported back, not silently applied.
