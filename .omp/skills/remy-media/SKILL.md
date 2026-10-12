---
name: remy-media
description: Create, edit, animate, preview, score, render and deliver any Remy video or animation, including cinematic shorts, promos, explainers, memes, Remy videos, bald Remys or Cabald stories, and video-game parodies. Use for Remy image assets, sprite rigs, deterministic filmkit animation, original synthesized music, and final MP4 verification.
---

# Remy media

Make a **finished moving film**, not a collection of static cards. This skill applies to any Remy format and any requested duration. Game parodies are one worked example, not the default. Read `skill://filmkit`, `~/dev/filmkit/README.md`, this skill's `assets.md`, and the actual core modules you call before writing code. Never guess API signatures or CLI flags.

## Start here (explicit agent procedure)

1. Read the user's requested format, duration, aspect ratio, story, tone and delivery location. Preserve these; do not silently substitute a game film or a six/15-second duration. Choose duration from the content only when the user leaves it open.
2. Read project instructions and existing film source. If resuming a builder, read its prior transcript and retained files; keep good existing work. Establish folder ownership before editing. Never change another builder's film, shared app code, `films/still-here`, or the finished read-only reference `films/remy-bros`.
3. Select the visual language and cast. **Hairy Remys are heroes; bald Remys are the Cabald antagonists.** Use `scripts/quest-bald.json`, not a guessed hairstyle. Hero #42 is red-haired with a sword. Inspect labelled contact sheets before choosing any other id. Original art, pixel rigs, procedural geometry, or a mixture are all appropriate.
4. Write a shared cue sheet (`timeline.js` or `choreo.js`) for shots, actions, captions and score. Choose real actions and camera movement for each shot. Ensure a readable setup, development and payoff appropriate to the format; no mandatory gameplay beat sequence.
5. Prepare assets once, draw every frame from time, iterate on inspected stills, then inspect an encoded draft for motion. Repair collisions, text, composition, wipes and mix before final lint/render.
6. Verify the **encoded final MP4** across its entire duration, inspect loudness and spectrogram, deliver and checksum the copy. Report only checks actually performed.

### Format choices, not prescriptions

- **Meme/reaction:** concise setup → expressive physical reaction → punchline; a deliberate loop if requested. Use portrait cut-ins, readable short text and a sharply timed sound gag.
- **Cinematic:** establish place → motivated camera/actor motion → reveal or reversal → emotional resolution. Use framed originals, layered environments, light, depth and restrained type. Length follows the story.
- **Promo/trailer:** hook → demonstrate value/identity → escalating visual rhythm → held call to action. Use a coherent palette, original score and beat-synced transitions; do not advertise nonexistent features.
- **Explainer:** one idea per shot, character-led demonstrations, diagrams and captions with enough reading time. Motion must clarify a relationship, not merely decorate it.
- **Music visual/montage:** develop a motif, change scale/location/action with musical sections, preserve character identity, end intentionally.
- **Game parody:** show actual animated play, credible rules, hero/Cabald interaction and a satisfying consequence. Original art/music/parody names only: no copied copyrighted logos, ripped sprites or soundtrack melodies.

## Tools and verified APIs

**filmkit** is the rendering engine, not a video editor UI. Run from the repo root. It serves project files and core modules to headless Chromium, renders Canvas/WebGL, synthesizes WebAudio offline, then encodes/muxes through ffmpeg. The user's ordinary browser tab/browser relay is not that renderer; diagnose render errors with `FILMKIT_DEBUG=1`.

- `filmkit new <slug> --template explainer|cinematic|promo`: available stock scaffolds.
- `filmkit preview <slug> --no-open --port 8765`: live player; only preview needs an explicitly chosen port. Headless stills/lint/render use an OS-assigned port (`startServer` default `port: 0`). **Do not invent `render --port`.** `--workers 1` is supported when simultaneous renders create pressure; default is 2.
- `filmkit stills <slug> 0.5,2,4.2` or `--scenes`; `--out <dir>` is supported.
- `filmkit sheet <slug>`; `filmkit sheet <slug> --video output/<slug>/<file>.mp4` inspects encoded scene start/middle/end.
- `filmkit lint <slug>` checks shot coverage, grid cuts and declared captions. It is **not** proof of good animation, music, collision logic, or custom-drawn text readability. A zero-caption pass does not validate your hand-drawn HUD.
- `filmkit render <slug> --fps 30 --preset veryfast --out output/<slug>/draft.mp4 --force` for drafts; final `filmkit render <slug> --force` defaults to 1920×1080 at 60fps. Run long renders with tool timeout **0**. Do not claim another aspect/resolution without checking engine support.
- ffmpeg/ffprobe: decode, inspect stream facts, extract frames, montage, analyse audio. Pillow: labelled character sheets, alpha crops and preprocessing. Use `uv run -q --with pillow python` for the included Python helper.

