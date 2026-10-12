# THE HAIRTRIX — SHOTLIST (build spec for film.js / art.js / score.js)

Film #36 · 92 s · 960×540 pixel stage blitted 2× nearest → 1920×1080p60.
The single source of truth for time is `timeline.js` (same folder). This document tells the
builder **how** to draw each shot against those clocks; it adds no new times.

## Reading order and contracts

- **Time domains:** `EVENTS` + `*_EV` + `STOPS` are WORLD seconds `g` (except keys in
  `EV_FILM_KEYS`, which are FILM seconds). `draw(ctx, lt, dur, t, overlay)` receives absolute
  film time `t` — position actors by `warp(t).g`, run freeze-window FX (shake, flash, agent
  head-turns, the bullet pluck) on film time. Never hand-delay; `filmT(g)` is the only
  world→film mapping and score.js imports the same module.
- **Resume rule:** an event at a freeze's `g` happens at `FREEZES.*.film1` (bullet resume
  film 63.0, volley resume film 86.1).
- **Anchors:** `GROUND = 430` is the feet line; `(x, feet)` passed to `A.drawRemy` is the FOOT
  anchor (`import * as A from '../remy-bros/art.js'`, `A.loadRemy(id, near)` in `prepare`).
  Keep all foot action `y ≤ SAFE_Y = 470` (letterbox band). Near sprite ≈ 96 px tall at
  default `sx/sy 2`; a back-bend uses `rot` about the feet plus `lean`, never a skew.
- **Cast:** `ROLES` tokens only — `CASTING.md` binds ids. Do not hardcode sprite ids.
  FLOW: clean shirt (contact/construct/dojo) → leather trench repaint (roof/lobby/subway/payoff).
  Agents: identical black suits + shades + earpiece; bald heads. Keep FLOW's hair highlight a
  dedicated bright rim in every grade so the flow stays readable.
- **Grades:** `GRADE.matrix` green-dark for everything in the Simulation; `GRADE.phosphor` for
  the terminal; `GRADE.construct` harsh white for film 20–28; `GRADE.real` cold blue for the
  pod farm 28–34. Bloom restrained (0.08–0.14, thresh 0.9).
- **Particles:** analytic only — immutable event tables seeded via `hash`, per frame
  `age = g − event.g`, position `x+vx·age`, `y+vy·age+½·gravity·age²`, fade by age. Nothing
  appended in `draw()`. Shells/dust/sparks are seeded, never random.
- **Captions:** drawn by the runtime from `CAPTIONS`/`CAP_STYLES` after bloom/grade — the
  builder must NOT re-draw them. All sizes ≥ 16 px at stage scale; reading lines sit at
  y 872–900 (1080p) above the letterbox band.
- **Camera:** `CAM` keys are film seconds, 960×540 stage coords, `k = zoom ≥ 1`; interpolate
  adjacent keys with clamped smoothstep. `ORBIT` overrides `CAM` for film 55.0–63.0.

## Set geometry (bake once in `prepare`, 960×540 stage coords)

| Set | Floor | Key props |
|---|---|---|
| TERMINAL | — | full-frame black CRT; scanlines y every 4 px; phosphor `PHOS` |
| CUBICLE | 448 | desk x 260–400 (top y 350), CRT x 330 y 280, chair x 300 |
| UNDERPASS | 430 | sodium lamps x 200/700 (y 150), parked car x 700–900, tag wall left |
| CONSTRUCT | 430 | two chairs x 380/570, glass table x 470 (y 372), standing mirror x 250 (y 220–430) |
| POD FARM | 430 catwalk | central pod x 480 (y 200–430, fluid line y 260), pod rows receding to horizon y 240 |
| DOJO | 430 | mirror wall left x 80–160, weapon rack x 820, hanging bulb x 480 (y 90) |
| ROOF (tense/bullettime/payoff) | 430 | parapet lip x 240–320 (y 380–430), antenna x 120, water tank x 880, city-grid horizon y 240 |
| JUMP ROOFS | near 400 / far 448 | gap x 420–560 between tower roofs |
| LOBBY | 430 | marble pillars x 300/480/660 (w 46/52/46, tops y 130), desk x 740–920 (h 90), doors x 60–130, stair door x 900 |
| SUBWAY | 430 | pillars x 200/620 (w 60), bench x 380–470, platform edge x 880, yellow line x 850, station sign "SHORN ST" |

