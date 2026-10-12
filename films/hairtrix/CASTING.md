# THE HAIRTRIX — CASTING (film #36)

Casting agent's verified picks. All ids verified by eye on labelled near-sprite contact sheets
(generated with `.omp/skills/remy-media/scripts/contact.py`, read as PNG) plus original-render
(`--src orig`) and side-head (`--src side`) verification sheets for every lead and agent.
Palettes from `media/quest/art.json` rows (hex). Bald status cross-checked against BOTH
`scripts/quest-bald.json` and `art.json` row[9].

## Cast table

| Role | Id | Palette (art.json) | Why chosen | Repaint caveats |
|---|---|---|---|---|
| **FLOW** (lead) | **2186** | skin #685240, hair #2b2c30 (Midnight Flow, silver-sheen in sprite), shirt #231c1c | Long straight charcoal hair to hip level on both sides; near-sprite torso is a plain black leather jacket — already 90% trench coat. Not a recent lead. Calm face, no hat, no text. | Paint the **orange fur collar** at the shoulders black; small pale **card** at right hip → paint over (or keep as a gag prop). Hair renders mid-gray-silver in the sprite — keep it readable against the black coat with rim light, not recoloring. |
| **MOUSSE-PHEUS** | **2719** | skin #685240, hair #697674 (Silver Flow), shirt #8c8a95 | The biggest genuine HAIR silhouette found: voluminous silver-gray mane draping to the chest, face fully visible, body present. Dignified silver/gray palette. Tiny round shades to be drawn on in art.js (no clean built-in shades asset exists on a big-hair body — verified). | No repaint needed. Tiny light patch on left chest can stay (reads as a pin) or be muted. Draw tiny round shades over the eyes; keep mane silhouette untouched. |
| **TRIMNITY** | **3972** | skin #d0bdb1, hair #002a5d (Cobalt Flow), shirt #231c1a, accent #01295d | Sleek cobalt-blue bob (reads dark under the green grade = "dark hair preferred" satisfied), slim silhouette, black leather jacket — agile hero look. | Optional: paint the small orange collar trim black to match FLOW's coat. Earring stays (character note). Do not touch the cobalt bob. |
| **AGENT SMIRK** (lead Cabald) | **1989** | skin #685240, shirt #050407, accent #6b5541; bald=1, shades=0 | Cleanest bald near-sprite found: plain black tee, neutral frown, fully bald front and side (side-head sheet verified), no props, no slogan, no visor. Ideal black-suit canvas. | Cover the tiny blue label bar on the chest with suit black; paint torso → identical black suit + tie; draw shades + earpiece on the head. Earring present — keep (SMIRK's tell) or paint over for the subway re-skin beat. |
| **THE STYLIST** (oracle cameo) | **4219** | skin #7483bd (blue!), hair #121012, shirt/accent #954c38 | Quirky and instantly memorable: blue-gray skin, small black horns, big grin, midnight hair — jumped out of the sheet as the oracle/stylist character. Holds phone+card at hip = on-brand "stylist consultation" prop (small, not oversized). | Keep horns, grin and jacket as-is (stylist look). If muted, desaturate the rust trim #954c38 toward black. |

## AGENT SWARM (5 clone agents + SMIRK above)

**1989 (SMIRK), 2653, 2487, 2619, 704, 389**

All six verified on bald contact sheets AND the side-head sheet (plain bald profiles, no fringe
issue), and programmatically: present in `scripts/quest-bald.json` with `art.json` row[9]=1,
`shades`=0. Mixed skin tones / tee colors so the pre-repaint crowd shot doesn't look copy-pasted;
after the black-suit repaint they read as identical clones.

| Id | base look (pre-repaint) | paint-over |
|---|---|---|
| 2653 | dark skin, black tee, small gold emblem | cover emblem |
| 2487 | light skin, white tee w/ small cat print | full torso repaint |
| 2619 | light skin, white long-sleeve, earring | full torso repaint |
| 704 | light skin, black tee, small yellow patch | cover patch |
| 389 | tan skin, white tee, small gray print | full torso repaint; note: thin blue fringe band at BACK of head (sanctioned by assets.md — bald from the front) |

## Contact sheets actually inspected (all under `output/_contact/`, repo root)

- `hairtrix-flow-cands.png`, `hairtrix-flow2.png`, `hairtrix-flowbody.png`, `hairtrix-flowfinal.png` — FLOW search
- `hairtrix-mousse-cands.png`, `hairtrix-mousse2.png`, `hairtrix-mousse3.png`, `hairtrix-pearl.png`, `hairtrix-midnight.png` — MOUSSE search
- `hairtrix-trimnity-cands.png`, `hairtrix-trimnity2.png` — TRIMNITY search
- `hairtrix-flowshades.png` — Flow+Shades (epithet) hunt
- `hairtrix-bald-0.png` (80 bald overview; labels too small to read — superseded by the two below), `hairtrix-baldA.png`, `hairtrix-baldB.png` — agent search
- `hairtrix-orig-verify.png` — original 600×600 renders of 2186, 3972, 2719, 4219, 1989, 2653, 2487, 2619, 704, 389 (+1627, 2067)
- `hairtrix-side-verify.png` — side-head atlas cells of all leads + all six agents

