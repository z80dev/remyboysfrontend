# Production lessons: Remy media beyond one genre

These notes combine the original `remy-bros` transcript, the retained first builders' transcripts/mined reports, actual source inspection and the finishing Sol builders' reports. A pattern present in code is not a claim that every sibling final has been rendered or delivered. Referenced film folders are **read-only examples**, not dependencies to copy blindly; use only your owned folder and the stable original rig.

## General lessons from the praised original

`films/remy-bros/{art,choreo,game,score,film}.js` separates baked art, pure choreography, scene/HUD, score and engine entry. This is a useful separation for any format. A cinematic could use `camera.js`, `actors.js`, `timeline.js`, `score.js` instead: retain one timing truth, not the game terminology.

- Asset discovery was consequential: contact sheets exposed slogans, props and ambiguous silhouettes. Near/far assets are generated full-body cutouts; originals are opaque portrait renders. Read the sprite generator and bald roster instead of guessing from filenames.
- Derive contact geometry from a hero path at event time: block x from bonk, pit edges from jump, enemy x from stomp. It transfers to a product landing in a hand or a character hitting a door.
- Integrated speed tables (original 1/1200s grid) give continuous positions under acceleration. Sample/interpolate rather than advance frame state. Eased jump ascent/descent and event particles are analytic.
- `warp` freezes world time; inverse `filmT` puts effects/audio at the right film frame. Shake can use real time so impact still feels alive. Equality maps onset to the beginning of the freeze; resumed intervals must include the stop.
- Native 960×540 → nearest 2× yields crisp pixel art. A different native size is fine if it divides the output cleanly (e.g. 640×360 → 3×). Type size guidelines depend on that ratio.
- Whitewashed sky came from excessive bloom; restrained bloom/threshold preserved colour. Flat early scenery improved through blob-shaded clouds, mountain planes, haze, treelines, textured dirt and pit depth. Palette ramps and selective seeded detail beat undifferentiated flat bands.
- Hit-stop, stance, collision, payoff and ending matter more than adding another filter. Dusk tint, warm windows, layered fireworks, letter-drop and a tally gave the original ending a real reward.
- Fractional ImageData dimensions broke terrain. Round dimensions; floor pixel coordinates. evenodd iris requires `moveTo` before circle. Lost declarations after edits caused ReferenceError; `FILMKIT_DEBUG=1` exposed it.
- Stills accumulate. Clean only your own still folder before tiling. ffmpeg tile outputs need a single frame and `-update 1`. Verify encoded motion/final frames, not only runtime.
- Triangle bass masked lead; frequency-band checks led to reduced bass/kick and a clearer melody. Gain figures are specific to a voice/mix. LUFS normalization does not remix.

## Fighter: physical support, poses and readable impacts

Sources: `films/remy-fighter/{choreo,rig,fight,stage,screens,score}.js`; `history://RemyFighter`; finishing `FighterSol` report.

Fighter uses separate limb/pose composition, parallax neon scenery, FM/pulse score and synthesized formant voice. Freeze/slow motion have a bidirectional time map. It shows that complex action can remain deterministic without an interactive game engine.

**Reported finishing fix:** a sprite rotating around feet needs centre compensation **and angle-dependent ground support radius**: at 90° horizontal half-width becomes vertical clearance. Clear the attack-arm pose after first landing, not throughout airborne spin or never. Keep a readable silhouette under KO flashes; lower an obscuring white strobe rather than erase character art with bloom. Use real shot-age for sparks when contact world-time freezes. Inspect dense encoded motion around airborne spin → bounce → grounded pose, not just one KO still.

Transfer: every tumbling logo, falling product, or reaction character has the same pivot/support problem. Stage the visible contact geometry, not merely the centre trajectory.

## Maze: legal routes, catch solving and HUD bounds

Sources: `films/pac-remy/{choreo,art,game,score,scenes}.js`; `history://PacRemy`; `PacSol` report.

