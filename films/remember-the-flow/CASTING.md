# CASTING — REMEMBER THE FLOW (a Remy Boys documentary)

Ken Burns–style war documentary: the hairy heroes ("the Flow") vs the bald villains ("the Cabald").
Casting method: contact sheets via `.omp/skills/remy-media/scripts/contact.py`, every sheet READ by eye;
every bald pick cross-checked against `scripts/quest-bald.json`; epithets + palettes from
`media/quest/art.json` (`rows[i] = [skin, hair, shirt, bg, accent, eye, hairStyle, shades, type, bald, epithet]`,
hair hex at index 1, shirt at index 2).

## Cast table

| Role | id | Epithet (art.json) | Hair hex | Bald-verified | Why chosen | Risks |
|---|---|---|---|---|---|---|
| HERO / VETERAN (protagonist) | 42 | Crimson Flow | `#893c3b` | No — hairy, NOT in bald roster (canon hero) | Canon protagonist. Near sprite: red hair + greatsword, face fully unobstructed (eyes/brows/mouth clear), sword blade clearly reads at mid-distance. Orig 600×600 (Eiffel Tower bg) works for the stylized smooth 1080p veteran-interview staging. | Shirt carries small meme text ("My Sword Rodeo") — tolerable per brief at mid-distance, but avoid extreme close-ups on the chest; sword tip reaches the sprite's top edge — don't crop tighter. Fallback for tight shots: 109. |
| HERO fallback (tight close-ups only) | 109 | Crimson Flow | `#893c3b` | No — hairy | Same crimson hair, plain white sweatshirt, totally clean sprite (used by good-bad-bald). No sword, so only for interview/close-ups, not battle reenactment. | Not canonical; keep screen time minimal so canon stays on 42. |
| CABALD BOSS (propaganda poster) | 1217 | Pearl Soul (shirt `#dad6d3` white gi) | — (bald, hairStyle 0) | YES — in `quest-bald.json` bald roster; row bald=1 | Best ORIGINAL of all candidates: white gi with dark belt trim, sea-cliff horizon, high-key sky, direct unblinking stare — reads "dictator general" at poster scale. Face 100% unobstructed, no text anywhere. | Pose is stern-calm, not snarling — pair with ominous grading/copy. Runner-up 5 (below) is angrier if a snarl is needed. |
| CABALD SQUAD — marcher 1 | 129 | Midnight Soul (shirt `#000000`) | — | YES — in roster; bald=1 | Clean black tee near sprite, smiling coldly, face clear, no props, no slogan text. | Generic black tee; keep him flanked by the more colourful marchers. |
| CABALD SQUAD — marcher 2 | 321 | Crimson Soul (shirt `#6d3231` maroon tunic) | — | YES — in roster; bald=1 | Maroon tunic with small chest medallion reads as an officer's uniform; face clear. | Epithet "Crimson Soul" is uncomfortably close to the Flow's "Crimson Flow" branding — do not put him next to the hero in a frame. |
| CABALD SQUAD — marcher 3 | 389 | Pearl Soul (shirt `#d5d5d5` white sweatshirt) | — | YES — in roster; bald=1 | Plain white sweatshirt, face clear; blue back-fringe only (still bald from the front — roster-confirmed). | Near-white shirt can bloom on bright occupation-footage grades. |
| CABALD SQUAD — marcher 4 | 585 | Cobalt Soul (shirt `#839bcc` blue tee) | — | YES — in roster; bald=1 | Cobalt tee with round white insignia reads as an armband — perfect occupation iconography; face clear. | Tiny dark object at one hand (small prop, does not touch face) — invisible at marching distance. |
| GOLDEN AGE portrait 1 — the Financier | 30 | Copper Flow (hair `#c1aa95` platinum) | `#c1aa95` | No — hairy | Orig: platinum slick hair, layered gold chains + gold robe, corporate towers with flags behind — the literal face of the Flow's golden age. Face clear, no text overlays. | Shares epithet "Copper Flow" with 2577 (hexes differ); gold-on-gold may need contrast lift in sepia pass. |
| GOLDEN AGE portrait 2 — the Magnate | 2531 | Midnight Crown (hair `#26221f` black pompadour) | `#26221f` | No — hairy | Orig: black pompadour + moustache, black tuxedo with bow tie, yacht deck, open sea — old-money majesty, ideal for slow Ken Burns push-ins. Face clear. | Dark tux on dark water — check sepia contrast; "Crown" hairStyle (1) is a quiff, not an actual crown. |
| GOLDEN AGE portrait 3 — the Poet / Heir | 2577 | Copper Flow (hair `#9d8943` golden blonde) | `#9d8943` | No — hairy | Orig: big glorious golden-blonde long flow, plain grey polo, dark forest estate behind — the only LONG-hair silhouette among the elders, distinct from 30 (slick), 2531 (pompadour) and the hero (red bob+sword). Face clear, no text. | Scene is moody/dark rather than sunny-prosperous — frame as "the estate at dusk" in narration. |
| INTERVIEW CUTAWAY (second talking head) | 70 | Aqua Flow (hair `#4093b7` azure) | `#4093b7` | No — hairy | Azure flow hair, damask-patterned suit, katana held at shoulder (face fully clear) — a Flow sword-knight; the blade motif rhymes with hero 42's greatsword. Distinctive and dramatic. | Katana is a prop near the head — keep framing at chest-up orig crop, never crop into the blade; azure is the brightest hair in the cast, grade gently. |

