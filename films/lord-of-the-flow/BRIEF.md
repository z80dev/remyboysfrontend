# THE LORD OF THE FLOW — a Remy Boys epic

**Slug** `lord-of-the-flow` · **Output** `lord-of-the-flow.mp4` · **Duration** exactly **90.0 s** · 1080p60 · pixel stage **960×540 blitted 2× nearest** (the-shine/baldzilla lineage) · **letterbox 1** for 2.39:1 epic frame · **80 BPM, bar = 3.0 s, 30 bars**, `grid: { bar: 1.5 }`.

The untaken genre in the catalog: long-form **epic fantasy** (trilogy compressed into one film). Hairy Remys are the free peoples of Middle-Flow; the bald Cabald are the armies of the Dark Lord. Parody names, 100 % original art and score — no copyrighted logos, sprites, or melodies.

## Tone

Prestige epic played straight. Sweeping painted pixel landscapes, gold serif narration over mist, a fellowship of six on a sunset ridge, a fire demon in a dark mine, a bald volcano, and an ending where hair is restored to all the land. The comedy comes from the deadpan seriousness of hair lore, never from winking at the camera.

## Cast (ids locked by casting; roles fixed)

| Role | Description |
|---|---|
| **FLOWDO** | The carrier. Hero **#42** (red hair, sword) — locked. Carries the One Razor. |
| **GRANDFLO** | The wizard. Golden-ager with the longest grey/white hair; procedural staff prop. Bridge stand: "YOU SHALL NOT BALD!" Falls at the mines, returns at the end ("I fell to a lower shelf."). |
| **SAMFLO** | The loyal friend who never leaves FLOWDO. |
| **3 more fellowship members** | An archer (flow hair), a stocky axe type, a broad dark-haired warrior — distinct silhouettes/hair colours. |
| **GOLBALD** | Wretched creature obsessed with his lost flow; clutches a tiny toupee ("my preciousss…"). Half-shaved repaint of a hero sprite (the-shine `baldify` pattern) or a fringe-bald id. |
| **THE CABALD HORDE** | 8 clean bald sprites (no slogan overlays/props) for marching armies. `#5` and `#1217` as chief villains. |
| **THE EYE** | Giant unblinking bald head atop the Dark Tower, searching beam. Suggested: `headIcon(heads, 1217, k)` at large k as a stylized eye. |
| **BALDROG** | Fully procedural fire demon: massive bald head silhouette, horns, fire cracks, smoke wings, whip of fire. No sprite. |

## World naming (locked)

The Shear (the hairiest homeland) · the Mines of Mo-Hair-A · Mount Dome (the bald volcano) · the One Razor · Razorwraiths (black riders, silhouettes only) · the Dark Lord **SAUBALD** (heard, never seen whole — his presence is the Eye).

## Beat sheet — 30 bars, bar = 3.0 s

| Bars | Film t | Beat |
|---|---|---|
| 1–2 | 0–6 | COLD OPEN. Black → drifting mist; gold serif main title **THE LORD OF THE FLOW** (small "a Remy Boys epic"). Narration: "In the Second Age of Style, the Cabald forged a Master Razor…" |
| 3–4 | 6–12 | PROLOGUE PLATES, quick Ken Burns: sparks of the forging (silhouette anvil) / bald horde marching / a hairy kingdom's banners falling. Caption: **"One Razor to shave them all."** |
| 5–7 | 12–21 | THE SHEAR. Golden pastoral: painted hills, round doors, laundry lines of combs; wind in the meadow grass. Night cut: GRANDFLO holds the dug-up Razor to the light, glint. "It must be cast into the fires of Mount Dome." |
| 8–11 | 21–33 | THE FELLOWSHIP. Assembly lineup (six, spaced, wind), then the iconic sunset ridge walk — six sprites in silhouette walking the crest, parallax valley behind. Beat 10–11: Razorwraith shapes on a dark ridge behind them; the fellowship moves with purpose. No combat yet. |
| 12–16 | 33–48 | THE MINES OF MO-HAIR-A. Dark halls, torchlight holes (the-shine darkness pattern), giant relic combs in niches, dust. At ~bar 13.5: chasm glow, ember rise — **BALDROG** ascends (bald head eclipsing the torchlight). GRANDFLO plants his staff on the stone bridge: **"YOU SHALL NOT BALD!"** — staff slam with hit-stop (~0.18 s), the bridge cracks, the Baldrog falls, dragging GRANDFLO into the dark. FLOWDO + SAMFLO escape, grief beat. |
| 17–19 | 48–57 | ASHLANDS. Grey desat, drifting ash, embers. GOLBALD skulks on a rock spur above the path, whisper-caption "my preciousss flow…". Cut-in: the EYE atop the Dark Tower swivels its search-beam. FLOWDO + SAMFLO trudge toward the smoking dome. |
| 20–24 | 57–72 | MOUNT DOME. The climb (embers, wind, taiko pulse). At the crater: FLOWDO hesitates — the Razor's blade reflects FLOWDO with impossible majestic hair (temptation beat). GOLBALD lunges; struggle hit-stop; the Razor and GOLBALD tumble into the lava. The Razor melts; ERUPTION. Quick montage: the Dark Tower cracks, the EYE bursts into drifting hair-confetti; across the land, Cabald heads sprout hair (the reverse-baldify). FLOWDO stranded on a rock spire; caption **"THE FLOW IS COMING"** — a giant flying hair-head (eagle) swoops and carries him off. |
| 25–28 | 72–84 | THE RETURN. The Shear at golden hour, everyone's hair blowing; GRANDFLO back, staff raised, white glow; FLOWDO and SAMFLO embrace. Score resolves: pastoral theme, full and warm. |
| 29–30 | 84–90 | END CARDS. **FLOW RESTORED.** · "No Remys were shaved in the making of this film. One comb was lost." · tiny sequel card: "THE TWO TOUPEES — probably never". Hold final chord to 90.0. |