Routes/catches/score events share a pure choreography. Solve contact once from continuous tracks (the prior builder used a dense sampled Manhattan-distance solver); fail if no catch exists. Distinct ghost behaviours can be authored route styles rather than carried simulation. Return paths need legality checks too, not only hero movement. Continuous sound intervals have different freeze-resume mapping needs than onset SFX.

**Reported finishing fix:** rounded-to-8px HUD font animation unexpectedly doubled a 16px chain label to 32px and clipped its side panel. Preserve nominal HUD text size; move/outline/colour it, reserving scaling for centrally spacious impact text. Path samples against the wall grid expose characters/returning eyes cutting corners. An encoded all-duration 4fps sheet exposes turning, chase, power state and intermission motion.

Transfer: callout labels and dashboard numbers can clip at peak animation even if their resting bounds pass.

## Shooter: derive launches from impacts and match weak points

Sources: `films/galaremy/{choreo,art,game,score}.js`; `history://Galaremy`; `GalagaSol` report. Current choreo explicitly derives fire times/path from authored kills; stop and mega event both use 10.38; game draws an elliptical weak point.

- Author impact data, derive launch time from distance/velocity, and derive hero/camera knots from that same geometry. This keeps bullets and retiming honest.
- When a named explosion moves, its hit-stop must move too. A stale standalone 10.5 stop after a 10.38 blast gives unmotivated pause.
- Two projectile lanes need visible target geometry wide enough to receive both; a narrow drawn core cannot credibly receive off-core hits.
- Per-letter stagger plus settle consumes real reading time. A 12-letter banner at 0.03s stagger uses 0.36s before the last letter even lands; shorten stagger/drop first, not the useful message.

Transfer: particle landings, moving pointers or arrows in an explainer must hit their visible targets; typography timing is geometry in time.

## Falling blocks: final legality is not trajectory legality

Sources: `films/remytris/{choreo,game,art,score}.js`; `history://Remytris`; `TetrisSol` report. Choreo stores before/placed/after board states, landing and clears; asserts final 1/2/3/4 clear sequence and all-clear. Accelerating beat→time mapping is shared with score.

- Solve/precompute legal board progression; render immutable snapshots at arbitrary time. Search scaffolds are temporary, final assertions are useful invariants.
- A legal final landing does **not** prove legal drawn motion. Hard-drop beginning before DAS shifts finish can intersect the pile. Fit every input stage inside `end - dropDuration - settleMargin`, not only high-level tempo.
- Derive soft-drop row duration from remaining time and distance; fixed 30ms/row may fail to reach the lock position after time compression.
- Effects must retain exact source-step/event identity; approximate time plus equal coordinates can accidentally select an earlier clear.

Transfer: a storyboard's correct endpoint does not prove a transition is collision-free or that an animated counter reaches its final value before cut.

## Adventure: masks, reward hold and face-clear staging

Sources: `films/legend-of-remy/{choreo,game,art,score}.js`; `history://LegendOfRemy`; `ZeldaSol` report. Current code uses GAME_SPEED=1.16, y-depth-sorted actors and an evenodd explosion annulus.

- `destination-out` on a scene canvas erases **all painted layers**, not just an effect's inner disk. Draw annuli with outer/reversed inner subpaths and `fill('evenodd')`, or isolate the effect in its own scratch.
- A compressed clock must multiply input in warp **and divide in inverse filmT**. Otherwise score drifts even when picture seems faster correctly.
- Budget full reward text hold before final render. Simultaneously land the two-line message; don't type the reward into a closing iris. Include fade/wipe in the readable interval calculation.
- Raised straight arms can cover the face; bent/outward elbows retain identity and expression. Depth-sort by feet/world depth rather than arbitrary actor order.

Transfer: masking mistakes affect promo shines and cinematic explosions equally; a finale is only useful if the audience can actually read/see it.

## Speed platformer: distance versus world x

Sources: `films/remy-rush/{choreo,art,game,score}.js`; `history://RemyRush`; prior mined report.

