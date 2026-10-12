# REMEMBER THE FLOW — a Remy Boys documentary

**Slug** `remember-the-flow` · **Duration 78 s** (26 bars at 80 BPM, bar = 3 s; every shot boundary on a
bar or half-bar) · **1920×1080 @ 60 fps final** · No letterbox (full 16:9 — this is TV, not cinema).

**Format:** prestige Ken Burns–style history-channel war documentary about the war between the Flow
(hairy heroes) and the Cabald (bald villains). Told entirely "after the fact": archival photographs,
propaganda, an animated war map, "archival reenactment" footage, and a present-day veteran interview.

## The two visual registers

- **PRESENT (smooth native 1080p):** the veteran interview set, title/chapter cards, memorial, end
  cards. Cool charcoal room, one warm amber key light, deep vignette. Typography: Cormorant Garamond
  (`F.serif`) for cards and narration; JetBrains Mono (`F.mono`) for lower-thirds/credits. Restrained:
  thin rules, tracked small caps, generous black space. fx: vignette ~0.4, grain ~0.01, bloom ≤ 0.08.
- **ARCHIVAL (960×540 pixel stage, nearest 2×):** sepia/faded-duotone "film": Ken Burns pans over the
  600×600 originals in archival mounts, the propaganda poster, the war map, and sprite "reenactment"
  footage (marching squads, the clash). Film damage: flicker (±brightness), gate weave (≤2 px slow
  drift), dust specks, 1–2 scratches, a LITERAL single dark hair waving in the gate corner (the film's
  signature meta-joke — it appears from Chapter II on and is gone after the clash), sprocket flutter at
  every cut. Archival motion is TIME-STEPPED at 12 fps (sample world time at floor(t*12)/12) for
  authentic jerkiness. Sepia grade + heavier grain (0.02) + vignette 0.5 in-register via the low canvas.

## Shot table (t0/t1 in seconds; all on the 1.5 s half-bar grid)

