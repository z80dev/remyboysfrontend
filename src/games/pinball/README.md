# Base Cadet

Original procedural tribute to 3D Pinball for Windows – Space Cadet (1995), Cinematronics / Maxis.

## Play

Hold Space for up to 0.8 seconds and release to launch. Z and / operate the flippers; X, . and Up nudge the table. Four nudges within three seconds tilt the table. F2 starts a game, F3 pauses, F4 enters full screen, and F8 opens persistent control remapping. Options supports one to four hotseat pilots. A new pilot receives three balls; earned extra balls are played before rotating.

Spot the mission target bank to choose a rank-appropriate mission and shoot the launch ramp to accept it. Fuel drains while deployed; the fuel chute refills it. All seventeen missions, including staged objectives, are implemented by the independent deterministic rules module. Promotions require two completed missions at Cadet and three at subsequent ranks. Reorg can promote or demote directly. The ten-second launch saver is available once per ball. Wormhole matches earn replay credits.

On touch screens the left and right table halves operate independent flippers, with a bottom-right plunger swipe and explicit plunger/nudge controls. The backglass becomes a forty-pixel status bar on Pocket screens. Loss of focus pauses play; resuming requires explicit input.

Typing `hidden test` enables dragging the ball across the table. Any game that enters test mode is excluded from high scores.

## Implementation

- `geometry.ts` supplies the shared collision/render layout and contact event identifiers.
- `physics.ts` uses fixed 1/480-second steps, swept collision queries, rotating flippers, and preallocated contact storage.
- `rules.ts` is DOM-free and owns missions, ranks, fuel, tilt, scoring, saves, multiplayer, and score-table validation.
- `render.ts` paints the static table once into a DPR-aware offscreen canvas and draws dynamic elements separately.
- `Panel.tsx` and `matrix.ts` draw the procedural dot-matrix backglass.
- `audio.ts` routes synthesized effects through the shared kit. The original 132 BPM, sixty-four-bar Base Cadet Theme and thirty-two-bar Mission loop live in `music/`.
- `strings.ts` centralizes help, panel, mission, and menu copy.

Rule and physics coverage lives in `tests/games/pinball.test.ts` and `tests/games/pinball-physics.test.ts`. Run them with `bun test tests/games/pinball.test.ts tests/games/pinball-physics.test.ts`.