## Caption plan (all serif, gold/ivory, ≥3 s full hold unless noted)

1. "In the Second Age of Style, the Cabald forged a Master Razor…" (prologue, narration style)
2. "One Razor to shave them all." (plates, the ring-legend line)
3. "It must be cast into the fires of Mount Dome." (Shear night)
4. "YOU SHALL NOT BALD!" (bridge — can be shorter hold via reasoned `minHold`; it is a shouted title, pair with big type)
5. "my preciousss flow…" (Golbald, italic, small, whispered)
6. "THE FLOW IS COMING" (rescue, title style)
7. "FLOW RESTORED." (end, title style)
8. End gag card (two short lines, serif small)

Title cards: main title at bar 1–2 (gold serif, slow settle, mist behind), "THE END"-style card at 29–30.

## Score direction (original, no borrowed themes)

Epic fantasy at 80 BPM. Prologue: low choir + distant horn over drone. The Shear: warm pluck/pastoral theme (this film's FLOW THEME — it must return at the Return). Fellowship: horn-call variant + strings, dignified A–B phrase. Mines: sparse drone + torch crackle + heartbeat; Baldrog: braam + taiko + choir cluster + riser; the slam lands ON the hit-stop. Grief: a solo string note, near-silence. Ashlands: sub drone + wind + whisper texture. Climb: taiko pulse building, ostinato low strings. Eruption: full tutti + impact + choir; the FLOW THEME erupts major and warm on the rescue beat. Return: pastoral reprise, resolved final chord that decays exactly to 90.0. SFX: forge sparks, torch, chasm rumble, staff crack (big), lava splash, tower crumble, wind. All cues scheduled from timeline clocks (`filmT`/`abs`) — never re-typed seconds.

## Technical contract ( crib from the proven films)

- Stage: `S.low = A.canvas(960, 540)` blitted `drawImage(S.low, 0,0, LW,LH, 0,0, W,H)` with smoothing off; letterbox 1 via fx; overscan-safe shake (repaint beyond stage edges).
- Hit-stops: `makeClock(t0, stops, rates)` exactly as `films/the-shine/timeline.js` L44–69 / `films/baldzilla/timeline.js` L96–127. Stops: staff slam, Golbald lunge; optional slow-mo rate on the fall/eruption. Score imports the same clocks.
- Torch darkness: `films/the-shine/art.js` `flame/warmGlow/darkness(holes)` pattern (darkness as destination-out punch-outs on a cached scratch layer).
- March choreography: `films/remember-the-flow/film.js` L616–656 (`walkPose`, painter's-order sort by feet).
- Rig: `import * as A from '../remy-bros/art.js'`; `loadRemy(id, far)`, `drawRemy(ctx, R, x, feet, { lift, stride, lean, flip, sx, sy, rot, glow, glowA, white, alpha })`, `loadHeads()/headIcon(atlas, id, k)`.
- Every frame pure in `t`; no `Math.random`/`Date.now`/cumulative state; particles analytic `{g,x,y,seed}`; wipes evenodd iris with `moveTo`.
- Post knobs per shot from: `letterbox, vignette, grain, bloom (≤0.14 on bright skies, thresh ~0.9), sat, tint, contrast, exposure, warm, haze, rays, fade, streak, aber, crt` — ash scenes desaturated, mines dark+warm, Shear golden and saturated.
- Files: `timeline.js` (single source of timing truth: `T`, `EV`, `CAST`, `DURATION`, `LW/LH`, clocks, captions) · `art.js` (baked painters) · `film.js` (shots) · `score.js`. Output `lord-of-the-flow.mp4`.

## Crew ownership

Casting owns `CASTING.md` + `output/_contact/`. Screenplay owns `timeline.js` + `TREATMENT.md`. Picture builder owns `art.js` + `film.js`. Composer owns `score.js`. Nobody edits another crew member's file; nobody touches other films, shared app code, or `films/remy-bros`. The director (main session) integrates, lints, renders, and delivers.