### Film contract

Imports `filmkit/lib.js`, `filmkit/motion.js`, `filmkit/cam3d.js`, `filmkit/stage3d.js` and `three` resolve through the player import map; bare imports are browser-side, not automatically Node-resolvable.

```js
import { W, H, seg, E } from 'filmkit/lib.js';
export default {
  title: 'Remy reveal', output: 'remy-reveal.mp4', duration: 8,
  async prepare({ variant }) { /* decode images and bake static art here */ },
  shots: [{ name: 'reveal', t0: 0, t1: 8,
    draw(ctx, lt, dur, t, overlay) {
      ctx.fillStyle = '#151329'; ctx.fillRect(0, 0, W, H);
      const u = E.outCubic(seg(lt, 0, 1));
      // Draw prepared characters/props with transforms derived from u and t.
    },
    fx: () => ({ bloom: 0.1, bloomThresh: 0.9, grain: 0.01 }),
  }],
  captions: [{ id: 'reveal', text: 'HAIR HAS ARRIVED', t0: 1, t1: 7, style: 'title', y: 220 }],
  score(kit) { kit.impact(1); kit.pad(1, [48, 55, 60], 6); },
  audio: { seed: 42, reverb: 1.2, reverbGain: 0.25 },
};
```

This illustrates the contract, not a finished film; the runnable three-file worked template below includes real moving Remys and a complete score. Shot `draw(ctx, lt, dur, t, overlay)` receives local shot time and absolute film time. Shots must be contiguous and cover `[0,duration)`. Optional `seek(t)` is asynchronous media preparation per frame: wait for exact video seeks there, never in synchronous `draw` (read README for blob URLs/short-GOP footage). The runtime clears its own main/overlay canvases, **not your persistent auxiliary canvases**.

`lib.js`: `seg(t,a,b)` clamps progress; `lerp(a,b,u)`, `E.outCubic(u)`, `hash(integerSeed)` and `rng(seed)` provide deterministic math. `txt(ctx,s,x,y,{size,font,color,align,...})` and `measure(ctx,s,size,font,track,weight)` are actual signatures. `motion.js` contains `lineIn`, `typewriter`, `slam`, `chip`, `flowArrow`, `counter`, `stamp`; read their signatures before use.

**Type:** ordinary reading text belongs on `overlay`, or in declarative `captions`, after bloom/grade. Caption styles support `size,font,x,y,anim,in,out,...`. Full hold excludes entrance/exit/typewriting; default lint minimum is 3s. Plan enough time rather than weakening the hold globally. For an intentionally short label use a reasoned per-caption `minHold`; maintain real readability. Pixel HUD text can deliberately live on the native low-res canvas for nearest-upscaled styling, but lint cannot fully judge it. Use 16px or larger at 960×540 for reading text and inspect the encoded result. Fit long text with `measureText`, wrap or shorten it; never just clip it.

**3D:** Canvas `cam3d.lookAt(pos,target,fovDeg,roll)` returns a camera with `project(p)`; projected points can be null behind camera. `dofSprite(ctx,img,x,y,w,h,blur,opts)` supplies preblurred sprite depth. For real three.js, create `new Stage({fov,near,far,dof,background,exposure})` in `prepare`, add meshes to `stage.scene`, then per frame set every object transform, `stage.look([x,y,z],[tx,ty,tz],roll,fov)`, `stage.focus(distance,aperture,maxblur)`, `stage.draw(ctx)`. Read `stage3d.js`/`fx3d.js` before adding rain, motes or lights. Do not carry physics or wall-clock deltas between frames.

## Assets, cropping and rigs

Read `assets.md` for exact paths, atlas formulas, sizes and helper options. The sources include opaque 600×600 `media/remy/Character<ID>.webp` originals, near/far transparent quest sprites, front/profile head atlases, minis, art metadata and separately indexed Halloween originals. Fonts include Press Start 2P and Pixelify Sans in node_modules, plus filmkit's core cinematic/explainer fonts. Do not treat the Halloween token IDs as quest IDs.