Integrated travel distance passes through a circular loop mapping to x/y/rotation. Distance must continue monotonically while screen/world x may reverse. Rings are placed on the path and timed from it; takeoff/landing squash and camera lock derive from events. Procedural curved checker patterns follow polar coordinates, not a rectangular sticker. FM/PSG music distinguishes the format without borrowing a game song.

Transfer: any actor on a curved motion path needs tangent orientation and arc-length-aware pacing. Camera tracking world x alone may behave badly around a loop. Do not report this film's final quality merely because the architecture exists.

Finishing `SonicSol` report adds a general UI solution: transparent native-resolution HUD/tally canvas, nearest-upscaled to the shot's fifth-argument overlay, reset and cleared each frame. Fade with `destination-in` only on that isolated layer, never the opaque world. Reserve tally reading time before ending fade; a total landing at 14.44 in a 15s film barely reads. Ordinary reading captions still need their full holds.

## Girder platformer: facing signs and prop continuity

Sources: `films/remy-kong/{choreo,game,art,score}.js`; `history://RemyKong`; `KongSol` report. Current scene uses signed `hero.x + hero.face*44` for impact/minion locations.

- Hammer collision/despawn/particles must all use the same facing-signed contact point, not hardcoded left.
- The held prop in anticipation must match the released projectile kind; avoid a barrel magically turning into a head at release.
- Rescue-heart overshoot can cross HUD despite safe resting position; move stage-only HUD anchors, not every other shot's layout.
- Dense time sweeps can detect unplanned hero/hazard overlaps; choose sampling resolution appropriate to fast motion and inspect the encoded story phases.
- Apply the adventure annulus/mask lesson to every sibling too; inherited repeated code can repeat the same compositing defect.

`KongSol` subsequently applied the annulus fix and inspected a 7.33s still with skyline retained through its centre. Final HUD anchor was checked at full resolution: even a seemingly free new position can overlap an adjacent status label.

Transfer: handedness, emitted/held object identity and maximum bounds apply to all animated staging.

## Pseudo-3D racer: projection, scratch bounds and isolated chrome

Sources: `films/remy-run/{choreo,game,art,score}.js`; `history://RemyRun`; `OutrunSol` report. Current game scratch is 700×220 and HUD uses a separate canvas.

- A reused 700×120 scratch silently clipped a 196px truck. Allocate for the largest source/pose and clear the entire allocation each use; inspect all sprite variants, not just the hero car.
- `source-atop` on an opaque scene masks against the whole scene. Isolate text/logo chrome on a transparent scratch before applying shine.
- Tune world trajectories in **projected pixels**. A plausible world-height number can fly above the screen; lowering height and adjusting longitudinal impulse can keep landing visible ahead of camera.
- Put pixel HUD on a transparent native canvas then blit to film overlay, so scene CRT/aberration does not smear it.
- Repaint the whole low stage before shake, not just sky-to-horizon. Missing trunks traced to helper arity mismatches: a procedural art function can fail visually without throwing.
- Use game age for world positions and real age for sparks/UI during freeze.

Transfer: intermediate scratch dimensions, alpha isolation and perspective-space review are essential in promos and cinematic compositing too.

Additional `OutrunSol` proof: reverse-seek stills at 11.32, 9.65 and .65 byte-matched ascending-seek PNGs, including shake, shine and particles. Cheap carryover check: draw the same timestamps into separate clean directories in ascending/descending order and compare SHA256 per timestamp. This complements encoded motion review.

## Raycaster: occlusion must include projected UI

Sources: `films/remystein-3d/{engine,tex,actors,choreo,game,screens,score}.js`; `history://Remystein`; `RaycastSol` report. Actual engine is DDA walls/floor/ceiling, packed Uint32 pixel buffers, depth-tested billboards and seeded textures. `game.js` checks `project(...).visible` for speech/popups.

