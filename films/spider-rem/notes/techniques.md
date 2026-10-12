# SPIDER-REM — technique scout notes

Verified from source: `/Users/z80/dev/filmkit/core/{lib,motion,audio}.js`,
`/Users/z80/dev/remyboysfrontend/films/hairyweight/{art,film,score}.js`,
`films/remy-bros/{art,score}.js`, `films/remy-bros/choreo.js` (== skill template `choreo.js`),
`films/remy-anime/art.js`, `.omp/skills/remy-media/{lessons.md,templates/film/*}`.
Everything below is copied from real parameter names/defaults unless marked UNCERTAIN.

---

## 1. Verified signatures

### filmkit lib.js (`import { ... } from 'filmkit/lib.js'`)

```js
export const W = 1920, H = 1080;
clamp(x, a = 0, b = 1)            // clamps
lerp(a, b, t)
seg(t, a, b)                      // clamp((t - a) / (b - a)) — 0..1 progress of [a,b]
smooth(t)                         // smoothstep
E.inQuad | outQuad | inCubic | outCubic | inOutCubic | outQuart | outExpo | inExpo | inOutExpo | outBack | outElastic
hash(n) -> 0..1                   // deterministic, no Math.random anywhere
rng(seed) -> () => 0..1           // seeded PRNG
pick(r, arr)
vnoise(x, seed = 0)
spring(t, k = 14, z = 0.35)       // damped step response — great for web-spring bobs
rgb(hex) -> [r,g,b];  mixHex(a, b, t) -> 'rgb(...)';  alpha(hex, a) -> 'rgba(...)';  shade(hex, k)
F = { anton: 'Anton', mono: '"JetBrains Mono"', grot: '"Space Grotesk"', vt: 'VT323', serif: '"Cormorant Garamond"' }
txt(ctx, s, x, y, o = {})         // o: { size=48, font=F.anton, weight='', color='#ffffff',
                                  //   align='left', base='alphabetic', track=0, alpha=1,
                                  //   shadow, off=size*0.03, glow, glowBlur=size*0.35,
                                  //   stroke, strokeW=2 }
measure(ctx, s, size, font = F.anton, track = 0, weight = '') -> px width
rrect(ctx, x, y, w, h, r);  star(ctx, x, y, n, r1, r2, rot = 0)   // star = comic burst base
```

### filmkit motion.js (`'filmkit/motion.js'`)

```js
lineIn(ctx, s, x, y, pIn, o = {}, pOut = 0)   // o.size ?? 100 clip window; pOut exits upward
typed(s, t, cps = 22) -> substring
stamp(ctx, s, x, y, o = {})   // boxed ink stamp. o: { size=140, p=1 /*0..1 slam progress*/,
                              // color='#ff2e4d', seed=7, rot=-0.18, alpha }
slam(ctx, text, x, y, p, o = {})  // oversized type punches down via E.outBack. o: {
    // from=2.2, shake=0 /*px, decays (1-q)*/, size=150, font=F.anton, color='#fff',
    // track=0, glow, glowBlur, alpha, flash /*white flash if q<0.12, alpha=o.flash*/ }
chip(ctx, x, y, w, h, label, p, o = {})       // springy pill label. o: { glow, glowBlur=24,
    // active, activeColor, color='#b8ff5a', fill, lineWidth=2, size=26, font=F.mono,
    // textColor, track=1, overlay /*other ctx for post-grade text*/ }
flowArrow(ctx, x0, y0, x1, y1, p, o = {})     // o: { bend, bendY, color='#b8ff5a', width=5,
    // glow, glowBlur=18, dashed(true|[12,10]), head=20, packet, packetSize=8, phase }
typewriter(ctx, s, x, y, lt, o = {})          // o: { cps=24, size=44, font=F.mono,
    // weight=500, color, align='left', base='middle', track=0, caret!==false,
    // caretColor, caretGap=4, caretHeight=24, caretWidth=3 }. returns chars shown n
underline(ctx, x, y, w, p, o = {})            // o: { color='#b8ff5a', width=4, alpha, glow, glowBlur=12 }
counter(ctx, from, to, p, x, y, o = {})       // o: { prefix='', suffix='', size=72, font=F.anton,
    // color, align, base, track }. E.outCubic count-up; returns value
```