```sh
uv run -q --with pillow python .omp/skills/remy-media/scripts/contact.py --kind bald --src near --n 80
uv run -q --with pillow python .omp/skills/remy-media/scripts/contact.py --src orig --ids 42,5,1217 --cols 3
```

**Read the produced PNG.** Reject unwanted slogan overlays, oversized props, ambiguous hair silhouettes or clipped weapons. Mirroring reverses printed slogans; choose clean assets or repaint/remove print deliberately. Frame opaque originals as portraits/cut-ins (panel, circle clip, museum frame), or make a reviewed matte; drawing an opaque square does not produce a cutout.

Shared stable rig (read-only reference):
```js
import * as A from '../remy-bros/art.js'; // from films/<slug>/
// In prepare:
const hero = await A.loadRemy(42, false); // false near; true far
const heads = await A.loadHeads();
const icon = A.headIcon(heads, 42, 2);
// In draw: (x, feet) is the foot anchor, not the sprite's top-left.
A.drawRemy(ctx, hero, x, feet, {
  lift: [3, 0], stride: [1, -1], lean: 0.04,
  flip: false, sx: 2, sy: 2, rot: 0,
  glow: '#ffe27a', glowA: 0.3, white: false, alpha: 1,
});
```

The rig splits generated legs at `legTop = 2 + 576/f + max(2,round(18/f))`, with f=6 near/9 far. It uses silhouette alpha to find feet, shears body strips for lean, independently lifts/strides legs, and creates white hit/glow masks. That is better than sliding a rigid sticker. Atlas cell: `(id % 67)*16, floor(id/67)*16`. To crop raw sprites use alpha bounds and preserve padding/foot anchors; avoid id-specific guessed coordinates. A back view is not a mirror of a face: `pokeremy/art.js` samples hair, repaints face area as hair and flattens shirt print before its deliberate mirror. This needs per-character review.

**Procedural art:** bake static backgrounds/props in `prepare()`, with integer canvas/ImageData dimensions. Establish outline, shadow, base, light and highlight ramps, then seeded texture/Bayer dither. Give clouds puff seams/belly shadow, mountains lit and shaded faces, distant haze, treelines, dirt rocks and dark pit depth. Flat rectangles plus a gradient are not reference-film quality. Use coherent silhouette/light direction; cinematic smooth art need not be pixel-dithered. Keep bloom restrained on bright skies/paper (start around 0–0.14, threshold 0.9; visually tune, not a universal guarantee).

## Motion, choreography and time mapping

Every frame must be independently drawable at any t, in any order. No `Math.random()`, `Date.now()`, incremental x, cumulative rotations, particle integration or frame-index-dependent state. Seed randomness once for immutable prepared art, or use event/id hashes. Reset every animated transform and canvas state each frame. Clear/repaint **all** auxiliary pixels, including overscan exposed by shake. The supplied template fixed stale borders by painting outside the stage before applying shake.

Use anticipation → contact → recoil/follow-through, planted feet/shadows, overlapping secondary motion, squash/stretch, trails, parallax and motivated camera easing. Do not let the camera hide the payoff, let an actor teleport through geometry, or use a title card to replace the action requested. Derive props and contact positions from the actor path at event times. Precompute integrated speed lookup tables when speed varies; draw interpolated positions from that immutable table. For jump arcs, eased ascent/descent or analytic ballistic equations are reliable.

Hit-stop is optional for **any** weighty action, including a cinematic slam or meme punchline. Keep shot time and action/world time separate. A sorted immutable `STOPS = [{g,d}]` freezes world time; shake/flash use real time. The proven `templates/film/choreo.js` exports:
```js
export function warp(ts) {
  let acc = 0;
  for (const s of STOPS) {
    const rs = s.g + acc;
    if (ts < rs) return { g: ts - acc, stop: null, sl: 0 };
    if (ts < rs + s.d) return { g: s.g, stop: s, sl: ts - rs };
    acc += s.d;
  }
  return { g: ts - acc, stop: null, sl: 0 };
}
export function filmT(g) {
  let acc = 0;
  for (const s of STOPS) if (s.g < g) acc += s.d;
  return VS + g + acc; // VS is this example's shot offset; replace with your shot start.
}
```
Equality intentionally schedules an impact at the **start** of its freeze. To schedule a resumed continuous interval at that same world time, include the equal-time stop duration explicitly. Do not use the onset mapper for resume boundaries. Score/SFX import the same mapper, never a hand-added guessed delay.