Per-lead verification notes (hair silhouette / prop check):
- **FLOW 2186** — `hairtrix-flowfinal.png` tile 2 + `hairtrix-orig-verify.png` tile 1: hair reaches hip level on both sides, straight, no hat, no text; only carry items are the small hip card and orange fur collar (both flagged as paint-overs above). Side head confirms normal profile.
- **MOUSSE-PHEUS 2719** — `hairtrix-flowfinal.png` tile 3 + `hairtrix-orig-verify.png` tile 3: mane is widest at the shoulders and drapes to chest; face clear; no text, no props; only a small chest patch. Majestic read confirmed at sprite scale.
- **TRIMNITY 3972** — `hairtrix-flowbody.png` tile 4 + `hairtrix-orig-verify.png` tile 2: sleek chin-length cobalt bob, slim torso, no props/text; earring only. Silhouette distinct from FLOW (bob vs. waist-length).
- **AGENT SMIRK 1989** — `hairtrix-baldA.png` (row 4) + `hairtrix-side-verify.png`: fully bald front and profile, plain black tee, no visor, no slogan, no prop. Verified clean.
- **AGENT SWARM ids** — each individually eyeballed on `hairtrix-baldA.png` / `hairtrix-baldB.png` and the side sheet: no oversized props, no slogan overlays, no face furniture. `hairtrix-orig-verify.png` tiles 5–10 confirm the torso designs.
- **THE STYLIST 4219** — `hairtrix-flowfinal.png` tile 1 + `hairtrix-orig-verify.png` tile 4: horns/grin intact at sprite scale, hip items small (phone + card), no text.

## Considered and rejected (with reasons)

- **Veil archetype (hair covers whole body — no shirt to repaint for FLOW)**: 2792, 2920, 1341, 1851, 906, 2550, 180, 2285, 771, 2261, 4087, 2173, 3521, 594, 1314, 2067 (also carries a blaster + aviator shades), 3734, 4390. Several additionally carry a gold "808" hair ornament/text (1501, 966, 2737, 4390…). 1627 (Pearl veil) was kept as MOUSSE alt but dropped: reads as a white robe/ghost rather than hair; 2719's mane is a better "big hair" read.
- **Slogan / meme text overlays**: 2501, 88, 325 ("WHAT DOES DN404 MEAN"), 2230 ("KINDA LAME"), 130 ("GET ME LIL SHID"), 1255 ("I HATE BACON"), 2585 ("I PUT HOT SAUCE…"), 224 ("FENE 2020"), 2752 ("RIP ETHR DELTA"), 2937 ("ADA LAME"), 2666, 3356.
- **Hats/visors reading as headgear, not hair**: 4027, 297, 3954, 486, 783, 1946, 1937, 1683, 803, 2263, 3440, 153, 516, 679, 938, 963, 1357, 1908, 2335, 2654, 209, 280, 596, 1735, 2051, 2941, 3799, 3983, 243, 1002, 1546, 443, 2640, 2687, 2850, 663, 3181, 4273, 2730, 2782, 3726 (top hats / NY buckets / "Marlbu" caps / berets), 125, 651, 952, 1454, 2537 (pink visors), 499, 3702, 2585.
- **Oversized props / face furniture**: 2713 (eyepatch + sword), 2749 (katana), 2763 (binoculars), 1071 (bomb), 38 (gun), 675, 2439, 4045, 424 (swords/lances), 2467 (banana phone + eye tattoo), 2829 (blaster), 2071, 2913 (camo + phone), 3052 (red horns + lightsaber), 1301 (muscle-print tee), 1954 (McDonald's shades), 2855/2940 (novelty shades), 2929 (purple round shades — kept clean faces for the swarm so the painted shades read as costume).
- **Clone-breakers**: 1856 (mustache), 1120 (racing suit), 908 (busy pattern shirt), 5 (gold "808" tee text).
- **FLOW runner-up 4219**: longest hair + leather, but horns + blue skin + grin read quirky, not leading-man — recast as THE STYLIST instead.
- **TRIMNITY alternates**: 1087 (bright cobalt bob + blue tee — more cheerful than agile), 494 (same bob, plain tee), 2113/2079 (dark bowl hair + black jacket — too similar to FLOW's palette). 3972 chosen for the sleek leather + dark-blue read.
- Dark-hair programmatic scan (lum<105 in art.json) surfaced mostly caps/visors: 334, 2218, 4200, 1118, 363, 138, 1081, 2440, 4297, 3565, 508, 1141, 3912, 4119 — rejected on visual (headgear/prints).

Method note: candidates were shortlisted by measuring the near sprites (hair-colored pixel mass
in head band vs. side strands at low y, torso visibility, shirt luminance, near-white top-row
text bands, out-of-band alpha for props), then every finalist was confirmed by eye on labelled
sheets. Contact.py `--kind` only splits bald/hair, so hairstyle families came from art.json
epithets (`* Flow` = long hair, `* Crown` = puff, `* Visor` = headgear — the reason so many
"wide silhouette" metric hits were hats).