Comic mapping: `slam` IS the onomatopoeia tool ("THWIP!", "KRAKK!") — pair with `o.flash` and a
hand-drawn burst behind it (§5). `stamp` is the caption-box/label tool (rotate ~-0.18 default).

### kit audio instruments (`createKit`, `core/audio.js` — all scheduled `kit.<name>(...)`)

Custom voices are built inside `score(kit)` with verified primitives `{ at, ac, osc, noise, out, hz, R }`;
wrap every node build in `at(t, () => {...})` and always exit through
`out(node, gain, send=0..reverb, pan=-1..1, width=0..Haas)`.

```js
kick(t, g = 1)                      clap(t, g = 0.5)
hat(t, g = 0.12, dur = 0.045)       crash(t, g = 0.22)
bass(t, m, dur, g = 0.35, type = 'sawtooth', cut = 700)      // m = midi note
pluck(t, m, g = 0.08, cut = 3200, dur = 0.22, type = 'sawtooth')
pad(t, notes, dur, g = 0.05, cut = 1600, atk = 0.4)
bell(t, f, g = 0.12, dur = 1.2, ratio = 3.5, index = 3)      // f in Hz (FM)
impact(t, g = 0.8, low = 55)        // body-drop + noise wash — the SLAM sound
riser(t0, t1, g = 0.18)             // noise BP 300→7000 + saw 110→880, ends exactly t1
sweepDown(t, dur, f0, f1, g = 0.3, type = 'sine')
tick(t, g = 0.08, f = 3000)         blip(t, f, g = 0.07, dur = 0.08, type = 'square')
glitch(t0, dur, g = 0.08)           drone(t0, t1, notes, g = 0.05, cut = 500)
braam(t, notes, dur = 3, g = 0.3, bright = 1)   // Inception brass wall (this is the brass kit)
taiko(t, g = 0.8, f = 62)           // sine drop to f + 260Hz bandpass slap — comic punch drum
strings(t, notes, dur = 4, g = 0.05, atk = 1.2, rel = 1.5, cut = 2600)
choir(t, notes, dur = 4, g = 0.05, vowel = 'a', atk = 1.4, rel = 1.8)   // vowel 'a'|'o'|'u'
piano(t, m, g = 0.18, dur = 4)      sub(t, g = 0.6, f0 = 90, f1 = 28, dur = 2.5)
swell(t0, t1, g = 0.25, top = 9000) // reverse cymbal, peaks exactly at t1
rain(t0, t1, g = 0.12)              thunder(t, g = 0.5, dur = 4.5)
wind(t0, t1, g = 0.15, f0 = 400, f1 = 1600)     // f0→f1 bandpass — city altitude wind
glass(t, g = 0.3, spread = 1.4)     clunk(t, g = 0.5)   hiss(t, dur = 1, g = 0.12)
heartbeat(t, g = 0.5)               crowd(t0, t1, g = 0.15)
whoosh(t, dur = 0.8, g = 0.2, f0 = 300, f1 = 3500)  // THE web-swing SFX: BP f0→f1→f0 hump
flutter(t0, t1, g = 0.12)           sample(t, name, { gain=1, pan=0, width=0, rate=1, offset=0, dur, send=0 })
```

No taiko/strings/choir/braam optional-object — they are positional args exactly as above.
Film entry: `audio: { seed, reverb, reverbGain }` (hairyweight: `{ seed: 1985, reverb: 1.7, reverbGain: 0.26 }`).

---

## 2. Overscan world canvas + per-frame camera blit (proven shape, hairyweight/film.js)

Constants (hairyweight art.js): `OVER = 120; AW = 2160, AH = 1320` (1920x1080 + 120 px each side).
Author every bake with `x.translate(OVER, OVER)` so world coords == frame coords.

