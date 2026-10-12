# CASTING — THE LORD OF THE FLOW

All ids verified by eye on contact sheets (`output/_contact/`, list at bottom). Palette from `media/quest/art.json` rows `[skin,hair,shirt,bg,accent,eye,hairStyle,shades,type,bald,epithet]`. Bald membership checked against `scripts/quest-bald.json`.

## Fellowship (6)

| Role | Id | Epithet | skin / hair / shirt | hs | Reason / warnings |
|---|---|---|---|---|---|
| **FLOWDO** (locked) | 42 | Crimson Flow | d0bdb1 / 893c3b / 2d3d49 | 3 | Verified: red flow, sword (the One Razor), big grin. Tiny red tee print — invisible at far. Not bald. |
| **GRANDFLO** | 909 | Silver Flow | a17f64 / 6a7674 / 213543 | 3 | Longest clean grey hair in the set; navy suit + tie reads as wizard robe at stage scale; stern face sells "YOU SHALL NOT BALD!" Warning: none. |
| **SAMFLO** | 4 | Moss Flow | 685240 / 446e44 / 9e6664 | 3 | Green shag + red/white striped tee = wholesome, stocky little sidekick; hair distinct from FLOWDO red. Warning: stripes are loud; small earring. |
| **ARCHER** | 2577 | Copper Flow | d1beb2 / 9d8943 / 8c8a95 | 3 | Longest blonde flow, lithe, plain grey sweater; only a stamp-sized logo on the sleeve. Clean. |
| **AXE-DWARF** | 90 | Crimson Flow | c0aa98 / 8a3c3c / 1e4c38 | 3 | Warm crimson bob + green tunic with white crest (reads as dwarf clan badge), blue eyes; compact silhouette. Warning: crest emblem is a feature, not text. |
| **WARRIOR** | 2531 | Midnight Crown | c4b5ab / 26221f / 000000 | 1 | Black bowl + moustache + black suit = broad, dark-haired, deadly serious (dark-armor vibe). Warning: bowtie/moustache are baked in; reads formal-general, works. |

Fellowship hair spread: red 42 / grey 909 / green 4 / blonde 2577 / crimson-bob 90 / black 2531 — all distinct in colour and silhouette.

## GOLBALD

| Role | Id | Epithet | skin / hair / shirt | hs | Reason / warnings |
|---|---|---|---|---|---|
| **GOLBALD** | 73 | Copper Soul | 685240 / 685240 / e1b890 | 0 | In quest-bald.json. Bald from the front with a ratty COPPER back-fringe (his "precious", no repaint needed); big sad reddish eyes, hunched stare. Warning: small chest print on the peach tee — invisible at far scale. Backup: 1856 (green fringe + moustache, sage tee). He clutches a procedural toupee per brief. |

## Chief villains + the Eye

| Role | Id | Epithet | skin / hair / shirt | hs | Notes |
|---|---|---|---|---|---|
| **Dark Lord presence** | 5 | Gold Soul | a07e63 / a07e63 / dccc5e | 0 | Bald (verified). Yellow tee w/ small gold R.O.R. emblem; receding grey scruff. Reads fine; emblem invisible at far. |
| **THE EYE** | 1217 | Pearl Soul | a07e63 / a07e63 / dad6d3 | 0 | Bald (verified). White gi, blue scalp rim, huge stern forehead — head atlas icon scales beautifully as `headIcon(heads, 1217, k)`. Confirmed. |

## THE CABALD HORDE (8 — all in quest-bald.json, verified clean at near AND far)

| Id | Epithet | skin / shirt | Notes |
|---|---|---|---|
| 159 | Pearl Soul | 685240 / dadad6 | White robe, green sleeves — Cabald priest. |
| 1445 | Pearl Soul | 685240 / dadad8 | White robe, tan trim; darker grey-brown skin. |
| 458 | Midnight Soul | 685240 / 000000 | Plain black tee. |
| 2529 | Midnight Soul | d0bcb1 / 211d1a | Black bomber w/ orange collar — armour vibe, pale skin. |
| 564 | Midnight Soul | c0aa98 / 050407 | Black tee, tiny gold chest emblem only. |
| 321 | Crimson Soul | c0aa98 / 6d3231 | Maroon tee; small chest print, invisible at far. |
| 1161 | Cobalt Soul | c0aa98 / 062465 | Blue knit sweater w/ sleeve stripe. |
| 908 | Copper Soul | a07f64 / 8a7057 | Brown tiger-camo jacket — pelt vibe; pattern, no text/prop. |

No horde sprite carries readable text or oversized props at either scale.

## THE FLYING HEAD (eagle rescue)

Recommend **2577**'s head (`headIcon(heads, 2577, k)`): long golden mane reads majestic and wind-blown at large scale — "the Great Eagle of the Flow". Alt: 909 (grey flow, doubles as a Grandflaegle gag). Verified on the heads atlas.

## Rejected notables (so nobody re-picks them)

- 966/1501/3734/4390/1627/3550/4091/1613 — "Pearl/Silver Flow" are white VEIL overlays, not hair.
- 1000, 3669, 46 — slogan/chest-print tees. 444, 2295, 23 — sword/weapon props.
- 30, 2531-family hs1 "crown" ids like 149/153/154/203/483/516/534 — Maxflon caps or explorer hats, not hair crowns.
- 9, 104, 109, 299, 84 — lightsabers, text tees, pill prints.
- Bald text/prop rejections: 0, 23, 48, 98, 125, 167, 222, 225, 315, 389, 452, 468, 556, 645, 651, 685, 690, 704, 744, 763, 804, 839, 1033, 1061, 1120, 1169, 1188, 1260, 1264, 1332, 1350, 1444, 1473, 1479, 1504, 1558, 1601, 1657, 1685, 1694, 1703, 1712, 1730, 1747, 1777, 1821, 1843, 1869, 1870, 1880, 1926, 1942, 1989, 1991, 2028, 2045, 2061, 2132, 2156, 2202, 2217, 2237, 2270, 2296, 2310, 2371, 2393, 2433, 2443, 2467, 2487, 2505, 2585, 2599, 2619, 2636, 2666.

## Contact sheets inspected (output/_contact/)

all-near-0.png (starter 7 + grey 12) · gf-near-a/b.png · samflo-near.png · archer-near.png · dwarf-near.png · warrior-near.png · dwarf-red.png · dwarf-final3.png · scraggly-auburn.png · bald-n0.png · bald-n1.png (full 240-id bald population) · horde-verify1–4.png · horde-far.png · golbald-horde-closeup.png · horde-golbald-head.png · heroes-verify-near/far/head.png · final-far.png
