# SPIDER-REM — "With Great Hair Comes Great Flow" — BEAT SHEET + CUE SHEET

Story lead's timing truth. 90 s, 1920x1080, 2D comic-book style. Remy #42 (sprite 42) is bitten
by a RADIOACTIVE HAIR LOUSE at the Museum of Natural Flow, gains prehensile golden hair-strands
(#e8cf7e) he THWIPs as webs, and takes down THE DANDRUFF GOBLIN (sprite 458, bald, angry brows)
over a sunset Hair City. Companion docs: `casting.md` (ids/rigs), `techniques.md` (verified kit).

---

## 1. MUSIC GRID — the one clock

```
BPM 80      BEAT = 60/80 = 0.75 s      BAR = 4 beats = 3.00 s
D = 90 s  = 30 bars exactly
```

- Every cut sits on a BAR line (t / 3 is an integer). Every key event sits on a BEAT
  (t / 0.75 is an integer). Same discipline as hairyweight (`grid: { bar: 3 }`).
- One half-swing of the web pendulum = one bar (3.00 s) — the whoosh lands mid-bar, on beat 3.
- film.js should declare `grid: { bar: 3 }`, `lint: { captionHold: 3, safe: { margin: 0.05, letterbox: false } }`
  (full-frame comic, no letterbox — panels provide their own gutters).
- Bar map: bars 1–7 origin (0–21) · bars 8–17 suit + first swing (21–51) · bars 18–23 menace
  (51–69) · bars 24–30 battle + payoff (69–90).

## 2. TWO CLOCKS (hairyweight convention, verbatim rules)

- **g** = absolute world timeline. All action events (BITE, CATCH, PUNCHES, WRAP) are in g.
  Every g is a beat multiple. Hit-stops freeze g.
- **rt** = real rendered seconds. Cuts, captions, onomatopoeia, camera shake, score live here.
  `warp(rt)` maps rt -> g (drawing); `filmT(g)` maps g -> rt (SFX/score scheduling).
  An impact lands at the START of its freeze. Score/sfx must call filmT — never hand-added delays.

### STOPS (world g + duration) and their REAL times

| # | event             | g     | d    | real (filmT) | freeze window (rt)  |
|---|-------------------|-------|------|--------------|---------------------|
| 1 | BITE SNAP         | 13.50 | 0.14 | 13.50        | 13.50–13.64         |
| 2 | RESCUE CATCH (24) | 48.00 | 0.16 | 48.14        | 48.14–48.30         |
| 3 | AERIAL PUNCH      | 70.50 | 0.14 | 70.80        | 70.80–70.94         |
| 4 | WRAP FINISH (BIG) | 76.50 | 0.30 | 76.94        | 76.94–77.24         |

- Every stop sits entirely inside one shot (checked: 13.64<15, 48.30<51, 70.94<72, 77.24<78).
- g 26.25 (suit-panel scissors) -> real 26.39. g 86.25 (louse salute) -> real 86.99.
- **FLOW-SENSE EXCEPTION (shot-local clock):** shot `flowSense` (rt 66–69) runs at 0.5x via a
  LOCAL clock `lt = t − 66` — NO global STOPS inside [66, 69). Its painters are pure in `lt`
  (fade-to-bald per-shot-clock pattern). Global warp resumes normally at rt 69. Do not "fix"
  this by folding the dilation into warp; the g-continuity seam is hidden on the cut.

---

## 3. SHOT LIST — 17 shots, contiguous [0, 90), every cut on a bar

Comic-panel pages: `tripPanel` (2 panels), `suitPanel` (3 panels), `newsPanel` (full-frame
comic splash). Everything else is full-frame cinematic. Panel geometry (1920x1080, 16 px black
gutter + white inner rim, `panelPush` from techniques.md §4):
- tripPanel: P1 [70, 90, 1780, 520] · P2 [70, 640, 1780, 380]
- suitPanel: P1 [70, 90, 1040, 500] · P2 [1150, 90, 700, 500] · P3 [70, 630, 1780, 390]

| # | name | t0–t1 (rt) | bars | kind | camera | action + KEY EVENT TIMES |
|---|------|------------|------|------|--------|--------------------------|
| 1 | museumExt | 0–6 | 1–2 | cinematic | dolly-in 1.00→1.08 on the marquee | HAIR CITY — MUSEUM OF NATURAL FLOW. Afternoon sun, school buses, steam. Class of Remies streams up the steps. openCard caption in 0.75. |
| 2 | tripPanel | 6–12 | 3–4 | PANEL PAGE (2) | page static, zoom 1.00→1.03; P1→P2 panel-push at 9.0 | P1 (6–9): class files past the exhibit case "THE RADIOACTIVE HAIR LOUSE — DO NOT TAP GLASS"; case glints on beat 7.5. P2 (9–12): hero 42 lagging at the back, homework in paw, unaware; cityCard caption in 6.75. |
| 3 | bite | 12–15 | 5 | cinematic | punch-in 1.00→1.35 on the hand; SHAKE amp 5 @ 13.50; FLASH 0.26 @ 13.50 | CU: the louse descends on a silk thread (drawn, deterministic leg wiggle) and BITES the back of hero's hand at **g 13.50** — SNAP! + hit-stop 0.14 + dead silence after. Golden spark crawls under the fur 14.25–15.0. |
| 4 | transform | 15–21 | 6–7 | cinematic | slow zoom 1.05→1.22 on the eyes; SHAKE amp 6 @ 16.50; FLASH 0.18 @ 16.50 | Vertigo CU: pupils dilate 15.75; at **g 16.50** the BRAAM lands and golden hair-strands RISE off his scalp one per beat (16.5/17.25/18.0/18.75), haloing him. TITLE "SPIDER-REM" slams ON the braam at 16.5. Strands settle into a living ponytail 19.5–21.0. |
| 5 | mirror | 21–24 | 8 | cinematic | locked, zoom 1.02; bathroom frame-within-frame | Home. Hero prods the new ponytail — it moves on its own. At **g 22.50** it fires by reflex: THWIP! — a strand glues the toothbrush/toilet plunger (gag pick). He stares. Strand waves back. First THWIP of the film. |
| 6 | suitPanel | 24–33 | 9–11 | PANEL PAGE (3) | page zoom 1.00→1.04 per panel; pushes at 27.0 and 30.0 | P1 (24–27): sewing machine montage, tongue out; scissors **SNAP! at g 26.25** (real 26.39). P2 (27–30): spray stencil "SR-42" on the chest, red lens cut. P3 (30–33): the reveal pose on a tenement roof, lens glint on beat 31.5, strand curled overhead like a question mark. Hero motif bars 1–3 under the page. |
| 7 | firstThwip | 33–36 | 12 | cinematic | low angle; whip-tilt up (cam.y 700→380) following the strand at 34.50; SHAKE amp 3 @ 34.64 | Rooftop wind. He aims two fingers: at **g 34.50** THWIP! — the first real strand fires up out of frame, catches, and YANKS him off his feet at 34.64 (spring wobble). Motif bar 4 completes on the yank. |
| 8 | swing1 | 36–45 | 13–15 | cinematic | follow cam, cam.x = hero.x with outCubic lag, zoom 0.92 | Three half-swings, one per bar (see §6 legs A/B/C). Arc bottoms g 37.5 / 40.5 / 43.5 — whoosh + city-parallax rush each time. Release off leg C at 44.25 with spring wobble; rooftop land-and-roll 44.6. |
| 9 | rescue24 | 45–51 | 16–17 | cinematic | tilt-down (cam.y 300→620) at 45.2, whip to intercept, zoom 1.05; SHAKE amp 6 + FLASH 0.18 @ 48.14 | Scaffold collapses; civilian 24 (Gold Flow bob) drops from g 45.0 (bar line; see §6 dive math). Hero dives headfirst, catches her at **g 48.00** (real 48.14, hit-stop 0.16) — WHAM! — then a damped swing-away (leg D) sets her on a balcony at 49.9. She salutes; he does NOT know what to do with his face. The emotional beat of act 2. |
| 10 | newsPanel | 51–57 | 18–19 | COMIC SPLASH | entry page-spin blur 51.0–52.2, then slow zoom 1.00→1.12 to the headline | Full-frame newspaper THE DAILY FLOW spins in and slams flat at **g 52.50**: caption "THE DAILY FLOW — HAIR-LICLE MENACE STALKS CITY" + halftone photo of a bald silhouette on a glider. Beneath: smaller headline "MUSEUM LOUSE STILL AT LARGE." Paper edges flutter 56–57. |
| 11 | goblinReveal | 57–63 | 20–21 | cinematic | low-angle push 1.00→1.15; continuous engine micro-shake amp 2 | Against the sun: THE DANDRUFF GOBLIN (458) crests the skyline on a flake-glider at 57.5, silhouetted, engine snarling. Villain lower-third in 58.5. He drums his fingers on the glider hull 60.75–62.25 — bored, entitled. First white flake drifts past lens at 62.25. |
| 12 | flakeBombs | 63–66 | 22 | cinematic | aerial wide, slow pan L→R tracking the bombs | The glider strafes downtown: at 63.0 and 63.75 he lobs white FLAKE-BOMBS (puffy dandruff chunks with cheap yellow "POWDER FRESH" labels). Parabola math in §6. Bombs fall past hanging laundry; a awning pop sags 65.25. |
| 13 | flowSense | 66–69 | 23 | cinematic (SHOT-LOCAL 0.5x CLOCK) | bullet-time: zoom 1.10→1.30, 20° orbit around hero; desaturate everything except gold #e8cf7e | Flow-sense: his strands stand up and POINT at the incoming bomb at 66.2 (lt 0.2). World crawls. He folds backward; bomb one grazes past his nose at **rt 67.50 — FLAKE-POW!** (near-miss, powder puff blooming); bomb two split-S dodge at 68.5. Radial speed-line field frozen behind him. Riser crawls under the whole shot, peaks at 69.0. |
| 14 | airBattle | 69–72 | 24 | cinematic | handheld aerial follow of both, zoom 1.00; SHAKE amp 7 + FLASH 0.20 @ 70.80 | Snap back to full speed and full colour. Pass one, strand-vs-glider scissor 69.6 (near miss both ways). At **g 70.50** (real 70.80) he plants both feet on the glider's rim and lands the AERIAL PUNCH — WHAM! + hit-stop 0.14. Goblin spins off with a wobble; recovers furious at 71.5. |
| 15 | wrapBarrage | 72–78 | 25–26 | cinematic — MONEY SHOT | orbit until 73.5, then LOCK wide (zoom 0.90) for the volley | THE WEB-BARRAGE: three strands in three beats — **g 73.50 / 74.25 / 75.00** (THWIP! x3) pin glider wings, tail, and shoulders; wrap completeness w = seg(g, 74.6, 76.5). At **g 76.50** (real 76.94) the last loop cinches — SNAP! — hit-stop 0.30, FLASH 0.30: the goblin is a neat white cocoon dangling from a golden strand. Silence in the freeze. Release 77.4: cocoon boings, hero thwips away 77.7. |
| 16 | hangSunset | 78–84 | 27–28 | cinematic — PAYOFF | slow crane down 60 px, drift L→R 40 px, zoom 1.06; zero shake | Sunset city, 4-layer parallax (§7). Hero hangs UPSIDE-DOWN from one hair-strand anchored off-frame top, gentle sway theta = 0.06·sin((t−78)·0.9), coat-tail bob. Cocoon dangles far below-left, swinging. Dust motes. TAGLINE card in at 80.0: "WITH GREAT HAIR COMES GREAT FLOW." Hold the beauty shot through 84. |
| 17 | stinger | 84–90 | 29–30 | cinematic (macro) | locked macro; iris-out 89.5–90.0 | POST-CREDITS STINGER: rack to a museum leaf/sill — THE LOUSE (36 px custom draw, 6 hash-phased legs) climbs into frame 84.0–85.5, turns to camera, and SALUTES at **g 86.25** (real 86.99) with one foreleg + bell twinkle. Credits-sting caption in 86.25. Music thins to solo celeste D5 88.5. Iris out 89.5; black to 90. |

---

## 4. ONOMATOPOEIA — slam() + burst() events (all REAL rt; burst star polygon behind, Anton, inked double-stroke; positions avoid faces)

| word | real t | pos (x, y) | rot | size | burst | staging note (what it must NOT cover) |
|------|--------|------------|-----|------|-------|----------------------------------------|
| SNAP! | 13.50 | (1340, 270) | −0.18 | 130 | yellow/red | bite CU: face + hand occupy left 2/3; word sits top-right clear |
| THWIP! | 22.50 | (1400, 360) | −0.12 | 110 | gold | mirror gag: mirror left third, hero centre; word upper-right |
| SNAP! | 26.39 | (500, 640) | −0.20 | 72 | yellow, small | suitPanel P1 (scissors gag); must stay inside P1's clip rect |
| THWIP! | 34.50 | (1160, 300) | −0.15 | 120 | gold | rooftop: hero low-left; word right of the rising strand |
| WHAM! | 48.14 | (330, 620) | −0.18 | 130 | red | rescue catch happens at (560, 860); word hugs left edge, clear of both faces |
| FLAKE-POW! | 67.50 | (1330, 560) | 0.14 | 96 | WHITE, grey stroke (only non-gold burst — it's a flake) | flow-sense: hero left-of-centre; word right where the bomb streaks past |
| WHAM! | 70.80 | (560, 350) | −0.15 | 140 | red/orange | punch at screen centre; word upper-left, both faces centre-right stay clear |
| THWIP! | 73.94 | (860, 300) | −0.10 | 90 | gold | volley 1 (wing pin) |
| THWIP! | 74.69 | (1080, 380) | 0.10 | 90 | gold | volley 2 (tail pin) |
| THWIP! | 75.44 | (980, 260) | −0.08 | 90 | gold | volley 3 (shoulder pin) |
| SNAP! | 76.94 | (1440, 320) | −0.20 | 150 | gold, biggest + 0.30 flash | WRAP FINISH: cocoon centre-frame; word upper-right clear of the money shot |

`p = seg(t, filmT(g), filmT(g) + 0.22)` for each; world freezes under the stop while the slam
keeps real time (techniques.md §5). Slam margins generous — no font-size pops near frame edges.

---

## 5. CAPTIONS (paste-ready for film.js `captions`; hold = t1 − t0 − in − out ≥ 3 everywhere)

Styles (define in film.js `captionStyles`, filmkit `txt` semantics; lineHeight = multiplier):
- `card` — comic caption box: Anton 30, #111 ink on #ffe9ad paper, left-aligned, x 70, y 130,
  box pad 14, anim 'pop' (in .15 / out .15), thin ink border, no glow.
- `title` — Anton 160, #fff, center x 960, y 430, track 4, in .35 / out .25, glow #e8cf7e blur 22,
  halftone burst behind (bake, techniques.md §3).
- `newsHead` — Anton 54, #111, center x 960, y 600, track 2, in .3 / out .3 (slams onto the drawn
  paper's headline band).
- `third` — Anton 40, #f4f1ea, left x 60, y 950, purple-black chyron bar (#1a1030) behind,
  in .3 / out .3 (goblin palette, NOT the hairyweight red).
- `thirdSub` — Anton 28, #cbb7e8, left x 60, y 1002, same bar, in .3 / out .3.
- `tagline` — Anton 72, #fff, center x 960, y 520, track 6, in .3 / out .3, warm glow #e8b06a 18.
- `taglineSub` — Anton 40, #e8cf7e, center x 960, y 630, track 8, in .3 / out .3.
- `sting` — '"JetBrains Mono"' 30, #d8d4cb, center x 960, y 962, track 3, in .15 / out .15.

| id | text | t0 | t1 | style | y | in/out | hold |
|----|------|----|----|-------|---|--------|------|
| openCard | A REMY BOYS PICTURE | 0.75 | 5.25 | card | 130 | .15/.15 | 4.5−0.3 = 4.2 OK |
| cityCard | HAIR CITY — MUSEUM OF NATURAL FLOW | 6.75 | 11.25 | card | 130 | .15/.15 | 3.9 OK |
| title | SPIDER-REM | 16.5 | 20.9 | title | 430 | .35/.25 | 4.4−0.6 = 3.8 OK (slams ON the braam) |
| newsHead | THE DAILY FLOW — HAIR-LICLE MENACE STALKS CITY | 52.5 | 56.25 | newsHead | 600 | .3/.3 | 3.15 OK |
| vilThird | THE DANDRUFF GOBLIN | 58.5 | 62.25 | third | 950 | .3/.3 | 3.15 OK |
| vilSub | BALD. AIRBORNE. FURIOUS. | 58.5 | 62.25 | thirdSub | 1002 | .3/.3 | 3.15 OK (clear of third: y 950 vs 1002) |
| tagline | WITH GREAT HAIR COMES GREAT FLOW | 80.0 | 83.7 | tagline | 520 | .3/.3 | 3.4 OK |
| taglineSub | — SPIDER-REM | 80.0 | 83.7 | taglineSub | 630 | .3/.3 | 3.4 OK |
| sting | NO LICE WERE HARMED. ONE WAS BITTEN. | 86.25 | 89.5 | sting | 962 | .15/.15 | 3.1 OK |

Every window sits inside one shot; nothing is masked by a panel push or the iris (iris starts
89.5 = sting out). Reading text ≥ 28 px everywhere.

---

## 6. SWING PHYSICS — pure functions of g (no integration state)

One half-swing per bar. Leg = `{ t0, t1, ax, ay, L, TH0 }`; `u = seg(g, t0, t1)`;
`theta(u) = TH0 * cos(PI * (u − 1))` → +TH0 at entry, −TH0 at exit, bottom of arc at u = 0.5
(mid-bar — schedule the whoosh there). Position (hand/feet ref):
`x = ax + sin(theta) * L · dir`, `y = ay + cos(theta) * L`, plus rope-stretch bob
`L * (1 + 0.05 * (1 − |theta|/TH0))` and a release wobble `+18 * spring(g − tRelease, 14, 0.35)`.

SWINGS (world g; anchors sit on L3 rooftop bake geometry — consume the real baked array):

| leg | g span | anchor (ax, ay) | L | TH0 | arc bottom (whoosh real t) | notes |
|-----|--------|------------------|-----|-----|----------------------------|-------|
| A | 36.0–39.0 | (1500, −100) | 920 | 0.85 | 37.5 → 37.64 | entry from the firstThwip yank |
| B | 39.0–42.0 | (560, −140) | 880 | 0.90 | 40.5 → 40.64 | handoff at u=1 == next u=0 |
| C | 42.0–45.0 | (1180, −80) | 950 | 0.80 | 43.5 → 43.64 | release 44.25, land-roll 44.6 |
| D | 48.0–50.4 | (240, −60) | 820 | 0.50 | — | rescue swing-away, damped: theta *= exp(−1.1·(g−48)) |

- Strand render: anchor → hand via `qBez`, control = midpoint + sag `60 * (0.4 + 0.6·|theta|/TH0)`
  (taut at the bottom); two strokes — dark base + thin #e8cf7e highlight (hairyweight rope recipe).
- Handoff rule: anchors pre-seeded (`rng(seed)`), never Math.random; camera `cam.x` follows
  `heroAt(g).x` with outCubic lag inside clampCam (overscan 120 makes the follow free).

RESCUE DIVE (shot 9, pure): civilian 24 falls from the scaffold at x 1180 from g 45.0:
`civY(g) = 300 + 560 * seg(g, 45.0, 48)²` (foot anchor; near sprite 76×116).
Hero dive parabola from (1420, 180) to the intercept point **(560, 860) at g 48.00** —
`u = seg(g, 46.6, 48); hero = lerp((1420,180), (560,860), u*u)`; catch STOP 0.16, then leg D.
After the catch she rides his left arm; set down at (350, 900) balcony mark at 49.9.

FLAKE-BOMBS (shot 12): lobbed from the glider at g 63.0 / 63.75 from (x_g, 320):
`bomb_i(g) = { x: x0 + 240·(g−g0), y: 320 + 420·(g−g0)² }` — pure parabola, spin rot = 9·(g−g0).
The two flow-sense bombs are staged in the shot-local 0.5x frame with the near-miss pass at
lt 1.5 (rt 67.5).

WRAP (shot 15): three strands from hero hand to glider rim points, attach at the volley beats;
cocoon completeness `w = seg(g, 74.6, 76.5)` eased outCubic; goblin drawn as `white: true`
silhouette behind w · 5 wrap rings; final cinch g 76.5.

---

## 7. EMOTIONAL BEAT + MONEY SHOT (the two frames the film exists for)

1. **EMOTIONAL BEAT — the catch, g 48.00 (rt 48.14, shot 9).** Hero saves civilian 24 — a
   literal gold-haired stranger — and for one damped swing he is not shy #42 any more. Score
   drops to heartbeat + a single warm piano echo of motif bar 1 at 49.5. Hold faces readable;
   no caption over it.
2. **MONEY SHOT — the sunset wrap + hang, g 76.50 → 84 (shots 15–16).** Volley → cinch at
   76.94 with 0.30 s of silence and a 0.30 flash, then the widest, warmest frame in the film:
   upside-down hero over the 4-layer sunset city (sun side locked LEFT for every layer; warm
   rim on all lit faces), cocoon swinging small below-left, tagline card at 80.0. Nothing
   competes: no onomatopoeia, no shake, score on a warm pad reprise. This is the poster frame.

---

## 8. SCORE CUE PLAN (composer reads this; kit voices per techniques.md §1/§7; all t REAL seconds — derive from filmT, never offsets)

### THE HERO MOTIF — "Great Flow Theme" (ORIGINAL, 4 bars @ 80 BPM, D major)

```
bar | chord (roots, MIDI) | melody (MIDI, beat: note)
   1 | D: 50, 57           | b1: 74 (D5)  b2: 76 (E5)  b3–4: 78 (F#5, half)
   2 | Bm: 47, 54          | b1: 83 (B5)  b2: 81 (A5)  b3–4: 78 (F#5, half)
   3 | G:  43, 50          | b1: 76  b2: 78  b3: 79 (G5)  b4: 81 (A5)   <- stepwise "flow rising"
   4 | A:  45, 52          | b1: 78 (half) b3: 74  b4: 69 (A4, pickup)
```
Statements: #1 suitPanel+firstThwip (24–36, pluck lead) · #2 swing1+rescue (36–51, brass, octave
up) · #3 hangSunset (78–89.5, warm pad reprise, half-time feel). Never quoted in the goblin cues.

| cue | window (rt) | intent | instruments/events |
|-----|-------------|--------|--------------------|
| museumCurious | 0–15 | shy, curious field-trip sparkle | pizzicato ostinato pluck(50/54/57/62) quarters from 0.75; bell(…) sparkles bars 2/4; **13.50 impact + glass on the SNAP, then TOTAL SILENCE 13.64–15.0** (the bite takes the music with it) |
| transformBraam | 15–21 | the bite takes hold; awe | riser(15.0→16.5); **braam(16.5, [38, 45], 2.5)** + sub(16.5) + choir(16.5, [62, 66, 69], 4.5, 'a'); strings swell under the strand-rise; thin to one pad by 21 |
| mirrorWhimsy | 21–24 | first discovery, comedy | soft pluck fragment 74/76/78; **blip(22.50)** on the reflex THWIP; bell(23.25) as the strand waves |
| suitFanfare | 24–36 | MOTIF STATEMENT #1 — building the legend | pluck lead + brassChord, bars 1–3 over the panels (24/27/30), bar 4 (33–36) with kick+clap entering; melody b3 74 lands ON the yank at 34.50 |
| swingDrive | 36–51 | full swing + rescue — cocky, bright | kick b1/b3, clap b2/b4, hat 8ths; brass stabs each bar line 36/39/42/45/48; motif #2 octave-up; **impact+taiko at 48.14 (catch)**; then hush 48.9–51: heartbeat + crowd bed + piano echo 74 @ 49.5 |
| newsSting | 51–57 | the menace gets a headline | paper whoosh 51.0; **brassChord([38, 41, 45], 0.8) + glass(52.50)** on the headline slam; drone(53.25→57, [36]) rising; riser(55.5→57.0) |
| goblinMenace | 57–69 | villain power; engine snarl | detuned saw drone [36, 42] (tritone) + flutter = glider engine; **braam(57.5, [36, 42], 2.0)**; taiko singles 58.5/60.0 under the lower-third; marching taiko 8ths from 63.0 (bombs); **flow-sense 66–69: master low-pass + half-density ostinato [50, 53, 55, 53] strings pad [36, 43, 48]**, riser(67.9→69.0) punches out of the slow-mo |
| skyBattle | 69–78 | taiko + strings ostinato, full band | taiko EVERY beat 0.75 s, accent pattern strong–weak–weak–medium; 8th-note string ostinato [50, 53, 55, 53] (D minor); **brass stabs: punch 70.80 [38, 45, 50]; volley 73.94 [45, 50] / 74.69 [47, 52] / 75.44 [50, 57] rising; WRAP 76.94 impact + sub + glass then SILENCE through the 0.30 freeze (→77.24)**; release whoosh 77.4 |
| sunsetPayoff | 78–89.5 | MOTIF STATEMENT #3 — warm reprise | strings + choir half-time, melody at pitch, bars at 78/81/84/87 (b4 truncates: 78 @ 87.0, 74 @ 88.5 held to 89.5); tagline chord bloom 80.0; **bell twinkle 86.99 (the louse salutes)**; solo celeste 74 from 88.5; ALL OUT 89.5, room tone to 90 |

Beds: `wind(36, 69)` city altitude + faint `crowd` murmur under 0–51. Bass discipline: bass g ≤ 0.28,
pad g ≤ 0.05 under lead lines (lessons.md band-mask rule).

Camera shake / flash accents (real, peaks ≤ 0.3, decay ≤ 0.2) — same events the score hits:
SHAKES: 13.50 (amp 5, decay 8) · 16.50 (6, 7) · 34.64 (3, 7) · 48.14 (6, 7) · 70.80 (7, 8) · 76.94 (8, 8).
FLASHES: 13.50 (0.26, 0.12) · 16.50 (0.18, 0.15) · 48.14 (0.18, 0.10) · 70.80 (0.20, 0.10) · 76.94 (0.30, 0.18).

---

## 9. ACT STRUCTURE (30 bars)

- **ACT 1 — THE BITE (0–21, bars 1–7):** museum, panel page, louse bite g 13.5, transformation
  + title slam g 16.5. Curious pizzicato → braam.
- **ACT 2 — GREAT RESPONSIBILITY (21–51, bars 8–17):** mirror THWIP 22.5, 3-panel suit montage,
  first real THWIP 34.5, three-bar swing, rescue of 24 at g 48.0. Motif statements #1/#2.
- **ACT 3 — THE HAIR-LICLE MENACE (51–69, bars 18–23):** Daily Flow headline 52.5, goblin
  reveal 57–63, flake-bomb strafing, flow-sense slow-mo dodge rt 67.5. Tritone menace cue.
- **ACT 4 — WITH GREAT HAIR COMES GREAT FLOW (69–90, bars 24–30):** aerial punch g 70.5,
  web-barrage wrap MONEY SHOT g 76.5 (rt 76.94), upside-down sunset hang + tagline card 80.0,
  louse salute stinger g 86.25 (rt 86.99), iris out 89.5.