## Bald-roster verification (exact commands run)

```sh
# roster cross-check for every Cabald pick (all True) and hero (False)
python3 -c "import json;b=set(json.load(open('scripts/quest-bald.json'))['bald']);print([(i, i in b) for i in (5,1217,129,321,389,585,834,42,109,30,2531,2577,70)])"
# epithet + palette rows (hair = index 1)
python3 -c "import json;r=json.load(open('media/quest/art.json'))['rows'];print(r[42],r[109],r[1217],r[5],r[129],r[321],r[389],r[585],r[834],r[30],r[2531],r[2577],r[70])"
```

Contact sheets generated and READ (all under `output/_contact/`):

```sh
SK=.omp/skills/remy-media/scripts
uv run -q --with pillow python $SK/contact.py --kind bald --src near --n 60                    # bald-near-0.png
uv run -q --with pillow python $SK/contact.py --kind bald --src near --start 60 --n 60         # bald-near-60.png
uv run -q --with pillow python $SK/contact.py --kind hair --src near --start 0 --n 80          # hair-near-0.png
uv run -q --with pillow python $SK/contact.py --kind hair --src near --start 1000 --n 80       # hair-near-1000.png
uv run -q --with pillow python $SK/contact.py --kind hair --src near --start 2500 --n 80       # hair-near-2500.png
uv run -q --with pillow python $SK/contact.py --src near --ids 42,109 --cols 2 --out output/_contact/hero-near.png
uv run -q --with pillow python $SK/contact.py --src orig --ids 5,1217,452,1350,1454,222,1033,1534 --cols 4 --out output/_contact/orig-boss-cands.png
uv run -q --with pillow python $SK/contact.py --src orig --ids 2,4,7,8,9,13,20,24,30,70,141,173 --cols 6 --out output/_contact/orig-goldA.png
uv run -q --with pillow python $SK/contact.py --src orig --ids 316,341,384,413,436,440,508,596,655,659,966,1131 --cols 6 --out output/_contact/orig-goldB.png
uv run -q --with pillow python $SK/contact.py --src orig --ids 11,16,19,26,27,32,1011,2525,2531,2577,1050,1376 --cols 6 --out output/_contact/orig-goldC.png
uv run -q --with pillow python $SK/contact.py --src near --ids 129,321,389,458,585,834,1271,222,452,197 --cols 5 --out output/_contact/squad-near-check.png
uv run -q --with pillow python $SK/contact.py --src orig --ids 26,1011,11,2577 --cols 4 --out output/_contact/orig-goldD.png
uv run -q --with pillow python $SK/contact.py --src orig --ids 42,1217,5,30,2531,1011,2577,70,8,26,109 --cols 4 --out output/_contact/orig-FINAL.png
```

