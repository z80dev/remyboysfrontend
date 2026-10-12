# MAD BALD: FURY FLOW — story.md

Slug `mad-bald`. 102 s, 1920×1080 @60fps, 2D filmkit full-res painted stage
(pirates-cabald / wizard-of-floz lineage), letterbox 0.8. This document is the
creative contract: the timeline builder converts every nominal below into
clock-derived MASTER values exactly as `films/wizard-of-floz/timeline.js`
documents (E-numbered events, per-shot clocks, STOPS-aware `abs(g)`), and the
score agent implements §8 from the same imports. Screenplay agent owns the exact
numbers; builders get ±0.5 s per shot under the §10 retime rule. No sepia in
this film; it has a NIGHT palette with its own flash cap (§2, §9).

---

## §1 LOGLINE + TONE

**Logline.** In a scorched wasteland where HAIR is the only currency, a red-haired
hero is captured and SHORN by a bald cult, chained to a fanatical war boy as a
blood bag — then rides the stolen hair-tonic tanker back up the road to give a
tyrant's army one thing to WITNESS: the great wig coming off.

**Tone.** Comedy-forward deadpan, catalog house style: everyone plays it straight,
the world is insane. Sight gags sit ON TOP of real stakes — the shearing is a
genuinely wounding beat (house lore: hair = hero power), the seed pressed into a
palm is a genuinely kind one, and the film earns its gags by never winking at the
cost. Remy speaks maybe six words all film. Nux speaks constantly and means none
of it until he means all of it. The wasteland wind is a character: it takes hats,
takes wigs, and at the very end takes one single hair.

**Structure in one line:** sheared (S1–S2) → stolen (S3) → chase (S4–S5) →
storm (S6) → dead hope (S7) → the turn (S8) → the rip (S9) → the regrow (S10).

---

## §2 PALETTE + LIGHT PLAN

