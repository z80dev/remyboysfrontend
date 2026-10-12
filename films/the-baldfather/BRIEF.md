# THE BALDFATHER — production brief (shared truth)

Format: 90 s cinematic mafia-epic parody, 1920×1080 @ 60 fps, **full-res 2D filmkit**
(nearest-upscaled sprites 2.5–4×, procedural 1940s sets, no 3D). Folder: `films/the-baldfather/`.
Style refs in repo: `films/goldflow/` (architecture), `films/fade-to-bald/` (grade/light),
`films/hairpera/` (ceremony/light shafts). Original story + ORIGINAL SCORE — no copyrighted
melodies (nothing from Nino Rota; our waltz is our own).

## Logline
New Flow City, 1947. The bald CABALD family runs the hair rackets — they don't grow hair,
they take it. DON BALDONE, the Baldfather, strokes a stolen red wig like a cat and grants
"justice" from a dark study. When a hairy rival wakes to a wig on his pillow and his own
head razored, the FLOW family answers: hero 42 is anointed DON OF THE FLOW in the chapel
while, on each organ stab, the Cabald are de-wigged across the city. In the final beat 42
sits in the Don's chair — stroking the same wig. Power is a haircut.

## Shot map (90 s, waltz grid 3/4 @ 90 BPM → bar = 2 s; all numbers film seconds)
- **S1 THE STUDY 0–26** — dark study, venetian-blind slat light, desk, rotary phone,
  candle lamp. Muffled wedding outside (warm window). BONASERA (hairy supplicant) enters,
  bows, kisses the signet ring. Beats: entrance ~1.5; "Someone razored my son's flow."
  ~7 (caption); Don rises, shadow over desk ~10; "Why did you go to the barbers?" ~14
  (caption, the scandal); "Some day — I will ask a service of you." ~19 (caption, ring
  kiss ~23). TITLE "THE BALDFATHER" fades over the study ~4–10 (Cormorant serif, letterspaced,
  restrained). Iris/wipe out ~25.5.
- **S2 THE RAZOR'S VISIT 26–48** — night bedroom, moon window. VITO (huge flow) asleep.
  Three fedora silhouettes tiptoe 28–36 (pizzicato creep, comedic care: one carries the
  scissors case like a doctor's bag). Snip-snick ~36–38 (light flashes of steel, NO gore).
  They vanish; VITO stirs ~40; slow sheet pull 40–42.5 — reveal: his own harvested FLOW
  laid across the pillow beside him (the horse-head beat). He touches his head — BALD.
  Mirror jump-cut ~44 (hit-stop 0.14 s) — scream frame, whip to black ~46.
- **S3 THE CROWNING WAR 48–80** — Chapel of the Flow: stained-glass hair-motif window,
  god rays, pews. 42 kneels; PRIEST anoints him DON OF THE FLOW (~50–56, organ + bells).
  Baptism-montage grammar from ~56: on each organ stab, intercut a Cabald de-wigging —
  (a) barbershop rug-yank ~58, (b) consiglieri mid-sentence toupee snatch ~61, (c) the
  Don's own prize wig lifted from his study ~64 while he's at the wedding cake? no: while
  he naps; (d) bank-vault of wigs discovered ~67 — and 42 answers the priest each time:
  "I DO." (~58.5, ~61.5, ~64.5, ~67.5). The stabs accelerate: city-wide lights-out of
  wigs ~70–76 (quick vignettes, 2 s each). Bells peal ~76.
- **S4 THE NEW DON 80–90** — the study again, slat light. 42 in the Don's chair. He picks
  up the red wig, strokes it once — the same gesture (mirror of S1). Door closes on
  BONASERA outside ~85 (door thud + single bell). End title card ~85.5–90:
  THE BALDFATHER + tagline caption "KEEP YOUR FRIENDS CLOSE — AND YOUR HAIR CLOSER."

## Cast (LOCKED — contact-sheet + vision verified vs scripts/quest-bald.json)
DON BALDONE = **3807** (bald, black sweater, stern brows). BONASERA = **909** (silver hair,
navy suit+tie). VITO = **37** (biggest flow in catalog, "Gold Flow"). ENFORCERS = **1793,
2061, 129** (bald, dark tops; 129's open smile = the eager goon). PRIEST = **83**.
WEDDING DAUGHTER = **96**. HERO = **42** (Crimson Flow, sword — sword must read as CEREMONIAL,
sheathed/held low, never waved around in this film). The WIG = procedural: long red 3-tress
wig drawn in art.js, the star prop. Sheet: output/_contact/baldfather-principals.png.

## Grammar / palette
1940s amber-sepia grade: study #1a120b base, warm lamp pools, hard slat shadows; S2 moon
blue-grey #0b1018; S3 chapel: deep nave shadow + gold-cyan god rays through dust; S4 study
again but colder. Bloom restrained (≤0.14, threshold 0.9). Sprites nearest-neighbor only.
Captions: Cormorant Garamond, big (≥46 px), cream #f3e9d2, brief & held (≥3 s or reasoned
minHold). All reading text on overlay/captions, not baked into canvas where possible.

## Score (original, bar = 2 s)
A-minor Sicilian waltz, 3/4 @ 90 BPM: mandolin-ish pluck lead (short plucked voice),
string pad, triangle-side. S1 waltz sparse under dialogue; S2 low strings + heartbeat +
pizzicato creep, snip SFX, scream sting; S3 organ + bells with stabs ON the de-wig cuts;
S4 waltz returns darker/solo, door thud, single bell. Intentional end, no abrupt cuts.

## Shared rules (from skill; binding for every crew member)
- Every frame pure in t: no Math.random/Date.now/incremental state; seed via hash/rng.
- Hit-stop freezes WORLD time via the shared makeClock warp; shake/flash stay real time.
- The SAME timeline.js clocks/events feed picture and score. Never hand-guess delays.
- prepare() bakes static art; auxiliary canvases fully repainted each frame.
- Stills→lint→draft→verify loop; QA reads actual PNGs. Report only checks performed.

## File plan
timeline.js (cue sheet: DURATION, T shot map, CAST ids, clocks, event tables, flashes,
pure position/paths) → art.js (procedural study/bedroom/chapel/wig/silhouettes, all baked
in prepare) → film.js (4 shot draw functions + captions + audio block) → score.js (kit cues,
same events). Keep film.js imports identical in shape to goldflow/film.js.