The final sheet `orig-FINAL.png` (chosen originals at 240 px tiles, labelled) was read last to confirm all
600×600 picks are poster/print-worthy: 42, 1217, 30, 2531, 2577, 70 all confirmed; 109 confirmed clean as fallback.

## Rejects (one line each)

Cabald-side rejects (bald-verified, but unusable as cast):
- 167, 315, 1112, 1249 — "WHAT DOES DN404 MEAN" slogan overlay across the sprite.
- 410, 1332 — "THESE ARE KINDA LAME" slogan overlay.
- 804, 1703 — "MEH / HOW TO RUG101" slogan overlay.
- 1271 — looked clean in the wide sheet; zoomed check found "MEH / HOW TO RUG101" text on the sprite.
- 222 — katana held vertically beside the face in the near sprite; orig background is a busy monster-movie collage.
- 1350 — "STRAIGHT OUTTA MONEY" meme text on the poster orig.
- 1033 — "I PUT THAT ON MY APE" text + pink shades on the orig.
- 1534 — pink visor shades cover the eyes; baguette prop in orig.
- 1454 — dark sunglasses cover the eyes (propaganda posters need eyes).
- 452 — strong tuxedo orig but holding playing cards; kept as uncast alternate, out-dramatized by 1217.
- 5 — frequent villain, strong Wall Street-bull orig, but softer pose/light than 1217; official BOSS alternate (and shares his yellow "hand-icon" tee family with 1011).

Flow-side rejects (hairy, checked for golden-age / cutaway):
- 2 — face fully covered by a black garment.
- 9 — red lightsaber prop; red hair also clashes with the hero's crimson identity.
- 19 — translucent shades cover the eyes ("Moss Crown").
- 32 — dark shades + blue lightsaber prop.
- 8 — "KINGSTON" block text across the tee.
- 11 — mall background + band tee: casual, not prosperous.
- 13 — "PLEASE DO NOT SMOKE" sign + "CAT CIVIC" text behind/under the face.
- 20 — "Get Me In Lil Shid" text on tee.
- 24 — busy Sonic "SCORE/TIME" background.
- 26 — blue crown reads royal but jersey carries "posco" sponsor text; crown-as-hat hides the hair.
- 1011 — near-miss elder statesman (platinum pompadour, Istanbul skyline): platinum repeats 30 and he wears the yellow hand-icon tee family of Cabald boss 5 (faction-colour confusion risk).
- 2525 — tie-dye + goofy grin, wrong register for golden-age gravitas.
- 384, 436 — bandana wraps cover the hair entirely.
- 508, 596, 655 — trucker cap / wide-brim hat / beanie cover the hair.
- 316, 341, 1131 — text tees ("TO ALL THE…", "Get Me In Lil Shid", "GET ME IN LIL SHID"); 341 also has a sushi prop on the head.
- 659 — "MEH / HOW TO RUG101" overlay.
- 966 — head shrouded in white hood; no hair visible.
- 1050 — holding cards + Pikachu + busy "coinbase" banner background.
- 1376 — red lightsaber prop.
- 4 — red/white graphic tee + busy space background.
- 7 — baseball-bat prop + text tee.
- 440 — racing-graphic tee, hair too short to read majestic.
- 413 — tie-dye street-casual.
- 141 — pink shades + wolf-moon tee.
- 173 — sunglasses + sushi bowl worn on the head.

## Notes for production

- Faction colour discipline: Cabald squad shirts are black/maroon/white/cobalt; keep hero-side frames dominated by reds/golds/blues of hair (42 `#893c3b`, 30 `#c1aa95`, 2531 `#26221f`, 2577 `#9d8943`, 70 `#4093b7`) for palette-matched trails/glows per assets.md.
- 321 ("Crimson Soul") must never share a frame with 42/109 ("Crimson Flow") — epithet and maroon-vs-crimson shirts will confuse.
- Orig renders are opaque with scene backgrounds: always frame them (panel, circle clip, or archival-photo matte with sepia pass for the golden-age trio).
