# TREATMENT — THE LORD OF THE FLOW (a Remy Boys epic)

Shooting script. `timeline.js` is the only timing truth; every number below is restated from it.
90.0 s · 80 BPM · bar = 3.0 s · half-bar = 1.5 s (every cut on the grid) · 30 bars · stage 960×540 @2× · letterbox 1 (2.39:1).

## Bar → second conversion

Bar n spans `[3(n−1), 3n)`.

| 1: 0–3 | 2: 3–6 | 3: 6–9 | 4: 9–12 | 5: 12–15 |
|---|---|---|---|---|
| **6: 15–18** | **7: 18–21** | **8: 21–24** | **9: 24–27** | **10: 27–30** |
| **11: 30–33** | **12: 33–36** | **13: 36–39** | **14: 39–42** | **15: 42–45** |
| **16: 45–48** | **17: 48–51** | **18: 51–54** | **19: 54–57** | **20: 57–60** |
| **21: 60–63** | **22: 63–66** | **23: 66–69** | **24: 69–72** | **25: 72–75** |
| **26: 75–78** | **27: 78–81** | **28: 81–84** | **29: 84–87** | **30: 87–90** |

## Shot script (28 shots, contiguous [0, 90))

| # | Shot | Bars | Film s | Camera / action | Overlays & clocks |
|---|---|---|---|---|---|
| 1 | mistTitle | 1–2 | 0–6 | Black → drifting mist; gold serif main title settles; sub "a Remy Boys epic" | CAPT narrAge; EV TITLE_EV; score choirIn 0.2 |
| 2 | forgePlate | 3a | 6–7.5 | Plate I, Ken Burns: silhouette anvil, hammer falls, spark bursts | EV FORGE_EV.sparks |
| 3 | hordePlate | 3b | 7.5–9 | Plate II: 8 Cabald sprites march, dust kicks, drums | EV HORDE_EV; CAST.HORDE |
| 4 | fallPlate | 4–5a | 9–13.5 | Plate III, long mournful push: a hairy kingdom's banners sag and fall; colour drains | CAPT legendRazor; EV BANNERS_EV |
| 5 | shearDay | 5b–6a | 13.5–16.5 | The Shear golden pastoral: painted hills, round doors, laundry lines of combs | EV SHEAR_DAY_EV; FLOW THEME in 13.7 |
| 6 | shearNight | 6b–7 | 16.5–21 | Night cut: GRANDFLO (909) raises the dug-up Razor; blade glint | CAPT decree; EV SHEAR_NIGHT_EV; glint 17.6 |
| 7 | assembly | 8 | 21–24 | The six (42/909/4/2577/90/2531) spaced in lineup, wind gust | EV ASSEMBLY_EV; horn-call 21.3 |
| 8 | ridgeWalk | 9–10a | 24–28.5 | Sunset crest walk, six silhouettes, parallax valley (remember-the-flow march pattern) | EV RIDGE_EV.stepOff 24.4 |
| 9 | wraithRidge | 10b–11 | 28.5–33 | Razorwraith silhouettes on the dark ridge behind; the six quicken — no combat | EV WRAITH_EV; sting 29.5 |
| 10 | minesEnter | 12 | 33–36 | Mines of Mo-Hair-A gate: torchlight holes swallow the party | EV MINES_ENTER_EV.torchSeeds |
| 11 | minesHall | 13 | 36–39 | Dark halls, flicker darkness, giant relic combs, dust motes; distant rumble | EV MINES_HALL_EV |
| 12 | balrogRise | 14 | 39–42 | Chasm glow, ember rise; BALDROG (procedural) ascends, eclipses torchlight, roars | EV BALROG_EV; braam 41.8 |
| 13 | bridgeStand | 15 | 42–45 | GRANDFLO plants staff on the stone bridge; SHOUT; slam + **hit-stop 0.18 s at 43.5** | CAPT shout (minHold 1.5); BRIDGE_CLOCK.warp(lt) |
| 14 | theFall | 16 | 45–48 | Bridge span collapses; Baldrog falls dragging GRANDFLO, **slow-mo 0.45× 45.2–46.4**; swallowed 46.94 | BRIDGE_CLOCK.warp(lt + 3); flash collapse 45.2 |
| 15 | escapeGrief | 17a | 48–49.5 | FLOWDO + SAMFLO at the far end; grief beat, near-silence, solo string 48.25 | EV ESCAPE_EV |
| 16 | ashlands | 17b | 49.5–51 | Grey desat trudge; ash and ember drift toward the smoking dome | EV ASH_EV; sub drone 49.9 |
| 17 | golbaldRock | 18–19a | 51–55.5 | GOLBALD (73) skulks on a rock spur, clutches the toupee, whispers | CAPT whisper (italic small); EV GOLBALD_EV |
| 18 | eyeTower | 19b | 55.5–57 | Cut-in: THE EYE (`headIcon(heads, 1217, k)`) swivels its search-beam | EV EYE_EV |
| 19 | domeClimb | 20 | 57–60 | Mount Dome climb: embers, wind gusts, taiko pulse builds | EV CLIMB_EV; taikoIn 57.8 |
| 20 | craterEdge | 21 | 60–63 | Crater rim; FLOWDO hesitates; blade reflects impossible majestic hair | EV CRATER_EV.reflection 61.8–62.7 |
| 21 | theLunge | 22 | 63–66 | GOLBALD lunges (**hit-stop 0.14 s at 63.9**); struggle; tumble into lava **slow-mo 0.5× 64.94–65.84**; splash 65.84 | CRATER_CLOCK.warp(lt); flash splash |
| 22 | meltErupt | 23 | 66–69 | The Razor melts in the melt; **ERUPTION at 67.5** (flash, shake 8) | EV MELT_EV; flash erupt |
| 23 | towersFall | 24a | 69–70.5 | Dark Tower cracks (69.1); THE EYE bursts into hair-confetti (69.6) | EV TOWERS_EV; flash eyeBurst |
| 24 | hairify | 24b | 70.5–72 | Reverse-baldify wave crosses the land; Cabald heads sprout hair in bursts | EV HAIRIFY_EV; GOLD.confetti palette |
| 25 | rescue | 25–26a | 72–76.5 | FLOWDO stranded on a spire; Great Eagle (head 2577) swoops 73.2, grabs 74.4, lifts, exits | CAPT coming (title); EV RESCUE_EV; FLOW THEME major 72.0 |
| 26 | shearReturn | 26b–27 | 76.5–81 | The Shear golden hour, all hair blowing; GRANDFLO returns, staff raised, white glow 77.5 | EV RETURN_EV; pastoral reprise 76.5 |
| 27 | embrace | 28 | 81–84 | FLOWDO and SAMFLO embrace; hold, warm resolve | EV EMBRACE_EV; embrace chord 82.2 |
| 28 | endCards | 29–30 | 84–90 | "FLOW RESTORED." + gag card stacked; tiny sequel type; fade 88.6–90 | CAPT restored + gag (stacked); COPY.endCards.sequel drawn; final chord decays to 90.0 |