| # | shot | t0–t1 | register | content |
|---|------|-------|----------|---------|
| 1 | coldopen | 0–7.5 | PRESENT | Dark interview room. Slow push-in on the VETERAN (#42, aged styling: dimmer palette, same rig). Lower-third fades in at 1.8. He speaks his first bite (caption). Cut out on his last word + projector flutter. |
| 2 | title | 7.5–12 | PRESENT | Film-leader flicker (a 2…1 countdown ghost) then main title: "REMEMBER THE FLOW", sub "a Remy Boys documentary". Thin rule, amber on charcoal. Narration V.O. card 1. |
| 3 | ch1card | 12–15 | PRESENT | Chapter card: "CHAPTER I — THE AGE OF FLOW". Paper-grain background, centered serif. |
| 4 | ch1a | 15–19.5 | ARCHIVAL | Sepia archival portrait GA1 in a museum mount (deckled paper edge, photo corner tabs). Slow Ken Burns push (zoom 1.06→1.18, drift). Archival credit lower-left: "PLATE 0142 · THE LONG SUMMER". Narration v1. |
| 5 | ch1b | 19.5–24 | ARCHIVAL | Group photo: GA2 + GA3 + hero as a "regiment photo" (three framed portraits in one wide, sepia). Slower lateral pan. Caption "THE FLOW GENERATION, c. LONG SUMMER". Narration v1b. |
| 6 | ch2card | 24–27 | PRESENT | "CHAPTER II — THE RAZOR COMES". Slightly colder grade. Music turns minor. |
| 7 | ch2a | 27–31.5 | ARCHIVAL | CABALD propaganda poster: high-contrast duotone of BOSS original, slogan "GLOSS IS DESTINY", ministry stamp "CABALD MINISTRY OF SHINE". Camera tilts up the poster. Narration v2. |
| 8 | ch2b | 31.5–39 | ARCHIVAL | THE WAR MAP. Parchment, coastlines, named places (Hairline, Tonsura Gap, Main Parting, St. Follicle, The South Coast). Dark "razor wash" territory spreads from the south; three animated arrows push north; tiny head icons flee along roads. Front line throbs. Narration v2b. Place names revealed by labels. |
| 9 | ch2c | 39–43.5 | ARCHIVAL | Occupation reenactment: CABALD SQUAD (4) marches through a small hairy village street; two villagers (hat brims low) stand still; a "SHINE ZONE" notice nailed to a post. 12 fps stepping. Narration v3. |
| 10 | ch3card | 43.5–46.5 | PRESENT | "CHAPTER III — THE REGROWTH". |
| 11 | ch3a | 46.5–51 | ARCHIVAL | Muster: HERO draws the greatsword (anticipation → raise → hold), then leads a column of 5 hairy sprites marching toward camera along a ridge, banner of flowing hair carried behind. Fife & drum enters. |
| 12 | ch3b | 51–55.5 | ARCHIVAL | The clash: HERO vs SQUAD. Charge, one parry per attacker (2 contacts), hit-stop freeze 0.22 s on the final clash + white flash frame, squad topples in sequence; hero plants sword; HAIR RETURNS banner drop. Archival damage suddenly CLEAN here for 2 s (the film "restores") — then the gate-hair flutters away. |
| 13 | veteran | 55.5–63 | PRESENT | Interview wide → slow push to medium. Second bite (caption), then a held quiet beat — he almost smiles. Lower-third re-shows briefly at 56. |
| 14 | memorial | 63–70.5 | PRESENT | Dawn light wall: a vast grid of tiny head icons (from heads atlas) — the memorial wall. Camera pushes slowly; at 67.2 ONE head (the hero's) lights warm amber with a soft pulse. Wreath at the base. Bugle call. Narration v5. |
| 15 | endcard | 70.5–74 | PRESENT | "IN MEMORY OF EVERY STRAND LOST" / small: "4,250 HEADS OF HAIR · THE OTHER 240 ARE DOING FINE". |
| 16 | brand | 74–78 | PRESENT | "THE FLOW REMEMBERS." then studio mark "REMY BOYS DOCUMENTARIES · EST. THE LONG SUMMER". Fade to black 77.2→78. |

## Narration copy (final; speakers: VETERAN in quotes, NARRATOR (V.O.) plain)

- d1 (coldopen, 1.6–6.9): "You could hear the razors at night. / We were young. We were flowing."
- v0 (title, 8.4–11.6): "Every spring, the Flow returns. / But flow is never free."
- v1 (ch1a, 15.8–19.2): "Before the Cabald came up from the south, / hair grew long and unafraid."
- v1b (ch1b, 20.2–23.6): "Nobody measured it back then. / That was the point."
- v2 (ch2a, 27.6–31.1): "They promised zero maintenance. / They called it the Gloss."
- v2b (map, 32.2–38.4): "In three seasons the razor took the coast, / the Gap, and half of Main Parting."
- v3 (occupation, 39.9–43.1): "They didn't hate hair. / They hated what it meant."
- v4 (ch3a, 47.6–50.6): "What the razors never understood: / you cannot cut what keeps growing back."
- v4b (clash, 52.4–55.1): "Main Parting held. / The rest is combing."
- d2 (veteran, 56.4–61.8): "People ask if I miss the war. / I miss my hairline the way it was."
- v5 (memorial, 64.4–69.4): "The wall honours 4,250 heads of hair. / The other 240 are doing fine."
- End cards are drawn type (not captions), per the table above.

## Cast (slot from CASTING.md)

HERO/VETERAN 42 (fallback 109) · GA1/GA2/GA3 golden-age portraits · BOSS poster Cabald ·
SQUAD 4 Cabald grunts · 2 villagers (reuse GA cast as hat-brim villagers or pick from CASTING).

## Score (80 BPM · bar = 3 s · 26 bars · original music only)

- 0–12: sparse piano dyads + low string drone; projector/flutter texture at 7.5.
- 12–24 (Ch I): warm piano motif (the FLOW motif: rises a sixth, settles), soft major pad.
- 24–39 (Ch II): modal shift to minor; low strings + slow taiko pulse from 31.5; riser 37–39.
- 39–46.5: sparse/cold — wind, distant march snare fading in at 45.
- 46.5–55.5 (Ch III): full fife (pulse-wave lead) + snare march; clash impacts + hit-stop thump at
  the freeze; victory hits when the squad topples.
- 55.5–63: solo piano, intimate, slight rubato feel; room tone.
- 63–70.5: bugle call (harmonic-series melody, original), choir pad under; soft bell at 67.2.
- 70.5–78: FLOW motif restated on piano + strings, resolve; final low chord + one projector click.

SFX: sprocket flutter on archival cuts, camera shutter on plate holds, march feet, sword parries,
topple thuds, wind. All original synthesis. No copyrighted melodies.

## Quality bars (from SKILL.md/lessons.md — binding)

- Frame is a pure function of time; no Math.random/Date.now/cumulative state; aux canvases fully
  cleared each frame; stepped archival time derives from floor(), never stored.
- Sprites via `../remy-bros/art.js` rig (drawRemy with lift/stride/lean; feet anchors). Originals
  always framed (mounts/clip), never pasted as opaque squares.
- Captions: declarative, ≥ 3 s full hold after in/out (copy above is timed for that), numeric in/out,
  anim ∈ rise/fade/line/type/cut. Custom title/chapter cards drawn in-canvas and reviewed by stills.
- Map arrows/territory washes are analytic functions of stepped time; head-icon refugees follow road
  paths, not random walks.
- fx.aber only as a brief spike at the clash if used (UV units: ≤ 0.004).

## TIMING NOTES (timeline.js — binding numbers for picture/captions/score)

All times live in `timeline.js` (EV is the single source of truth; captions reference it). Deviations
from the tables above, with reasons:

- **brand stays at 74 although it is off the half-bar grid** (grid neighbours 73.5 / 75). The shot
  table pins it and no score event lands on 74 (70.5–78 is one continuous restatement phrase), so it
  remains a picture-only cut. Every other boundary is exactly on the 1.5 s grid; total is 78.000.
- **Narration windows widened, copy untouched** — as first timed, the short lines cannot reach the
  ≥3 s full-visible hold after the 0.35 s caption fades (quality bar):
  v0 8.4–11.6 → **8.05–11.85** · v1 15.8–19.2 → **15.6–19.4** · v1b 20.2–23.6 → **19.9–23.8** ·
  v2 27.6–31.1 → **27.4–31.3** · v3 39.9–43.1 → **39.6–43.4** · v4 47.6–50.6 → **47.0–50.8** ·
  v4b 52.4–55.1 → **51.5–55.3**. d1, v2b, d2, v5 keep the windows above (holds 4.6 / 5.5 / 4.7 / 4.3 s).
- **Plate credits added** for ch2a/ch2b/ch2c/ch3a/ch3b (only ch1a's was specified) — Ken Burns
  convention; strings in `COPY.plateCredits`, windows in `EV.credit*`. The ch1b caption
  "THE FLOW GENERATION, c. LONG SUMMER" is a credit-style caption at 19.85–23.8.
- **damage-clean is 53.6–55.5** (1.9 s — capped at the shot end; the table says "2 s").
- Micro-timing refinements inside the budgets above (not changes): map labels stagger 31.9–32.5,
  washes 32.5→36.5, arrows reach by 37.2, refugees complete by 38.2, map hold to 39; clash topples
  53.97 / 54.17 / 54.37 / 54.57 (= `CLASH_CLOCK.filmT`, hit-stop 53.60 + 0.22), sword plant 55.02,
  banner drop 55.17; score micro-cues windIn 39, taikoIn 31.5, snareIn 45, fifeIn 46.5,
  finalChord 76.5, projectorClick 77.0.