---

## SHOT 1 — `terminal` · film 0–12 · GRADE.phosphor

**Intent:** Phosphor CRT wakes FLOW: glyph rain of hair-strands, WAKE UP, title slam.

- **Art:** black screen, faint scanline drift (y offset = 2·sin on film t). Digital rain =
  glyph columns every 24 px; glyphs from the hair-strand set `s h a i r ∿ / \ | 0 1`;
  per-column speed 60–140 px/s seeded by column index; leading glyph bright `#54ff8e`,
  trail fades through `#1d7a42` → `#0b2c17`. `rainStorm` (7.0) doubles column count and speed.
- **Events:** `crtOn` 0.6 (columns ignite top-down), `wakeUp` 1.4 / `hareLine` 5.6 (captions
  carry the words; builder adds only a blinking block cursor and a dim underline sweep — no
  duplicate text), `rainStorm` 7.0, `titleSlam` 9.2 (title caption + `FLASHES[0]`), `glitchOut`
  11.2 (columns smear upward, horizontal tear bands), `cutOut` 11.9 (one white scanline
  collapses to black).
- **Camera:** `CAM.terminal` — near-static, slow 1.0→1.07 push.
- **SFX:** sub drone + CRT tick grid from 0; typing ticks under 1.4/5.6; braam 9.2; glitch
  zap 11.2; power-out hiss 11.9.

## SHOT 2 — `contact` · film 12–20 · GRADE.matrix

**Intent:** Cubicle glitch whisper; underpass first contact; THE HAIRTRIX HAS YOU.

- **Art:** fluorescent cubicle farm, one desk lit. FLOW (clean shirt) seated x 300, feet 448,
  hunched (`lean 0.12`). CRT at x 330 y 280 hiccups green at `deskGlitch` 12.6; TRIMNITY's
  words crawl across the glass at `screenWhisper` 13.6 (thin `PHOS` chars rising off the
  screen face, dissolving) — caption `whisper` is the readable truth. `boothBlack` 16.2:
  screen dies, one frame of full-room blackout + power-down whoosh.
- **Underpass cut (16.8):** sodium pools of light, idling car x 700–900 (headlight glow on
  wet ground), FLOW enters x 200→300 (16.8–17.8, walk cycle `stride`), MOUSSE-PHEUS steps out
  beside the car `mousseIn` 17.0 (x 620, facing left). Caption `hasYou` 17.4 on the sting.
  `carDoor` 19.2: rear door swings, white interior glow — `cutWhite` 19.9 floods the frame.
- **Camera:** `CAM.contact` — desk close 1.16, holds, snap wide 1.0 at the cut, push 1.14 on
  the car door.
- **Particles:** CRT static flecks; underpass dust motes in the lamp cones.
- **SFX:** fluorescent hum; glitch ticks 12.6; shimmer 13.6; power-down 16.2; distant traffic;
  car-door clunk 19.2.

## SHOT 3 — `construct` · film 20–34 · construct → real grades

**Intent:** White void: two pills offered, red taken; mirror bursts; wake in the cold-blue pod farm.