```js
// prepare(): persistent world canvas + resettable ctx
S.frame = A.canvas(ART.AW, ART.AH); S.frameCtx = S.frame.getContext('2d')
function frameCtx() {                     // hairyweight film.js:237 — resets EVERY frame (SonicSol lesson:
  const x = S.frameCtx                    // clear/fill the untransformed full stage BEFORE camera moves,
  x.setTransform(1, 0, 0, 1, 0, 0)        // or stale pixels leak at edges on seek)
  x.globalAlpha = 1; x.globalCompositeOperation = 'source-over'
  x.filter = 'none'; x.imageSmoothingEnabled = false
  return x
}
function drawWorld(x, g, t, o = {}) {     // :395
  const fc = frameCtx()
  fc.clearRect(0, 0, ART.AW, ART.AH)
  fc.translate(ART.OVER, ART.OVER)        // back to world coords
  fc.drawImage(S.arenaBack, -ART.OVER, -ART.OVER)   // bakes drawn at -OVER,-OVER
  // ... layers, actors (pure in world g), then o.after?.(fc, t)
}

// shake: real shot time so it keeps moving THROUGH hit-stop freezes. SHAKES: [{real, amp, decay}]
function shakeAt(t, extra = 0) {          // :414
  let sx = 0, sy = 0
  for (const s of SHAKES) {
    const d = t - s.real
    if (d < 0 || d > 0.5) continue
    const k = s.amp * Math.exp(-d * s.decay)          // exponential decay envelope
    sx += Math.sin(t * 67 + s.real * 13) * k
    sy += Math.cos(t * 53 + s.real * 7) * k * 0.6     // vertical at ~0.6x
  }
  return [sx, sy]
}
function clampCam(cam) {                  // :429 — overscan guarantees the clamp never exposes an edge
  const hw = W / 2 / cam.zoom, hh = H / 2 / cam.zoom
  cam.x = clamp(cam.x, hw - ART.OVER, ART.AW - ART.OVER - hw)
  cam.y = clamp(cam.y, hh - ART.OVER, ART.AH - ART.OVER - hh)
  return cam
}
function blit(ctx, src, cam, t, ox = 0) { // :436 — THE camera transform
  const [shx, shy] = shakeAt(t)
  ctx.save()
  ctx.imageSmoothingEnabled = false
  ctx.fillStyle = '#04060b'; ctx.fillRect(0, 0, W, H)   // bg BEFORE transform
  ctx.translate(W / 2 + shx + ox, H / 2 + shy)
  ctx.scale(cam.zoom, cam.zoom)
  ctx.translate(-cam.x, -cam.y)
  ctx.drawImage(src, -ART.OVER, -ART.OVER)
  ctx.restore()
}
function kickZoom(t, who, amp = 0.028) {  // :449 — punch-in kick on landed hits
  let k = 0
  for (const p of PUNCHES) {
    if (p.who !== who || !p.landed) continue
    const d = t - filmT(p.t)
    if (d >= 0 && d < 0.4) k += amp * Math.exp(-d * 9)
  }
  return k
}
function camera(name, t) {                // :459 — per-shot keyframes; returns clampCam({x, y, zoom})
  let x = 960, y = 540, zoom = 1
  switch (name) { /* pan = x/y over seg(); punch-in = zoom lerp; handheld = +sin/hash wobble */ }
  return clampCam({ x, y, zoom })
}
// shot draw:  drawWorld(frameCtx(), warp(t).g, t, {...}); blit(ctx, S.frame, camera('x', t), t); vign(ctx, k)
```

Shot/overlay contract (template + hairyweight): `draw(ctx, lt, dur, t, ov)` — `ov` is the
post-grade overlay; put reading text/HUD there (>= 28 px) so bloom/grain never eats it.
`fx: (lt, t) => ({ bloom, bloomThresh, vignette, grain, sat, contrast, tint })`.

### Two time domains (choreo pattern, template choreo.js:12-32 — copy verbatim)

```js
export const STOPS = [{ g: HIT_G, d: 0.12 }]        // world g of freeze + film-seconds duration
export function warp(ts) { /* shot-time -> { g, stop, sl } */ }
export function filmT(g) { /* world g -> film seconds; an event at g sounds at freeze START */ }
```
World motion uses `g = warp(t).g`; shake, flashes, onomatopoeia, score use real `t` / `filmT(g)`.
Flash accent while frozen (template film.js:60): `const d = t - (filmT(HIT_G) - VS); k = d>=0 && d<0.3 ? 6*Math.exp(-d*14) : 0`.

---

## 3. Halftone / Ben-Day dots — RECOMMENDED: bake once in prepare (ImageData), pattern overlay for live frames

Two proven mechanisms exist in the repo; use both, split by what is static:

(a) **Static art (posters, panels, skyline bakes): luminance → dot radius ImageData bake in
prepare.** Integer sizes mandatory (lesson: "Fractional ImageData dimensions broke terrain. Round
dimensions; floor pixel coordinates"). Shape proven by hairyweight `sketchPass` (film.js:959) —
same getImageData/putImageData loop, different quantizer:

```js
// prepare(), AFTER a bake is drawn. Luminance -> CMYK-ish red dot on white gutter.
function benDay(srcCanvas) {
  const w = srcCanvas.width, h = srcCanvas.height               // already integers
  const x = srcCanvas.getContext('2d')
  const img = x.getImageData(0, 0, w, h), d = img.data
  const PITCH = 6, OUT = x.createImageData(w, h), q = OUT.data
  for (let y = 0; y < h; y++)
    for (let px = 0; px < w; px++) {
      const i = (y * w + px) * 4
      const L = d[i] * 0.3 + d[i + 1] * 0.55 + d[i + 2] * 0.15  // film-style luma weights
      // staggered grid (Ben-Day is hex-offset), dot radius from darkness
      const row = Math.floor(y / PITCH), col = Math.floor(px / PITCH) + (row & 1 ? 0.5 : 0)
      const cx = col * PITCH, cy = row * PITCH
      const r = (1 - L / 255) * PITCH * 0.62                    // dark -> fat dot, light -> none
      const dist = Math.hypot(px - cx, y - cy)
      if (dist <= r) { q[i] = 214; q[i+1] = 36; q[i+2] = 60; q[i+3] = 255 }  // Ben-Day red
      else           { q[i] = q[i+1] = q[i+2] = 255; q[i+3] = 255 }          // paper
    }
  x.putImageData(OUT, 0, 0)
  return srcCanvas
}
```
Cost: hairyweight runs this exact class of loop per-frame at 2160x1320 for the replay shot, so a
prepare-time bake on static art is far inside budget. Do NOT run it per-frame on the full world —
reserve that for one hero slam shot max.

(b) **Live frames: small tile canvas + `createPattern('repeat')` multiply overlay** (pattern
mechanism proven in hairyweight scanlines, film.js:617/941: bake an 8x6 tile in prepare, lazily
`ctx.createPattern(S.scan, 'repeat')` on the shot ctx, fillRect the frame). Bake a 2-3 tile set at
different pitches/colours in prepare; pick per shot for the flat-colour comic look. Halftone shading
for cut-in panels: remy-anime `cutPanel` (art.js:813) shows the seeded in-clip variant —
`sp = 7` pitch, `hash(rx*131 + ry*7 + seed*1013) < 0.24` dropout, `0.7 + 1.5*prog` dot radius.

---

## 4. Comic panel wipe recipes

All deterministic, all clip-based on the shot ctx; hard cuts stay free via the `shots` array
(cut on the beat grid: `grid: { bar: 3 }`, hairyweight puts every cut on the bar).

```js
// PANEL-PUSH: next panel slides a rect over. u = E.inOutCubic(seg(t, w0, w1))
function panelPush(ctx, drawA, drawB, u, edge = 14) {
  const xw = lerp(-80, W + 80, u)                       // sliding seam
  ctx.save(); ctx.beginPath(); ctx.rect(0, 0, xw, H); ctx.clip(); drawA(ctx); ctx.restore()
  ctx.save(); ctx.beginPath(); ctx.rect(xw, 0, W - xw, H); ctx.clip(); drawB(ctx); ctx.restore()
  ctx.fillStyle = '#0b0b0e'                              // comic gutter: thick black edge
  ctx.fillRect(xw - edge, 0, edge * 2, H)
  ctx.fillStyle = '#fff'; ctx.fillRect(xw - 2, 0, 4, H)  // white inner rim
}
// PAGE-TURN DIAGONAL: same but the seam is a slanted edge; keep both clips as quads:
//   A: (0,0) (xw+SLANT,0) (xw-SLANT,H) (0,H);  B mirrored; SLANT ~ 160 + a white leading band.
// IRIS (evenodd — moveTo BEFORE arc or it draws a wedge; template film.js:85):
const u = clamp01((g - IRIS.g0) / (IRIS.g1 - IRIS.g0))
if (u > 0) {
  const rad = Math.max(0, 640 * (1 - u) ** 2), cx = heroX(g), cy = GY - 50
  ctx.fillStyle = '#000'
  ctx.beginPath(); ctx.rect(0, 0, LW, LH); ctx.moveTo(cx + rad, cy)
  ctx.arc(cx, cy, rad, 0, 7, true); ctx.fill('evenodd')
}
```
Lesson guard (lessons.md "Evidence discipline"): reading text must finish its hold BEFORE any wipe
masks it — schedule iris/wipe starts after caption holds. Speed-line burst under a wipe sells the
panel transition (next section).

### Speed lines / impact bursts (both proven, pick by shot)

```js
// BAKED radial manga rays — remy-anime art.js:444 speedLines(w, h, tint, seed)
// n = 96 + hash*56 triangular rays from frame edge, centre ~46% radius kept clear, alpha
// 0.22 + 0.55*hash. Bake 2-3 tints in prepare (anime film.js:71-73), stamp with globalAlpha * k.
// LIVE radial burst — hairyweight art.js:683 speedLines(x, cx, cy, k, seed = 9):
//   30 rays, a = i/30*TAU + hash(seed+i)*0.2, r0 = 70+hash*50, r1 = r0+140+k*420+hash*130,
//   'lighter', alpha 0.5*k*(0.5+hash*0.5). k = real-time decay: k = exp(-age*~10).
// COMIC STARBURST polygon (for THWIP/KRAKK): lib star() with unequal radii + seeded jitter:
function burst(x, cx, cy, r1, r2, n, seed, fill = '#ffd23f', stroke = '#111') {
  x.beginPath()
  for (let i = 0; i < n * 2; i++) {
    const a = (i / (n * 2)) * Math.PI * 2 + (hash(seed * 31 + i) - 0.5) * 0.18
    const r = (i % 2 ? r2 : r1) * (0.85 + hash(seed * 17 + i) * 0.3)
    x.lineTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r)
  }
  x.closePath(); x.fillStyle = fill; x.fill()
  x.lineWidth = 5; x.strokeStyle = stroke; x.lineJoin = 'round'; x.stroke()
}
```

---

## 5. Onomatopoeia slam + hit-stop pairing

`motion.slam` is exactly scale-overshoot + optional flash: `scale = lerp(o.from ?? 2.2, 1, E.outBack(q))`,
x-jitter `Math.sin(q*PI*18)*(o.shake??0)*(1-q)`, alpha-in `clamp(q*5)`, flash under q<0.12.
Comic upgrade: precede with `burst()` (above), tilt via a rotated ctx (hairyweight VS stamp,
film.js:767: `ctx.rotate(-0.1); ctx.scale(E.outBack(vu), E.outBack(vu))`), double-stroke via
`txt` o.stroke for the inked outline.

Pairing with STOPS (template + hairyweight rule):
- Declare `STOPS = [{ g: IMPACT_G, d: 0.12 }]` in choreo; the onomatopoeia appears at
  `filmT(IMPACT_G)` — the START of the freeze — and its `p = seg(t, filmT(IMPACT_G), filmT(IMPACT_G) + 0.22)`.
- World actors freeze (warp g pins to IMPACT_G) but slam/shake/flash keep REAL time:
  shake envelope `k = 6 * Math.exp(-d * 14)` with `d = t - (filmT(IMPACT_G) - VS)` (template film.js:60).
- Audio: `kit.impact(filmT(IMPACT_G), 0.8, 46)` + `kit.taiko(same, 0.9, 50)` land on the freeze
  start; keep the freeze window silent after (hairyweight KO: "deliberate hit-stop silence").
- Schedule the impact `kit` events through `filmT`, never hand-added delays (hairyweight score header rule).
- Font-size pops clip at peak (pokeremy lesson) — slam scales from centre with generous margins,
  or animate position/outline instead if the word is near a frame edge.

---

## 6. Pendulum web-swing math (pure function of anchor + t)

No repo precedent — UNCERTAIN beyond the primitives, but built only from verified `seg/lerp/E/spring/hash`:

```js
// One swing leg: hero hangs from anchor A(ax, ay) on rope length L.
// theta(t): starts at +TH0, swings to -TH0 over the pass; pure cosine — no integration state.
const TH0 = 0.9                                  // radians of release angle
const swingTheta = (u) => TH0 * Math.cos(Math.PI * (u - 1))   // u = seg(g, t0, t1); u0 -> TH0, u1 -> -TH0
// hero position (feet/hands reference):
const heroAt = (ax, ay, L, th) => ({ x: ax + Math.sin(th) * L, y: ay + Math.cos(th) * L })
// vertical bob (rope stretch at the bottom of the arc): lerp(L, L * 1.06, 1 - Math.abs(th) / TH0)
// or a damped wobble on release: + 18 * spring(g - tRelease, 14, 0.35)
// Web strand anchor -> hero hand with sag (hairyweight qBez, film.js:294):
const qBez = (a, c, b, u) => ({ x: (1-u)**2*a.x + 2*(1-u)*u*c.x + u*u*b.x,
                                y: (1-u)**2*a.y + 2*(1-u)*u*c.y + u*u*b.y })
// control point: midpoint + sag * (1 - tension), tension peaks at arc bottom:
//   c = { x: (ax + hx) / 2, y: Math.max(ay, hy) + 60 * (0.4 + 0.6 * Math.abs(th) / TH0) }
// Draw strand as two strokes (dark base + thin white highlight) — hairyweight rope recipe art.js:210.
// Multi-swing: array of legs { t0, t1, ax, ay, L } with handoff at u=1 of leg i == u=0 of leg i+1;
// anchor positions seeded (rng(seed)), never Math.random. Camera: run blit cam.x from heroAt(g).x
// with clampCam — the overscan makes the follow free.
```
Whoosh per pass: `kit.whoosh(filmT(midG), 0.6, 0.2, 300, 2600)` at each arc bottom (real time).

---

## 7. Score plan for SPIDER-REM

Kit calls that exist and fit: `taiko` (punch drums), `strings`/`choir` (heroic swell; vowel 'a'),
`braam` (the only kit brass — for menace), `impact`+`sub`+`glass` (slams), `riser`/`swell`
(into freezes), `whoosh` (web passes), `wind` (city altitude), `crowd` (street beds).
Kit has NO hero-fanfare brass beyond braam: hairyweight built one — copy this verified custom voice
(hairyweight/score.js:25, built only from kit primitives):

```js
const brass = (t, m, dur, g = 0.12, o = {}) => at(t, () => {
  const { atk = 0.045, rel = 0.14, cut = 2400, send = 0.35, pan = 0, width = 0.45 } = o
  const lp = ac.createBiquadFilter(); lp.type = 'lowpass'; lp.Q.value = 0.8
  lp.frequency.setValueAtTime(cut * 0.5, t); lp.frequency.linearRampToValueAtTime(cut, t + Math.max(0.14, atk * 2))
  const a = ac.createGain()
  a.gain.setValueAtTime(0, t); a.gain.linearRampToValueAtTime(g, t + atk)
  a.gain.setValueAtTime(g, t + Math.max(atk, dur * 0.65)); a.gain.linearRampToValueAtTime(0, t + dur + rel)
  for (const det of [-9, -4, 5, 11]) { const w = osc('sawtooth', hz(m), t, dur + rel); w.detune.value = det; w.connect(lp) }
  const sb = osc('triangle', hz(m - 12), t, dur + rel)
  const sg = ac.createGain(); sg.gain.value = 0.45; sb.connect(sg).connect(lp)
  lp.connect(a); out(a, 1, send, pan, width)
})
const brassChord = (t, notes, dur, g, o = {}) => notes.forEach((m, i) => brass(t, m, dur, g, { ...o, pan: ((i % 3) - 1) * 0.35 }))
```

Retro pulse voice (remy-bros/score.js:25-49) if any 8-bit gag panel appears:

```js
const pulseWave = (duty) => { /* cache per duty; 48-harmonic Float32Array re/im, createPeriodicWave(re, im) */ }
const pulse = (t, m, dur, { duty = 0.25, g = 0.18, pan = 0, to = null, send = 0.05, vib = 0, dec = 0.6 } = {}) => at(t, () => {
  const o = osc('square', hz(m), t, dur + 0.02); o.setPeriodicWave(pulseWave(duty))
  if (to != null) o.frequency.exponentialRampToValueAtTime(hz(to), t + dur)   // pitch-slide SFX
  /* 4ms attack, settle to g*dec by 0.08s, hold, 12ms release */ ... out(a, 1, send, pan)
})
const tri = (t, m, dur, { g = 0.32, to = null } = {}) => { /* triangle, no send — bass lane */ }
const nz = (t, dur, { f = 4000, type = 'highpass', g = 0.12, q = 0.7, f1 = null, pan = 0, send = 0.04 } = {}) => { /* noise drum/SFX */ }
```

Bass-masking tip (lessons.md, measured): "Triangle bass masked lead; frequency-band checks led to
reduced bass/kick and a clearer melody." Concretely: keep `bass` g <= 0.28 and `pad` g <= 0.05
under lead lines, and check the 150-1000 Hz band after render. More lessons that bind here: every
world event scheduled via `filmT` (no hand-added delays); hit-stop silence is deliberate; narration
of chord entrances on the `grid: { bar }` beat grid (hairyweight BPM 80 / bar 3 s pattern).

---

## 8. Parallax sunset city — 3-4 layer bake plan

Precedent: hairyweight bakes full-overscan layers in prepare and offsets foreground after the blit
(`fgSilhouettes`, film.js:795: `const off = (camx - 960) * 0.55` — draw the fg layer on the shot ctx
AFTER `blit`, offset opposite camera). Plan:

1. **Sky bake** (one canvas, AW x AH): vertical sunset ramp (`ditherBands`-style bands, not a bare
   gradient — lesson: "Palette ramps and selective seeded detail beat undifferentiated flat bands"),
   sun disc placed at a fixed world x, plus seeded cloud streaks (`speckle` recipe, art.js:31).
2. **LIGHT DIRECTION COHERENCE**: pick sun side (say left) ONCE. Every layer's lit faces, window
   glow sides, and rim highlights point left. Warm glow additive passes use `warmGlow` (art.js:67,
   'lighter' radial) with the same warm colour family ('255,190,120').
3. **Layers** (each a full AW+ x AH bake in prepare, widths beyond AW so offset never exposes edges):
   - L1 far skyline (parallax k=0.15): lightest silhouette (mixHex toward sky), thin water-tower/AC
     props, NO windows or tiny dim ones.
   - L2 mid (k=0.35): mid tone; seeded windows via `h2(i, j, s)` grid test, warm lit only on the
     sun side face, ~20% lit.
   - L3 near rooftops (k=0.7): dark silhouette ramp, larger window grid, ledge/coping highlights.
   - L4 foreground frame (k=1.3-1.6, drawn post-blit like fgSilhouettes): near-black building edge /
     water tower crossing the frame; darkest tone so the hero pops.
   Silhouette ramp: same hue, value steps via `shade(hex, k)` per layer (far = highest k).
4. **Per-frame draw**: sky + layers with `drawImage(layer, -OVER - (cam.x - 960) * k, -OVER - (cam.y - 540) * k * 0.4)`
   inside the blit transform (or draw layers into S.frame before actors; L4 after blit). Windows can
   flicker deterministically: `hash(Math.floor(t * 0.8) + i) > 0.06` re-bake only as a cheap live
   pass over a stored window-position list (marquee-bulb pattern, film.js:627).
5. Web-swing staging: anchor points live on L3 rooftops; store them at bake time in an array so
   choreo consumes real geometry (lesson: "derive contact geometry from a hero path at event time").

---

## 9. Cross-cutting rules worth keeping

- Determinism: no `Math.random`, no wall clock; `hash`/`rng(seed)` only; every painter pure in t.
- Clear/fill full-frame stage BEFORE any camera/shake transform (SonicSol edge-leak lesson).
- Reading text on the `ov` overlay, >= 28 px, holds complete before wipes/iris cover it.
- HUD/panel text: animate position/outline/colour, not font-size pops (clip at peak).
- `lint: { safe: { margin: 0.03..0.05 } }` and `captionHold` available in the film export.
- Fonts: Anton (slams/onomatopoeia), JetBrains Mono (captions/labels); films add their own via
  `fonts: [{ family, url }]` with @fontsource woff2 (template film.js:117).
- Reuse rig: `import * as A from '../remy-bros/art.js'` gives `canvas(w,h)` (nearest-neighbour
  ctx), `loadRemy(id, far)`, `drawRemy(ctx, R, x, feet, o)`, `loadHeads()`, `headIcon(atlas, i, k)`.