- A correct wall/billboard z-buffer does not automatically occlude speech bubbles. Check projected visibility and screen bounds for UI anchored in the world too.
- Packed RGBA texture layouts and alpha cutoffs must agree across texture writer and reader. Use source dimensions, not assumed square textures or guessed pivots.
- Typewriter banner nominally starting before end can have almost no readable interval after typing/film fade. Land it earlier or reveal whole text at once; inspect the last readable frame, not only the end card source.
- Cached canvases are fine only if cleared; don't stash mutable per-frame state on actor records. FM/OPL-like brass can be built with `kit.at`, carrier plus sine modulation into frequency, separate index-decay and amplitude envelopes, short dry reverb.

Transfer: world-attached diagrams/captions need the same depth/visibility rules as scene props; low-level memory art needs a tested layout contract.

Finishing `RaycastSol` report also warns against giant cinematic impact layers on frequent gunshots: short filtered noise plus descending sine preserves punch without burying the score. Native HUD type is imperative; a zero-caption lint cannot establish its legibility.

## Monster battle: back sprites and tight text animation

Sources: `films/pokeremy/{art,choreo,game,score}.js`; `history://PokeRemy`; `PokemonSol` report. `backSprite` repaints a sampled sprite silhouette; atlas uses 67 columns; hit-stop mapping and original periodic waves keep picture/audio synchronized.

- Generate back-view hair once from masks/colour ramps; do not pretend mirroring a face makes a back view. Review shoulders, sword hand and shirt text after repaint.
- Tight reward panels should animate text translation/outline/colour, not font-size pops that clip at their peak. Finisher kept EXP label at fixed 16px and moved its centre/anticipation.
- Dense encoded sampling reveals typed dialogue cadence, menu cursor, HP drain, send-out slides, attack flashes, evolution silhouette alternation and reward holds.
- Reserve dialogue/reveal reading time, including entrance delay. A tiny timing adjustment can help but is not a substitute for enough total hold.

## Evidence discipline and tooling

The included template was copied into `films/_skilltest`, linted, rendered to stills and a 6s encoded 30fps draft, and its montage/motion strip/contact helper output were actually read. The lint pass had 0 errors/warnings but **0 declarative captions**: this proves engine/timeline loading, not caption audit coverage. The draft had 180 H.264 1920×1080 frames and AAC audio, output −14.0 LUFS/−4.7 dBTP; scene loudness −15.8/−13.9 LUFS. Band helper output was full −18.2 dB mean, <150Hz −22.5, 150–1000Hz −21.8, 1–5kHz −25.8. These are measured template facts, not a promised mix for every film.

The example's closing iris intentionally masks its banner as the scene closes; production reading text must finish its required hold **before** any such wipe. The proof is a small technical example, not the quality ceiling or a substitute for the requested story. Final-film render/checksum delivery workflows were source-checked; this skill's proof draft was not a user delivery and was not copied to iCloud.

Additional exercised template proof: stills at 4.6, 2.85 and 0.5 seconds rendered in reverse order SHA256-matched the corresponding ascending-order PNGs exactly. YAML frontmatter parsed with PyYAML; the existing `.claude/skills/remy-media` symlink resolved to `.omp/skills/remy-media`. Pillow verified original/sprite/atlas dimensions and modes; roster verified 240 bald IDs, hairy #42 and bald #5/#1217. Original/Halloween counts were 4490/239. After proof, `films/_skilltest` and its draft MP4 were removed; montage, encoded motion strip, character contact sheet, loudness JSON and spectrogram remain under `output/_skilltest/` as inspection evidence.

## Final delivery addenda

Final `RaycastSol` report confirms the formerly empty score was replaced, not silently accepted: `remystein-3d/score.js` now implements the original 150 BPM “Follicle Fortress” FM march and synchronized foley with a major-key victory answer. Current `game.js` builds a frame-local `guardStates` array used by popups rather than mutating persistent guard records. Reported final evidence was 900 encoded frames, full-duration motion and victory sheets, −14.00 LUFS/−1.86 dBTP and a matching local iCloud-folder checksum. These remain the builder's final verification report, not this skill agent's independent video review. General lessons: inspect missing-score stubs explicitly when resuming, derive footsteps from travelled distance, and keep frame-local pose data local.