Analytic particles: immutable events `{g,x,y,seed}`; for each frame compute `age = worldTime-event.g`, skip outside lifetime, position `x+vx*age`, `y+vy*age+0.5*gravity*age*age`, fade by age. Seed velocity from id/hash. No particles appended by `draw()`. Wipes: for an evenodd iris, `beginPath(); rect(...); moveTo(cx+r,cy); arc(cx,cy,r,0,2*Math.PI,true); fill('evenodd')`; missing `moveTo` creates a visible wedge. Inspect intermediate radii and ensure the iris focuses on the intended subject.

## Original music and audio

Compose for the chosen format, not always chiptune. A shared bar/beat grid, original motif, harmonic development, dynamics and an intentional ending make a score; a loop plus a few loud effects is not enough. Never rip copyrighted songs or imitate a protected melody. Cinematic kit: braam/strings/choir/piano/taiko; electronic: kick/hat/bass/pluck/pad; foley: whoosh/clunk/wind/rain/heartbeat. All cues use seconds/MIDI and must align with picture.

Verified basic calls: `kit.kick(t)`, `kit.pad(t,[48,55,60],dur)`, `kit.impact(t)`, `kit.riser(t0,t1)`, `kit.whoosh(t)`. Inspect `core/audio.js` for optional gain parameters; do not assume all instruments have the same options object. Licensed/user-owned samples: `audio.samples = {hit:new URL('./hit.wav',import.meta.url).href}`, `kit.sample(t,'hit',{gain,pan,width,rate,offset,dur,send})`.

Custom voices use `kit.at(t, () => {...})` so nodes are created just in time. Actual primitives: `kit.osc(type,frequencyHz,t,dur)`, `kit.noise(t,dur)`, `kit.out(node,gain,send,pan,width)`, `kit.ac` OfflineAudioContext, `kit.hz(midi)`, `kit.R` seeded RNG. Build explicit attack/release envelopes; exponential ramps require positive endpoints. Do not connect every raw oscillator directly to the bus.

For an original retro pulse voice see the runnable `templates/film/score.js`: cached `ac.createPeriodicWave(real,imag)` with Fourier coefficients for 12.5/25/50% duty, gain envelope, optional pitch ramp, triangle bass and filtered noise. `remy-bros/score.js` supplies richer fanfares/SFX; fighter/rush use custom FM (carrier frequency modulated by another oscillator) for a different timbre. Start triangle bass gain near 0.2 in **this custom voice**, not as a universal gain ceiling for every synth. Listen/check bands; loudness normalization cannot repair bass masking or poor musical balance. Leave room for impacts and avoid clicky abrupt tails.

## Stills → draft → final → delivery

Run only for your owned film. Helper `st.sh` clears that film's accumulated stills so old PNGs cannot contaminate a montage. Pass a simple film slug, not a path/traversal; it deletes `output/<slug>/stills`.

```sh
bash .omp/skills/remy-media/scripts/st.sh <slug> 0.5,2,4.2 3
# READ output/<slug>/montage.png and individual key frames.
filmkit render <slug> --fps 30 --preset veryfast --out output/<slug>/draft.mp4 --force
bash .omp/skills/remy-media/scripts/mp4check.sh output/<slug>/draft.mp4 0 4
# READ output/<slug>/draft.strip.png; repeat at later windows and around fast impacts.
filmkit lint <slug>
filmkit render <slug> --force
filmkit sheet <slug> --video output/<slug>/<final>.mp4
bash .omp/skills/remy-media/scripts/mp4check.sh output/<slug>/<final>.mp4 0 4
```

**Do not stop after source inspection or lint.** Stills at onset/contact/recoil, every text layout, climax and ending; draft strips around cuts, pauses, collision/occlusion and camera transitions; final encoded frames spread over the **whole** duration plus dense strips at tricky moments. A scene sheet alone may miss fast defects. The helper prints ffprobe codec/resolution/fps/frame count/duration and full/three-band mean/peak levels. Its chip-band thresholds are heuristics, not requirements for cinematic sound. It produces 16 samples over the requested seconds; its default is four seconds.