- **White void (20–28):** flat near-white `#f4f7f2`, no texture, no particles — purity is the
  point; only soft contact shadows under the chairs. MOUSSE-PHEUS x 570 (feet 430, facing
  left), FLOW x 380. `pillsOffered` 22.0: palm opens at (470, 340) with red (`#c23a2e`) and
  blue (`#2e5fc3`) pills, one soft highlight each; caption `pillsLine`. `choiceReach` 23.4
  (push-in), `redTaken` 24.6 (red pill leaves frame in FLOW's fingers), `blueFade` 25.2
  (blue dissolves into motes that fall UP — wrongness cue).
- **Mirror (26.2–28.0):** standing mirror x 250; `mirrorLiquid` 26.2 — surface ripples
  concentrically; `mirrorBreak` 27.4 — liquid bursts THROUGH the frame toward camera at
  `HIT.mirrorBreak`, white flash `FLASHES[2]`, silver droplets ballistic outward.
- **Pod farm (28–34):** grade flips to `GRADE.real`. `podFall` 28.0 — falling through dark
  water (bubble streaks up, light shaft above). `podWake` 29.0 — FLOW slumped in the central
  pod x 480 (fluid line y 260 drains downward 29.0–30.0; his hair floats, then settles wet).
  `podsWide` 30.2 — camera pulls wide: rows of bald-silhouette pods recede to the horizon.
  `hoverIn` 31.2 — floodlight cones down from above; `welcomeSay` 31.8 (caption
  `welcomeLine`); `whiteOutEv` 33.8 blows out to white.
- **Camera:** `CAM.construct` — wide → 1.3 push on the palm → 1.45 snap on the mirror burst →
  pod medium → wide farm.
- **Particles:** rising dissolve motes (25.2), mirror droplets (27.4), pod bubbles, draining
  fluid beads, dust in the floodlight.
- **SFX:** room tone of white; pill click 22.0; heartbeat from 24.6; liquid warp 26.2; glass
  boom 27.4; deep-water rumble 28–29.4; pod alarm ping 29.0; distant pod-hum drone; engine
  thrum 31.2.

## SHOT 4 — `dojo` · film 34–44 · GRADE.matrix

**Intent:** Spar vs MOUSSE-PHEUS; palm-strike hit-stop; the comb bends — THERE IS NO FOLLICLE.

- **Art:** warm-lit wooden dojo gone green-dark; mirror wall doubles the fighters.
  MOUSSE-PHEUS x 600 (feet 430), FLOW x 360. `dojoIn` 34.6: both bow (lean 0.2, hold 0.4 s).
  `sparStart` 36.4: circling — FLOW 360→420, MP mirrors 600→560; `combo1` 37.8: FLOW flurry
  (lift/stride alternating, 3 quick advances to x 460) while MP does not move his feet.
- **The hit:** HARD SILENCE 39.55–40.0 — MP steps in 600→440 across it (single fast lunge,
  coat flap). `dojoHit` 40.0: palm meets chest at `HIT.dojo` (402, 376) — STOP 0.18, punch-in
  `CAM` 1.3, flash. On resume FLOW flies back: x 402→230 with ballistic ease-out, lands feet
  430, skids to rest by `recoil` 40.48, mat dust puff at (300, 428).
- **The comb:** `combRaise` 41.58 — MP raises a wide black comb (x 500, y 330); `combBend`
  42.0 — tines curl like soft plastic over 42.18–43.4 (bend angle 0→60°, eased) while caption
  `noFollicle` (42.0–45.2) holds. MP's shades glint once at 43.0.
- **Camera:** `CAM.dojo` — wide 1.04 → 1.3 punch riding the freeze → settle 1.12 → 1.05.
- **Particles:** mat dust (hit + landing), one hanging-bulb sway 40.0–41.5 (pendulum on rt).
- **SFX:** gi swishes 36.4–39.5; silence; palm THUD + sting at 40.0 ringing through the
  freeze; skid 40.5; comb creak 42.2; bell shimmer 43.0.

## SHOT 5 — `jumpprog` · film 44–48 · GRADE.matrix

**Intent:** Rooftop jump program: run, apex hang between towers, hard landing.

- **Art:** two tower roofs, impossible gap x 420–560; near roof surface y 400, far roof y 448
  (both ≥ 470-safe: feet never exceed 448 + sprite skid). City wind lines.
- **Action:** `runUp` 44.78 — FLOW sprints x 150→400 (5 strides, `lift/stride` full cycle,
  lean 0.18). Takeoff 400 at film 45.9: ballistic arc, `x(t)` linear, `feet(t)` parabola —
  apex at (490, feet 322) at `jumpApex` 46.38 with a 0.35 s hang (ease flattens near apex,
  coat flares up, one beat of stillness). Lands (585, 448) at `jumpLand` 47.58 — deep crouch,
  skid to x 660 by 47.98, grit spray. `cutRoof` 47.98 smash cut.
- **Camera:** `CAM.jumpprog` — tracks the run, lifts to the apex 1.18, settles on the landing.
- **Particles:** grit puffs at takeoff/landing; 3–4 wind streak lines crossing the gap.
- **SFX:** footsteps; wind swell into apex (all sound suspends 46.2–46.7); heavy land thud +
  grit 47.58; one bar of near-quiet.

## SHOT 6 — `rooftense` · film 48–54 · GRADE.matrix

**Intent:** Five bald suits wall him in; SMIRK fronts the line; the tracer wave is fired.

- **Art:** night rooftop (see set table), sprinkler mist drifting. FLOW x 330, feet 430.
  `wallIn` 49.38 — four clones step from the stairwell glow to x 760/805/850/895.
  `smirkFront` 50.18 — SMIRK walks to x 712, front and center, shades catching the city glow.
  `waveAim` 51.18 — five pistols level (muzzle coords = `WAVE.muzzleX/Y`), one beat of aim;
  `waveFire` 51.98 — five muzzle flashes, and the tracer wave CRAWLS across: each round is a
  green-white core with a 40 px trail moving at `WAVE.vPx = 139 px/s` from muzzle toward its
  `hangX/Y`, reaching the hang plane exactly at `G_FREEZE` (film 55.0 = shot cut).
  Caption-free; the ticking score carries the dread.
- **Camera:** `CAM.rooftense` — wide 1.0 → drift right 1.1 → tighten 1.2 on the fire.
- **Particles:** muzzle smoke puffs (5 seeded events), sprinkler mist droplets.
- **SFX:** wind; slow footsteps; gun cock 51.18; five staggered cracks at 51.98; rising
  time-stretch sheen into the cut.

## SHOT 7 — `bullettime` · film 54–64 · THE SIGNATURE SHOT (10 s)

**Intent:** World freezes on the volley; 320° parametric orbit around hanging bullets +
hair-part trails; resume whip.

- **Freeze:** STOPS[1] — world hangs film 55.0–63.0 (world `g` pinned at 54.82). Frozen
  tableau: FLOW at x 330 mid-back-bend (`rot ≈ −0.35` about feet, hair swung back, coat
  lifted), tracers hanging at `WAVE.hangX/Y` (x 386–430, y 330–348), rain droplets, muzzle
  smoke — all pinned. Agents frozen mid-recoil EXCEPT their heads, which slowly track the
  camera from `smirkTrack` 55.6 (head yaw follows `θ(t)`; rt-driven, bodies still — the
  creepy beat).
- **Orbit (parametric, film-time camera):** for `u = seg(t, 55.6, 62.6)`:
  - `θ(t) = −140° + 320° · smoothstep(u)` — starts front-left of FLOW, sweeps clockwise,
    ends behind his shoulder looking toward the agent line.
  - `r(u) = 235 − 25·sin(πu)` — slow mid-orbit push (210 px at closest).
  - `h(u) = 262 + 14·sin(πu)` — camera rises through the middle, looking slightly down on
    the hanging volley.
  - Look-at fixed at `ORBIT.lookAt = (415, 284)`; entry whip carries `rollDeg 2` easing to 0.
  - Parallax while orbiting: skyline ×0.4, agents ×0.75, FLOW and bullets ×1.0, rain ×1.15
    (screen-space offsets from `θ` about the look-at; no true 3D needed).
- **Hair-part trails:** each hanging round trails a thin tapering ribbon along its incoming
  trajectory (length 60–90 px, seeded), with a slow sinusoidal flutter (amplitude 2 px,
  ~0.3 Hz on film time) — reads as a parted strand of hair behind each bullet. FLOW's own
  flow streams toward the agents in one frozen arc with 2–3 parted strands.
- **Caption:** `believe` (whisper, 58.8–62.0) rides the far side of the orbit — the only
  words in the shot.
- **Resume:** at 63.0 the world snaps 1:1 — `snapUp` 63.08 (FLOW snaps upright, coat crack),
  `whipPast` 63.13 (tracers scream past his ear), `dodgeSettle` 63.68, `parapetChew` 63.78
  (rounds chew the parapet lip at `WAVE.chewTarget`, spark shower). Full band slams back on
  the downbeat. Camera keys re-take control: `CAM.bullettime` exit key 63.8 settles wide 1.0.
- **SFX:** at 55.0 drums cut to a weightless pad + slow siren sweep synced to `θ` (half-sweep
  ≈ 59.1 = motif peak); creaking-hinge texture under the head-tracks; resume 63.0 = full band
  drop; whip-by whooshes 63.13; spark crackles 63.78.

## SHOT 8 — `lobby` · film 64–74 · GRADE.matrix

**Intent:** Trench-coat entry; pillar shootout; cartwheel to cover; shells and stone dust rain.

- **Art:** green-black marble hall (set table). FLOW + TRIMNITY in matching leather trenches.
  `lobbyEntry` (film 64.5): doors burst inward, both walk in low and wide — FLOW to x 250,
  TRIMNITY to x 190 by 65.4 (striding, coats flaring once and settling). `deskLine` 65.4:
  five clones rise behind desk/columns (x 300-col behind, 780/820/860/900 desk line).
  Caption `lobbyNarr` 64.6–67.8.
- **Firefight:** `pillarHit1` 66.0 — pillar x 660 chews (dust puff + 3 stone chips at
  (660, 300)); `crossFire` 67.0 — both heroes fire, tracers exchange, muzzle flashes light
  the hall (2-frame light lift). Shell casings eject per shot: ballistic arc, one floor
  bounce at y 430, seeded rest x. `cartwheel` 67.9 — FLOW cartwheels x 240→505 (0.7 s, body
  rotating 0→−2π about its center — compose onto scratch, then place; feet land
  `HIT.cartwheelLand` (505, 432)) — STOP 0.14 on `cartwheelLand` 68.6, punch-in 1.26.
- **`pillarHit2` 70.0 (STOP 0.2):** the center pillar gutted at `HIT.pillar2` — big chunk
  rain (6–10 ballistic chips), dust billow that grows by age, shells raining, flash. TRIMNITY
  returns fire from x 190 through 70–71. `pillarHit3` 71.5 — pillar x 300 chews smaller.
  `stairSprint` 72.8 — both sprint right: FLOW 505→760, TRIM 190→700 by 73.6 (full stride
  cycles), `lobbyExitCut` 73.8 smash cut on the run.
- **Camera:** `CAM.lobby` — entry 1.12 → hall wide 1.0 → cartwheel punch 1.26 → pillar2 punch
  1.3 → pull wide for the sprint.
- **Particles:** muzzle flashes, tracer lines, shell casings (≥ 12 events), stone chips +
  growing dust billows at pillarHit1/2/3, glass sprinkle from the burst doors.
- **SFX:** door burst 64.5; pistol cracks (66.0/67.0/70.0/71.5 — the 70.0 slam rides the
  0.2 s freeze); shell tinkles continuous; cartwheel whoosh 67.9; stone rubble 70.0; sprint
  riser into the cut.

## SHOT 9 — `subway` · film 74–84 · GRADE.matrix

**Intent:** Platform standoff; the thousand-clippers line; the express clips SMIRK; re-skinned
passenger.

- **Arrival:** `subwayArrival` 74.6 — the express roars through the track band (x 880–960)
  as a light-streaked smear L→R, 74.6–75.4; wind flips litter across the platform, FLOW's
  coat snaps. FLOW has entered x 160→300 by 75.2. `platformStandoff` 75.6 — SMIRK x 700
  facing left; 30 px of tiled silence between them.
- **The line:** `clippersSay` 76.2 — caption `clippersLine` (two lines, holds 3.7 s);
  under it an electric CLIPPERS buzz rises in the mix. `shadesOff` 76.6 — SMIRK removes his
  shades, folds them, pockets them: disrespect. Buzz swells to a scream of a thousand teeth.
- **The clip:** `duelDash` 79.12 — FLOW dashes 300→520 (3 strides), SMIRK 700→560;
  `grapple` 79.5 — locked chest-to-chest at x 545, feet skidding toward the edge. HARD
  SILENCE 79.55–80.0. `trainClip` 80.0 — the NEXT express hits the full frame as a wall of
  metal sweeping L→R (foreground band y 380–540 plus light band above), its FRONT frozen at
  x 700 — exactly where SMIRK stands — for STOP 0.35 with headlight white-out `FLASHES[6]`
  and wheel-spark shower at the rails. On resume the metal smears across; `expressClear`
  81.0: gone, FLOW alone, coat settling, papers falling dead.
- **The re-skin:** `localStops` 81.6 — the local glides in and halts (its windows carry
  6–8 passenger silhouettes); `doorsOpen` 82.1 — chime, doors part; `reskinReveal` 82.5 —
  passengers file out; ONE BALD HEAD turns to camera: SMIRK's repaint minus shades, paper
  cup in hand, blends into the crowd and is gone by 83.2. `narrowEyes` 83.4 — push-in on
  FLOW's eyes; cut.
- **Camera:** `CAM.subway` — wide 1.04 → standoff 1.16 → grapple 1.3 → rides the train wall
  → wide → 1.2 on the reveal.
- **Particles:** platform litter (wind-driven L→R at 74.6), wheel sparks (80.0, gravity 1200),
  falling papers after the express, door-chime ripple.
- **SFX:** express roar 74.6; rumble bed; clippers buzz 76.2–79.9; silence; MASSIVE metal
  impact + scream-by at 80.0 ringing through the 0.35 s freeze; hollow wind after 81.0;
  brake squeal 81.6; chime 82.1; crowd murmur; one dry footstep at 82.5.

## SHOT 10 — `payoff` · film 84–92 · GRADE.matrix → black

**Intent:** Hand rises, volley freezes and drops dead; FLOW lifts off hair-first; FREE YOUR HAIR.

- **Setup:** same rooftop set, later night, city grid glittering. `swarmIn` 84.2 — SMIRK
  (re-suited after the re-skin) plus the four-swarm fan onto the roof to x 640/690/740/800/862,
  level pistols, `swarmFire` 84.4 — five cracks, the FAST volley crosses at
  `VOLLEY.vPx = 500 px/s` toward `VOLLEY.hangX/Y`.
  HARD SILENCE 84.55–85.0 — in the dead air `handRaise` 84.7: FLOW (x 330) turns from profile
  to 3/4 and raises one hand, palm out.
- **The freeze (STOP 1.1, film 85.0–86.1):** the volley hangs at `HIT.volleyCentroid`
  (478, 320) — same tracer + hair-part-trail treatment as the orbit, now a still life.
  `FLASHES[7]` bloom. On film time FLOW walks slowly THROUGH his own hanging death — x 330→430
  — and at `pluckBullet` 85.8 his fingers close on one round at `HIT.pluck` (452, 318);
  he flicks it away spinning (85.95).
- **The drop:** at `bulletsDrop` (film 86.1, resume) every hanging round obeys `VOLLEY.dropG`
  gravity and hits the roof (y 430) with a dead metallic tick; by `brassClatter` 86.7 the
  roof is carpeted in brass — a granular clatter grid, then stillness.
- **Liftoff:** `crouch` 86.9 (deep crouch, coat pooling) → `liftoff` 87.4 — he rockets up:
  feet 430 → 390 (crouch) → off-frame top (y −60) by 88.8, analytic ease-in with a dust ring
  + 16 radial motes at launch, hair streaming straight down, coat lashing. `FLASHES[8]`.
  Camera tilts up with him (`CAM.payoff` y 296→200), `skyStreak` 88.6 — he becomes a rising
  streak with a green contrail.
- **End:** `endcard` 88.6 — caption `endCard` "FREE YOUR HAIR" fades up over the empty sky,
  `slate` sub-line under it; `fadeOut` 91.0 → black by 91.8; hold black to 92.
- **SFX:** volley cracks 84.4; silence; glassy freeze pad 85.0–86.1; soft pluck foley 85.8;
  THOUSAND brass drops 86.1–86.9 (granular, decaying); one breath; riser + whoosh 87.4;
  wind streak; endcard braam 88.6; pad fades from 91.0; room tone out.

---

## Builder checklist (from the brief)

- Starred set pieces all present: Construct (S3), bullet-time orbit (S7), lobby (S8),
  subway train clip (S9), payoff (S10).
- Every frame pure in `t`: no Math.random/Date.now, no per-frame state; rain/glyphs/shells/
  dust all seeded analytic; resets all canvas state per frame.
- Feet ≤ y 470 everywhere; feet anchors from `drawRemy(x, feet)`; no teleporting through
  geometry (the cartwheel clears the pillar on its west face, landings are planted).
- Derive prop/contact positions from event times (`WAVE`, `VOLLEY`, `HIT` provided).
- Captions come from `CAPTIONS` — verify none are re-drawn; terminal CRT adds cursor only.
- Score imports `timeline.js` (`filmT`, `FREEZES`, `SECTION/BAR/BEAT`, `SILENCES`, `FLASHES`)
  — never hand-delays a cue; silences and freezes are structural.