## Caption hold arithmetic (lint: full hold = min(t1−out, shot.t1) − (t0+in); need 3 s unless minHold)

| Caption | Style (in/out) | Shot | t0 | full-hold start | full-hold end | t1 | Total full | ≥3 s? |
|---|---|---|---|---|---|---|---|---|
| narrAge | narr (.5/.5) | mistTitle 0–6 | 0.80 | 1.30 | 5.10 | 5.60 | **3.80** | yes |
| legendRazor | legend (.4/.4) | fallPlate 9–13.5 | 9.40 | 9.80 | 12.90 | 13.30 | **3.10** | yes |
| decree | narr (.5/.5) | shearNight 16.5–21 | 16.70 | 17.20 | 20.30 | 20.80 | **3.10** | yes |
| shout | shout (.1/.1) | bridgeStand 42–45 | 43.20 | 43.30 | 44.85 | 44.95 | **1.55** | minHold 1.5 (see below) |
| whisper | whisper (.4/.4) | golbaldRock 51–55.5 | 51.30 | 51.70 | 54.80 | 55.20 | **3.10** | yes |
| coming | title (.3/.3) | rescue 72–76.5 | 72.40 | 72.70 | 75.85 | 76.15 | **3.15** | yes |
| restored | title (.3/.3) | endCards 84–90 | 84.50 | 84.80 | 88.90 | 89.20 | **4.10** | yes |
| gag | card (.4/.4) | endCards 84–90 | 85.00 | 85.40 | 88.60 | 89.00 | **3.20** | yes |

`shout` minHold 1.5 is the BRIEF-sanctioned exception: a shouted single line that lands with the
staff slam + hit-stop at 43.5 and holds the rest of the shouted bar before the crack takes the frame.
No caption crosses a cut; `restored` + `gag` deliberately stack (different y) inside endCards.

## Clocks (makeClock per the-shine/baldzilla; score.js imports the same objects)

| Clock | t0 | Stops | Rates | Abs anchors |
|---|---|---|---|---|
| BRIDGE_CLOCK | 42 (bridgeStand) | g 1.5, d 0.18 (staff slam) | g [3.02, 3.56) at 0.45× (1.2 s real) | slam 43.5 · crack 43.68 · collapse 45.2 · fallSlow [45.2, 46.4] |
| CRATER_CLOCK | 63 (theLunge) | g 0.9, d 0.14 (the lunge) | g [1.8, 2.25) at 0.5× (0.9 s real) | lunge 63.9 · tumbleSlow [64.94, 65.84] · splash 65.84 |

Wiring: bridgeStand draw → `BRIDGE_CLOCK.warp(lt)`; theFall → `BRIDGE_CLOCK.warp(lt + 3)`; theLunge →
`CRATER_CLOCK.warp(lt)`. Every other shot runs 1× (`abs = T.<shot> + g`). All warped hits are
precomputed in `SCORE_ABS` — never re-type them.

## Notes for picture & composer

- **Two reasoned rebalances of the BRIEF bar map**: fallPlate grows to bars 4–5a (the legend caption
  needs a ≥3 s full hold, and lint measures holds inside one shot only), so The Shear starts at 13.5;
  rescue grows to bars 25–26a for the same reason, so the Return compresses to bars 26b–28. All other
  section boundaries match the BRIEF exactly. Every BRIEF beat has a home.
- Caption coordinate space is 1920×1080 overlay; with letterbox 1 the bars cover y < 138 / y > 942 —
  all caption y values (430 / 760 / 806 / 812) clear bars and the 5% title-safe margin.
- Whisper italics ride on the renderer's font composition (`weight: 'italic 500'` → valid canvas shorthand).
- Flashes/shakes: FLASHES (7) and SHAKES (8) are abs-time tables; peaks ≤ 0.3, decay ≤ 0.2.
- Score cues: schedule from `SCORE_ABS` + bar grid (`BPM`/`BAR`); the slam lands ON the hit-stop, the
  grief solo note at 48.25 sits in near-silence, the FLOW THEME states at 13.7, erupts major at 72.0,
  and the final chord decays exactly to 90.0.
- Determinism: timeline.js has zero imports and contains only literals and pure arithmetic.