ffmpeg montage primitive (use a clean owned directory):
```sh
ffmpeg -v error -y -pattern_type glob -i 'output/<slug>/stills/*.png' -vf 'scale=640:-1,tile=3x3' -frames:v 1 -update 1 output/<slug>/montage.png
ffmpeg -v error -y -ss 2 -t 2 -i output/<slug>/draft.mp4 -vf 'fps=8,scale=480:270,tile=4x4' -frames:v 1 -update 1 output/<slug>/impact.png
```
Match tile capacity to selected frames; `-frames:v 1 -update 1` avoids multiple-image filename errors. Extract more than one sheet when needed. Read `<final>.loudness.json` (output integrated LUFS/true peak and per-scene values) and `<final>.spectrogram.png`. Default render targets −14 LUFS integrated/−1 dBTP maximum; true peak may be well below the ceiling. Silence/missing score or a scene 8+ LU quieter than neighbours requires investigation, not blind approval. The AAC-normalized result, not the source WAV, is the final evidence.

Delivery when requested:
```sh
mkdir -p "$HOME/Library/Mobile Documents/com~apple~CloudDocs/Remy Videos"
cp "output/<slug>/<final>.mp4" "$HOME/Library/Mobile Documents/com~apple~CloudDocs/Remy Videos/<slug>.mp4"
shasum -a 256 "output/<slug>/<final>.mp4" "$HOME/Library/Mobile Documents/com~apple~CloudDocs/Remy Videos/<slug>.mp4"
```
Equal local checksums prove byte equality, **not that remote iCloud sync completed**. Quote all space-containing paths. Remove only your scratch/draft artifacts when finished; preserve source and final QA evidence. Do not run app builds or edit global config just to render a film.

## Worked template and production lessons

`templates/film/{film.js,choreo.js,score.js}` is a **6s worked example**, not a duration or genre constraint. It combines original portrait panels, moving near-sprite rigs, head HUDs, analytic particles, synchronized hit-stop/score, nearest 2× pixel stage and iris. It imports only the stable `films/remy-bros/art.js` rig. Copy from repo root to a new absent film folder, rename title/output and replace story/timing/art/score to suit the real brief:
```sh
cp -R .omp/skills/remy-media/templates/film films/<new-slug>
```
Do not render the template in its skill directory: relative imports intentionally expect `films/<slug>/`. Supporting paths: `assets.md`, `scripts/contact.py`, `scripts/st.sh`, `scripts/mp4check.sh`. Do not leave a scratch film registered after proving a template.

Complex lessons from the original and ten sibling builders are preserved in `lessons.md`, with source pointers and the distinction between an implementation pattern and a finished-film verification. Read the relevant section when building a maze, puzzle, racing, platform, fighter, battle or raycast scene. These lessons also apply to cinematic staging, motion graphics and explainers: shared truth for events, physical contact, camera legibility, depth/occlusion, palette-preserving materials and sound envelopes.

For PS2/modern **true 3D**, read `lessons.md` § True 3D before building. It covers articulated chibi rigs, head/vehicle clearance, rotated support bounds, world-space camera occlusion, precise seated/held-object handoffs, portal secondary renders and render-state restoration, readable contact/aftermath, and final AAC peak measurement. New film folders are examples, not shared dependencies; keep each production independently owned.

## Completion checklist

- Brief honoured: format, duration, cast/lore, original content, actual animation and requested delivery.
- All selected assets inspected; alpha/background handling, feet anchors, hair/bald identity and mirrored print correct.
- Frame is pure in time; static preparation cached; no stale buffers, missing transforms, hidden action or discontinuous trajectories.
- Art has coherent light/depth/detail, not placeholder fills; effects enhance rather than wash out subjects.
- Reading text is large, safe, contrasty, unclipped and held long enough; custom HUD reviewed separately from lint.
- Contact/impact/pickup events match paths, props, HUD and score; freeze/resume boundaries correct.
- Complete original score/SFX, balanced across sections and frequency bands, intentional end, no missing audio.
- Inspected stills, encoded draft motion, final lint pass, final encoded all-duration frame proof, ffprobe, loudness JSON and spectrogram.
- Delivered copy checksum matches; report exact paths, duration/resolution/fps, observed loudness, proof and genuine limitations. Never call an unrendered or visually unchecked film finished.