Base rule: Fury Road saturation discipline — blasted ORANGE day world, one deep
BLUE night, everything else rationed. Two sanctioned accents, never a third:
**RED** (Remy's hair — the only saturated red wides in the film, S1 and the S10
regrow; gone from every frame between them) and **the flame guitar's fire**
(the only other licensed red-orange, always diegetic, always the doof's).
Letterbox 0.8 → visible band rows ~111..969; action is blocked in the band,
captions center at y ≤ 915 (§4). Flash budget: global peak ≤ 0.24, decay ≤ 0.2.
**NIGHT cap:** S6 carries ZERO screen-flash rows — lightning is in-scene radial
light only; if a flash row is ever added inside S6 it caps at 0.12 peak.

| Shot | Light plan |
|---|---|
| S1 wasteland | High-noon blast: orange sand ramp (#c96a2a shadows → #e8a04c mids), blown-white sky, hard short shadows. Letterbox keeps the eye in the mid band; the interceptor's black + Remy's RED mane are the only dark/red clusters. |
| S2 shear | Interior war-boy lair: torch amber on white-painted bodies (ghoul duotone, bone ramp), red strand sparks on the clippers frame. The SLAM flash (0.18) is the shot's only bloom. |
| S3 citadel | White rock citadel against orange dusk; the FLOW is saturated GOLD — the arcs, the pipes' seams, the crowd's upturned cups all catch it. GREAT WIG is the brightest object after the tonic. |
| S4 chase | Max-saturation orange chase; teal-shadowed dune faces (orange/teal complement, Fury Road discipline). Flame guitar = the sanctioned red-orange bloom, synced to the doof cues. Silver spray glints on Nux. |
| S5 defect | Same orange, tail sliding amber; the seed beat is the warmest, smallest light in the film (single gold seed in a palm, everything else darkened a step). |
| S6 storm | DEEP BLUE night: indigo ramp (#141c30 → #24314f), lightning white in-scene only, white paint glowing blue-white. ONE warm pixel alive: the doof's flame, far behind, as a dot. No screen flashes (cap 0.12 if ever added). |
| S7 greenplace | Grey-green dawn, hope's corpse: desaturated sage sky, cracked mud browns, no gold anywhere. The buried sign is the only man-made color. |
| S8 turn | Warming back: gold rim-light crawls up the convoy during the U-turn; full orange by the head-on run. |
| S9 return | Full orange again, hardest contrast of the film; the GREAT WIG white is the brightest object on screen so the rip reads at a glance. |
| S10 flow | Golden hour → golden rain: every pipe glows, the crowd is gilded. The film's ONLY saturated-red WIDE since S1: the regrow. Red returns exactly once and means everything. |

---

## §3 SHOT LIST + CLOCK RULE

Ten shots tiling [0, 102) exactly. CUTS: `0 / 8.5 / 18 / 30 / 43 / 52.5 / 61 /
71.5 / 79 / 91 / 102`.

### CLOCK RULE (load-bearing)

This is a chase/action film and declares **4 hit-stops** (total frozen film time
0.78 s). STOPS by shot — `{g, d}` in shot-local WORLD seconds, g = the world
moment the freeze STARTS, d = real seconds frozen (effects/shake/captions run on
REAL time; world time is pinned):

- **S2 shear:** `STOPS = [{ g: 4.2, d: 0.22 }]` — the clippers SLAM (E7).
- **S4 chase:** `STOPS = [{ g: 6.8, d: 0.14 }]` — the ram domino (E19).
- **S9 return:** `STOPS = [{ g: 7.0, d: 0.30 }]` — THE WIG RIP (E44; the money
  freeze, the longest in the film on purpose).
- **S10 flow:** `STOPS = [{ g: 2.0, d: 0.12 }]` — the valve wheel SLAM (E47).
- **S1, S3, S5, S6, S7, S8: NO STOPS — continuous time**, `abs(g) = t0 + g`
  exactly. Declare `STOPS = []` and keep the per-shot clocks anyway (house rule:
  nobody ever hand-adds `t0 + g`).

Conventions, verbatim house rules: an event scheduled AT a stop's g lands at the
START of its freeze (intentional); every EV below is shot-local WORLD time; use
`CLOCK.abs(g)` for film time, never hand arithmetic; the S2/S4/S9/S10 world-time
shot lengths are 9.28 / 12.86 / 11.70 / 10.88 s respectively (film length minus
freeze). Score discipline: no cue STARTS inside [freeze−0.5, freeze+0.4] except
the four pinned impact cues at E7 / E19 / E44 / E47.

---

### S1 `wasteland` 0.00–8.50 (8.50) — STOPS: none, continuous time

Open on silence and heat. Slow lateral drift across a dune sea: MAD REMY's black
INTERCEPTOR sits parked, supercharger ticking; Remy lies on the hood eating a
two-headed lizard off a stick (both heads squeak when he bites — the film's first
gag, played dead straight). Sun glints off a scalp crest: WAR BOYS crest the dune
in a V of rusted cars, white-painted, whooping. Remy is moving before they land —
interceptor coughs, fuel gauge inset gag: the needle is under the "E", next to a
small comb icon. Chain-net capture at full sprint (CONTACT.netBag), and the bag
goes over his head — blackout with two crude eye-holes drawn on, through which we
see the dunes upside down. Hard cut on the bag cinching.

EV (g, shot-local world seconds):

| EV | g | E | annotation |
|---|---|---|---|
| glide | 0.0 | E1 | wasteland wide, lonesome drone (score §8), heat shimmer |
| lizard | 1.8 | E2 | two-headed lizard gag; both heads squeak |
| crest | 3.0 | E3 | war boys crest the dune in a V; far war drums |
| netBag | 5.0 | E4 | CONTACT.netBag: chain-net capture at full sprint |
| sacked | 6.4 | E5 | bag over head; upside-down eye-hole POV gag |
| cut | 8.3 | — | bag cinches; hard cut |

### S2 `shear` 8.50–18.00 (9.50) — STOPS: [{ g: 4.2, d: 0.22 }]

Interior: a war-boy grooming hall, torch amber, engine-block barber chair. Remy
is strapped in (comic oversized buckles), a war-boy barber snaps a cape with a
flourish and does salon patter to a customer who cannot answer. Two warning snips
— Remy's eyes go wide above the cape: he knows the lore (hair is power; this is
the film's wound, played with real dread under the patter). Then the CLIPPERS
come down — SLAM at g4.2, HIT-STOP: the frame freezes on the contact, spark ring
of red strands hanging mid-air, buzz-zzt SFX pinned to the freeze. Resume: one
long full-head pass, red hair falls like rain (the only red in the frame, leaving
it). The MUZZLE: iron grill mask clamped on, tiny comb rivet — the barber pats it
like a job well done. Finally Remy is chained arm-to-arm to NUX (IV tube into the
elbow, Nux taps the "blood bag" tattoo on his forearm and salutes: he is
delighted). Hard cut on the salute.

EV (g; abs via SHEAR.abs(g), stop at g4.2 shifts everything after):

| EV | g | abs | E | annotation |
|---|---|---|---|---|
| chair | 0.5 | 9.00 | E6 | engine-block chair, buckle gag; cape snap g1.4 (unnumbered) |
| snip | 2.6 | 11.10 | — | warning snips; Remy's eyes above the cape; dread beat |
| clippers | 4.2 | 12.70 | E7 | SLAM + STOP 1 (freeze 12.70–12.92): spark ring of red strands; CONTACT.clippers |
| shave | 5.0 | 13.72 | E8 | full pass, red hair rains; SHEAR motif (score) |
| muzzle | 6.8 | 15.52 | E9 | iron grill mask + comb rivet; barber's proud pat |
| bloodbag | 7.8 | 16.52 | E10 | chained to Nux; IV tube; Nux's salute |
| cut | 9.2 | 17.92 | — | hard cut on the salute |

### S3 `citadel` 18.00–30.00 (12.00) — STOPS: none, continuous time

The Citadel in glory: three rock towers, valve pipes, terraces packed with grey
rag masses holding out scalps and cups. IMMORTAN FLOW towers above in his GREAT
WIG and bellows mask; the valves open and the FLOW arcs gold over the crowd
(E11) — they moan, they jostle, one worshipper holds his cup upside down and
doesn't notice. Immortan sweeps opera glasses across their bald heads: the
sneer (E12, mandated line). Internal cutaway to the vault: the MANE WIVES'
graffitied wall — "WE ARE NOT WIGS." painted large, "WHO SHAVED THE WORLD?"
beneath it — as FLOWIOSA kicks the door (E13), seed pouch across her shoulder,
mech arm humming. The steal (E14): mech arm grabs the cab rail, wives pile
through the tanker top hatches one-two-three. The rig ROARS out of the gate
(E15), a wall of dust; behind, Immortan's mask inhales — first statement of the
doom brass. Hard cut chasing the dust.

EV (g; abs = 18 + g):

| EV | g | abs | E | annotation |
|---|---|---|---|---|
| gate | 0.0 | 18.00 | — | citadel wide: towers, pipes, terraces, masses |
| spray | 1.8 | 19.80 | E11 | the FLOW arcs gold; cups and scalps up; upside-down cup gag |
| sneer | 3.4 | 21.40 | E12 | opera glasses sweep; "MEDIOCRE FOLLICLES." (caption c3_med leads 0.2) |
| vault | 5.0 | 23.00 | E13 | vault door kicked; graffiti wall; wives + seed pouch |
| steal | 6.6 | 24.60 | E14 | mech arm to the cab; wives pile into hatches |
| roar | 8.2 | 26.20 | E15 | rig roars out in a dust wall; mask inhale = doom brass in |
| cut | 11.5 | 29.50 | — | hard cut chasing the dust |

### S4 `chase` 30.00–43.00 (13.00) — STOPS: [{ g: 6.8, d: 0.14 }]

Full chase grammar, side-view, parallax dune layers screaming past. The war
party crests (E16): Nux's car with muzzled Remy splayed on the hood as a blood-bag
hood ornament; then the DOOF WARRIOR's speaker wall fills the background — a
blindfolded Cabald atop a mountain of cabinets, flame-throwing guitar alight.
DOOF CHUG ignites (E17) and LEAKS into the score — from here the music IS the
doof (§8). Nux mouth-sprays SILVER, whoops the mandated line at the sky (E18).
The rig runs heavy and fast; a pursuer tries the flank and the rig
SHOULDER-CHECKS it into a barrel-roll domino through two more cars (E19,
COLLIDE.ramDomino) — HIT-STOP on the first impact, spark and glass hanging, then
the domino completes on resume with pinwheeling wheels and catapulting war boys.
A harpoon chain from Nux's car bites the rig's tailgate (E20, CONTACT.lasso);
Remy — still muzzled, still chained — uses the taut chain to SWING the gap
between car and rig (E21, CONTACT.swingCatch: one ballistic arc, glass everywhere)
and crashes through the rig's rear window into the wives' cab (E22). They applaud,
politely. Hard cut.

EV (g; abs via CHASE.abs(g), stop at g6.8 shifts everything after):

| EV | g | abs | E | annotation |
|---|---|---|---|---|
| party | 0.0 | 30.00 | E16 | war party crests; Remy splayed on Nux's hood |
| doof | 1.4 | 31.40 | E17 | DOOF CHUG ignites; flame licks synced to cue; speaker wall reads |
| sprayDay | 4.4 | 34.40 | E18 | Nux silver mouth-spray; mandated line (caption c4_day leads 0.2) |
| ramDomino | 6.8 | 36.80 | E19 | COLLIDE.ramDomino + STOP 2 (freeze 36.80–36.94): rig checks pursuer into a 3-car domino |
| resume | 7.2 | 37.34 | — | domino completes; pinwheels; catapult gags |
| lasso | 9.0 | 39.14 | E20 | CONTACT.lasso: chain bites the tailgate; sag→taut over 6 frames |
| swing | 10.2 | 40.34 | E21 | the boarding swing: one ballistic arc, car → rig window |
| aboard | 11.4 | 41.54 | E22 | CONTACT.swingCatch lands: through the rear window, glass; wives applaud |
| cut | 12.6 | 42.74 | — | hard cut |

### S5 `defect` 43.00–52.50 (9.50) — STOPS: none, continuous time

Driverless, Nux's car pinwheels off a dune behind; NUX hauls himself aboard the
rig on the same chain and face-plants on the deck (E23). Face-off: muzzle vs
white paint — until a wife takes the mech arm and simply UNMASKS Remy (E24): the
shorn scalp, red stubble, one beat of silence for the wound. Then the kindness
beat, the smallest and most important event in the film: a wife presses ONE SEED
into Nux's palm and closes his fingers (E25, CONTACT.seedPress) — THE DOOF CHUG
STOPS DEAD mid-phrase (house silence precedent: the joke is the silence; here the
silence is the conversion). Nux stares at his fist. Then he climbs the tanker,
arms wide, sprays his mouth silver and gives the cult's whole soul in two words:
"WITNESS ME." (E26; WITNESS STING; the wives witness him, deadpan, chest-taps).
Nux comes down different: takes the navigator's seat, wipes a stripe of white
paint off his hand onto his trouser (the paint — the cult — comes off) (E27).
Hard cut on dusk arriving fast.

EV (g; abs = 43 + g):

| EV | g | abs | E | annotation |
|---|---|---|---|---|
| tumble | 0.0 | 43.00 | E23 | CONTACT.tumbleNux: face-plant aboard; chain swings |
| unmuzzle | 1.6 | 44.60 | E24 | mech arm un-masks Remy; the shorn reveal; muzzle springs away |
| seed | 3.2 | 46.20 | E25 | CONTACT.seedPress: one seed into the palm; DOOF STOPS DEAD (score hard-out) |
| witness | 5.2 | 48.20 | E26 | "WITNESS ME." silver spray on the tanker top; WITNESS STING; deadpan chest-taps |
| defect | 7.0 | 50.0 | E27 | Nux takes the nav seat; wipes the white paint off |
| cut | 9.1 | 52.1 | — | hard cut on dusk |

### S6 `storm` 52.50–61.00 (8.50) — STOPS: none, continuous time — NIGHT

Day dies in two beats: palette swings orange → indigo, rig lights on (E28). The
STORM WALL: a black-blue mountain of dust with lightning living inside it (E29);
the pursuers' headlights peel off one by one — they fear it; the rig does not.
The rig plunges IN (E30): lightning silhouettes everything, dust streaks
horizontal — and the film's best wind gag tumbles past the windshield: a
tumbleweed wearing someone's wig. Then the eye (E31): surreal blue calm, the rig
drifting almost gently, wheels still dutifully spinning under it. Quiet beat at
the wheel: Flowiosa gestures at the horizon — the GREEN PLACE, she says, pointing
us home; Nux, reverent, transposes his religion: "SHINY AND GROWN." (E32). Hard
cut on dawn cracking the storm behind.

EV (g; abs = 52.5 + g):

| EV | g | abs | E | annotation |
|---|---|---|---|---|
| dusk | 0.0 | 52.50 | E28 | orange → indigo in two beats; rig lights on |
| stormwall | 1.6 | 54.10 | E29 | the storm wall; pursuers' lights peel away |
| into | 3.0 | 55.50 | E30 | plunge; lightning silhouettes; TUMBLEWIG gag past the windshield |
| calm | 4.6 | 57.10 | E31 | the eye: blue calm, drifting rig, wheels still spinning |
| tale | 5.3 | 57.80 | E32 | Green Place tale at the wheel; "SHINY AND GROWN." (caption c6_shiny leads 0.4) |
| cut | 8.1 | 60.60 | — | hard cut on dawn behind |

### S7 `greenplace` 61.00–71.50 (10.50) — STOPS: none, continuous time

Dawn greys out the storm behind them (unnumbered beat g0.0) — and the film goes
quiet. The GREEN PLACE reveal (E33): cracked mud flats baked shiny-bald (someone
has RAKED it — comb-marks in the mud, the shot's saddest gag), dead trees, a
half-buried sign: "GREEN PLACE →" pointing at nothing. The VUVALINI rise from a
mud blind (E34): two old biker grannies on one tiny motorbike, shotguns — one
plugged with a cork, one with a knitting needle. The reveal (E35): granny sweeps
her arm across the bald mud — THE GREEN PLACE IS GONE; above them, three crows
take off, and they are bald too (molted — no tail feathers). The seed pouch
opens: the LAST FOLLICLE SEEDS (unnumbered beat g7.5); the granny who kept her
grey braid: "we dig." Flowiosa walks to the rig hood and sits (E36): grease-paint
eyes at camera — the despair beat, no gags, the plan is dead. Hard cut.

EV (g; abs = 61 + g):

| EV | g | abs | E | annotation |
|---|---|---|---|---|
| dawn | 0.0 | 61.00 | — | storm cracking into grey light |
| mud | 1.8 | 62.30 | E33 | bald mud flats, rake-marks; buried "GREEN PLACE →" sign |
| vuv | 3.4 | 63.90 | E34 | grannies rise from the mud blind; cork shotgun, knitting needle |
| gone | 6.0 | 67.00 | E35 | the arm sweep: "THE GREEN PLACE IS GONE."; bald crows lift |
| seeds | 7.5 | 68.50 | — | pouch open: the last follicle seeds; "we dig." |
| despair | 8.5 | 69.50 | E36 | Flowiosa on the hood; the despair beat; no gags |
| cut | 10.1 | 71.10 | — | hard cut |

### S8 `turn` 71.50–79.00 (7.50) — STOPS: none, continuous time

Remy stands (E37). The long pause — everyone waiting for the man of few words to
have some. He does (E38, mandated line + the one-liner, one caption pill):
"WE'RE GOING BACK. HE HAS A WIG. WE HAVE WIND." — the plan in nine words: go
back, take the Citadel, open the valves; the wig will not survive the wasteland
wind (this line IS the wig-rip's setup; the wind has been stealing headwear since
S1). FLOW THEME's first full major statement lands under it. The U-TURN (E39):
the entire caravan pivots in one synchronized skid — EXCEPT the grannies' bike,
which does a full three-point turn, takes twice as long, and arrives last,
first. Full send (E40): everything accelerates at camera, dust wall rising, the
film's forward vector flipped. Hard cut at speed.

EV (g; abs = 71.5 + g):

| EV | g | abs | E | annotation |
|---|---|---|---|---|
| fewwords | 0.0 | 71.50 | E37 | Remy stands; the pause; heartbeat only (score) |
| plan | 1.3 | 72.80 | E38 | mandated line + one-liner; FLOW THEME full major |
| uturn | 3.1 | 74.60 | E39 | synchronized skid U-turn; grannies' three-point-turn gag |
| fullsend | 5.1 | 76.60 | E40 | head-on run begins; dust wall; acceleration at lens |
| cut | 7.1 | 78.60 | — | hard cut at speed |

### S9 `return` 79.00–91.00 (12.00) — STOPS: [{ g: 7.0, d: 0.30 }]

Head-on convergence (E41): Immortan Flow's podium car — the GREAT WIG visible
from a mile off like a mattress-sized hood ornament — leading his convoy one way;
the rig leading ours the other; closing speed nearly double the chase's. The
doof's flame guitar reprises at full fire (E42) — the war party's own music now
plays AGAINST them, dopplering between the convoys. POLE-CATS vault from the
pursuers' cars on bendy poles (E43): they bounce off the tanker with comic
resilience (squash 15%, boing); one lands in the grannies' sidecar and is knitted
a small hat before he can escape. Remy one-hands a fourth out of the air and
hands him down to the grannies (unnumbered beat g4.8, CONTACT.poleCatch).
Immortan's car pulls level with the cab (unnumbered beat g6.0): the mask
bellows-inhales, he mouths the sneer again. And then the money shot: FLOWIOSA
plants her mech arm on the cab roof, leans across the gap, and RIPS THE GREAT WIG
OFF IMMORTAN FLOW (E44, CONTACT.wigRip) — HIT-STOP, the freeze of the film, spark
ring of white hair, both convoys hanging in the air. Resume on a snap zoom (E45):
Immortan Flow is BALD — scalp gleaming, mask hanging slack — and the GREAT WIG
tumbles into the wasteland wind, rolling end-over-end away like a tumbleweed.
The army wavers (E46): goggles come up to witness the truth, harpoons droop, cars
slow one by one, the doof's chug detunes and starts losing voices. Hard cut on
the citadel horizon.

EV (g; abs via RETURN.abs(g), stop at g7.0 shifts everything after):

| EV | g | abs | E | annotation |
|---|---|---|---|---|
| converge | 0.0 | 80.00 | E41 | head-on convergence; the wig visible at distance |
| doofback | 1.4 | 81.40 | E42 | doof reprise at full flame, now against the war party; doppler |
| poles | 3.0 | 82.00 | E43 | pole-cats vault; tanker boings; sidecar knitting gag |
| poleCatch | 4.8 | 83.80 | — | CONTACT.poleCatch: Remy one-hands a boarder to the grannies |
| alongside | 6.0 | 85.00 | — | podium car pulls level; bellows inhale; the sneer mouthed |
| wigRip | 7.0 | 86.00 | E44 | CONTACT.wigRip + STOP 3 (freeze 86.00–86.90): THE WIG RIP, spark ring of white hair |
| bald | 7.8 | 87.10 | E45 | BALD reveal, snap zoom; the wig tumbles into the wind, tumbleweed-roll |
| waver | 9.4 | 88.70 | E46 | the army wavers: goggles up, harpoons droop; doof falters |
| cut | 11.2 | 90.50 | — | hard cut on the citadel horizon |

### S10 `flow` 91.00–102.00 (11.00) — STOPS: [{ g: 2.0, d: 0.12 }]

The waver reached home first: war boys haul the Citadel gates open themselves and
wave the rig through (unnumbered beat g0.0). Flowiosa's mech arm SLAMS the master
valve wheel (E47, CONTACT.valveSlam) — HIT-STOP, the wheel spins free — and THE
FLOW RAINS (E48): golden tonic arcs from every pipe; the crowd catches it in
cups, on scalps, in its upturned faces. NUX plants his one seed in a mud terrace
(the S5 seed — the payoff of the kindness beat) and the first sprout pops on a
terrace scalp (unnumbered beat g3.8). Then the payoff of S2: MAD REMY on the
tanker top and his shorn scalp SPRUTS BACK (E49) — the REGROW LADDER, four ticks,
front → crown → sides → mane, the most glorious red mane last, sweeping in the
same direction the shave ran, in reverse. Flowiosa is lifted by the crowd
(E50, CONTACT.crowdSurf); Immortan Flow, demoted, is handed a mop and pointed at
the spilled tonic (the janitor gag — he never does leave the car... this once).
Remy walks alone out the far gate into the wasteland (E51). One final single
hair sprouts on his head (E52); he plucks it (E53, CONTACT.pluck, comic twang),
studies it against the sun, and lets the wind take it (E54) — the kicker echo
lands as it drifts. End card slate (E55) over the gilded citadel, grade
darkening; card, credit, tease. Done.

EV (g; abs via FLOW.abs(g), stop at g2.0 shifts everything after):

| EV | g | abs | E | annotation |
|---|---|---|---|---|
| gates | 0.0 | 91.00 | — | war boys open the gates themselves; the waver reached home |
| valve | 2.0 | 93.00 | E47 | CONTACT.valveSlam + STOP 4 (freeze 93.00–93.12): mech arm slams the master valve |
| rain | 3.0 | 94.12 | E48 | the FLOW rains gold; cups, scalps, faces |
| crowdSprout | 3.8 | 94.92 | — | NUX plants his S5 seed on a terrace; first sprout pops |
| regrow | 4.0 | 95.12 | E49 | REGROW LADDER: 4 ticks at g 4.0 / 4.5 / 5.0 / 5.5 (0.5 each), front→crown→sides→mane; resolve g6.0 → abs 97.12 |
| lifted | 6.4 | 97.52 | E50 | CONTACT.crowdSurf: Flowiosa lifted; Immortan + mop demotion gag |
| walk | 7.2 | 98.32 | E51 | Remy walks out the far gate, alone |
| sprout1 | 7.8 | 98.92 | E52 | one single hair sprouts |
| pluck | 8.3 | 99.42 | E53 | CONTACT.pluck: the pluck, comic twang, studied against the sun |
| windTake | 8.8 | 99.92 | E54 | the wind takes it; kicker echo lands (c10k_day) |
| card | 9.2 | 100.32 | E55 | end card slate over the darkening gold |
| end | 9.5 | 100.62 | — | card holds; grade darkens to black |

---

### MASTER EVENT TABLE — story.md nominals, film-absolute, filmT-TRUE

All values are what `CLOCK.abs(g)` must produce (stop-shifted where marked ★).
The timeline builder derives them from the clocks; this table is the exact
self-check anchor set.

| E | name | shot | abs | | E | name | shot | abs |
|---|---|---|---|---|---|---|---|---|
| E1 | glide | S1 | 0.00 | | E29 | stormwall | S6 | 54.10 |
| E2 | lizard | S1 | 1.80 | | E30 | into | S6 | 55.50 |
| E3 | crest | S1 | 3.00 | | E31 | calm | S6 | 57.10 |
| E4 | netBag | S1 | 5.00 | | E32 | tale | S6 | 57.80 |
| E5 | sacked | S1 | 6.40 | | E33 | mud | S7 | 62.30 |
| E6 | chair | S2 | 9.00 | | E34 | vuv | S7 | 63.90 |
| E7 ★ | clippers | S2 | 12.70 | | E35 | gone | S7 | 67.00 |
| E8 ★ | shave | S2 | 13.72 | | E36 | despair | S7 | 69.50 |
| E9 ★ | muzzle | S2 | 15.52 | | E37 | fewwords | S8 | 71.50 |
| E10 ★ | bloodbag | S2 | 16.52 | | E38 | plan | S8 | 72.80 |
| E11 | spray | S3 | 19.80 | | E39 | uturn | S8 | 74.60 |
| E12 | sneer | S3 | 21.40 | | E40 | fullsend | S8 | 76.60 |
| E13 | vault | S3 | 23.00 | | E41 | converge | S9 | 80.00 |
| E14 | steal | S3 | 24.60 | | E42 | doofback | S9 | 81.40 |
| E15 | roar | S3 | 26.20 | | E43 | poles | S9 | 82.00 |
| E16 | party | S4 | 30.00 | | E44 ★ | wigRip | S9 | 86.00 |
| E17 | doof | S4 | 31.40 | | E45 ★ | bald | S9 | 87.10 |
| E18 | sprayDay | S4 | 34.40 | | E46 ★ | waver | S9 | 88.70 |
| E19 ★ | ramDomino | S4 | 36.80 | | E47 ★ | valve | S10 | 93.00 |
| E20 ★ | lasso | S4 | 39.14 | | E48 ★ | rain | S10 | 94.12 |
| E21 ★ | swing | S4 | 40.34 | | E49 ★ | regrow | S10 | 95.12 |
| E22 ★ | aboard | S4 | 41.54 | | E50 ★ | lifted | S10 | 97.52 |
| E23 | tumble | S5 | 43.00 | | E51 ★ | walk | S10 | 98.32 |
| E24 | unmuzzle | S5 | 44.60 | | E52 ★ | sprout1 | S10 | 98.92 |
| E25 | seed | S5 | 46.20 | | E53 ★ | pluck | S10 | 99.42 |
| E26 | witness | S5 | 48.20 | | E54 ★ | windTake | S10 | 99.92 |
| E27 | defect | S5 | 50.00 | | E55 ★ | card | S10 | 100.32 |
| E28 | dusk | S6 | 52.50 | | | | | |

★ = stop-shifted (events after a stop's g ride `filmT`): S2 +0.22 after g4.2,
S4 +0.14 after g6.8, S9 +0.30 after g7.0, S10 +0.12 after g2.0. Freeze windows
(abs): [12.70, 12.92], [36.80, 36.94], [86.00, 86.90], [93.00, 93.12].

---

## §4 CAPTIONS

Lane model (house): title y540 · sub y660 · main y868 (two-line pills y878 size
38) · kicker y430 · tease y780. Main lane strictly sequential, gaps ≥ 0.9 s.
Hold rule: FULLY-VISIBLE hold `(t1 − out) − (t0 + in) ≥ 3.0`, or a declared
`minHold ≥ 1.0` with justification. All windows end inside their shot and inside
the film. Style notes: title = anton 132 anim `line`; sub = 30px w500 anim
`rise`; caption = grot 40 (y868 single-line; y878 size 38 two-line pills); kicker
= mono 26 anim `fade`.

**Mandated parody lines (verbatim, with exact `\n` where shown):**
1. Title card: `MAD BALD: FURY FLOW` — t1_title and e1_card.
2. `WHO SHAVED THE WORLD?` — c3k_who (graffiti echo; also painted in the S3 art).
3. `WITNESS ME.` — c5_witness (Nux, silver-spray beat).
4. `OH WHAT A DAY.\nWHAT A LOVELY BALD DAY.` — c4_day (Nux, iconic chase placement).
5. `WE ARE NOT WIGS.` — c3_notwigs (the wives).
6. `SHINY AND GROWN.` — c6_shiny (Nux, storm Valhalla riff).
7. `MEDIOCRE FOLLICLES.` — c3_med (Immortan's sneer).
8. `THE GREEN PLACE IS GONE.` — c7_gone.
9. `WE'RE GOING BACK.` — c8_back line 1.
10. Remy's one-liner: `HE HAS A WIG. WE HAVE WIND.` — c8_back line 2 (declared
    improvement over "HOPE IS A COMB-OVER.": it is the plot — the line literally
    sets up the wig-rip physics and pays the wind motif; both strings sit verbatim
    in one two-line pill, Remy's whole speech, he is a man of few words).
11. Wig-rip beat line: `WITNESS THAT.` — c9_witnessthat (the army witnessing the
    truth; pays off "WITNESS ME.").
12. Regrow beat line: `THE MANE EVENT.` — c10_mane.
13. End slate: `MAD BALD: FURY FLOW` + `A REMY BOYS PICTURE` +
    `NEXT: THE TUMBLEWIG.` (declared improvement over "NEXT: THE FLOW RIDES
    AGAIN.": the wig that blew away in S9 — and the S6 tumblewig gag — IS the
    sequel; the wind took it, the wind returns it).

**Caption list — 21 rows** (t0/t1 film-absolute, nominal; builders may ride
±0.5 per shot under §10 without re-deriving text):

| id | verbatim text | t0 | t1 | lane | anim | in/out | hold | notes |
|---|---|---|---|---|---|---|---|---|
| t1_title | `MAD BALD: FURY FLOW` | 1.8 | 6.2 | title y540 | line | .7/.5 | 3.20 | main title over the dune drift |
| t2_sub | `WHERE THE FLOW RAN DRY` | 3.4 | 7.3 | sub y660 | rise | .5/.4 | 3.00 | settles under the title |
| c1_hero | `HERO #42. RED. UNAUTHORIZED.` | 4.6 | 8.1 | main y868 | fade | .3/.2 | 3.00 | over the capture |
| c2k_house | `HOUSE RULE: HAIR IS POWER.` | 9.9 | 13.5 | kicker y430 | fade | .3/.3 | 3.00 | the lore, before the wound |
| c2_trim | `HE CAME IN FOR A TRIM.` | 13.9 | 17.4 | main y868 | fade | .3/.2 | 3.00 | deadpan over the shave |
| c3_med | `MEDIOCRE FOLLICLES.` | 21.0 | 24.5 | main y868 | fade | .3/.2 | 3.00 | MANDATED; leads sneer E12 by 0.2 |
| c3k_who | `WHO SHAVED THE WORLD?` | 22.6 | 26.2 | kicker y430 | fade | .3/.3 | 3.00 | MANDATED echo; vault door opens under it |
| c3_notwigs | `WE ARE NOT WIGS.` | 25.4 | 28.9 | main y868 | fade | .3/.2 | 3.00 | MANDATED; wives' wall |
| c4_day | `OH WHAT A DAY.\nWHAT A LOVELY BALD DAY.` | 34.2 | 38.2 | main y878 size38 | fade | .3/.2 | 3.50 | MANDATED; Nux silver-spray E18; may lift to y826 if the hood actor collides (floz c9 precedent, same lane) |
| c4_tickets | `TICKETS, PLEASE.` | 39.4 | 42.9 | main y868 | fade | .3/.2 | 3.00 | the wives, deadpan, as Remy crashes aboard |
| c5_witness | `WITNESS ME.` | 47.9 | 51.4 | main y868 | fade | .3/.2 | 3.00 | MANDATED; leads E26 by 0.3; E25 silence stays caption-free |
| c6_shiny | `SHINY AND GROWN.` | 57.4 | 60.95 | main y868 | fade | .3/.2 | 3.05 | MANDATED; leads tale E32 by 0.4 |
| c7k_mud | `YES. THE MUD IS ALSO BALD.` | 62.8 | 66.4 | kicker y430 | fade | .3/.3 | 3.00 | the rake-marks gag; yields before the mandate |
| c7_gone | `THE GREEN PLACE IS GONE.` | 66.6 | 70.1 | main y868 | fade | .3/.2 | 3.00 | MANDATED; leads gone E35 by 0.4 |
| c8_back | `WE'RE GOING BACK.\nHE HAS A WIG. WE HAVE WIND.` | 72.5 | 76.6 | main y878 size38 | fade | .3/.2 | 3.60 | MANDATED ×2 in one pill (Remy speaks once); U-turn E39 lands under it |
| c9_witnessthat | `WITNESS THAT.` | 86.2 | 89.7 | main y868 | fade | .3/.2 | 3.00 | MANDATED beat; t0 sits INSIDE the wig freeze (86.00–86.90), sanctioned pirates C7 pattern |
| c10_mane | `THE MANE EVENT.` | 95.0 | 98.5 | main y868 | fade | .3/.2 | 3.00 | MANDATED; leads regrow E49 by 0.12 |
| c10k_day | `WHAT A LOVELY DAY.` | 99.6 | 101.9 | kicker y430 | fade | .3/.3 | 1.70 minHold 1.70 | declared: lands ON windTake E54, the film's last line, rides into the slate in its own lane; endgame short-hold precedent (floz/pirates slates) |
| e1_card | `MAD BALD: FURY FLOW` | 100.3 | 101.9 | title y540 | cut | 0/.4 | 1.20 minHold 1.0 | slate slam (anim cut, in 0) |
| e1_credit | `A REMY BOYS PICTURE` | 100.4 | 101.9 | sub y660 | fade | .15/.25 | 1.10 minHold 1.0 | MANDATED credit |
| e2_tease | `NEXT: THE TUMBLEWIG.` | 100.5 | 101.9 | tease y780 | fade | .2/.1 | 1.10 minHold 1.0 | MANDATED tease (improved, see above) |

Main-lane sequencing (film order, gaps): c1_hero →4.8→ c2_trim →3.6→ c3_med
→**0.90**→ c3_notwigs →5.3→ c4_day →1.2→ c4_tickets →5.0→ c5_witness →6.0→
c6_shiny →5.65→ c7_gone →2.4→ c8_back →9.6→ c9_witnessthat →5.3→ c10_mane. All
gaps ≥ 0.9 (minimum exactly 0.90: c3_med → c3_notwigs). Kicker lane: c2k_house →
c3k_who → c7k_mud → c10k_day, never overlapping within the lane. Every t1 is
inside its shot (c4_tickets 42.9 < 43; c6_shiny 60.95 < 61; slate ends 101.9 <
102, end-inside-the-film margin, floz/pirates precedent).

---

## §5 CAST ROLES

Casting agent picks exact sprite ids in parallel — this section fixes ROLE NAMES,
repaint intent, hair/bald lore flags, and STAGED STATES only. Lore flags obey the
house rule: hairy Remys are heroes, bald Remys are the Cabald; hero power = hair,
so every shaved hero reads as sacrifice, every shaved Cabald as cult.

- **mad_remy** (hero, RED hair). Hair states, staged: `MANE_FULL` (S1 only) →
  `STUBBLE` (E7 through E48; 1px red shadow on the scalp so he never reads
  hairless-grey) → `REGROW_T1..T4` (E49 ladder: front / crown / sides / mane) →
  `MANE_FULL_RESTORED` (post 97.12) → `SINGLE_HAIR` (E52; one 3px tuft at
  crown). MUZZLE prop on E9–E24. Repaint: native hero face, no paint. Stunts:
  hood-splay (S4, limbs out, chained), one-arm chain swing (E21), pluck recoil +
  finger-pop (E53), walk-out silhouette (E51).
- **flowiosa** (hero repaint). Shaved by CHOICE (sacrifice/camouflage — faint
  hair-shadow, like mad_remy's stubble but intentional); BLACK GREASE EYE-PAINT
  forehead bar; MECH ARM (left, procedural prop) socketed at the shoulder;
  oil-black leather coat repaint. Stunts: cross-cab lunge (E44 — mech-arm reach
  1.4× body), two-hand valve slam (E47), crowd-surf pose arm raised (E50), drive
  poses S4–S10.
- **immortan_flow** (Cabald, BALD). GREAT WIG is a SEPARATE procedural prop,
  NEVER baked onto the head (floz witch-wig lesson) — states `WIG_ON` /
  `WIG_RIPPING` (frozen mid-rip in the E44 freeze) / `WIG_GONE` (scalp gleam,
  rim-lit). IMMORTAN MASK prop (bellows respirator, §6) with two-state inhale
  squash synced to the 0.25 Hz score LFO. Chrome grin repaint. He never leaves
  the podium car — not even for the mop.
- **nux** (Cabald war boy). WHITE PAINT duotone (ghoul-pattern repaint), chest
  SCARIFICATION etching, goggles up/down. States: `MOUTH_SILVER` (E18, E26 —
  clean one-step duotone swap on the lower face, never an overlay),
  `SMILE` (post E27), `PAINT_WIPE` (hand stripe after E27). Stunts: face-plant
  tumble (E23), tanker-top arms-wide (E26), terrace seed plant (S10).
- **wife_a / wife_b / wife_c** (hero Remys, shaved by choice). Ivory/gold vault
  wraps, faint hair-shadow. wife_b does the seed press (E25 — the hands are the
  close-up); wife_a drives shotgun with the mech-arm cradle; wife_c runs the
  top hatches. Stunts: hatch-pile (E14), tanker boing swats (E43), the polite
  applaud (E22), crowd-surf support (E50).
- **doof_warrior** (Cabald). RED BLINDFOLD repaint; FLAME GUITAR prop; bungee
  tether atop the speaker stack. Never speaks, never stops playing — until E46,
  when he falters (one note).
- **vuvalini_a / vuvalini_b** (elderly hero Remys). GREY BRAIDS KEPT — the tell:
  Green Place people never shaved. Bandanas, goggles up; one cork-plugged
  shotgun, one knitting-needle shotgun; they share one tiny motorbike. Stunts:
  mud-blind rise (E34), the three-point-turn gag (E39), sidecar knitting (E43).
- **warboy_horde ×8** (far sprites, Cabald). White duotone, goggles.
  `GOGGLES_UP` waver beat (E46) — the chest-tap witness wave ripples
  left-to-right, 0.12 s stagger (house KNEEL_STAGGER pattern).
- **polecat_a / polecat_b** (Cabald boarders). Mud-paint masks, bendy poles
  (prop, §6). Gags assigned: tanker boing (E43), sidecar hat (E43).
- **crowd** (far, terraces): grey rags, cups and scalps up (S3), gilded and
  sprouting (S10).

---

## §6 PROCEDURAL PROPS + SETS

Bake static art in `prepare()`; animate from time. All read at 1920×1080 with
2.4–3.2× sprite scale.

- **WAR RIG** — side-view: angular armored cab + long ribbed tanker glowing GOLD
  at the panel seams (it is full of the FLOW), spike brush-guard, chain skirts.
  Baked ~470 px wide; at 3.0× it is the film's biggest silhouette (~1400 px) and
  must fit the band with margin at fullsend.
- **INTERCEPTOR** — Remy's black V8 coupe, supercharger through the hood, one RED
  pinstripe (the hero accent). 2.8×. S1 only; its stripped shell reappears as a
  war-boy trophy rack in S2's background (set dressing gag).
- **CITADEL** — three stacked rock towers, valve pipes with handwheels, terrace
  crowd rows baked as far texture. Tallest tower crops at the band top (111) —
  vertical scale must be checked against `SAFE.bandY` before blocking.
- **IMMORTAN MASK** — parody respirator: two-lobed horse-hair bellows that squash
  on inhale at 0.25 Hz (sync to score DOOM LFO), chrome teeth grille. Reads at
  2.6× from its two moving lobes alone.
- **GREAT WIG** — white wave-mass, 3 lobes, separate prop per §5. Rip physics:
  analytic ballistic from release event `{g, x, y, vx, vy, seed}` — tumble rate
  constant, wind drift accelerates it off-frame right, scale eases 1.0 → 0.8 into
  the horizon. No per-frame integration; the E44 freeze holds it mid-air by
  pinning world time.
- **FLAME GUITAR + SPEAKER WALL** — double-neck with a pilot flame at the head;
  flame licks are analytic flame events spawned on doof cues. Speaker wall: 12
  cabinet stack with comb-and-scalp totems; bungee sway = sine of world time,
  amplitude from vehicle bob.
- **POLE-CATS' BENDY POLES** — 3-segment flex, curvature ∝ angular velocity,
  analytic from vault arcs; boing squash 15% on tanker contact.
- **SEED POUCH + SEEDS** — leather pouch, gold seam; seeds are 3 px gold ovals.
  ONE hero seed (E25 press → Nux's fist → S10 terrace plant → first sprout). The
  seed is a tracked prop across three shots; do not respawn it.
- **CLIPPERS** — oversized manual clippers with comb emblem; SLAM scale-pop
  1.15× at E7, spark ring of red strands frozen mid-air in the stop.
- **MUZZLE** — iron grill mask, tiny comb rivet; springs away with a sproing at
  E24 (analytic arc). Anchored to mad_remy's head anchor at all times (house
  rule: props derive from actor paths).
- **MECH ARM** — Flowiosa's left arm: 3 segments, socket shoulder, claw; reach
  1.4× body; specular seam so it reads as machine against the leather coat.
- **DUST PLUMES / SANDSTORM** — analytic dust events at wheel contacts
  `{g, x, y, seed}` (§7); the storm is a blue mass with 2–3 inner lightning bolts
  on hash-spaced gaps — IN-SCENE light only, never a screen flash (§2 night cap).
- **MUD FLATS + DEAD TREES** — cracked bald mud with comb-rake marks, 5 dead
  trees, the half-buried "GREEN PLACE →" sign. The one man-made color in S7.
- **CROW FISHERS (optional)** — 2–3 bald crows (molted, no tail feathers) on the
  dead trees; they lift at E35. Cut first if S7 runs long.

---

## §7 CHASE PHYSICS + MOTION PLAN

**Speed profiles (piecewise, world-relative px/s at depth 1.0):**
- WAR RIG: S4 g0–6.8 eased 0 → 620; g7.2 (post-stop resume) 640 held through S5;
  S6 storm 300 (storm-relative drift); S9 head-on closing speed 1180 (both
  convoys in); S10 gate charge 400 → 0 at the valve.
- NUX'S CAR (S4, until E20): rig-relative x = 340 + 90·sin(0.9g + φ_id), φ from
  hash(id) — rubber-band pursuit, never perfectly synced.
- PODIUM CAR (S9): closes from x_rel 1400 → 260 eased 0.85, arriving "alongside"
  exactly at g6.0.
- Precompute each vehicle's integrated distance `s(g)` from its piecewise profile
  into an immutable lookup in `prepare()`; draw interpolated positions from that
  table (house rule for varying speed). NO per-frame integration, ever.

**Wheel-loop illusion:** wheels hold screen-x with the world scrolling; rotation
θ(g) = s(g)/r, r = 26 px at 3.0×; 8 spokes, phase = θ mod (2π/8). During the S6
eye the world nearly stops but the wheels keep dutifully spinning (the gag) —
drive rotation from s(g) with a minimum floor there, from the table, not from
state.

**Parallax layers:** sky 0.05 (heat shimmer only), far dunes 0.18, mid dunes
0.45, ground 1.0, foreground scrub 1.55 — each layer offset = s(g)·factor mod
tile width; verify tile seams land off-frame at stills (stale-buffer gotcha,
§10). S6 adds a horizontal dust-streak layer at 1.2×.

**Dust/trails:** immutable events spawned every 0.22 s of world time per ground
contact: `{g, x, y, seed}`; per frame compute age, skip outside 0.9 s lifetime,
position analytically, fade by age; vx = −0.5·layer speed + hash jitter. During
hit-stop freezes world time is pinned — dust freezes too; only shake and spark
rings run on REAL time (`sl`).

**Camera grammar:** whip-pan blur (6 frames) on the S3→S4 cut; snap zoom 1.0 →
1.12 over 4 frames at the E45 resume (the bald reveal); push-ins 2.5% across the
E25 seed press and E38 plan; hit-stop shake 3 px at 60 Hz driven by REAL stop
time `sl`, never world time. Letterbox 0.8: block all vehicle rooftops, the doof
stack, and the wig's tumble apex inside band 111..969.

**Hit-stops** (declared in §3, restated for the choreography builder): E7
`{g:4.2, d:0.22}` S2 · E19 `{g:6.8, d:0.14}` S4 · E44 `{g:7.0, d:0.30}` S9 ·
E47 `{g:2.0, d:0.12}` S10. Everything else is continuous time. An impact
scheduled AT a stop's g lands at the freeze START.

**Collision registry** (event names match §3 EVs exactly):
`CONTACT.netBag` (E4) · `CONTACT.clippers` (E7) · `COLLIDE.ramDomino` (E19 —
pursuer tumbles into pursuer into pursuer; restitution 0.35, pinwheel spin 2.2
rev/s decaying 0.8/s) · `CONTACT.lasso` (E20 — chain sag→taut over 6 frames) ·
`CONTACT.swingCatch` (E21→E22 — one ballistic arc, car hood to rig window, 1.1 s
aperture, glass on landing) · `CONTACT.tumbleNux` (E23) · `CONTACT.seedPress`
(E25) · `CONTACT.poleSwat` (E43 group — squash 15%) · `CONTACT.poleCatch`
(S9 g4.8) · `CONTACT.wigRip` (E44) · `CONTACT.valveSlam` (E47) ·
`CONTACT.crowdSurf` (E50) · `CONTACT.pluck` (E53).
All contact positions derive from the owner actors' paths at event times; props
(muzzle, chain, mech arm, seed, wig) anchor to their owner's transform each frame
from time — no stored positions, no teleporting through geometry.

---

## §8 SCORE PLAN

Score sections are per-shot, each t0 a downbeat, NO film-wide grid (each section
carries its own grid, house precedent). **Rule: every cue imports from the
timeline (CUES = clock-derived `CLOCK.abs(g)` values); score.js adds no
hand-added delays.** In the four stopped shots every cue resolves through the
shot's clock; the four pins are the ONLY cues allowed to start inside
[freeze−0.5, freeze+0.4].

**House motifs (original; MIDI offsets from roots; quote nothing):**
- **FLOW THEME** (the hope motif): `FLOW_ROOT 62 (D4)`, `FLOW = [0, 4, 7, 14]` —
  rise and hang on the 9th; the 14 NEVER resolves until told to.
  `FLOW_FULL = [0, 4, 7, 12]` is the resolution form (E38, and the regrow).
- **SHEAR** (the wound): `SHEAR_ROOT 55 (G3)`, `SHEAR = [0, −1, −2, −4]` — fast
  descending shred; the regrow answers it inverted.
- **IMMORTAN DOOM** (breathing brass): `DOOM_ROOT 38 (D2)`, cluster `[0, 3, 7]`
  with a gain LFO at 0.25 Hz — the mask bellows' breath rate; picture and score
  breathe together.
- **DOOF CHUG** (diegetic engine): distorted dropped-E guitar ostinato, 8th-note
  chug + flame-lick fills. LEAKS into the score during war-party shots (S4, S9):
  the score IS the doof there. It stops DEAD at E25 and falters/detunes from E45.
- **WITNESS STING**: silver high shimmer (`WITNESS_ROOT 86`) + one soft choir
  "ah". Used twice: E26 (Nux's faith) and E45 (the army's faith dying).
- **REGROW LADDER** (SHEAR inverted): four CLOCK-PINNED notes `62 / 64 / 66 / 69`
  at abs 95.12 / 95.62 / 96.12 / 96.62, resolving `74 (D5)` at abs 97.12 — grid
  notes NEVER, clock pins always (floz click-chain pattern).

| Shot | BPM | Beats/bar | Key | Feel + cues |
|---|---|---|---|---|
| S1 wasteland 0–8.5 | 84 | 4 | D minor | Lone drone (osc+noise, didgeridoo-ish) + heat whistle; FLOW THEME stated half-speed, unresolved (hope is scarce). Cues: wasteland 0.0 · crest 3.0 (far war drums enter). |
| S2 shear 8.5–18 | 96 | 4 | D minor | Taut heartbeat kick + scissor-snap percussion; SHEAR motif under E8; clippers buzz PIN at E7 = 12.70 (stops WITH picture). Cues: chair 9.00 · clippers 12.70 (pin) · bloodbag 16.52. |
| S3 citadel 18–30 | 108 | 4 | D harm. minor → F major | IMMORTAN DOOM enters at E11 (19.80); cult choir under E12; the vault (23.00) pivots to music-box FLOW THEME in MAJOR — the wives carry the hope motif, first full statement; v8-roar percussion from E14. Cues: spray 19.80 · vault 23.00 · roar 26.20. |
| S4 chase 30–43 | 140 | 4 | E minor | THE DOOF CHUG: diegetic, leaking, the score IS the doof; flame licks on E17; silver-spray sfx E18; ram PIN at E19 = 36.80. Cues: doof 31.40 · ram 36.80 (pin) · swing 40.34 · glass with E22 41.54. |
| S5 defect 43–52.5 | 140 | 4 | E minor (halts) | Chug continues 3.2 s then TRUE SILENCE from E25 46.20 for ~1.4 s — the house silence joke, here the conversion; WITNESS STING at E26 48.20; music-box FLOW THEME solo from E27 50.00. Cues: seed 46.20 (hard out) · witness 48.20 · defect 50.00. |
| S6 storm 52.5–61 | 60 | 4 | B minor | Deep blue pad, wind the only percussion; IMMORTAN DOOM inverted — the breathing slows to sleep, filtered; FLOW THEME minor fragment at E32; keep short-term loudness a step down (the quiet IS the palette). Cues: stormwall 54.10 · calm 57.10 · tale 57.80. |
| S7 greenplace 61–71.5 | 66 | 3 | D minor | Grey lament, solo cello; the floor drops to sub-only at E35 67.00; despair cello FLOW THEME minor at E36 69.50. Cues: mud 62.30 · gone 67.00 · despair 69.50. |
| S8 turn 71.5–79 | 96 | 4 | D major | Heartbeat only into E38; FLOW THEME FIRST FULL MAJOR ENSEMBLE at E38 72.80 (the decision resolves the hope-note one beat early); reverse riser under the U-turn E39 74.60; tempo tightens toward the return run at E40 76.60. |
| S9 return 79–91 | 140 | 4 | E minor | DOOF CHUG reprise with doppler — the war party's own music now turns on them; wig-rip PIN at E44 86.00; E45 87.10 = WITNESS STING + the chug detunes a quarter-tone and drops voices one per 0.5 s through E46 88.70; ends unresolved into the cut. Cues: converge 80.00 · wigrip 86.00 (pin) · bald 87.10 · waver 88.70. |
| S10 flow 91–102 | 108 | 4 | D major | Harp gliss at E48 94.12; REGROW LADDER clock pins 95.12/95.62/96.12/96.62 resolving 97.12 (SHEAR inverted — full circle); crowd choir at E50 97.52; strips to solo celesta FLOW THEME at E51 98.32; comic pluck twang at E53 99.42 (pirates pluck precedent); one soft button at E55 100.32, then the slate rides the tail. Cues: valve 93.00 (pin) · rain 94.12 · regrow×4 + resolve · walk 98.32 · pluck 99.42 · card 100.32. |

---

## §9 SELF-CHECK EXPECTATIONS

Numeric invariants the timeline self-check must assert (floz's checked-script
pattern, adapted):

1. **Shots tile [0, 102) exactly.** DUR = 102; cuts 0 / 8.5 / 18 / 30 / 43 /
   52.5 / 61 / 71.5 / 79 / 91 / 102; every t0 = previous t1; 2 decimals max.
2. **EV tables:** finite, non-negative, non-decreasing, strictly inside their
   shot (except the trailing `cut`/`end` markers) in WORLD time — S2 world length
   9.28, S4 12.86, S9 11.70, S10 10.88; other shots' lengths are their film
   lengths.
3. **Clocks/stops:** S1/S3/S5/S6/S7/S8 `STOPS = []` and `abs(g) = t0 + g` exact;
   S2 `[{g:4.2, d:0.22}]`, S4 `[{g:6.8, d:0.14}]`, S9 `[{g:7.0, d:0.30}]`, S10
   `[{g:2.0, d:0.12}]`, all `d` in [0.12, 0.30]; events at a stop's g land at the
   freeze START; freeze windows abs [12.70,12.92], [36.80,36.94], [86.00,86.90],
   [93.00,93.12].
4. **MASTER = clock-derived, never hand-added:** every MASTER value is
   `shot.t0 + filmT(EV)`; assert against the §3 E-table exactly (all 55 values,
   including the stop-shifted ★ set).
5. **Captions:** 21 rows; every window inside its shot and inside the film; every
   y ≤ 915 (SAFE.captionYMax; letterbox band 111..969); visible hold
   `(t1−out)−(t0+in) ≥ 3.0` for 17 rows, or declared minHold for the 4 short
   rows (c10k_day 1.70, e1_card 1.0, e1_credit 1.0, e2_tease 1.0); main lane
   strictly sequential with gaps ≥ 0.9 (minimum exactly 0.90: c3_med →
   c3_notwigs); kicker lane single-use per shot, never overlapping itself;
   mandated lines verbatim (§4's 13, including the two `\n` pills).
6. **REGROW_LADDER:** 4 ticks at abs 95.12 / 95.62 / 96.12 / 96.62, tick length
   0.5, resolve abs 97.12; ticks derived from FLOW clock (`filmT`), never raw
   t0+g.
7. **Flashes:** 6 rows max, peaks ≤ 0.24, decays ≤ 0.2, `flashK(0) = 0`;
   ZERO rows inside S6 (night rule — any future S6 flash caps at 0.12).
8. **Determinism:** no `Math.random`, no `Date`; seeded `hash`/`rng` only (wheel
   phases, dust jitter, horde variation all seeded in `prepare()`).
9. **Sections/cues:** 10 score sections, one per shot, tiling the film; every
   CUE equals some clock-derived t0+EV in its shot (pins included); no
   film-wide grid asserted.
10. **Lanes:** title/sub/kicker/main/tease occupancy as §4 (title: t1_title,
    e1_card; sub: t2_sub, e1_credit; kicker: 4 rows; tease: e2_tease; everything
    else main).

---

## §10 PRODUCTION NOTES

**Retime allowance (±0.5 s per shot, DUR stays 102.0 exactly).** Donor shots:
S4 `chase` (the swing→aboard window compresses) and S9 `return` (converge→poles
compresses). Acceptor shots: S10 `flow` (regrow ladder + walk-out + slate want
room) and S5 `defect` (the silence wants to breathe). Any retime must re-derive
stop-shifted absolutes through the clocks — never hand-shift the ★ rows. The
caption windows in §4 already carry ~0.2–0.5 s of hold headroom except the three
exactly-3.00 rows in S3 (c3_med / c3_notwigs) and S1 (c1_hero); if S3 or S1 gets
retimed −0.5, extend those outs first (floz's out-extension pattern, documented
in its header).

**Trim order if a shot runs long:** (1) S10 crowdSprout terrace detail, (2) the
S9 sidecar knitting gag beat, (3) the S10 mop demotion gag tail, (4) the S6
tumblewig gag. **Never trim:** the E25 silence, any stop duration, the E49
ladder, the E52–E54 single-hair beat, the slate.

**One money shot per shot.** S1 the capture slam · S2 the CLIPPERS SLAM · S3 the
spray glory · S4 the ram domino · S5 the seed press · S6 the storm-wall reveal ·
S7 the mud reveal · S8 the U-turn · S9 THE WIG RIP · S10 THE REGROW. A shot may
not spend a second bloom moment: the film's only saturated-red WIDE is the regrow
(floz's "never spend it twice" discipline); the flame guitar is the only other
licensed red-orange, always diegetic.

**Known house gotchas that bite THIS film** (from the required reading):
- **Stale buffers from shake overscan** — the chase carries constant camera
  shake; paint outside the stage rect BEFORE applying shake every frame, or the
  draft strips will show drifting borders (the template's fixed scar).
- **Letterbox band** — 0.8 → visible rows 111..969, captions center ≤ 915. Clamp
  the rig roofline, doof speaker-stack tops, and the wig's tumble apex to the
  band before blocking; never use core y 930/986 caption defaults bare.
- **No Math.random** — wheel spoke phase, dust jitter, horde variation, crow
  placement all from `hash(id)`/`rng(seed)` baked in `prepare()`. Pure functions
  of time everywhere; no state carried between frames.
- **Props derive from actor paths** — muzzle, chain, mech arm, seed, and the
  great wig all compute their position from their owner's transform at time t;
  no stored offsets, no prop teleporting through geometry.
- **Hit-stop discipline** — during a freeze, world time is pinned: dust,
  wheels, and flames freeze with the picture; only shake, spark rings, and
  caption fades run on real stop time. Score pins land AT the freeze start; no
  cue starts inside [freeze−0.5, freeze+0.4].
- **Caption-vs-actor collision** — muzzled Remy sits low on Nux's hood under
  c4_day (nominal y878); if the encoded stills show overlap, lift to y826
  (floz c9_melting precedent, same lane, still ≤ 915).
- **Two-line pill measuring** — c4_day and c8_back are the longest mandated
  strings; measure at size 38 with `measureText` before locking windows, wrap
  only at the mandated `\n`.
- **Duotone swaps** — Nux's silver mouth and the waver's goggle flip are clean
  ghoul-pattern repaint lerps (one transform per actor family, driven by tables),
  never overlays.
- **The wig is never baked onto the head** — it must rip, freeze mid-air, and
  tumble; bake it as its own multi-lobe prop from day one.
