# THE TERMHAIRNATOR — casting (verified against media/quest/art.json + quest-bald.json)

## Final cast
- **machine = 347** — "leather" (flame-hem black leather-look shirt, stern face; dressed for the fire walk-out)
- **bystanderA = 11** — "blond" (blond bob, dark navy top; cleanest far-sprite silhouette)
- **bystanderB = 191** — "cyan" (cyan bob, near-black tee; pops against neon-rain night, contrasts hero's red)
- **hero = 42** (canonical; verified — see notes)

## Bald/hair status (art.json col 9 + hair==skin check)
- 347: bald=1, hair==skin `a07e63` — true bald, clean crown in head AND side atlas
- 11: bald=0, hair `a79240` (blond) · 191: bald=0, hair `4093b7` (cyan) · 42: bald=0, hair `893c3b` (crimson)

## Palette rows [skin, hair, shirt, bg, accent, eye, hairStyle, shades, type, bald, epithet]
- 347: `['a07e63','a07e63','0b0d0f','2a1c2f','a48267','1d171c',0,0,1,1,'Midnight Soul']`
- 11:  `['685240','a79240','19293a','a8a1a3','a9913c','1b1714',3,0,1,0,'Copper Flow']`
- 191: `['c4b492','4093b7','050407','dba39e','3f94b8','34312f',3,0,2,0,'Aqua Flow']`
- 42:  `['d0bdb1','893c3b','2d3d49','24293e','8d3b3b','1d1815',3,0,3,0,'Crimson Flow']`

## Art-builder notes
- **Machine 347**: shirt `0b0d0f` w/ RED-FLAME trim at hem (bottom edge) — not text, keep it; it rim-matches molten `#ff7a1a` in the fire walk-out (46.0) and foundry grade. Eyes are near-black `1d171c` — the red lens (eyeIgnite 15.5) must be a picture-side overlay on the eye pixel. Button-front leather shirt has clear sleeves: burn away the timeline's "left side" (viewer-left) arm for the chrome endoskeleton; sprite is symmetric so mirroring walk cycles is safe.
- **Hero 42**: sword is IN HAND — upright at his side in the right hand, blade above shoulder, yellow crossguard, on the sprite's **viewer-LEFT** edge. It is NOT on his back, though the streets shot desc says "sword on back" — builder must either accept in-hand carry or draw a back scabbard and hide the in-hand blade for the pre-chase beats. Foundry actions (clash/hair-grab counter/flourish/core stab) all work with the in-hand pose. Tee `2d3d49` has faint white cursive print (illegible at near scale — harmless). Crimson `893c3b` hair reads at head-icon 16px (lock-on HUD "HAIR: CRIMSON" checks out).
- **Bystanders**: far sprites only (streets g9.5 scatter). 11 vs 191 = blond vs cyan, maximum hue separation, both plain dark tops so silhouettes read at 156px. Avoid red/pink hair ids — they read as a second #42.
- **Fringe audit**: 347, 129, 3807 clean bald front + side. 564 (backup) shows a dark top-back fringe in the near sprite — acceptable but note it. 1730/458 (also passed dark-shirt filter) have grey/blue-grey nape fringes.

## Machine backups (shortlist)
- **129** — plainest black tee `000000`, cleanest sprite for the chrome-half composite swap
- **3807** — all-black hoodie `222222`, deadpan menace; hoodie sleeves complicate the chrome-arm swap (note)
- (also passed: 564 — gritted-teeth aggressive face, dark tee; fringe caveat above)

## Rejected during review
- 2371 (carries sword + toy props — clashes with hero's sword motif), 2855/2940 (slogan tees), 2914/1707/554/368/54/9 (lightsaber/blade props), 452 (tux + playing card), 3308/3150/1896 (camo), 3980/222 (skull face paint), 100 (face fully covered)
