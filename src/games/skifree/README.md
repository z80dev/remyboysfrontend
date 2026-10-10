# SkiFree

A resizable, VGA-palette remake of Chris Pirih's 1991 SkiFree, set on Mempool Mountain. The selected shared player Remy supplies the skier's Quest head and jacket color. The Abominable Cabald takes the original snow monster's place.

## Controls

- Left / Right or numpad 4 / 6 rotate through the seven grounded ski directions. Down / numpad 2 points downhill. Up / numpad 8 brakes; while horizontal it walks uphill. Press the same horizontal direction again to step sideways.
- Numpad 1 / 3 selects a diagonal; 7 / 9 selects horizontal.
- Point the mouse or drag a finger to steer. Click or tap, Insert, or numpad 0 jumps.
- In the air, Left / Right spins, Up flips forward, and Down flips backward. Completed tricks earn style when landed; an incomplete trick causes a crash.
- F toggles the fast speed cap, F2 starts a new game, and F3 pauses. T advances one physics frame while paused.
- Pocket exposes Pause and F controls. Losing window focus or hiding the game pauses it; resuming is explicit.

Choose Slalom, Tree Slalom, Freestyle, or Free Ski, or follow the start-area signs. Slalom gates alternate the required side, and each miss adds five seconds. Courses have start and finish banners; the run-out is not safe from the monster. Scores persist, but an unfinished run does not.

## Implementation

- `types.ts` is the shared mutable simulation and renderer contract.
- `engine.ts` contains deterministic seeded slope generation, fixed-step physics, gate scoring, style accounting, NPC and obstacle behavior, and the monster state machine. It is independent of the DOM, React, and audio.
- `render.ts` draws cached pixel sprites, quantized Quest heads, bitmap text, ski tracks, and the four-line status box. Desktop sprites are 1×; Pocket uses integer scaling with an expanded portrait view.
- `index.tsx` owns input, lifecycle, menus, dialogs, art loading, and guarded best-score persistence through the shared kit.
- `sound.ts` uses the kit's shared synthesis graph for speed-dependent ski hiss and short event sounds. It does not load sound or music files.
- `strings.ts` centralizes the game's user-facing text. `icon.tsx` contains its self-contained 32×32 SVG icon.

The absolute skier position remains continuous while terrain generation wraps every 18,000 meters. Normal, monster, and fast speed caps are ordered so fast mode can outrun a pursuing monster. A second monster appears farther downhill. Yellow snow follows dog collisions, and passing a stump uphill reveals the mushroom egg.

## Verification

Behavior-focused rules tests: `bun test tests/games/skifree.test.ts`.

Browser entry: `/#/skifree`. Check both a desktop window (including resizing) and a Pocket viewport below 720 CSS pixels. Exercise all courses, keyboard and pointer steering, pause/frame-step, the monster's full eat animation, fast escape, audio mute, best-score dialogs, and the offline-art fallback. Canvas pixel colors must remain in the 16-color VGA palette.