Final `OutrunSol` report adds **visibility of the decision itself**: an oversized median billboard hid the branching fork even though road projection was correct. Remove/reposition foreground dressing that occludes the story's meaningful choice. Current road dressing places fork signs off the road and uses smaller median chevrons. Maximum-bound review also applies to boss-bar entrances and slam-scaled banners. Reported final evidence was 900 encoded frames, whole-film extracted-frame review, −14.15 LUFS/−1.07 dBTP, reverse-seek equality and matching local copy checksum. Again this is attributed verification, not a new check of those MP4s by the skill author.

Latest `SonicSol` lesson: clear/fill the untransformed full-frame stage **before** shake/camera translation; moving a full-frame background without first clearing exposes pixels from a previous seek at the edges. All analytic actor motion can be correct while a reused framebuffer still breaks determinism. Its reported harness proof compared the same PNG after visits to 14.8 and 1.0 at four impact/tally moments. Cached art/scratch is safe only when every dynamic layer is reset and cleared each draw. This reinforces the exercised reverse-order proof above; no unchanged template checks were rerun for these addenda.

## True 3D: PS2 and modern-game production

Sources: `films/grand-theft-remy`, `remy-gear-solid`, `god-of-hair`, `remy-burnout`, `remy-halo`, `remy-souls`, `remy-portal`, `remycraft`, `remy-league`, and `remy-2077`. These are independently owned examples, not new shared dependencies. The lessons below combine inspected source and builders' reported render fixes; do not present a builder's measurements as your own listening or playback.

### Characters, contact and camera geometry

- Build articulated mesh characters with actual head volume, sculpted hair and expressive limbs. Match a reviewed original's palette/face, verify bald/hairy casting, and preserve a recognizable silhouette. A textured portrait floating over a cube is not an articulated 3D character. Use the existing sprite rig for intentional 2D scenes, not as an automatic substitute for requested 3D.
- Chibi proportions affect every prop: Burnout's driver hair intersected the coupe roof. Fit roof, pillars and glass to the **whole posed head bounds**, not torso height. Stealth's short arms could not reach over its large head; shift the shoulder anchors appropriately and model a grip bar/trolley at the actual hands.
- World-space cameras can be inside buildings even when the actor path is correct. Hair City's side camera initially sat in the storefront row and hid the ramp jump. Keep camera paths in clear space; temporarily hold the camera on the roadblock so the pursuing cars' collision remains visible instead of following the hero away from it.
- Check every foreground silhouette. Halo's oversized head obscured its targets; the jeep roll bar later crossed the face. Opposite-shoulder combat framing, a farther-right parking/dismount path and a left-front victory camera resolved different moments. A distant signature ring needed `fog:false` on its own materials, not removal of useful valley fog.
- Rotation changes ground support. Burnout's raised roof made symmetric roll clearance wrong: upright lower bounds and inverted upper bounds differ. Calculate support from the rotated body's bounds, including width at sideways angles, so neither roof nor wheels bury into the ground. Do not merely clamp the object's centre.
- Transfers between outside rig, seated driver, held object and vehicle-mounted actor need one exact ownership boundary and matched world transforms/scale. Hair City initially showed both hero representations for 50ms; mutually exclusive visibility predicates at the same instant removed the duplicate.
- Solve tool, hand, blade and target contact in world space. Voxel mining required arm reach and lane offsets; its diamond pickup ends at a matrix-derived hand position. Cyber's sword orientation and path needed rendered contact review, not just matching a damage timestamp.
- Repeated locomotion should not ease to zero before an imminent impact. A smoothstep raider march made RemyCraft's threat crawl near the trap; use continuous march speed when the character is meant to keep approaching. Ease intentional arrivals, not every path by habit.

### Multi-pass portals and render state

`remy-portal/art.js` uses a real destination-camera render, screen-projective aperture mapping and clipping, rather than painting a black disk and teleporting the actor. Its camera transform is:

```text
destinationWorld × rotationY(π) × inverse(sourceWorld) × mainCameraWorld
```

Update world matrices before mapping. Copy the main projection, clip at the destination plane, hide portal surfaces during the secondary render to prevent feedback, and restore render target, clipping state and visibility before `Stage.draw`. This example is deliberately **nonrecursive**; do not imply infinite recursion.

A mathematically correct portal camera can still see nothing useful: the cutaway chamber lacked the walls/ceiling visible from the destination camera. A secondary-pass-only enclosure made that view coherent without blocking the main cutaway shot. Inspect both the aperture image and clipped actor transit at dense frame intervals; a beautiful rim does not prove the portal view is correct.

### Reading overlays and encoded audio

- Keep 3D HUD/type on the post-composited overlay; bloom, depth blur and fog should not swallow values. Check scale peaks, health changes, goal counters and result holds in encoded output.
- League's `span:true` caption visibly held across a replay cut, but lint measured only the pre-cut portion. Check the actual full visibility interval; if an explicitly documented per-caption `minHold` accounts for that implementation limitation, it must not excuse an unreadably short real hold. Do not globally weaken caption lint.
- AAC can overshoot a nominal −1 dBTP target. Measured overshoots occurred in several modern films; **inspect decoded final AAC**, not only the pre-encode WAV or configured target. Lowering integrated LUFS alone was not monotonic around loudnorm's linear/dynamic switch.
- Prefer a film-local correction with measured headroom rather than editing the shared toolkit. Report exactly whether you adjusted source gain/target or performed audio-only normalization/remux with the H.264 video copied unchanged. Re-measure the delivered master and regenerate/update loudness and spectrum evidence; never leave sidecars describing a superseded file.
- Original genre scores matter: city synth-funk, stealth breakbeat, mythic percussion/choir, arena EDM, laboratory glass-FM, quiet voxel plucks and cyber synths have different balance needs. A chiptune gain heuristic from the first film is not a universal mix rule.

### Verification that catches 3D defects

Inspect encoded establish → anticipation → contact → recoil → landing → result, with dense strips at transfers, dodge/parry, portal transit, aerial ball touches and rollovers. Check spatial occlusion and visible cause/effect, not only HUD values. Compare identical timestamps after ascending and descending seeks: reset limb rotations, materials, light intensity, visibility, scratch canvases and secondary-pass state. Static geometry may be cached; mutable state must not depend on which frame a render worker saw first.


Creative-review refinements add **aftermath visibility**: Portal's defeated turret originally fell behind the cube/lower HUD, so it now falls sideways into clear space. Souls' critical now has visible breastplate contact, a motivated contact-camera arc and recoil; its dissolution samples head/torso volumes rather than a uniform particle cylinder. League's replay-to-live remap resumed an already-expanded shockwave around the close celebration camera; gate effects by shot intent as well as event age. Deterministic time mapping alone does not guarantee good staging on return from a replay.

Show the hidden side of props before approving a tumble: Burnout's full-width dark floor pan became a featureless black slab at the crash climax. Grey rough plating, axle/differential, driveshaft, exhaust and chassis ribs made the inverted car read as a car. For a pale environment, Halo's original white grenade merged into the identical white turret lens: use a distinct blue projectile, visible hand release, travel trail and contrasting attachment pulse. Small HUD labels are not a substitute for readable action. Myth's victory exposes the fallen bald face and begins the slam shockwave at the measured distance to the titan's feet; the orb counter needs its own dark backing against sky. These are general staging/material lessons, not requirements for every Remy film.

Cyber's contact pass moves the camera to the opposite three-quarter view so the oversized head cannot hide the slice, brightens the slash and emissive sparks, and sends severed drone parts away from the hero's lane. Stealth's box opening uses a hinged red-hair peek and push-in so the disguise contains a visible character, and the retrieved key stows on the belt before zipline travel to preserve the face. Identity, action and outcome must be legible without relying on text or a reviewer knowing the script.
