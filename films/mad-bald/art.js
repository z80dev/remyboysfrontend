// MAD BALD: FURY FLOW art: rig repaints per casting.md (zone-classified ghoul
// pattern: 42's staged shear/regrow, 13's shorn+harness, 471's pallid dome +
// chrome harness, 808's war paint, wives' rag gowns, 3-tint horde) + prepare-time
// bakes (the WAR RIG hero tanker, the black INTERCEPTOR, citadel rock towers,
// day/night dune seas, highway, mud flats, sandstorm wall) + character-attached
// props (immortan mask + breathing tubes, GREAT WIG worn/tumble, flame guitar +
// speaker wall, pole-cats, mech arm, seed pouch, clippers, muzzle, tonic vial) +
// pure per-frame atmosphere (storm bolts, flame jets, flow pour, dust plumes).
// Full-res painted stage, sprites 2.4-3.2x nearest. Deterministic: hash/rng only,
// no Math.random/Date.now; every per-frame painter a pure function of (t, params).
//
// ------------------------------- EXPORTS --------------------------------
// re-exports of the stable rig: canvas loadRemy drawRemy loadHeads headIcon
//   headCrop PAL                (from ../remy-bros/art.js)
// repaint helpers:  zoneRepaint(R, refs, ramps, opts) -> canvas   (ghoul pattern,
//   wizard-of-floz verified; opts = {keep(r,g,b), remap(zone,x,y)->zone, dither})
//   keepMain(R)  tint(R, color)  stripBlade(R)  whiteSil(c,w,h)  (pirates pattern)
// vehicles:  warRig(k) -> canvas 760k x 260k (ground ink line y=h-2; deck baked;
//   cnv.rigMeta = {wheels, cabFloor, deckY}) | drawRig(ctx,cnv,x,groundY,{bob,pitch,wheel})
//   interceptor(k) -> canvas 380k x 130k | drawCar(ctx,cnv,x,groundY,{bob,pitch,wheel,dust})
// environment: citadel(w,h) | dunes(mode,k) | highway(w,h) | mudFlats(w,h) |
//   sandstorm(w,h,seed) | stormBolt(ctx,x,y,t,seed)
// attached props: immortanMask(k) | drawMask(ctx,cnv,R,{breath,t,sx,flip,x,feet}) |
//   greatWig(k,phase) | flameGuitar(k) | flameJet(ctx,x,y,u,seed) | speakerWall(k) |
//   poleCat(k,bend) | mechArm(k,curl) | seedPouch(k) | clippers(k) | muzzle(k) |
//   tonicVial(k,fill)
// atmosphere: dustPlume(seed, ramp=REPAINT_SHARED.dustDay) | flowPour(ctx,x,y,h,u,seed)
// cast pipeline (extra, beyond casting.md §5): loadCast() -> {role: rig} with every
//   CAST role repainted per REPAINT/REPAINT_SHARED + extra roles madRemyStripped
//   (blade-off, flip-safe), nuxSilver (silver-grin duotone), doofBlind (blindfold
//   band baked over the aviators); shear42(rig, s) / regrow42(rig, k) staged
//   haircut states; RECOLOUR ONLY — never alpha-erase (hazard 8).
//
// --------------------------- DEVIATIONS (§5) ----------------------------
// 1. shear42/regrow42 return a full rig {c, sil, w, h, top, bottom, cx, legTop}
//    (drawRemy-ready), not a bare canvas — a superset of the contract.
// 2. dunes(mode, k): canvas is fixed 2560x1080 (casting size); k is the tile
//    VARIANT seed (default 1), not a pixel scale.
// 3. dustPlume takes an optional ramp (defaults to dustDay); bake a second plume
//    with dustNight for night scenes.
// 4. drawMask needs the rig's screen anchor: pass {x, feet} (+sx/flip) matching
//    the drawRemy call; without them it draws in sprite-local coords.
// 5. drawRig/drawCar read wheel geometry from cnv.rigMeta attached by warRig/
//    interceptor; hub spokes are drawn live from the wheel param.
// 6. highway/mudFlats canvases carry .groundY = the wheel/foot line row inside
//    the strip (the film parks vehicles at stripY + groundY*scale); the universal
//    2px ink line stays at y=h-2 per the ground anchor convention.
import { hash, rng } from 'filmkit/lib.js'
import {
  canvas as rigCanvas, loadRemy, drawRemy, loadHeads, headIcon, headCrop, PAL,
} from '../remy-bros/art.js'
import { CAST, REPAINT, REPAINT_SHARED } from './timeline.js'

// rigCanvas re-export keeps the §5 name `canvas` while the local code uses it too.
const canvas = rigCanvas

const hexRgb = (h) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)]
const mix = (a, b, t) => [
  Math.round(a[0] + (b[0] - a[0]) * t),
  Math.round(a[1] + (b[1] - a[1]) * t),
  Math.round(a[2] + (b[2] - a[2]) * t),
]
const css = (c, a = 1) => `rgba(${c[0]},${c[1]},${c[2]},${a})`
const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v)
const h2 = (x, y, s = 0) => hash(x * 7349 + y * 92821 + s * 1013)
const TAU = Math.PI * 2

// ============================== rig prep ==============================

export function whiteSil(c, w, h) {
  const s = canvas(w, h), x = s.getContext('2d')
  x.drawImage(c, 0, 0)
  x.globalCompositeOperation = 'source-in'
  x.fillStyle = '#fff'
  x.fillRect(0, 0, w, h)
  return s
}

// Solid-colour silhouette copy of a rig keeping the pose rig.
export function tint(R, color) {
  const c = canvas(R.w, R.h), x = c.getContext('2d')
  x.drawImage(R.c, 0, 0)
  x.globalCompositeOperation = 'source-in'
  x.fillStyle = color
  x.fillRect(0, 0, R.w, R.h)
  return { ...R, c }
}

// Keep only the largest 4-connected alpha component — drops detached bake
// artefacts (12's floating tan slab) without cutting hair that touches the head.
export function keepMain(R) {
  const c = canvas(R.w, R.h), x = c.getContext('2d')
  x.drawImage(R.c, 0, 0)
  const d = x.getImageData(0, 0, R.w, R.h), p = d.data
  const n = R.w * R.h
  const seen = new Uint8Array(n)
  const alpha = (i) => p[i * 4 + 3] > 8
  let best = null, bestN = 0
  for (let s = 0; s < n; s++) {
    if (seen[s] || !alpha(s)) continue
    const comp = [s]
    seen[s] = 1
    for (let q = 0; q < comp.length; q++) {
      const i = comp[q], xx = i % R.w, y = (i / R.w) | 0
      for (const j of [y > 0 ? i - R.w : -1, y < R.h - 1 ? i + R.w : -1, xx > 0 ? i - 1 : -1, xx < R.w - 1 ? i + 1 : -1]) {
        if (j >= 0 && !seen[j] && alpha(j)) { seen[j] = 1; comp.push(j) }
      }
    }
    if (comp.length > bestN) { bestN = comp.length; best = comp }
  }
  if (!best) return { ...R, c }
  const keep = new Uint8Array(n)
  for (const i of best) keep[i] = 1
  for (let i = 0; i < n; i++) if (!keep[i]) p[i * 4 + 3] = 0
  x.putImageData(d, 0, 0)
  return { ...R, c, sil: whiteSil(c, R.w, R.h) }
}

// Strip the baked greatsword from 42 (blade hugs the viewer-left edge, yellow
// pommel at the waist) — pirates/hairtanic verified pattern: drop the detached
// left-edge run per scanline, then sweep the blade colour family in the left
// columns. Runs BEFORE any flipped pose (casting flip policy).
export function stripBlade(R) {
  const c = canvas(R.w, R.h), x = c.getContext('2d')
  x.drawImage(R.c, 0, 0)
  const d = x.getImageData(0, 0, R.w, R.h), p = d.data
  const a = (xx, y) => (xx < 0 || xx >= R.w ? 0 : p[(y * R.w + xx) * 4 + 3])
  for (let y = 0; y < R.h; y++) {
    let x0 = 0
    while (x0 < R.w && a(x0, y) === 0) x0++
    if (x0 > 8) continue
    let x1 = x0
    while (x1 < R.w && a(x1, y) > 0) x1++
    if (x1 - x0 > 15) continue
    let gap = 0, xx = x1
    while (xx < R.w && a(xx, y) === 0) { gap++; xx++ }
    if (gap < 3) continue
    for (let xb = x0; xb < x1; xb++) p[(y * R.w + xb) * 4 + 3] = 0
  }
  for (let y = 0; y < R.h; y++)
    for (let xx = 0; xx < 23; xx++) {
      const i = (y * R.w + xx) * 4
      if (p[i + 3] === 0) continue
      const r = p[i], g = p[i + 1], b = p[i + 2]
      if (b >= r || (g > 150 && b < 90 && r > 140)) p[i + 3] = 0
    }
  for (let y = 40; y < R.h; y++)
    for (let xx = 0; xx < 36; xx++) {
      const i = (y * R.w + xx) * 4
      if (p[i + 3] === 0) continue
      const r = p[i], g = p[i + 1], b = p[i + 2]
      if ((b >= r + 8 && b > 80) || (g > 150 && b < 90 && r > 140)) p[i + 3] = 0
    }
  x.putImageData(d, 0, 0)
  return { ...R, c, sil: whiteSil(c, R.w, R.h) }
}

// Zone-classified duotone repaint (ghoulize pattern): each pixel classifies to
// the nearest palette ref; zone 'skip' keeps the pixel; zone ramps remap by
// luminance (pairs are [dark, light]); dark outlines always stay ink.
// opts.keep(r,g,b) protects a predicate family (42's gold pommel);
// opts.remap(zone,x,y) re-routes a zone geometrically (471's crown band, 42's
// chest-print red); opts.dither = [{zone, col, density}] stamps seeded 1px dots.
export function zoneRepaint(R, refs, ramps, opts = {}) {
  const c = canvas(R.w, R.h), x = c.getContext('2d')
  x.drawImage(R.c, 0, 0)
  const d = x.getImageData(0, 0, R.w, R.h), p = d.data
  const table = refs.map(([hex, zone]) => ({ rgb: hexRgb(hex), zone }))
  const rampOf = {}
  for (const [zone, pair] of Object.entries(ramps)) rampOf[zone] = [hexRgb(pair[0]), hexRgb(pair[1])]
  const singles = {}
  for (const [zone, hex] of Object.entries(opts.singles ?? {})) singles[zone] = hexRgb(hex)
  for (let yy = 0; yy < R.h; yy++)
    for (let xx = 0; xx < R.w; xx++) {
      const i = (yy * R.w + xx) * 4
      if (p[i + 3] < 8) continue
      const r = p[i], g = p[i + 1], b = p[i + 2]
      const L = (r + g + b) / 765
      if (L < 0.16) continue // true outlines stay ink
      if (opts.keep && opts.keep(r, g, b)) continue
      let zone = 'skip', bd = 1e9
      for (const f of table) {
        const dd = (r - f.rgb[0]) ** 2 + (g - f.rgb[1]) ** 2 + (b - f.rgb[2]) ** 2
        if (dd < bd) { bd = dd; zone = f.zone }
      }
      if (opts.remap) zone = opts.remap(zone, xx, yy)
      const ramp = rampOf[zone]
      let col = null
      if (ramp) col = mix(ramp[0], ramp[1], clamp01((L - 0.14) / 0.6))
      else if (singles[zone]) col = singles[zone]
      if (!col) continue
      if (opts.dither) {
        for (const dt of opts.dither) {
          if (dt.zone !== zone || h2(xx, yy, dt.seed ?? 5) > (dt.density ?? 0.16)) continue
          col = hexRgb(dt.col)
          break
        }
      }
      p[i] = col[0]; p[i + 1] = col[1]; p[i + 2] = col[2]
    }
  x.putImageData(d, 0, 0)
  return c
}

// Wrap a repainted canvas back into a rig (drawRemy-ready geometry + silhouette).
const rerig = (R, c) => ({ ...R, c, sil: whiteSil(c, R.w, R.h) })

// ============================== cast pipeline ==============================

// Zone refs per id (casting.md §2 + measured from the sprites on
// output/mad-bald/cal/*.png). 'skip' keeps a pixel family untouched.
const REFS = {
  42: [
    ['#a93837', 'hair'], ['#94312d', 'hair'], ['#832a26', 'hair'], ['#702623', 'hair'],
    ['#c9c5b8', 'shirt'], ['#e8e4da', 'shirt'], ['#b03028', 'shirt'],
    ['#273c4b', 'shirt'], ['#3c4c55', 'shirt'],
    ['#3a4258', 'jeans'], ['#2f3848', 'jeans'],
    ['#e9d3c2', 'skip'], ['#d7bcae', 'skip'],
    ['#4d6465', 'skip'], ['#2f4a55', 'skip'], // sword blade family
  ],
  13: [
    ['#184190', 'scalp'], ['#12367b', 'scalp'], ['#0c2453', 'scalp'], ['#1d4aa2', 'scalp'], ['#112e66', 'scalp'],
    ['#23232f', 'top'], ['#1a1a24', 'top'], ['#b03028', 'top'], ['#8a2020', 'top'],
    ['#ebd6c4', 'skip'], ['#e0c3b5', 'skip'], ['#c9af9f', 'skip'], ['#c93030', 'skip'], // skin + lips
  ],
  471: [
    ['#d4daea', 'bib'], ['#c6c6d5', 'bib'], ['#e4e4ec', 'bib'],
    ['#b3b4c2', 'harness'], ['#9b9fab', 'harness'], ['#8a8c9a', 'harness'],
    ['#b78861', 'skin'], ['#ac7c58', 'skin'], ['#b1835e', 'skin'], ['#9b6e4c', 'skin'],
    ['#e87fa8', 'dome'], ['#40c8d8', 'dome'], // pink/cyan crown tuft — dies into the dome band (hazard 3)
    ['#2a2621', 'pants'], ['#2a2e3a', 'pants'],
  ],
  808: [
    ['#0e0e10', 'torso'], ['#1a1a1c', 'torso'], ['#232726', 'torso'], ['#000000', 'torso'],
    ['#c9c5b8', 'torso'], ['#3fbf7f', 'torso'], ['#3a8a3c', 'torso'], // pill print dies into the paint
    ['#3a8a3c', 'tufts'], ['#566e63', 'tufts'], ['#d8c080', 'tufts'], ['#c9a86b', 'tufts'],
    ['#e9d4c1', 'skip'], ['#ddc2b2', 'skip'], ['#c03028', 'skip'], ['#a02020', 'skip'], // skin + the grin (hazard: grin is the performance)
  ],
  840: [
    ['#03a8fe', 'strap'], ['#2a5aa0', 'strap'], ['#1a3a70', 'strap'], // blue bikini top -> bandolier (hazard 7)
    ['#fefefe', 'skip'], ['#f5f5f5', 'skip'], // open shirt stays
    ['#b5865f', 'skip'], ['#ab7c56', 'skip'], ['#946f4b', 'skip'],
    ['#3d3f76', 'skip'], ['#323a62', 'skip'], // aviators (the blindfold covers them at draw/bake time)
  ],
  12: [
    ['#01237d', 'gown'], ['#021a61', 'gown'], ['#05359b', 'gown'], ['#0a40a8', 'gown'],
    ['#c3a63d', 'skip'], ['#a3872a', 'skip'], ['#b89933', 'skip'], ['#e3bc70', 'skip'], // native mane IS the glory
    ['#af825a', 'skip'], ['#a07850', 'skip'],
  ],
  24: [
    ['#1a3a9a', 'gown'], ['#0a2a7a', 'gown'], ['#2a4ab8', 'gown'], ['#3a5ad0', 'gown'],
    ['#e0b050', 'skip'], ['#c89838', 'skip'], ['#b08028', 'skip'], // yellow mane skip
    ['#af825a', 'skip'],
  ],
  70: [
    ['#2f4a2f', 'gown'], ['#4a6a3a', 'gown'], ['#5a7a42', 'gown'], ['#3a5a30', 'gown'],
    ['#20c8c0', 'skip'], ['#18a0a0', 'skip'], // cyan mane skip
    ['#af825a', 'skip'], ['#a07850', 'skip'],
  ],
  46: [
    ['#687777', 'mane'], ['#748080', 'mane'], ['#828887', 'mane'], ['#8e8e8b', 'mane'], ['#989a95', 'mane'],
    ['#ffffff', 'rags'], ['#f4f4f4', 'rags'], ['#c02020', 'rags'], ['#22201e', 'rags'], // tee + its print
    ['#b38662', 'skip'], ['#ac7c58', 'skip'], ['#956e49', 'skip'],
  ],
  83: [
    ['#6a7674', 'mane'], ['#828385', 'mane'], ['#9aa0a2', 'mane'],
    ['#2a4a8a', 'rags'], ['#1c3468', 'rags'], ['#3a5aa8', 'rags'], // blue sweater
    ['#b38662', 'skip'], ['#ac7c58', 'skip'],
  ],
  5: [
    ['#f2db44', 'shirt'], ['#dfa937', 'shirt'], ['#c9b832', 'shirt'],
    ['#b5845e', 'skip'], ['#aa7b56', 'skip'], ['#947049', 'skip'],
  ],
  834: [
    ['#d5d5d5', 'shirt'], ['#c8c8c8', 'shirt'], ['#e2e2e2', 'shirt'],
    ['#50a0f0', 'skip'], ['#3a7ac0', 'skip'], // blue side tufts stay
    ['#c0aa98', 'skip'], ['#b08858', 'skip'],
  ],
  585: [
    ['#76aaeb', 'shirt'], ['#5a94d8', 'shirt'], ['#8fbaf0', 'shirt'], ['#f4fafd', 'shirt'], // light-blue tee + bird print
    ['#d7b8a0', 'skip'], ['#caab8e', 'skip'], ['#b89e80', 'skip'],
  ],
  882: [
    ['#141416', 'shirt'], ['#000000', 'shirt'], ['#232726', 'shirt'],
    ['#c9c5b8', 'shirt'], ['#3fbf7f', 'shirt'], // pill print dies under the tint
    ['#c0aa98', 'skip'], ['#b08858', 'skip'],
  ],
  458: [
    ['#141416', 'shirt'], ['#000000', 'shirt'], ['#1e1e22', 'shirt'],
    ['#c0aa98', 'skip'], ['#b08858', 'skip'],
  ],
  389: [
    ['#e5e4e4', 'shirt'], ['#dadada', 'shirt'], ['#eeeeed', 'shirt'], ['#cccccb', 'shirt'],
    ['#d7b8a0', 'skip'], ['#caab8e', 'skip'],
  ],
  233: [
    ['#b26bea', 'shirt'], ['#a058d8', 'shirt'], ['#8a48c2', 'shirt'], ['#f0f0f0', 'shirt'], // sweater + spiral badge
    ['#c0aa98', 'skip'], ['#b08858', 'skip'],
  ],
  1217: [
    ['#eae5e1', 'shirt'], ['#f8f3ee', 'shirt'], ['#dfdad6', 'shirt'], ['#f3ede9', 'shirt'],
    ['#201b19', 'belt'], ['#16120f', 'belt'],
    ['#03a8fe', 'skip'], ['#3d3f76', 'skip'], ['#c03028', 'skip'], // blue arc tuft + red shoes stay
    ['#b5865f', 'skip'], ['#ac7c58', 'skip'],
  ],
  908: [
    ['#c08030', 'shirt'], ['#8a5a20', 'shirt'], ['#e0b060', 'shirt'], ['#4a3820', 'shirt'], // tiger camo noise
    ['#c0aa98', 'skip'], ['#b08858', 'skip'],
  ],
  685: [
    ['#1f5b7f', 'shirt'], ['#2a6a8a', 'shirt'], ['#16405c', 'shirt'],
    ['#d8c040', 'shirt'], ['#e0cc60', 'shirt'], // yellow hand prop tints into the clutter (hazard 12)
    ['#e8d5c1', 'skip'], ['#dbc0b1', 'skip'],
  ],
}

const goldKeep = (r, g, b) => r > 195 && g > 135 && b < 115 && r > b + 85 // 42's pommel predicate

// 42 base repaint: ash-road shirt/jeans, hair handled by the state machines.
// Stripped path runs keepMain after the blade sweep — drops the detached
// grip/pommel residue the sweep can leave on this id. The chest print's reds
// classify as 'hair' (same crimson family) — deep torso rows remap to shirt.
function repaint42(R, stripped) {
  const base = stripped ? keepMain(stripBlade(R)) : R
  const c = zoneRepaint(base, REFS[42], {
    shirt: REPAINT[42].shirt, jeans: REPAINT[42].jeans,
  }, {
    keep: goldKeep,
    remap: (zone, xx, y) => (zone === 'hair' && y > 62 && Math.abs(xx - R.cx) < 18 ? 'shirt' : zone),
  })
  return rerig(base, c)
}

// Hair geometry for 42/13-style bobs: per-column topmost opaque row (the dome
// outline) decides crown vs side-lock classification.
function colTops(R) {
  const d = R.c.getContext('2d').getImageData(0, 0, R.w, R.h).data
  const tops = new Int16Array(R.w).fill(-1)
  for (let xx = 0; xx < R.w; xx++)
    for (let y = 0; y < R.h; y++)
      if (d[(y * R.w + xx) * 4 + 3] > 8) { tops[xx] = y; break }
  return tops
}

const HAIR_REFS_42 = [['#a93837', 'hair'], ['#94312d', 'hair'], ['#832a26', 'hair'], ['#702623', 'hair']]
// FILM FIX (builder 1, pixel-verified): shear42/regrow42 classified EVERY pixel
// against hair-only refs, so face/shirt pixels also classified 'hair' and took
// the scalp/side ramps — the shorn head read as mottled brown rot instead of an
// intentional bald dome (checklist item 2, 2.8x torch light). Classify against
// the hair refs PLUS 42's non-hair refs as 'skip' so only true hair remaps.
const SHEAR_REFS_42 = HAIR_REFS_42.concat(REFS[42].filter(([, zone]) => zone !== 'hair'))
const hairGeom = (R, xx, y) => {
  const cx = R.cx, side = Math.abs(xx - cx) > 18
  const deep = y > 62 && Math.abs(xx - cx) < 18 // chest-print rows: reds there are the shirt graphic
  return { side, deep }
}

// MAD REMY 42 — staged haircut at shear param s (0 native -> 1 fully shorn).
// s<1/3 sides+burners; 1/3..2/3 crown+bangs; >=2/3 full dome + stubble dither.
// RECOLOUR ONLY — the bob-shaped outline survives (hazard 8).
export function shear42(rig, s) {
  const R = rig
  const tops = colTops(R)
  const c = zoneRepaint(R, SHEAR_REFS_42, {
    side: REPAINT[42].hairSide, crown: REPAINT[42].hairCrown, scalp: REPAINT[42].scalp,
  }, {
    remap: (zone, xx, y) => {
      if (zone !== 'hair') return zone
      const { side, deep } = hairGeom(R, xx, y)
      if (deep) return 'skip'
      const crownPx = !side && y <= (tops[xx] < 0 ? R.top + 24 : tops[xx] + 24)
      if (s >= 2 / 3) return 'scalp'
      if (crownPx) return s >= 1 / 3 ? 'crown' : 'skip'
      return 'side'
    },
    dither: s >= 2 / 3 ? [{ zone: 'scalp', col: REPAINT[42].stubbleDots, density: 0.17, seed: 41 }] : [],
  })
  if (s >= 2 / 3) {
    // FILM FIX (builder 1, checklist 2): lift scalp contrast. The locked scalp
    // pair renders near-black over crimson's mid luminance, so at 2.8x the shorn
    // dome read as dark hair, not an intentional bald dome. Re-light the scalp
    // by dome curvature (shared scalpStubble edge tone as the lit stop) and
    // stamp a sparse red-stubble fleck (story §5: red shadow so he never reads
    // hairless-grey). Dark ink outlines and non-dome pixels are untouched.
    const x2 = c.getContext('2d')
    const d2 = x2.getImageData(0, 0, R.w, R.h), p2 = d2.data
    const lit = hexRgb(REPAINT_SHARED.scalpStubble[2])
    const fleck = hexRgb('#7a4030')
    const domeCx = R.cx, domeCy = R.top + 18
    for (let yy = R.top; yy < Math.min(R.h, R.top + 56); yy++)
      for (let xx = Math.max(0, domeCx - 34); xx < Math.min(R.w, domeCx + 34); xx++) {
        const i = (yy * R.w + xx) * 4
        if (p2[i + 3] < 8) continue
        const r = p2[i], g = p2[i + 1], b = p2[i + 2]
        if ((r + g + b) / 765 < 0.1) continue // true ink stays ink
        if (r > 0x50 || g > 0x48 || b > 0x42) continue // only the dark scalp family
        const dd = Math.hypot((xx - domeCx) / 30, (yy - domeCy) / 22)
        const liftv = clamp01(1.12 - dd)
        let col = mix([r, g, b], lit, liftv * 0.85)
        if (h2(xx, yy, 77) > 0.93) col = mix(col, fleck, 0.7) // the red stubble shadow
        p2[i] = col[0]; p2[i + 1] = col[1]; p2[i + 2] = col[2]
      }
    x2.putImageData(d2, 0, 0)
  }
  return rerig(R, c)
}

// MAD REMY 42 — regrow ladder k in [0,4]: zones front/crown/sides/mane regrow
// crimson in order; fractional k lerps the growing zone (REPAINT_SHARED.regrowLerp
// pacing stays film-side). k=0 is the fully shorn state, k=4 native crimson.
const CRIMSON = ['#702623', '#b0453a'] // native "Crimson Flow" ramp (shadow, light)
export function regrow42(rig, k) {
  const R = rig
  const tops = colTops(R)
  const scal = [hexRgb(REPAINT_SHARED.scalpStubble[0]), hexRgb(REPAINT_SHARED.scalpStubble[1])]
  const nat = [hexRgb(CRIMSON[0]), hexRgb(CRIMSON[1])]
  const zoneIx = { front: 0, crown: 1, sides: 2, mane: 3 }
  const c = zoneRepaint(R, SHEAR_REFS_42, { grow: ['#000000', '#ffffff'] }, {
    remap: (zone, xx, y) => {
      if (zone !== 'hair') return zone
      const { deep } = hairGeom(R, xx, y)
      if (deep) return 'skip'
      const crownPx = y <= (tops[xx] < 0 ? R.top + 24 : tops[xx] + 24)
      const low = y > (tops[xx] < 0 ? R.top + 44 : tops[xx] + 44)
      const name = crownPx ? (Math.abs(xx - R.cx) <= 14 ? 'front' : 'crown') : low ? 'mane' : 'sides'
      return name
    },
  })
  // per-pixel zone lerp scalp->native by that zone's ladder progress
  const x = c.getContext('2d')
  const d = x.getImageData(0, 0, R.w, R.h), p = d.data
  const table = SHEAR_REFS_42.map(([hex, zone]) => [hexRgb(hex), zone])
  for (let yy = 0; yy < R.h; yy++)
    for (let xx = 0; xx < R.w; xx++) {
      const i = (yy * R.w + xx) * 4
      if (p[i + 3] < 8) continue
      const r = p[i], g = p[i + 1], b = p[i + 2]
      const L = (r + g + b) / 765
      if (L < 0.16) continue
      let bd = 1e9, zone = null
      for (const f of table) {
        const dd = (r - f[0][0]) ** 2 + (g - f[0][1]) ** 2 + (b - f[0][2]) ** 2
        if (dd < bd) { bd = dd; zone = f }
      }
      if (!zone || zone[1] !== 'hair') continue // FILM FIX: only true hair regrows
      const { deep } = hairGeom(R, xx, yy)
      if (deep) continue
      const crownPx = yy <= (tops[xx] < 0 ? R.top + 24 : tops[xx] + 24)
      const low = yy > (tops[xx] < 0 ? R.top + 44 : tops[xx] + 44)
      const name = crownPx ? (Math.abs(xx - R.cx) <= 14 ? 'front' : 'crown') : low ? 'mane' : 'sides'
      const prog = clamp01(k - zoneIx[name])
      const Lp = clamp01((L - 0.14) / 0.6)
      const col = mix(mix(scal[0], scal[1], Lp), mix(nat[0], nat[1], Lp), prog)
      p[i] = col[0]; p[i + 1] = col[1]; p[i + 2] = col[2]
      if (prog < 0.6 && h2(xx, yy, 43) < 0.14 * (1 - prog)) { p[i] = 0x17; p[i + 1] = 0x11; p[i + 2] = 0x0d }
    }
  x.putImageData(d, 0, 0)
  return rerig(R, c)
}

// IMPERATOR FLOWIOSA 13 — chose the shave: flat dark scalp + stubble from day
// one, war-paint grease bars, harness cloth over the CAT CIGS print + strap.
// The print's reds sit nearest the lips-skip ref — below the face (y > top+70)
// every skip classifies into the top ramp so the print dies before any flip.
function repaint13(R) {
  const c = zoneRepaint(R, REFS[13], {
    scalp: REPAINT[13].scalp, top: REPAINT[13].top,
  }, {
    remap: (zone, xx, y) => (zone === 'skip' && y > R.top + 62 ? 'top' : zone),
    dither: [{ zone: 'scalp', col: REPAINT[13].stubbleDots, density: 0.15, seed: 17 }],
  })
  const x = c.getContext('2d')
  // grease bars: two vertical war-paint bars in the forehead band (eyes ~y45-52)
  x.fillStyle = REPAINT[13].grease
  for (const [off, seed] of [[-7, 3], [6, 9]]) {
    const jx = Math.round((h2(seed, 4) - 0.5) * 3)
    x.fillRect(R.cx + off + jx, R.top + 30, 3, 13)
    x.fillRect(R.cx + off + jx, R.top + 26, 2, 4)
  }
  // chest strap shoulder->hip + chrome buckle (covers the print zone before flips)
  const y0 = R.top + 62, y1 = Math.min(R.h - 8, R.top + 98)
  const strap = (col, w) => {
    x.strokeStyle = col
    x.lineWidth = w
    x.lineCap = 'butt'
    x.beginPath()
    x.moveTo(R.cx + 15, y0)
    x.lineTo(R.cx - 12, y1)
    x.stroke()
  }
  strap('#151009', 6)
  strap(REPAINT[13].strap, 4)
  x.fillStyle = REPAINT[13].buckle
  x.fillRect(R.cx - 14, y1 - 5, 6, 5)
  x.fillStyle = '#5f6b78'
  x.fillRect(R.cx - 13, y1 - 4, 4, 3)
  return rerig(R, c)
}

// IMMORTAN FLOW 471 — pallid scar-skin (crown band incl. the pink tuft dies into
// the dome), gunmetal bib, chrome harness plates, scar specks on the dome.
function repaint471(R) {
  const c = zoneRepaint(R, REFS[471], {
    skin: REPAINT[471].skin, dome: REPAINT[471].domeShade, bib: REPAINT[471].bib,
    harness: REPAINT[471].harness, pants: REPAINT[471].pants,
  }, {
    remap: (zone, xx, y) => (zone === 'skin' && y < R.top + 14 ? 'dome' : zone),
    dither: [{ zone: 'dome', col: '#8e8b78', density: 0.1, seed: 23 }], // scar specks
  })
  const x = c.getContext('2d')
  // harness plate row over the bib (the strung chest gear becomes a breathing rig)
  x.fillStyle = '#5f6b78'
  x.fillRect(R.cx - 16, R.top + 74, 32, 7)
  x.fillStyle = '#9aa6b2'
  x.fillRect(R.cx - 16, R.top + 74, 32, 2)
  x.fillStyle = '#cfd6de'
  for (const dx of [-12, -4, 4, 12]) x.fillRect(R.cx + dx, R.top + 76, 3, 3)
  return rerig(R, c)
}

// NUX 808 — bone-white war paint over tee + pill print, tufts (both zones) shorn,
// scarification strokes; the red grin stays native (grinKeep). The tee's true
// blacks sit under the ink threshold — lift torso-row near-blacks first so the
// whole shirt takes the paint.
function repaint808(R) {
  const pre = canvas(R.w, R.h), px = pre.getContext('2d')
  px.drawImage(R.c, 0, 0)
  const pd = px.getImageData(0, 0, R.w, R.h), pp = pd.data
  for (let y = R.top + 58; y < R.h; y++)
    for (let xx = 0; xx < R.w; xx++) {
      const i = (y * R.w + xx) * 4
      if (pp[i + 3] < 8) continue
      if (pp[i] + pp[i + 1] + pp[i + 2] < 90) {
        pp[i] = 0x2e; pp[i + 1] = 0x2e; pp[i + 2] = 0x32 // above the ink threshold
      }
    }
  px.putImageData(pd, 0, 0)
  const c = zoneRepaint({ ...R, c: pre }, REFS[808], {
    torso: REPAINT[808].torsoPaint, tufts: REPAINT[808].tufts,
  }, {})
  const x = c.getContext('2d')
  x.strokeStyle = REPAINT[808].scars
  x.lineWidth = 2
  x.lineCap = 'round'
  x.beginPath() // chest V
  x.moveTo(R.cx - 9, R.top + 78)
  x.lineTo(R.cx - 2, R.top + 92)
  x.moveTo(R.cx + 9, R.top + 78)
  x.lineTo(R.cx + 2, R.top + 92)
  x.stroke()
  x.beginPath() // forehead bolt
  x.moveTo(R.cx, R.top + 24)
  x.lineTo(R.cx, R.top + 34)
  x.stroke()
  x.fillStyle = REPAINT[808].scars
  x.fillRect(R.cx - 1, R.top + 30, 3, 2)
  return rerig(R, c)
}

// NUX silver variant — the mandated spray: the grin's reds remap through the
// chrome duotone by luminance (clean zone pass, never an overlay). Runs on the
// REPAINTED rig, so the white war paint / skin / scars are protected as skip.
export function nuxSilver(rig) {
  const R = rig
  const c = zoneRepaint(R, [
    ['#c03028', 'grin'], ['#a02020', 'grin'], ['#d85838', 'grin'], ['#8a1a14', 'grin'],
    ['#e04038', 'grin'], ['#f05040', 'grin'],
    ['#c9c5b8', 'skip'], ['#e8e4da', 'skip'], // war paint
    ['#e9d4c1', 'skip'], ['#ddc2b2', 'skip'], ['#ccb7a6', 'skip'], // skin
    ['#5a4a42', 'skip'], ['#241d18', 'skip'], ['#3a2f26', 'skip'], // scars + tuft stubble
    ['#2e2e32', 'skip'], ['#0e0e10', 'skip'], ['#1a1a1c', 'skip'], ['#232726', 'skip'], ['#000000', 'skip'],
  ], { grin: [REPAINT_SHARED.chrome[0], REPAINT_SHARED.chrome[2]] })
  return rerig(R, c)
}

// DOOF 840 — bandolier repaint covers the blue bikini top; the blindfold variant
// stamps a leather band computed from the actual aviator pixels (lenses die).
function repaint840(R) {
  const c = zoneRepaint(R, REFS[840], { strap: [REPAINT[13].strap, '#4a3a26'] })
  const x = c.getContext('2d')
  x.strokeStyle = '#151009' // bandolier strap over the repainted chest
  x.lineWidth = 4
  x.beginPath()
  x.moveTo(R.cx + 14, R.top + 64)
  x.lineTo(R.cx - 13, R.top + 96)
  x.stroke()
  x.fillStyle = '#cfd6de'
  x.fillRect(R.cx - 15, R.top + 92, 5, 4)
  return rerig(R, c)
}

function blindfold840(R) {
  const c = canvas(R.w, R.h), x = c.getContext('2d')
  x.drawImage(R.c, 0, 0)
  const d = x.getImageData(0, 0, R.w, R.h), p = d.data
  // find the aviator band: blue-navy lens pixels BELOW the crown arc (the blue
  // hair arc lives at y < top+22; the lenses sit ~top+25..top+53)
  let x0 = R.w, x1 = 0, y0 = R.h, y1 = 0
  for (let y = R.top + 22; y < R.top + 58; y++)
    for (let xx = 0; xx < R.w; xx++) {
      const i = (y * R.w + xx) * 4
      if (p[i + 3] < 8) continue
      const r = p[i], g = p[i + 1], b = p[i + 2]
      if (b > r + 18 && b > g + 12 && b > 60 && r < 110) {
        x0 = Math.min(x0, xx); x1 = Math.max(x1, xx)
        y0 = Math.min(y0, y); y1 = Math.max(y1, y)
      }
    }
  if (x1 > x0) {
    const by0 = y0 - 2, by1 = y1 + 3
    for (let y = by0; y <= by1; y++)
      for (let xx = x0 - 2; xx <= x1 + 2; xx++) {
        if (xx < 0 || xx >= R.w || y < 0 || y >= R.h) continue
        const i = (y * R.w + xx) * 4
        if (p[i + 3] < 8 && (xx < x0 || xx > x1)) continue
        const edge = y === by0 || y === by1
        p[i] = 0x15; p[i + 1] = 0x10; p[i + 2] = 0x09
        if (!edge && p[i + 3] < 8) { p[i + 3] = 255 }
        else if (!edge) { p[i] = 0x3a; p[i + 1] = 0x2a; p[i + 2] = 0x18 }
        if (edge) { p[i] = 0x15; p[i + 1] = 0x10; p[i + 2] = 0x09; if (p[i + 3] < 8) p[i + 3] = 255 }
      }
    // knot + trailing ends at the band's right edge
    x.putImageData(d, 0, 0)
    x.fillStyle = '#151009'
    x.fillRect(x1 - 1, (by0 + by1) / 2 - 3, 7, 7)
    x.strokeStyle = '#3a2a18'
    x.lineWidth = 3
    x.beginPath()
    x.moveTo(x1 + 4, (by0 + by1) / 2)
    x.lineTo(x1 + 12, (by0 + by1) / 2 + 14)
    x.moveTo(x1 + 4, (by0 + by1) / 2 + 2)
    x.lineTo(x1 + 10, (by0 + by1) / 2 + 20)
    x.stroke()
  } else x.putImageData(d, 0, 0)
  return rerig(R, c)
}

// MANE WIVES — pale rag gown + hem tint; manes stay native. 12 carries a baked
// tan artefact block top-right (x>=56, y<=40) — geometric mask + keepMain.
function repaintWife(R, id, hemCol) {
  let base = R
  if (id === 12) {
    const m = canvas(R.w, R.h), mx = m.getContext('2d')
    mx.drawImage(R.c, 0, 0)
    const md = mx.getImageData(0, 0, R.w, R.h), mp = md.data
    for (let y = 0; y <= 40; y++)
      for (let xx = 56; xx < R.w; xx++) mp[(y * R.w + xx) * 4 + 3] = 0
    mx.putImageData(md, 0, 0)
    base = keepMain({ ...R, c: m })
  }
  const c = zoneRepaint(base, REFS[id], { gown: REPAINT[id].gown })
  const x = c.getContext('2d')
  const d = x.getImageData(0, 0, R.w, R.h), p = d.data
  const hem = hexRgb(hemCol)
  // gown rows in the lowest band of the dress take the hem tone
  for (let y = R.bottom - 12; y <= R.bottom; y++)
    for (let xx = 0; xx < R.w; xx++) {
      const i = (y * R.w + xx) * 4
      if (p[i + 3] < 8) continue
      const r = p[i], g = p[i + 1], b = p[i + 2]
      const warm = r > b // ivory gown pixels are warm; the blue native dress is not
      if (!warm) continue
      p[i] = Math.round(r * 0.6 + hem[0] * 0.4)
      p[i + 1] = Math.round(g * 0.6 + hem[1] * 0.4)
      p[i + 2] = Math.round(b * 0.6 + hem[2] * 0.4)
    }
  x.putImageData(d, 0, 0)
  return rerig(base, c)
}

// VUVALINI — silver manes + dust-tan wraps (far cut).
function repaintVuvalini(R, id) {
  const c = zoneRepaint(R, REFS[id], {
    mane: REPAINT[id].mane, rags: REPAINT[id].rags,
  })
  return rerig(R, c)
}

// HORDE / CITADEL EXTRAS — whole shirt zone to the assigned tint variant.
function repaintHorde(R, id) {
  const spec = REPAINT[id]
  const c = zoneRepaint(R, REFS[id], { shirt: spec.tint, belt: ['#14161a', '#26282e'] })
  return rerig(R, c)
}

// loadCast — every role in timeline CAST repainted per REPAINT/REPAINT_SHARED,
// plus extras: madRemyStripped (flip-safe), nuxSilver, doofBlind. Hazard fixes
// applied here: 13's print dies under strap+top, 471's tuft inside domeShade,
// 808 both tuft zones, 42 stripBlade variant, 12's bake artefact masked.
export async function loadCast() {
  const out = {}
  const raw = {}
  for (const [role, [id, src]] of Object.entries(CAST)) {
    raw[id] = raw[id] ?? (await loadRemy(id, src === 'far'))
    out[role] = raw[id]
  }
  // 42 — blade-on hero + blade-off flip-safe double
  out.madRemy = repaint42(raw[42], false)
  out.madRemyStripped = repaint42(raw[42], true)
  out.madRemyNative = raw[42]
  out.flowiosa = repaint13(raw[13])
  out.immortan = repaint471(raw[471])
  out.nux = repaint808(raw[808])
  out.nuxSilver = nuxSilver(out.nux)
  out.doof = repaint840(raw[840])
  out.doofBlind = blindfold840(out.doof)
  for (const role of ['wifeSeed', 'wifeVeil', 'wifeToes']) {
    const id = CAST[role][0]
    out[role] = repaintWife(raw[id], id, REPAINT[id].hem)
  }
  for (const role of ['vuvalini1', 'vuvalini2']) {
    const id = CAST[role][0]
    out[role] = repaintVuvalini(raw[id], id)
  }
  for (const role of ['warboy1', 'warboy2', 'warboy3', 'warboy4', 'warboy5', 'citadel1', 'citadel2', 'citadel3', 'citadel4']) {
    const id = CAST[role][0]
    out[role] = repaintHorde(raw[id], id)
  }
  return out
}

// ============================== vehicles ==============================

// chrome ramp convenience
const CH = REPAINT_SHARED.chrome
const grad = (x, x0, y0, x1, y1, stops) => {
  const g = x.createLinearGradient(x0, y0, x1, y1)
  for (const [p, c] of stops) g.addColorStop(p, c)
  return g
}
const inkLine = (x, w, y) => {
  x.fillStyle = '#0b0c0e'
  x.fillRect(6, y, w - 12, 2)
}

// THE WAR RIG — hero silhouette. Cab-forward prime mover (chrome exhaust stacks,
// raked windshield, spike brush-guard, rope-and-mud flanks) + long ribbed fuel
// tanker with tonic-glow seams, rear valve manifold, ladder, deck railing,
// chain skirts over mud. Ground ink line y=h-2; wheels baked base-only (drawRig
// spins the spokes). k = size multiplier (film draws 1.6-2.2x).
export function warRig(k = 1) {
  const W0 = 760, H0 = 260
  const c = canvas(Math.round(W0 * k), Math.round(H0 * k)), x = c.getContext('2d')
  x.scale(k, k)
  // ---- tanker cylinder (rear cap x76 -> cone into cab x566), axis y106
  const tank = new Path2D()
  tank.ellipse(76, 106, 36, 72, 0, 0, TAU)
  tank.moveTo(76, 34)
  tank.quadraticCurveTo(300, 24, 520, 36)
  tank.quadraticCurveTo(556, 44, 566, 74)
  tank.lineTo(566, 138)
  tank.quadraticCurveTo(556, 168, 520, 176)
  tank.quadraticCurveTo(300, 186, 76, 178)
  tank.closePath()
  x.fillStyle = grad(x, 0, 26, 0, 186, [
    [0, '#4a505a'], [0.22, '#353a42'], [0.5, '#26282c'], [0.82, '#1b1d22'], [1, '#131418'],
  ])
  x.fill(tank)
  // cylindrical top sheen (soft light band along the upper curve)
  x.save()
  x.clip(tank)
  x.fillStyle = 'rgba(96,104,116,0.5)'
  x.fillRect(84, 30, 436, 9)
  x.fillStyle = 'rgba(20,22,26,0.55)'
  x.fillRect(84, 168, 436, 8)
  // ribs: subtle plate bands (dark seam + light lip), not neon
  for (let rx = 120; rx <= 500; rx += 44) {
    x.fillStyle = '#191b1f'
    x.fillRect(rx, 26, 2.4, 160)
    x.fillStyle = '#454a52'
    x.fillRect(rx + 2.4, 26, 1.6, 160)
    const sx = rx + 22
    if (sx < 505) {
      // tonic-glow seams: dashed, restrained — the FLOW breathing through the hull
      x.save()
      x.setLineDash([11, 7])
      x.strokeStyle = 'rgba(47,214,168,0.34)'
      x.lineWidth = 3.2
      x.beginPath()
      x.moveTo(sx, 58)
      x.lineTo(sx, 152)
      x.stroke()
      x.strokeStyle = 'rgba(143,252,224,0.6)'
      x.lineWidth = 1.2
      x.beginPath()
      x.moveTo(sx, 62)
      x.lineTo(sx, 148)
      x.stroke()
      x.restore()
    }
  }
  // rust streaks (seeded) + a rivet row along the top chord
  const rr = rng(4711)
  for (let i = 0; i < 7; i++) {
    const rx = 92 + rr() * 420, len = 18 + rr() * 46
    x.fillStyle = `rgba(110,56,24,${0.3 + rr() * 0.25})`
    x.fillRect(rx, 46, 1.6 + rr(), len)
  }
  for (let rx = 96; rx < 500; rx += 26) {
    x.fillStyle = '#454a52'
    x.fillRect(rx, 34, 2, 2)
  }
  // FLOW level gauge on the forward cone
  x.fillStyle = '#101215'
  x.fillRect(532, 76, 12, 58)
  const gfill = REPAINT_SHARED.tonic
  x.fillStyle = gfill.shadow
  x.fillRect(534, 96, 8, 36)
  x.fillStyle = gfill.mid
  x.fillRect(535, 98, 6, 32)
  x.fillStyle = gfill.light
  x.fillRect(535, 98, 6, 3)
  x.strokeStyle = '#454a52'
  x.lineWidth = 1.6
  x.strokeRect(532, 76, 12, 58)
  x.restore()
  // hull outline
  x.strokeStyle = '#0b0c0e'
  x.lineWidth = 2.5
  x.stroke(tank)
  // ---- rear valve manifold + tonic hose
  x.fillStyle = '#26282e'
  x.fillRect(14, 78, 26, 112)
  x.fillStyle = '#33373f'
  x.fillRect(14, 78, 26, 6)
  x.strokeStyle = '#0b0c0e'
  x.lineWidth = 2
  x.strokeRect(14, 78, 26, 112)
  x.fillStyle = '#2f8a3c' // pump handwheel
  x.beginPath()
  x.arc(27, 100, 11, 0, TAU)
  x.fill()
  x.strokeStyle = '#8ffce0'
  x.lineWidth = 2.4
  x.beginPath()
  x.arc(27, 100, 11, 0, TAU)
  x.stroke()
  x.strokeStyle = '#1c5a26'
  x.lineWidth = 2
  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * Math.PI
    x.beginPath()
    x.moveTo(27 - Math.cos(a) * 10, 100 - Math.sin(a) * 10)
    x.lineTo(27 + Math.cos(a) * 10, 100 + Math.sin(a) * 10)
    x.stroke()
  }
  x.strokeStyle = gfill.mid
  x.lineWidth = 4
  x.beginPath()
  x.moveTo(30, 112)
  x.quadraticCurveTo(52, 118, 66, 128)
  x.stroke()
  x.strokeStyle = gfill.light
  x.lineWidth = 1.4
  x.stroke()
  // ---- deck walkway + railing on the tanker top
  x.fillStyle = '#26282e'
  x.fillRect(424, 12, 48, 22)
  x.strokeStyle = '#0b0c0e'
  x.lineWidth = 2
  x.strokeRect(424, 12, 48, 22)
  x.fillStyle = gfill.mid
  x.fillRect(430, 16, 4, 14)
  x.fillStyle = '#26282e'
  for (let dx = 96; dx <= 480; dx += 48) x.fillRect(dx, 8, 3, 26)
  x.fillStyle = '#33373f'
  x.fillRect(88, 6, 404, 4)
  x.fillStyle = '#454a52'
  x.fillRect(88, 6, 404, 1.6)
  x.fillStyle = '#26282e'
  x.fillRect(88, 20, 404, 3)
  // walkway plank line hugging the hull top
  x.fillStyle = '#1b1d22'
  x.fillRect(88, 32, 404, 5)
  x.fillStyle = 'rgba(96,104,116,0.4)'
  x.fillRect(88, 32, 404, 1.4)
  // ---- ladder down the flank
  x.fillStyle = '#26282e'
  x.fillRect(302, 172, 4, 80)
  x.fillRect(320, 172, 4, 80)
  x.fillStyle = '#3a3f48'
  for (let ly = 178; ly < 250; ly += 11) x.fillRect(302, ly, 22, 2.6)
  // ---- chassis + fuel drum
  x.fillStyle = '#101215'
  x.fillRect(60, 192, 650, 12)
  x.fillStyle = grad(x, 598, 176, 682, 196, [[0, '#4a505a'], [0.5, '#33373f'], [1, '#1c1f24']])
  x.fillRect(598, 176, 84, 20)
  x.fillStyle = '#cfd6de'
  x.fillRect(598, 176, 5, 20)
  x.fillRect(677, 176, 5, 20)
  // ---- cab (armoured prime mover)
  const cab = new Path2D()
  cab.moveTo(556, 150)
  cab.lineTo(556, 54)
  cab.quadraticCurveTo(558, 42, 570, 42)
  cab.lineTo(652, 40)
  cab.lineTo(688, 92)
  cab.lineTo(700, 150)
  cab.closePath()
  x.fillStyle = grad(x, 0, 40, 0, 150, [
    [0, '#3a3f48'], [0.42, '#26282c'], [1, '#15171b'],
  ])
  x.fill(cab)
  x.strokeStyle = '#0b0c0e'
  x.lineWidth = 2.5
  x.stroke(cab)
  // roof edge light + panel seam + rivets
  x.fillStyle = '#454a52'
  x.fillRect(560, 40, 96, 3)
  x.fillStyle = '#0b0c0e'
  x.fillRect(606, 44, 2, 104)
  const cr = rng(88)
  for (let i = 0; i < 9; i++) {
    x.fillStyle = '#454a52'
    x.fillRect(566 + cr() * 118, 50 + cr() * 90, 2, 2)
  }
  // raked windshield slit under a dark brow
  x.fillStyle = '#0b0c0e'
  x.beginPath()
  x.moveTo(648, 44)
  x.lineTo(684, 94)
  x.lineTo(674, 97)
  x.lineTo(642, 47)
  x.closePath()
  x.fill()
  x.fillStyle = '#14171d'
  x.beginPath()
  x.moveTo(652, 50)
  x.lineTo(679, 90)
  x.lineTo(669, 93)
  x.lineTo(647, 53)
  x.closePath()
  x.fill()
  x.strokeStyle = 'rgba(154,166,178,0.35)'
  x.lineWidth = 1.6
  x.beginPath()
  x.moveTo(655, 54)
  x.lineTo(673, 82)
  x.stroke()
  // grille slats on the front face (steel, not chrome-bright)
  x.fillStyle = '#5f6b78'
  for (let gy = 100; gy <= 136; gy += 9) x.fillRect(676, gy, 20, 4)
  x.fillStyle = '#9aa6b2'
  for (let gy = 100; gy <= 136; gy += 9) x.fillRect(676, gy, 20, 1.2)
  // twin chrome exhaust stacks with heat-darkened tops
  for (const stx of [568, 596]) {
    x.fillStyle = grad(x, stx, 0, stx + 11, 0, [[0, '#b9c2cc'], [0.45, '#8a94a0'], [1, '#4a525c']])
    x.fillRect(stx, 4, 11, 38)
    x.fillStyle = '#454a52'
    for (let by = 10; by < 40; by += 10) x.fillRect(stx - 1.6, by, 14, 3)
    x.fillStyle = '#2c2620'
    x.fillRect(stx, 4, 11, 7)
    x.fillStyle = '#0b0c0e'
    x.beginPath()
    x.ellipse(stx + 5.5, 4, 5.5, 2.2, 0, 0, TAU)
    x.fill()
  }
  // rope-and-mud flank armour + chain skirt
  x.fillStyle = '#3a2c20'
  x.fillRect(556, 150, 144, 46)
  x.fillStyle = '#241a12'
  const mr = rng(97)
  for (let i = 0; i < 26; i++) x.fillRect(558 + mr() * 138, 154 + mr() * 38, 2 + mr() * 3, 1.6)
  x.strokeStyle = '#8a6f48'
  x.lineWidth = 2.2
  for (const ry of [158, 172, 186]) {
    x.beginPath()
    x.moveTo(556, ry)
    for (let dx = 0; dx <= 144; dx += 18) x.lineTo(556 + dx, ry + Math.sin(dx * 0.5) * 1.6)
    x.stroke()
  }
  // mud skirt: ragged hem held ABOVE the wheels so they read
  x.fillStyle = '#3a2c20'
  x.beginPath()
  x.moveTo(60, 200)
  for (let dx = 60; dx <= 540; dx += 20) x.lineTo(dx, 198 - h2(dx, 3) * 6)
  x.lineTo(540, 228)
  for (let dx = 540; dx >= 60; dx -= 20) x.lineTo(dx, 226 + (h2(dx, 5) - 0.5) * 12)
  x.closePath()
  x.fill()
  x.strokeStyle = '#0b0c0e'
  x.lineWidth = 2
  x.stroke()
  // hanging chains: clear 3-link drops from the skirt hem
  for (let dx = 84; dx <= 520; dx += 64) {
    const top = 226 + (h2(dx, 5) - 0.5) * 10
    x.strokeStyle = 'rgba(106,116,128,0.9)'
    x.lineWidth = 2.4
    for (let li = 0; li < 3; li++) {
      x.beginPath()
      x.ellipse(dx, top + 4 + li * 7, 2.6, 4, 0, 0, TAU)
      x.stroke()
    }
  }
  // ---- spike brush-guard at the nose
  x.fillStyle = '#26282e'
  x.fillRect(722, 92, 6, 118)
  x.fillRect(698, 104, 58, 5)
  x.fillRect(698, 148, 58, 5)
  x.fillRect(698, 192, 58, 5)
  x.strokeStyle = '#0b0c0e'
  x.lineWidth = 1.6
  x.strokeRect(698, 104, 58, 93)
  for (let i = 0; i < 5; i++) {
    const bx = 702 + i * 12
    x.fillStyle = grad(x, bx, 118, bx + 8, 138, [[0, '#e8edf2'], [0.5, '#9aa6b2'], [1, '#5f6b78']])
    x.beginPath()
    x.moveTo(bx, 148)
    x.lineTo(bx + 7, 120 - (i % 2) * 6)
    x.lineTo(bx + 10, 148)
    x.closePath()
    x.fill()
    x.strokeStyle = '#0b0c0e'
    x.lineWidth = 1.2
    x.stroke()
  }
  // ---- wheels: bigger, with dark arch cutouts so they read (spokes live)
  const wheels = []
  for (const [wx, wy] of [[110, 228], [190, 228], [565, 228], [660, 228]]) {
    x.fillStyle = '#0b0c0e'
    x.beginPath()
    x.arc(wx, wy - 2, 33, Math.PI, 0)
    x.fill()
    x.fillStyle = '#050607'
    x.beginPath()
    x.arc(wx, wy, 33, 0, TAU)
    x.fill()
    x.fillStyle = '#14161a'
    x.beginPath()
    x.arc(wx, wy, 29, 0, TAU)
    x.fill()
    x.fillStyle = '#26282c'
    x.beginPath()
    x.arc(wx, wy, 14, 0, TAU)
    x.fill()
    x.strokeStyle = '#454a52'
    x.lineWidth = 2.6
    x.beginPath()
    x.arc(wx, wy, 14, 0, TAU)
    x.stroke()
    wheels.push([wx, wy, 30])
  }
  // mud spray baked over the wheel bottoms
  for (const [wx, wy] of wheels) {
    x.fillStyle = 'rgba(58,44,32,0.75)'
    for (let i = 0; i < 7; i++) {
      const a = Math.PI * (0.15 + h2(wx, i, 3) * 0.7)
      x.beginPath()
      x.arc(wx - Math.cos(a) * 26, wy + Math.sin(a) * 26, 2 + h2(wx, i, 5) * 3, 0, TAU)
      x.fill()
    }
  }
  inkLine(x, W0, H0 - 2)
  c.rigMeta = { wheels, cabFloor: 150, deckY: 12, k }
  return c
}

// Place the rig: ground line parks at groundY; bob px lift; pitch deg; wheel
// 0..1 = hub-spoke phase (per-wheel hash offset).
export function drawRig(ctx, cnv, x, groundY, o = {}) {
  const meta = cnv.rigMeta
  ctx.save()
  ctx.imageSmoothingEnabled = true
  ctx.translate(x, groundY)
  if (o.pitch) ctx.rotate((o.pitch * Math.PI) / 180)
  if (o.bob) ctx.translate(0, -o.bob)
  ctx.drawImage(cnv, -cnv.width / 2, -(cnv.height - 2))
  if (meta) {
    ctx.translate(-cnv.width / 2, -(cnv.height - 2))
    const spin = (o.wheel ?? 0) * TAU
    const kk = meta.k ?? 1
    for (let i = 0; i < meta.wheels.length; i++) {
      const [wx, wy, wr] = meta.wheels[i]
      const a0 = spin + hash(i * 31 + 7) * 0.9
      ctx.strokeStyle = '#454a52'
      ctx.lineWidth = 2.2 * kk
      for (let sp = 0; sp < 8; sp++) {
        const a = a0 + (sp / 8) * TAU
        ctx.beginPath()
        ctx.moveTo(wx * kk + Math.cos(a) * 3 * kk, wy * kk + Math.sin(a) * 3 * kk)
        ctx.lineTo(wx * kk + Math.cos(a) * wr * 0.5 * kk, wy * kk + Math.sin(a) * wr * 0.5 * kk)
        ctx.stroke()
      }
      ctx.fillStyle = '#9aa6b2'
      ctx.beginPath()
      ctx.arc(wx * kk, wy * kk, 3 * kk, 0, TAU)
      ctx.fill()
    }
  }
  ctx.restore()
}

// THE INTERCEPTOR — faceted black V8, long bonnet, supercharger through the
// hood, cut-down roof, ONE red pinstripe (the hero accent), mud rocker.
export function interceptor(k = 1) {
  const W0 = 380, H0 = 130
  const c = canvas(Math.round(W0 * k), Math.round(H0 * k)), x = c.getContext('2d')
  x.scale(k, k)
  const body = new Path2D()
  body.moveTo(112, 98)
  body.lineTo(112, 50)
  body.lineTo(172, 44)
  body.lineTo(186, 30)
  body.lineTo(240, 28)
  body.lineTo(264, 56)
  body.lineTo(330, 62)
  body.quadraticCurveTo(366, 66, 372, 80)
  body.lineTo(372, 98)
  body.closePath()
  x.fillStyle = grad(x, 0, 28, 0, 98, [
    [0, '#26282c'], [0.4, '#17181c'], [1, '#0e0f12'],
  ])
  x.fill(body)
  x.strokeStyle = '#050607'
  x.lineWidth = 2.2
  x.stroke(body)
  // top-edge highlights (key light upper-left)
  x.fillStyle = '#454a52'
  x.fillRect(186, 28, 54, 2.4)
  x.fillRect(266, 56, 64, 2)
  x.fillRect(114, 48, 56, 2)
  // windshield + tiny rear window
  x.fillStyle = '#0c0e12'
  x.beginPath()
  x.moveTo(240, 34)
  x.lineTo(260, 56)
  x.lineTo(246, 58)
  x.lineTo(232, 36)
  x.closePath()
  x.fill()
  x.fillStyle = 'rgba(154,166,178,0.3)'
  x.fillRect(240, 38, 2, 14)
  x.fillStyle = '#0c0e12'
  x.fillRect(176, 34, 12, 8)
  // supercharger scoop through the hood + chrome blower
  x.fillStyle = grad(x, 272, 40, 306, 60, [[0, '#b9c2cc'], [0.55, '#7a8492'], [1, '#3f454e']])
  x.beginPath()
  x.moveTo(272, 62)
  x.lineTo(275, 46)
  x.lineTo(299, 44)
  x.lineTo(306, 57)
  x.lineTo(304, 62)
  x.closePath()
  x.fill()
  x.strokeStyle = '#050607'
  x.lineWidth = 1.6
  x.stroke()
  x.fillStyle = '#101215'
  x.beginPath()
  x.ellipse(304, 51, 3, 6, 0.2, 0, TAU)
  x.fill()
  x.fillStyle = '#454a52'
  x.fillRect(278, 47, 18, 2)
  // THE pinstripe
  x.fillStyle = '#c22e2e'
  x.fillRect(116, 76, 252, 2.6)
  x.fillStyle = '#e85a4a'
  x.fillRect(116, 76, 252, 1)
  // door seam + handle
  x.fillStyle = '#050607'
  x.fillRect(236, 62, 1.6, 32)
  x.fillStyle = '#454a52'
  x.fillRect(224, 66, 8, 2.4)
  // side pipes + mud rocker
  x.fillStyle = '#454a52'
  x.fillRect(120, 90, 150, 4.4)
  x.fillStyle = '#9aa6b2'
  x.fillRect(120, 90, 150, 1.3)
  x.fillStyle = '#3a2c20'
  x.fillRect(114, 94, 254, 10)
  const ir = rng(4242)
  x.fillStyle = 'rgba(20,14,10,0.5)'
  for (let i = 0; i < 30; i++) x.fillRect(116 + ir() * 250, 95 + ir() * 8, 2 + ir() * 3, 1.4)
  // nose light slit + fang bumper
  x.fillStyle = '#cfd6de'
  x.fillRect(366, 74, 5, 4)
  x.fillStyle = '#9aa6b2'
  for (let i = 0; i < 3; i++) {
    x.beginPath()
    x.moveTo(368, 84 + i * 5)
    x.lineTo(376, 86 + i * 5)
    x.lineTo(368, 88 + i * 5)
    x.closePath()
    x.fill()
  }
  // wheels (spokes live)
  const wheels = []
  for (const [wx, wy] of [[150, 102], [300, 102]]) {
    x.fillStyle = '#050607'
    x.beginPath()
    x.arc(wx, wy, 27, 0, TAU)
    x.fill()
    x.fillStyle = '#0e0f11'
    x.beginPath()
    x.arc(wx, wy, 24, 0, TAU)
    x.fill()
    x.fillStyle = '#26282c'
    x.beginPath()
    x.arc(wx, wy, 13, 0, TAU)
    x.fill()
    x.strokeStyle = '#454a52'
    x.lineWidth = 2.4
    x.beginPath()
    x.arc(wx, wy, 13, 0, TAU)
    x.stroke()
    wheels.push([wx, wy, 26])
  }
  inkLine(x, W0, H0 - 2)
  c.rigMeta = { wheels, cabFloor: 60, deckY: 28, k }
  return c
}

export function drawCar(ctx, cnv, x, groundY, o = {}) {
  drawRig(ctx, cnv, x, groundY, o)
  if ((o.dust ?? 0) > 0) {
    const plume = defaultPlume()
    ctx.save()
    ctx.globalAlpha = clamp01(o.dust)
    ctx.imageSmoothingEnabled = true
    const s = 0.9 + clamp01(o.dust) * 0.5
    const w = plume.width * s, h = plume.height * s
    const meta = cnv.rigMeta
    const kk = meta ? (meta.k ?? 1) : 1
    const rx = x - cnv.width / 2 + (meta ? meta.wheels[0][0] * kk : 40)
    ctx.drawImage(plume, rx - w * 0.72, groundY - h * 0.86, w, h)
    ctx.restore()
  }
}

// lazily-baked default plume for drawCar's dust stamp (deterministic pixels)
let _plume = null
const defaultPlume = () => (_plume ??= dustPlume(11))

// ============================== environment ==============================

const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5]

// direct pixel buffer (remy-bros discipline; scratch-safe, art-local)
function pixels(w, h) {
  w = Math.round(w); h = Math.round(h)
  const c = canvas(w, h), ctx = c.getContext('2d'), img = ctx.createImageData(w, h), d = img.data
  const set = (x, y, col, a = 255) => {
    x = Math.floor(x); y = Math.floor(y)
    if (x < 0 || y < 0 || x >= w || y >= h) return
    const rgb3 = typeof col === 'string' ? hexRgb(col) : col
    const i = (y * w + x) * 4
    d[i] = rgb3[0]; d[i + 1] = rgb3[1]; d[i + 2] = rgb3[2]; d[i + 3] = a
  }
  const done = () => (ctx.putImageData(img, 0, 0), c)
  return { c, set, done, w, h }
}

// Dune sea — two 2560x1080 overscan panels ('day' | 'night'). Three parallax
// bands with lit/shaded faces, belly shadows under each crest, Bayer seam
// dither, distant haze; day = dustDay oranges under a bleached sun, night =
// dustNight blue-greys under a seeded star field. k = tile variant seed.
export function dunes(mode, k = 1) {
  const w = 2560, h = 1080
  const day = mode !== 'night'
  const P = pixels(w, h)
  const skyStops = (day
    ? [[0, '#e2b978'], [0.5, '#f0d5a2'], [0.82, '#f8e8c4'], [1, '#fdf3da']]
    : [[0, '#0a101e'], [0.5, '#141f36'], [0.82, '#1e2f4e'], [1, '#2a3f62']]
  ).map(([p, c]) => [p, hexRgb(c)])
  const bands = day
    ? [
        { base: 560, a1: 26, f1: 0.004, a2: 12, f2: 0.011, dark: '#c89058', mid: '#d9a55e', lit: '#eeC48a', haze: 0.45 },
        { base: 740, a1: 40, f1: 0.0026, a2: 18, f2: 0.008, dark: '#a86e34', mid: '#c08a48', lit: '#e0ac68', haze: 0.16 },
        { base: 930, a1: 58, f1: 0.0019, a2: 24, f2: 0.006, dark: '#7a4c22', mid: '#9a6430', lit: '#c08a48', haze: 0 },
      ]
    : [
        { base: 560, a1: 26, f1: 0.004, a2: 12, f2: 0.011, dark: '#2c3a54', mid: '#3c4c6c', lit: '#55688c', haze: 0.45 },
        { base: 740, a1: 40, f1: 0.0026, a2: 18, f2: 0.008, dark: '#232f46', mid: '#31405c', lit: '#46587a', haze: 0.16 },
        { base: 930, a1: 58, f1: 0.0019, a2: 24, f2: 0.006, dark: '#161e30', mid: '#232e46', lit: '#36445e', haze: 0 },
      ]
  const ridge = (b, x) => b.base + b.a1 * Math.sin(x * b.f1 + k * 2.1) + b.a2 * Math.sin(x * b.f2 + k * 5.7 + 1.3)
  const skv = skyStops[skyStops.length - 1][1]
  for (let x = 0; x < w; x++) {
    const ry = bands.map((b) => ridge(b, x))
    for (let y = 0; y < h; y++) {
      let col
      if (y < ry[0]) {
        // sky gradient with Bayer banding
        const v = y / (ry[0] + 40)
        const q = Math.min(0.999, Math.max(0, v)) * 12
        const b0 = Math.floor(q), f = q - b0
        const pick = f * 16 > BAYER[(y & 3) * 4 + (x & 3)] ? b0 + 1 : b0
        const p2 = Math.min(1, pick / 12)
        let s = 0
        while (s < skyStops.length - 2 && p2 > skyStops[s + 1][0]) s++
        const [pa, ca] = skyStops[s], [pb, cb] = skyStops[s + 1]
        col = mix(ca, cb, clamp01((p2 - pa) / (pb - pa)))
        // bleached sun disc + halo (day only, upper-left of the panel)
        if (day) {
          const dd = Math.hypot(x - 620, y - 190)
          if (dd < 90) col = mix(col, [255, 246, 220], dd < 34 ? 0.85 : 0.5 * (1 - dd / 90))
        }
      } else {
        let bi = 2
        if (y < ry[1]) bi = 0
        else if (y < ry[2]) bi = 1
        const b = bands[bi]
        const under = y - ry[bi]
        // continuous slope shading: surface falling to the right = left-facing
        // slope = catches the upper-left key; broad lit/shaded dune faces
        const slope = (ridge(b, x + 6) - ridge(b, x - 6)) / 12
        const lit = clamp01(0.5 + slope * 0.6)
        col = mix(hexRgb(b.dark), hexRgb(b.lit), 0.05 + lit * 0.95)
        // gentle deepening within the band + crest treatments
        col = mix(col, hexRgb(b.dark), clamp01(under / 340) * 0.3)
        if (under < 2 && ((x + y) & 1) === 0) col = mix(col, hexRgb(b.lit), 0.45)
        if (under < 14 && lit < 0.45) col = mix(col, hexRgb(b.dark), (1 - under / 14) * 0.5)
        if (h2(x, y, 31 + bi) > 0.965) col = mix(col, hexRgb(b.dark), 0.4)
        if (b.haze > 0) col = mix(col, skv, b.haze * clamp01(1 - under / 240))
      }
      P.set(x, y, col)
    }
  }
  if (day) {
    // (sun disc handled inline in the sky branch above)
  } else {
    // seeded star field above the far ridge (2px clusters stay legible at
    // review crops; the film draws the panel near full width)
    const sr = rng(900 + k)
    for (let i = 0; i < 300; i++) {
      const x = Math.floor(sr() * w), y = Math.floor(sr() * 520)
      const tw = 0.5 + sr() * 0.5
      P.set(x, y, mix(hexRgb('#0a101e'), [224, 234, 250], tw))
      if (sr() > 0.55) P.set(x + 1, y, mix(hexRgb('#0a101e'), [224, 234, 250], tw * 0.8))
      if (sr() > 0.85) P.set(x, y + 1, mix(hexRgb('#0a101e'), [224, 234, 250], tw * 0.7))
    }
  }
  return P.done()
}

// Citadel — three carved rock towers with tier ledges (lit west / shaded east
// faces), scree dither, terrace crowd rows, valve crowns + tonic pipes running
// down the middle tower into the pour spout (cnv.spout = [x, y]).
export function citadel(w = 720, h = 560) {
  const c = canvas(w, h), x = c.getContext('2d')
  const towers = [
    { cx: w * 0.25, hw: 74, top: h * 0.16, tiers: 4 },
    { cx: w * 0.52, hw: 96, top: h * 0.04, tiers: 5 },
    { cx: w * 0.79, hw: 66, top: h * 0.27, tiers: 3 },
  ]
  const baseY = h - 6
  // rock base shelf
  x.fillStyle = '#4a3424'
  x.beginPath()
  x.moveTo(0, baseY)
  for (let dx = 0; dx <= w; dx += 60) x.lineTo(dx, baseY - 16 - h2(dx, 2) * 14)
  x.lineTo(w, h)
  x.lineTo(0, h)
  x.closePath()
  x.fill()
  x.fillStyle = '#33241a'
  x.fillRect(0, h - 22, w, 22)
  for (const t of towers) {
    const litW = hexRgb('#c9a86b'), litHi = hexRgb('#e8cf9a')
    const shdW = hexRgb('#6e5238'), shdDk = hexRgb('#4a3424')
    for (let ti = 0; ti < t.tiers; ti++) {
      const u = ti / t.tiers
      const y0 = t.top + u * (baseY - 30 - t.top)
      const y1 = t.top + ((ti + 1) / t.tiers) * (baseY - 30 - t.top) + (ti === t.tiers - 1 ? 40 : 0)
      const hw = t.hw * (1 - u * 0.24)
      // tier slab
      x.fillStyle = '#33241a'
      x.fillRect(t.cx - hw - 3, y0, hw * 2 + 6, y1 - y0)
      const face = (x0, x1v, litSide) => {
        const g = x.createLinearGradient(x0, 0, x1v, 0)
        if (litSide) {
          g.addColorStop(0, css(litHi))
          g.addColorStop(1, css(litW))
        } else {
          g.addColorStop(0, css(shdW))
          g.addColorStop(1, css(shdDk))
        }
        x.fillStyle = g
        x.fillRect(x0, y0 + 3, x1v - x0, y1 - y0 - 3)
      }
      face(t.cx - hw, t.cx + hw * 0.16, true)
      face(t.cx + hw * 0.16, t.cx + hw, false)
      // ledge lip: lit top edge + ink shadow under
      x.fillStyle = litHi
      x.fillRect(t.cx - hw - 3, y0, hw * 2 + 6, 3)
      x.fillStyle = '#241a10'
      x.fillRect(t.cx - hw - 3, y1 - 2, hw * 2 + 6, 2)
      // carved slots + terrace crowd rows (far texture)
      const sr = rng(ti * 17 + Math.round(t.cx))
      for (let sy = y0 + 10; sy < y1 - 12; sy += 16) {
        const nx = 2 + Math.floor(sr() * 3)
        for (let sxx = 0; sxx < nx; sxx++) {
          const px = t.cx - hw * 0.7 + sr() * hw * 1.4
          x.fillStyle = '#241a10'
          x.fillRect(px, sy, 3, 6)
          if (sr() > 0.6) {
            x.fillStyle = '#b38662'
            x.fillRect(px + 1, sy - 2, 2, 2)
          }
        }
      }
      // scree dither
      for (let i = 0; i < (hw * (y1 - y0)) / 90; i++) {
        const px = t.cx - hw + sr() * hw * 2, py = y0 + 4 + sr() * (y1 - y0 - 8)
        x.fillStyle = sr() > 0.5 ? 'rgba(138,106,72,0.5)' : 'rgba(36,26,16,0.5)'
        x.fillRect(px, py, 2, 2)
      }
    }
    // valve crown: green pump derrick + handwheel
    x.fillStyle = '#2f8a3c'
    x.fillRect(t.cx - 10, t.top - 22, 20, 24)
    x.fillStyle = '#1c5a26'
    x.fillRect(t.cx - 10, t.top - 22, 20, 5)
    x.strokeStyle = '#8ffce0'
    x.lineWidth = 2.2
    x.beginPath()
    x.arc(t.cx, t.top - 26, 7, 0, TAU)
    x.stroke()
    x.fillStyle = '#2f8a3c'
    x.beginPath()
    x.arc(t.cx, t.top - 26, 3, 0, TAU)
    x.fill()
  }
  // tonic pipes down the middle tower's lit face into the spout
  const mid = towers[1]
  const spout = [mid.cx + mid.hw * 0.16 + 8, h * 0.585]
  x.strokeStyle = REPAINT_SHARED.tonic.shadow
  x.lineWidth = 6
  x.beginPath()
  x.moveTo(mid.cx, mid.top - 20)
  x.lineTo(mid.cx, h * 0.42)
  x.quadraticCurveTo(mid.cx + 6, h * 0.5, spout[0], spout[1] - 6)
  x.lineTo(spout[0] + 10, spout[1] - 2)
  x.stroke()
  x.strokeStyle = REPAINT_SHARED.tonic.mid
  x.lineWidth = 3
  x.stroke()
  x.strokeStyle = REPAINT_SHARED.tonic.light
  x.lineWidth = 1.2
  x.stroke()
  for (let jy = mid.top - 10; jy < h * 0.56; jy += 40) {
    x.fillStyle = '#5f6b78'
    x.fillRect(mid.cx - 4, jy, 8, 5)
  }
  // spout bell
  x.fillStyle = '#33373f'
  x.beginPath()
  x.moveTo(spout[0] - 2, spout[1] - 8)
  x.lineTo(spout[0] + 18, spout[1] - 8)
  x.lineTo(spout[0] + 14, spout[1] + 2)
  x.lineTo(spout[0] + 2, spout[1] + 2)
  x.closePath()
  x.fill()
  x.strokeStyle = '#0b0c0e'
  x.lineWidth = 1.4
  x.stroke()
  inkLine(x, w, h - 2)
  c.spout = spout
  return c
}

// Highway strip — two-lane blacktop + bleached centre dashes, tar patches,
// edge rubble. cnv.groundY = the wheel/foot wear line.
export function highway(w = 2560, h = 260) {
  const c = canvas(w, h), x = c.getContext('2d')
  const r = rng(66)
  // shoulders
  x.fillStyle = '#3a3226'
  x.fillRect(0, 0, w, 16)
  x.fillStyle = '#2e2a20'
  x.fillRect(0, h - 64, w, 64)
  x.fillStyle = '#0b0c0e'
  x.fillRect(0, h - 2, w, 2)
  // asphalt bed
  const g = x.createLinearGradient(0, 16, 0, h - 64)
  g.addColorStop(0, '#202227')
  g.addColorStop(0.5, '#1c1e22')
  g.addColorStop(1, '#15161a')
  x.fillStyle = g
  x.fillRect(0, 16, w, h - 80)
  // wear + tar patches (seeded)
  for (let i = 0; i < 90; i++) {
    const px = r() * w, py = 20 + r() * (h - 110), pw = 30 + r() * 120, ph = 3 + r() * 9
    x.fillStyle = r() > 0.55 ? 'rgba(38,40,44,0.7)' : 'rgba(14,15,18,0.7)'
    x.beginPath()
    x.ellipse(px, py, pw, ph, 0, 0, TAU)
    x.fill()
  }
  // wheel-wear bands (the drive line)
  x.fillStyle = 'rgba(38,40,44,0.5)'
  x.fillRect(0, h - 118, w, 7)
  x.fillRect(0, h - 96, w, 5)
  // edge lines + bleached centre dashes
  x.fillStyle = '#3a3e46'
  x.fillRect(0, 24, w, 3)
  x.fillRect(0, h - 74, w, 3)
  for (let dx = 0; dx < w; dx += 100) {
    x.fillStyle = '#c9a86b'
    x.fillRect(dx, h - 164, 58, 6)
    x.fillStyle = '#e0c090'
    x.fillRect(dx, h - 164, 58, 1.6)
  }
  // rubble on both shoulders
  for (let i = 0; i < 120; i++) {
    const px = r() * w, top = r() > 0.5
    const py = top ? 2 + r() * 12 : h - 60 + r() * 52
    x.fillStyle = ['#4a4438', '#2c2620', '#55503f'][Math.floor(r() * 3)]
    x.beginPath()
    x.ellipse(px, py, 2 + r() * 5, 1.6 + r() * 3, r() * 3, 0, TAU)
    x.fill()
  }
  c.groundY = h - 112
  return c
}

// Mud flats — cracked bald mud (mud ramp), seeded crack polylines, comb-rake
// marks, tonic-glint puddles at 8%. cnv.groundY = the wheel/foot line.
export function mudFlats(w = 2560, h = 300) {
  const P = pixels(w, h)
  const top = hexRgb('#6e5a3c'), midc = hexRgb('#54432e'), deep = hexRgb('#3a2c20')
  for (let y = 0; y < h; y++) {
    const v = y / (h - 1)
    const col = v < 0.4 ? mix(top, midc, v / 0.4) : mix(midc, deep, (v - 0.4) / 0.6)
    for (let x = 0; x < w; x++) {
      let cc = col
      if (h2(x, y, 71) > 0.965) cc = mix(col, top, 0.5)
      if (h2(x, y, 72) > 0.97) cc = mix(col, deep, 0.55)
      P.set(x, y, cc)
    }
  }
  const c = P.done(), x = c.getContext('2d')
  const r = rng(303)
  x.strokeStyle = '#241a12'
  x.lineWidth = 2
  // cracks: jagged descending polylines with occasional branches
  for (let i = 0; i < 26; i++) {
    let px = r() * w, py = 8 + r() * 40
    x.beginPath()
    x.moveTo(px, py)
    const steps = 8 + Math.floor(r() * 14)
    for (let s = 0; s < steps; s++) {
      px += (r() - 0.5) * 46
      py += 8 + r() * 20
      x.lineTo(px, py)
    }
    x.stroke()
    if (r() > 0.5) {
      x.beginPath()
      x.moveTo(px, py)
      x.lineTo(px + (r() - 0.5) * 70, py - 10 - r() * 30)
      x.stroke()
    }
  }
  // comb-rake marks: groups of parallel grooves (the saddest gag)
  for (let gi = 0; gi < 5; gi++) {
    const gx = r() * (w - 300), gy = 40 + r() * (h - 120), rot = (r() - 0.5) * 0.5
    x.save()
    x.translate(gx, gy)
    x.rotate(rot)
    x.strokeStyle = 'rgba(36,26,18,0.75)'
    x.lineWidth = 1.6
    for (let t = 0; t < 5; t++) {
      x.beginPath()
      x.moveTo(0, t * 5)
      x.quadraticCurveTo(90 + r() * 60, t * 5 + (r() - 0.5) * 6, 200 + r() * 80, t * 5)
      x.stroke()
    }
    x.restore()
  }
  // puddles + tonic glints (8% of puddle pixels)
  for (let i = 0; i < 7; i++) {
    const px = r() * w, py = 30 + r() * (h - 80), pw = 20 + r() * 60, ph = 4 + r() * 9
    x.fillStyle = '#2c2118'
    x.beginPath()
    x.ellipse(px, py, pw, ph, 0, 0, TAU)
    x.fill()
    x.strokeStyle = '#1a120c'
    x.lineWidth = 1.6
    x.stroke()
    const glint = REPAINT_SHARED.tonic.light
    x.fillStyle = glint
    const n = Math.max(1, Math.floor(pw * ph * 0.08 / 14))
    for (let s = 0; s < n; s++) {
      x.globalAlpha = 0.5 + r() * 0.5
      x.fillRect(px - pw * 0.5 + r() * pw, py - ph * 0.4 + r() * ph * 0.8, 2 + r() * 3, 1.4)
    }
    x.globalAlpha = 1
  }
  inkLine(x, w, h - 2)
  c.groundY = h - 130
  return c
}

// Sandstorm wall — a SOLID dust mass (alpha-1 puffs, no see-through gaps) with
// puffy edges, seam crescents, belly shadow, sunlit speckle. Bolts per frame
// via stormBolt().
export function sandstorm(w = 1200, h = 1080, seed = 5) {
  const c = canvas(w, h), x = c.getContext('2d')
  const r = rng(seed)
  const ramp = REPAINT_SHARED.dustDay
  const puffs = []
  for (let i = 0; i < 150; i++) {
    const u = i / 150
    puffs.push({
      x: r() * w * 1.12 - w * 0.08,
      y: h * 0.14 + r() * h * 0.9,
      rx: 55 + r() * 160 * (0.5 + u),
      ry: 38 + r() * 95,
    })
  }
  puffs.sort((a, b) => a.y - b.y)
  for (const p of puffs) {
    const v = clamp01(p.y / h)
    const col = v > 0.72 ? ramp[0] : v > 0.4 ? ramp[1] : ramp[2]
    x.fillStyle = col
    x.beginPath()
    x.ellipse(p.x, p.y, p.rx, p.ry, 0, 0, TAU)
    x.fill()
  }
  // seam crescents clipped to the filled mass (no floating arcs over the sky)
  x.globalCompositeOperation = 'source-atop'
  for (const p of puffs) {
    x.strokeStyle = 'rgba(122,74,32,0.25)'
    x.lineWidth = 5
    x.beginPath()
    x.ellipse(p.x, p.y, p.rx - 4, p.ry - 4, 0, Math.PI * 0.15, Math.PI * 0.85)
    x.stroke()
  }
  // belly shadow
  const bg = x.createLinearGradient(0, h * 0.72, 0, h)
  bg.addColorStop(0, 'rgba(90,52,20,0)')
  bg.addColorStop(1, 'rgba(90,52,20,0.5)')
  x.fillStyle = bg
  x.fillRect(0, h * 0.72, w, h * 0.28)
  x.globalCompositeOperation = 'source-over'
  // sunlit speckle
  for (let i = 0; i < 220; i++) {
    x.fillStyle = `rgba(242,207,148,${0.2 + r() * 0.4})`
    x.fillRect(r() * w, h * 0.2 + r() * h * 0.7, 2 + r() * 3, 1.6)
  }
  return c
}

// One inner-storm lightning polyline; pure fn of t (call at seeded event times).
export function stormBolt(ctx, x, y, t, seed = 3) {
  const ph = Math.floor(t * 16)
  const n = 9 + Math.floor(hash(seed * 7 + 1) * 5)
  const pts = [[x, y]]
  let px = x, py = y
  for (let i = 0; i < n; i++) {
    px += (hash(i * 13 + seed * 31 + ph) - 0.5) * 40
    py += 34 + hash(i * 7 + seed * 17 + ph) * 46
    pts.push([px, py])
  }
  const stroke = (col, w2) => {
    ctx.strokeStyle = col
    ctx.lineWidth = w2
    ctx.lineJoin = 'round'
    ctx.beginPath()
    ctx.moveTo(pts[0][0], pts[0][1])
    for (const [qx, qy] of pts.slice(1)) ctx.lineTo(qx, qy)
    ctx.stroke()
  }
  stroke('rgba(232,106,30,0.4)', 6)
  stroke('#ffc23c', 2.6)
  stroke('#fff2b0', 1.2)
  // one branch
  const bi = 3 + Math.floor(hash(seed + ph) * 3)
  const [bx, by] = pts[bi]
  ctx.strokeStyle = 'rgba(255,194,60,0.8)'
  ctx.lineWidth = 1.6
  ctx.beginPath()
  ctx.moveTo(bx, by)
  ctx.lineTo(bx + (hash(ph + seed) - 0.5) * 60, by + 40 + hash(ph + 9) * 40)
  ctx.stroke()
}

// ============================== attached props ==============================

// IMMORTAN MASK — bone teeth plates + dark eye band (tubes are alpha strokes at
// draw time). Native 90x70, drawn at actor scale over 471's head.
export function immortanMask(k = 1) {
  const W0 = 90, H0 = 70
  const c = canvas(Math.round(W0 * k), Math.round(H0 * k)), x = c.getContext('2d')
  x.scale(k, k)
  // eye socket band (deep: covers eyes AND the mouth rows of the sprite)
  x.fillStyle = '#1a1c20'
  x.beginPath()
  x.moveTo(8, 4)
  x.lineTo(82, 4)
  x.quadraticCurveTo(88, 6, 86, 18)
  x.lineTo(80, 28)
  x.lineTo(10, 28)
  x.lineTo(4, 18)
  x.quadraticCurveTo(2, 6, 8, 4)
  x.closePath()
  x.fill()
  x.fillStyle = '#0b0c0e'
  x.beginPath()
  x.ellipse(28, 14, 8, 5, 0, 0, TAU)
  x.fill()
  x.beginPath()
  x.ellipse(62, 14, 8, 5, 0, 0, TAU)
  x.fill()
  x.fillStyle = '#454a52'
  x.fillRect(8, 4, 74, 2)
  // jaw: bone trapezoid of teeth plates
  const jaw = new Path2D()
  jaw.moveTo(12, 30)
  jaw.lineTo(78, 30)
  jaw.lineTo(72, 60)
  jaw.quadraticCurveTo(45, 68, 18, 60)
  jaw.closePath()
  x.fillStyle = grad(x, 0, 30, 0, 64, [[0, '#e8e4da'], [0.55, '#c9c5b8'], [1, '#8e8b78']])
  x.fill(jaw)
  x.strokeStyle = '#151009'
  x.lineWidth = 2
  x.stroke(jaw)
  for (let i = 0; i < 4; i++) {
    x.fillStyle = '#151009'
    x.fillRect(24 + i * 11, 32, 2.4, 26 - Math.abs(i - 1.5) * 3)
  }
  // bottom teeth scallops
  x.fillStyle = '#f4f2ea'
  for (let i = 0; i < 5; i++) {
    x.beginPath()
    x.arc(22 + i * 11.5, 56 + Math.abs(i - 2) * 1.2, 4, 0, Math.PI)
    x.fill()
  }
  // side wing rivets
  x.fillStyle = '#5f6b78'
  x.fillRect(8, 28, 4, 10)
  x.fillRect(78, 28, 4, 10)
  c.maskMeta = { k }
  return c
}

// Anchor the mask to rig R at actor scale; breath 0..1 squashes the bellows and
// drives tube jitter (pure in t). Pass x/feet (+sx/flip) to match drawRemy.
// The canvas may be pre-scaled (immortanMask(k)) — sprite-space size stays 90x70.
export function drawMask(ctx, cnv, R, o = {}) {
  const sx = o.sx ?? 2.8
  const t = o.t ?? 0
  const breath = clamp01(o.breath ?? 0)
  const kk = cnv.maskMeta ? cnv.maskMeta.k : 1
  const MW = cnv.width / kk, MH = cnv.height / kk // native 90x70 in sprite px
  const jit = (i) => (hash(Math.floor(t * 7) + i * 131 + 7) - 0.5) * 2.4 * (0.5 + breath)
  ctx.save()
  if (o.x !== undefined) {
    // match drawRemy's anchor exactly: canvas centre col (M + w/2) at x, bottom
    // row (bottom+1) at feet
    ctx.translate(o.x, o.feet)
    ctx.scale(o.flip ? -sx : sx, sx)
    ctx.translate(-(R.w / 2 + 6), -(R.bottom + 1))
  }
  // mask eye band over the sprite's eye rows (~top+41), jaw down over the chin
  const squash = 1 - 0.06 * breath
  const mh = MH * squash
  const mx = R.cx - MW / 2, my = R.top + 24 - (MH - mh)
  ctx.imageSmoothingEnabled = true
  ctx.drawImage(cnv, mx, my, MW, mh)
  // breathing tubes: two beziers from the jaws back over the shoulders
  const tube = (dir, i) => {
    const x0 = R.cx + dir * 36
    const y0 = R.top + 58
    const cxx = R.cx + dir * (56 + jit(i))
    const cyy = R.top + 26 + jit(i + 3)
    const x1 = R.cx + dir * (44 + jit(i + 6) * 0.6)
    const y1 = R.top + 96
    ctx.strokeStyle = 'rgba(159,166,178,0.55)'
    ctx.lineWidth = 3.4
    ctx.lineCap = 'round'
    ctx.beginPath()
    ctx.moveTo(x0, y0)
    ctx.quadraticCurveTo(cxx, cyy, x1, y1)
    ctx.stroke()
    ctx.strokeStyle = 'rgba(232,237,242,0.8)'
    ctx.lineWidth = 1.2
    ctx.beginPath()
    ctx.moveTo(x0, y0 - 1)
    ctx.quadraticCurveTo(cxx, cyy - 1, x1, y1 - 1)
    ctx.stroke()
  }
  tube(-1, 1)
  tube(1, 5)
  ctx.restore()
}

// GREAT WIG — white/silver horsehair mass, worn at phase 0; phase 0..1 breaks
// into 3-5 tumbling clumps (offsets/rotations pure in phase + seeded hashes).
export function greatWig(k = 1, phase = 0) {
  const W0 = 120, H0 = 90
  const c = canvas(Math.round(W0 * k), Math.round(H0 * k)), x = c.getContext('2d')
  x.scale(k, k)
  const ramp = REPAINT_SHARED.greatWig
  const ink = REPAINT_SHARED.wigInk
  const cx = 60, cy = 36
  const clump = (px, py, rot, sc, seedv) => {
    x.save()
    x.translate(px, py)
    x.rotate(rot)
    x.scale(sc, sc)
    const rr = rng(seedv)
    for (const [dx, dy, r2] of [[-9, 2, 10], [0, -3, 12], [9, 2, 10], [0, 7, 8]]) {
      x.fillStyle = ramp[0]
      x.beginPath()
      x.arc(dx, dy, r2, 0, TAU)
      x.fill()
    }
    x.fillStyle = ramp[1]
    x.beginPath()
    x.arc(-3, -6, 7, 0, TAU)
    x.fill()
    x.strokeStyle = ink
    x.lineWidth = 1.3
    for (let i = 0; i < 3; i++) {
      x.beginPath()
      x.moveTo(-10 + i * 9, -8)
      x.quadraticCurveTo(-12 + i * 9 + (rr() - 0.5) * 6, 2, -9 + i * 9, 10)
      x.stroke()
    }
    x.restore()
  }
  if (phase <= 0.02) {
    // worn: draped horsehair — dome + lobes + descending wavy locks (it must
    // read as a wig mass ripe for the rip, not a cap)
    x.fillStyle = ramp[0]
    x.beginPath()
    x.ellipse(cx, cy, 47, 25, 0, 0, TAU)
    x.fill()
    x.fillStyle = ramp[1]
    for (const [dx, dy, r2] of [[-30, -10, 16], [0, -18, 19], [30, -10, 16]]) {
      x.beginPath()
      x.arc(cx + dx, cy + dy, r2, 0, TAU)
      x.fill()
    }
    // descending locks: thick round strokes with a shadowed under-hem
    x.strokeStyle = 'rgba(106,112,120,0.55)'
    x.lineWidth = 13
    x.lineCap = 'round'
    for (let i = 0; i < 6; i++) {
      const lx = cx - 38 + i * 15
      x.beginPath()
      x.moveTo(lx, cy + 12)
      x.lineTo(lx + Math.sin(i * 2.1) * 3, cy + 34)
      x.stroke()
    }
    x.strokeStyle = ramp[0]
    x.lineWidth = 10
    for (let i = 0; i < 6; i++) {
      const lx = cx - 38 + i * 15
      x.beginPath()
      x.moveTo(lx, cy + 10)
      x.quadraticCurveTo(lx + Math.sin(i * 2.6) * 6, cy + 24, lx + Math.sin(i * 2.1) * 4, cy + 40 + (i % 2) * 6)
      x.stroke()
    }
    x.strokeStyle = ramp[1]
    x.lineWidth = 3.4
    for (let i = 0; i < 6; i += 2) {
      const lx = cx - 38 + i * 15
      x.beginPath()
      x.moveTo(lx - 2, cy + 12)
      x.quadraticCurveTo(lx + Math.sin(i * 2.6) * 6 - 2, cy + 24, lx + Math.sin(i * 2.1) * 4 - 2, cy + 38 + (i % 2) * 6)
      x.stroke()
    }
    // strand lines over the dome + seeded flyaways
    x.strokeStyle = ink
    x.lineWidth = 1.4
    const wr = rng(707)
    for (let i = -3; i <= 3; i++) {
      x.beginPath()
      x.moveTo(cx + i * 12, cy - 20)
      x.quadraticCurveTo(cx + i * 15, cy, cx + i * 11, cy + 14)
      x.stroke()
    }
    for (let i = 0; i < 6; i++) {
      const a = wr() * TAU
      x.beginPath()
      x.moveTo(cx + Math.cos(a) * 42, cy + Math.sin(a) * 22)
      x.quadraticCurveTo(
        cx + Math.cos(a) * 54 + (wr() - 0.5) * 10, cy + Math.sin(a) * 28,
        cx + Math.cos(a) * 58 + (wr() - 0.5) * 16, cy + Math.sin(a) * 34,
      )
      x.stroke()
    }
  } else {
    // tumble: the dome shrinks while clumps separate and spin
    const domeScale = Math.max(0.12, 1 - phase * 1.05)
    x.save()
    x.translate(cx, cy + phase * 14)
    x.scale(domeScale, domeScale)
    x.fillStyle = ramp[0]
    x.beginPath()
    x.ellipse(0, 0, 46, 26, 0, 0, TAU)
    x.fill()
    x.strokeStyle = ink
    x.lineWidth = 1.4
    for (let i = -2; i <= 2; i++) {
      x.beginPath()
      x.moveTo(i * 14, -14)
      x.quadraticCurveTo(i * 17, 0, i * 13, 14)
      x.stroke()
    }
    x.restore()
    const n = 4
    for (let i = 0; i < n; i++) {
      const a = -Math.PI * 0.15 + (i / n) * TAU + hash(i * 7 + 3) * 0.8
      const dist = phase * (30 + hash(i * 13 + 5) * 52)
      clump(
        cx + Math.cos(a) * dist,
        cy + Math.sin(a) * dist * 0.7 + phase * 18,
        phase * (2.2 + hash(i * 3 + 9) * 2.6) * (i % 2 ? 1 : -1),
        1 - phase * 0.25,
        i * 31 + 7,
      )
    }
  }
  return c
}

// FLAME GUITAR — redhide slab body, chrome neck, the headstock IS the nozzle.
export function flameGuitar(k = 1) {
  const W0 = 150, H0 = 56
  const c = canvas(Math.round(W0 * k), Math.round(H0 * k)), x = c.getContext('2d')
  x.scale(k, k)
  const fire = REPAINT_SHARED.fire
  // strap stubs
  x.strokeStyle = '#3a2a18'
  x.lineWidth = 4
  x.beginPath()
  x.moveTo(14, 12)
  x.lineTo(2, 4)
  x.moveTo(132, 34)
  x.lineTo(146, 44)
  x.stroke()
  // slab body wrapped in redhide (deep red, lit top edge only)
  const body = new Path2D()
  body.moveTo(8, 10)
  body.quadraticCurveTo(2, 28, 10, 46)
  body.quadraticCurveTo(46, 54, 84, 46)
  body.lineTo(88, 12)
  body.quadraticCurveTo(48, 4, 8, 10)
  body.closePath()
  x.fillStyle = grad(x, 0, 6, 0, 52, [[0, '#a03a16'], [0.45, '#8a2a10'], [1, '#5c160a']])
  x.fill(body)
  x.strokeStyle = '#2a0c06'
  x.lineWidth = 2
  x.stroke(body)
  x.strokeStyle = 'rgba(232,106,30,0.5)'
  x.lineWidth = 1.6
  x.beginPath()
  x.moveTo(10, 9)
  x.quadraticCurveTo(48, 5, 86, 12)
  x.stroke()
  // leather wrap seams + pickups
  x.strokeStyle = 'rgba(42,12,6,0.7)'
  x.lineWidth = 1.6
  for (let i = 0; i < 4; i++) {
    x.beginPath()
    x.moveTo(12 + i * 18, 8)
    x.quadraticCurveTo(14 + i * 18, 28, 12 + i * 18, 48)
    x.stroke()
  }
  x.fillStyle = '#5f6b78'
  for (const dx of [34, 58]) {
    x.fillRect(dx, 22, 8, 5)
    x.fillRect(dx, 32, 8, 5)
  }
  x.fillStyle = '#9aa6b2'
  x.fillRect(20, 40, 44, 3) // bridge
  // chrome neck + frets
  x.fillStyle = grad(x, 0, 24, 0, 34, [[0, '#e8edf2'], [0.5, '#9aa6b2'], [1, '#5f6b78']])
  x.fillRect(86, 24, 46, 10)
  x.fillStyle = '#454a52'
  for (let i = 0; i < 6; i++) x.fillRect(92 + i * 7, 24, 1.6, 10)
  // headstock = flame nozzle
  const noz = new Path2D()
  noz.moveTo(132, 22)
  noz.lineTo(146, 16)
  noz.quadraticCurveTo(150, 28, 146, 40)
  noz.lineTo(132, 34)
  noz.closePath()
  x.fillStyle = grad(x, 0, 16, 0, 40, [[0, '#cfd6de'], [0.6, '#9aa6b2'], [1, '#5f6b78']])
  x.fill(noz)
  x.strokeStyle = '#0b0c0e'
  x.lineWidth = 1.6
  x.stroke(noz)
  x.fillStyle = '#1a0c06'
  x.beginPath()
  x.ellipse(145, 28, 2.6, 8, 0, 0, TAU)
  x.fill()
  c.nozzle = [148, 28] // native nozzle mouth (pre-scale coords / k)
  return c
}

// Fire-ramp jet plume from (x,y) firing right; u 0..1 = throttle. Pure in (u, seed).
export function flameJet(ctx, x, y, u, seed = 2) {
  if (u <= 0.01) return
  const fire = REPAINT_SHARED.fire
  const len = 20 + u * 96
  const tongues = [[0.5, fire[1], 0.85], [0.32, fire[2], 0.95], [0.16, fire[3], 1]]
  ctx.save()
  ctx.globalCompositeOperation = 'lighter'
  for (const [wf, col, al] of tongues) {
    ctx.globalAlpha = al * Math.min(1, u * 2)
    ctx.fillStyle = col
    ctx.beginPath()
    const n = 7
    ctx.moveTo(x, y - len * 0.22 * wf)
    for (let i = 0; i <= n; i++) {
      const v = i / n
      const flick = 0.55 + 0.45 * hash(Math.floor(u * 22) + i * 5 + seed)
      ctx.lineTo(x + len * v, y - len * 0.24 * wf * Math.sin(v * Math.PI) * flick)
    }
    for (let i = n; i >= 0; i--) {
      const v = i / n
      const flick = 0.55 + 0.45 * hash(Math.floor(u * 22) + i * 7 + seed + 40)
      ctx.lineTo(x + len * v, y + len * 0.24 * wf * Math.sin(v * Math.PI) * flick)
    }
    ctx.closePath()
    ctx.fill()
  }
  ctx.globalAlpha = 1
  ctx.restore()
  // sparks past the tip
  ctx.fillStyle = fire[3]
  for (let i = 0; i < 3; i++) {
    const dx = len + 6 + hash(i * 3 + seed) * 16 * u
    const dy = (hash(i * 9 + seed) - 0.5) * 20 * u
    ctx.globalAlpha = 0.7 * u
    ctx.beginPath()
    ctx.arc(x + dx, y + dy, 1.6 + hash(i + seed) * 2, 0, TAU)
    ctx.fill()
  }
  ctx.globalAlpha = 1
}

// SPEAKER WALL — amp/drum stack with woven grilles, red valve trim, comb+scalp
// totems. Native 420x300 (drawn ~1.4x on the rig deck).
export function speakerWall(k = 1) {
  const W0 = 420, H0 = 300
  const c = canvas(Math.round(W0 * k), Math.round(H0 * k)), x = c.getContext('2d')
  x.scale(k, k)
  const r = rng(840)
  const cab = (cx2, cy2, w2, h2, drums) => {
    // box
    x.fillStyle = grad(x, 0, cy2, 0, cy2 + h2, [[0, '#2e3238'], [0.6, '#23262c'], [1, '#17191d']])
    x.fillRect(cx2, cy2, w2, h2)
    x.strokeStyle = '#0b0c0e'
    x.lineWidth = 2.4
    x.strokeRect(cx2, cy2, w2, h2)
    // chrome corner protectors
    x.fillStyle = '#5f6b78'
    for (const [ex, ey] of [[cx2, cy2], [cx2 + w2 - 8, cy2], [cx2, cy2 + h2 - 8], [cx2 + w2 - 8, cy2 + h2 - 8]]) {
      x.fillRect(ex, ey, 8, 8)
      x.fillStyle = '#9aa6b2'
      x.fillRect(ex, ey, 8, 2)
      x.fillStyle = '#5f6b78'
    }
    // cloth grille with weave dither
    x.fillStyle = '#1a1c20'
    x.fillRect(cx2 + 10, cy2 + 10, w2 - 20, h2 - 20)
    for (let wy = cy2 + 10; wy < cy2 + h2 - 10; wy += 3)
      for (let wx = cx2 + 10; wx < cx2 + w2 - 10; wx += 3) {
        if ((wx + wy) % 6 === 0 || r() > 0.86) continue
        x.fillStyle = r() > 0.5 ? 'rgba(70,76,86,0.5)' : 'rgba(40,44,52,0.6)'
        x.fillRect(wx, wy, 2, 2)
      }
    x.strokeStyle = '#454a52'
    x.lineWidth = 1.4
    x.strokeRect(cx2 + 10, cy2 + 10, w2 - 20, h2 - 20)
    if (drums) {
      // drum shells sitting IN the top cab: red shells, pale-tan heads, tilted
      for (let i = 0; i < 2; i++) {
        const dx = cx2 + 30 + i * (w2 - 68)
        x.save()
        x.translate(dx + 24, cy2 + 12)
        x.rotate(i ? 0.12 : -0.1)
        x.fillStyle = i ? '#a03a16' : '#7a1e0e'
        x.beginPath()
        x.ellipse(0, 2, 26, 9, 0, 0, TAU)
        x.fill()
        x.fillStyle = '#d8ccb0'
        x.beginPath()
        x.ellipse(0, 0, 26, 9, 0, 0, TAU)
        x.fill()
        x.fillStyle = '#b8ac8e'
        x.beginPath()
        x.ellipse(0, 0.8, 20, 6.4, 0, 0, TAU)
        x.fill()
        x.strokeStyle = '#2a0c06'
        x.lineWidth = 1.6
        x.beginPath()
        x.ellipse(0, 0, 26, 9, 0, 0, TAU)
        x.stroke()
        x.fillStyle = '#5f6b78'
        for (const lx of [-20, 20]) x.fillRect(lx - 1.4, -4, 2.8, 9)
        x.restore()
      }
    }
  }
  cab(10, 180, 190, 110, false)
  cab(220, 180, 190, 110, false)
  cab(10, 84, 190, 88, false)
  cab(220, 84, 190, 88, false)
  cab(60, 22, 300, 56, true)
  // red valve tube trim up the edges
  x.strokeStyle = '#7a1e0e'
  x.lineWidth = 7
  x.beginPath()
  x.moveTo(6, 292)
  x.lineTo(6, 20)
  x.moveTo(414, 292)
  x.lineTo(414, 20)
  x.stroke()
  x.strokeStyle = '#a03a16'
  x.lineWidth = 3.4
  x.stroke()
  // comb + scalp totems on the top cab (band name plate)
  x.fillStyle = '#c9c5b8'
  x.fillRect(150, 34, 26, 4)
  for (let i = 0; i < 5; i++) x.fillRect(151 + i * 5.4, 38, 1.8, 6)
  x.fillStyle = '#e8e4da'
  x.beginPath()
  x.arc(250, 40, 9, Math.PI, 0)
  x.closePath()
  x.fill()
  x.fillStyle = '#8e8b78'
  x.fillRect(244, 38, 12, 2)
  inkLine(x, W0, H0 - 2)
  return c
}

// POLE-CAT bendy pole — graphite bow (bend -1..1) + red rag pennant.
export function poleCat(k = 1, bend = 0) {
  const W0 = 26, H0 = 150
  const c = canvas(Math.round(W0 * k), Math.round(H0 * k)), x = c.getContext('2d')
  x.scale(k, k)
  const bx = 13 + bend * 22, by = 76
  // tapered bowed pole
  x.strokeStyle = '#26282e'
  x.lineCap = 'round'
  x.lineWidth = 5.4
  x.beginPath()
  x.moveTo(13, 146)
  x.quadraticCurveTo(bx, by, 13, 8)
  x.stroke()
  x.strokeStyle = '#454a52'
  x.lineWidth = 1.6
  x.beginPath()
  x.moveTo(11.4, 146)
  x.quadraticCurveTo(bx - 1.6, by, 11.4, 8)
  x.stroke()
  // base clamp
  x.fillStyle = '#9aa6b2'
  x.fillRect(7, 140, 12, 5)
  x.fillStyle = '#5f6b78'
  x.fillRect(7, 143, 12, 2)
  // rag pennant: notched double-tail flag at the tip
  const tipX = 13, tipY = 10
  x.fillStyle = '#a03a16'
  x.beginPath()
  x.moveTo(tipX, tipY)
  x.lineTo(tipX + 13 + bend * 4, tipY + 5)
  x.lineTo(tipX + 10 + bend * 3, tipY + 11)
  x.lineTo(tipX + 15 + bend * 4, tipY + 18)
  x.lineTo(tipX, tipY + 22)
  x.closePath()
  x.fill()
  x.fillStyle = '#7a1e0e'
  x.beginPath()
  x.moveTo(tipX, tipY + 8)
  x.lineTo(tipX + 9 + bend * 3, tipY + 12)
  x.lineTo(tipX + 6 + bend * 2, tipY + 16)
  x.lineTo(tipX, tipY + 18)
  x.closePath()
  x.fill()
  x.strokeStyle = '#2a0c06'
  x.lineWidth = 1
  x.beginPath()
  x.moveTo(tipX, tipY)
  x.lineTo(tipX, tipY + 22)
  x.stroke()
  inkLine(x, W0, H0)
  return c
}

// MECH ARM — chrome segments + elbow + two-finger claw; curl -1..1 poses it.
export function mechArm(k = 1, curl = 0) {
  const W0 = 60, H0 = 24
  const c = canvas(Math.round(W0 * k), Math.round(H0 * k)), x = c.getContext('2d')
  x.scale(k, k)
  const seg = (x0, y0, x1, y1, w2) => {
    const g = grad(x, x0, y0 - w2 / 2, x1, y1 + w2 / 2, [[0, '#e8edf2'], [0.45, '#9aa6b2'], [1, '#5f6b78']])
    x.strokeStyle = g
    x.lineWidth = w2
    x.lineCap = 'round'
    x.beginPath()
    x.moveTo(x0, y0)
    x.lineTo(x1, y1)
    x.stroke()
    x.strokeStyle = '#0b0c0e'
    x.lineWidth = 1
    x.beginPath()
    x.moveTo(x0, y0 - w2 / 2 + 1)
    x.lineTo(x1, y1 - w2 / 2 + 1)
    x.stroke()
  }
  const elbY = 12 + curl * 6
  const wriY = 12 - curl * 12
  seg(6, 12, 30, elbY, 11)
  seg(30, elbY, 50, wriY, 8)
  // elbow joint + rivets
  x.fillStyle = '#5f6b78'
  x.beginPath()
  x.arc(30, elbY, 6.4, 0, TAU)
  x.fill()
  x.fillStyle = '#cfd6de'
  x.beginPath()
  x.arc(30, elbY - 1.6, 3, 0, TAU)
  x.fill()
  // socket shoulder plate
  x.fillStyle = '#33373f'
  x.beginPath()
  x.arc(6, 12, 8, 0, TAU)
  x.fill()
  x.fillStyle = '#9aa6b2'
  x.beginPath()
  x.arc(6, 12, 5, 0, TAU)
  x.fill()
  x.fillStyle = '#454a52'
  x.fillRect(2, 10, 8, 1.6)
  // two-finger claw
  x.strokeStyle = '#cfd6de'
  x.lineWidth = 3
  x.lineCap = 'round'
  const open = curl * 6
  x.beginPath()
  x.moveTo(50, wriY)
  x.quadraticCurveTo(58, wriY - 6 - open, 56, wriY - 11 - open)
  x.stroke()
  x.beginPath()
  x.moveTo(50, wriY + 2)
  x.quadraticCurveTo(58, wriY + 7 + open, 55, wriY + 12 + open)
  x.stroke()
  x.strokeStyle = '#5f6b78'
  x.lineWidth = 1.2
  x.stroke()
  return c
}

// SEED POUCH — burlap + weave dither, drawstring, spilled green follicle seeds.
export function seedPouch(k = 1) {
  const W0 = 40, H0 = 36
  const c = canvas(Math.round(W0 * k), Math.round(H0 * k)), x = c.getContext('2d')
  x.scale(k, k)
  const ramp = REPAINT_SHARED.seed.pouch
  // strap stubs
  x.strokeStyle = '#6a5232'
  x.lineWidth = 3
  x.beginPath()
  x.moveTo(10, 8)
  x.lineTo(4, 0)
  x.moveTo(30, 8)
  x.lineTo(36, 0)
  x.stroke()
  const bag = new Path2D()
  bag.moveTo(8, 12)
  bag.quadraticCurveTo(2, 24, 8, 32)
  bag.quadraticCurveTo(20, 38, 32, 32)
  bag.quadraticCurveTo(38, 24, 32, 12)
  bag.quadraticCurveTo(20, 8, 8, 12)
  bag.closePath()
  x.fillStyle = grad(x, 0, 10, 0, 36, [[0, ramp[1]], [0.6, ramp[0]], [1, '#6a5232']])
  x.fill(bag)
  x.strokeStyle = '#3a2c18'
  x.lineWidth = 1.8
  x.stroke(bag)
  // weave dither
  const r = rng(1212)
  for (let i = 0; i < 60; i++) {
    x.fillStyle = r() > 0.5 ? 'rgba(122,96,58,0.5)' : 'rgba(201,168,107,0.5)'
    x.fillRect(8 + r() * 24, 12 + r() * 20, 1.6, 1.2)
  }
  // gold seam + drawstring
  x.strokeStyle = '#c9a86b'
  x.lineWidth = 1.4
  x.beginPath()
  x.moveTo(9, 14)
  x.quadraticCurveTo(20, 18, 31, 14)
  x.stroke()
  x.strokeStyle = '#8a6f48'
  x.lineWidth = 2.6
  x.beginPath()
  x.moveTo(8, 11)
  x.quadraticCurveTo(20, 16, 32, 11)
  x.stroke()
  // spilled follicle seeds (3-green ramp)
  const seeds = REPAINT_SHARED.seed.seeds
  for (let i = 0; i < 5; i++) {
    x.fillStyle = seeds[i % 3]
    x.beginPath()
    x.ellipse(26 + i * 3.4, 8 - (i % 2) * 3, 2, 1.2, 0.5, 0, TAU)
    x.fill()
  }
  return c
}

// CLIPPERS — oversized manual shears: chrome blades + dark teeth + tonic dot.
export function clippers(k = 1) {
  const W0 = 44, H0 = 28
  const c = canvas(Math.round(W0 * k), Math.round(H0 * k)), x = c.getContext('2d')
  x.scale(k, k)
  // lower blade with teeth
  const low = new Path2D()
  low.moveTo(2, 18)
  low.lineTo(26, 14)
  low.lineTo(28, 20)
  low.lineTo(4, 23)
  low.closePath()
  x.fillStyle = grad(x, 0, 12, 0, 24, [[0, '#e8edf2'], [0.5, '#9aa6b2'], [1, '#5f6b78']])
  x.fill(low)
  x.strokeStyle = '#0b0c0e'
  x.lineWidth = 1.4
  x.stroke(low)
  x.fillStyle = '#0b0c0e'
  for (let i = 0; i < 6; i++) {
    x.beginPath()
    x.moveTo(4 + i * 4, 17.6)
    x.lineTo(6 + i * 4, 22)
    x.lineTo(7 + i * 4, 17.8)
    x.closePath()
    x.fill()
  }
  // upper blade + handle
  const up = new Path2D()
  up.moveTo(4, 12)
  up.lineTo(30, 8)
  up.lineTo(42, 12)
  up.lineTo(40, 17)
  up.lineTo(10, 16)
  up.closePath()
  x.fillStyle = grad(x, 0, 6, 0, 18, [[0, '#e8edf2'], [0.5, '#9aa6b2'], [1, '#5f6b78']])
  x.fill(up)
  x.strokeStyle = '#0b0c0e'
  x.lineWidth = 1.4
  x.stroke(up)
  x.fillStyle = '#26282e'
  x.beginPath()
  x.moveTo(32, 8)
  x.quadraticCurveTo(44, 4, 43, 12)
  x.lineTo(38, 15)
  x.closePath()
  x.fill()
  x.strokeStyle = '#0b0c0e'
  x.stroke()
  // pivot screw + tonic power dot
  x.fillStyle = '#454a52'
  x.beginPath()
  x.arc(30, 13, 2.6, 0, TAU)
  x.fill()
  x.fillStyle = REPAINT_SHARED.tonic.mid
  x.beginPath()
  x.arc(39, 10, 2, 0, TAU)
  x.fill()
  return c
}

// MUZZLE — iron grill bit + leather straps + chrome ring + comb rivet.
export function muzzle(k = 1) {
  const W0 = 56, H0 = 22
  const c = canvas(Math.round(W0 * k), Math.round(H0 * k)), x = c.getContext('2d')
  x.scale(k, k)
  // straps first (they pass behind the grill)
  x.strokeStyle = '#3a2a18'
  x.lineWidth = 4
  x.beginPath()
  x.moveTo(2, 8)
  x.lineTo(18, 11)
  x.moveTo(38, 11)
  x.lineTo(54, 8)
  x.stroke()
  x.strokeStyle = '#151009'
  x.lineWidth = 1.4
  x.stroke()
  // chrome ring on the left strap
  x.strokeStyle = '#cfd6de'
  x.lineWidth = 2.4
  x.beginPath()
  x.arc(5, 8, 3.4, 0, TAU)
  x.stroke()
  // iron grill cup
  x.fillStyle = grad(x, 0, 4, 0, 20, [[0, '#454a52'], [0.5, '#26282e'], [1, '#141518']])
  x.beginPath()
  x.moveTo(18, 5)
  x.quadraticCurveTo(28, 2, 38, 5)
  x.quadraticCurveTo(40, 12, 38, 18)
  x.quadraticCurveTo(28, 21, 18, 18)
  x.quadraticCurveTo(16, 12, 18, 5)
  x.closePath()
  x.fill()
  x.strokeStyle = '#0b0c0e'
  x.lineWidth = 1.4
  x.stroke()
  x.strokeStyle = '#0b0c0e'
  x.lineWidth = 1.6
  for (let i = 0; i < 3; i++) {
    x.beginPath()
    x.moveTo(23 + i * 5, 5)
    x.lineTo(23 + i * 5, 19)
    x.stroke()
  }
  x.strokeStyle = '#454a52'
  x.lineWidth = 1
  x.beginPath()
  x.moveTo(23, 6)
  x.lineTo(23, 18)
  x.stroke()
  // comb rivet (gold)
  x.fillStyle = '#e0b050'
  x.beginPath()
  x.arc(28, 11.4, 2.2, 0, TAU)
  x.fill()
  x.fillStyle = '#8a6a1c'
  x.fillRect(26, 12, 4, 1)
  return c
}

// TONIC VIAL — glass + FLOW level (fill 0..1) in the tonic ramp; cork + cap.
export function tonicVial(k = 1, fill = 0.7) {
  const W0 = 20, H0 = 34
  const c = canvas(Math.round(W0 * k), Math.round(H0 * k)), x = c.getContext('2d')
  x.scale(k, k)
  const t = REPAINT_SHARED.tonic
  // cork + chrome cap
  x.fillStyle = '#8a6f48'
  x.fillRect(6, 0, 8, 5)
  x.fillStyle = '#5f6b78'
  x.fillRect(4, 4, 12, 3)
  x.fillStyle = '#cfd6de'
  x.fillRect(4, 4, 12, 1.2)
  // glass walls
  x.fillStyle = 'rgba(207,214,222,0.35)'
  x.fillRect(4, 7, 12, 24)
  x.strokeStyle = 'rgba(207,214,222,0.8)'
  x.lineWidth = 1.4
  x.strokeRect(4, 7, 12, 24)
  // liquid
  const lv = clamp01(fill)
  if (lv > 0.02) {
    const lh = 22 * lv, ly = 30 - lh
    x.fillStyle = t.shadow
    x.fillRect(5, ly, 10, lh)
    x.fillStyle = t.mid
    x.fillRect(6, ly + 1, 8, lh - 2)
    x.fillStyle = t.light
    x.fillRect(6, ly + 1, 8, 2)
    x.fillStyle = 'rgba(63,232,192,0.3)'
    x.fillRect(12, ly + 3, 2, lh - 5)
  }
  return c
}

// ============================== atmosphere ==============================

// Dust plume puff (220x160, transparent) — blob with puff seams + belly shadow;
// ramp tint: bake REPAINT_SHARED.dustDay for day, dustNight for night.
export function dustPlume(seed = 1, ramp = REPAINT_SHARED.dustDay) {
  const w = 220, h = 160
  const c = canvas(w, h), x = c.getContext('2d')
  const r = rng(seed * 977 + 13)
  const puffs = []
  const n = 11
  for (let i = 0; i < n; i++) {
    const u = i / n
    puffs.push({
      x: 30 + r() * (w - 80) * (0.4 + u * 0.6),
      y: h - 26 - r() * (h - 60) * (1 - u * 0.55),
      rx: 22 + r() * 40 * (0.5 + u),
      ry: 16 + r() * 26,
    })
  }
  puffs.sort((a, b) => a.y - b.y)
  for (const p of puffs) {
    const v = clamp01(1 - p.y / h)
    const col = v > 0.66 ? ramp[2] : v > 0.33 ? ramp[1] : ramp[0]
    x.fillStyle = col
    x.globalAlpha = 0.85
    x.beginPath()
    x.ellipse(p.x, p.y, p.rx, p.ry, 0, 0, TAU)
    x.fill()
    x.globalAlpha = 1
    // puff seam crescent + belly shadow
    x.strokeStyle = 'rgba(90,52,20,0.3)'
    x.lineWidth = 4
    x.beginPath()
    x.ellipse(p.x, p.y, p.rx - 3, p.ry - 3, 0, Math.PI * 0.2, Math.PI * 0.9)
    x.stroke()
  }
  const bg = x.createLinearGradient(0, h * 0.6, 0, h)
  bg.addColorStop(0, 'rgba(90,52,20,0)')
  bg.addColorStop(1, 'rgba(90,52,20,0.34)')
  x.fillStyle = bg
  x.fillRect(0, h * 0.6, w, h * 0.4)
  for (let i = 0; i < 26; i++) {
    x.fillStyle = `rgba(242,207,148,${0.2 + r() * 0.3})`
    x.fillRect(r() * w, r() * h * 0.7, 2 + r() * 3, 1.6)
  }
  return c
}

// THE FLOW pour — tonic-ramp stream + seeded splash; u 0..1 intensity/phase.
// Pure in (u, seed); the citadel spout / valve calls it.
export function flowPour(ctx, x, y, h, u, seed = 4) {
  if (u <= 0.01) return
  const t = REPAINT_SHARED.tonic
  const al = Math.min(1, u * 3)
  const sway = (hash(Math.floor(u * 18) + seed) - 0.5) * 16 * u
  ctx.save()
  ctx.globalAlpha = al
  // glow wash
  ctx.strokeStyle = 'rgba(63,232,192,0.22)'
  ctx.lineWidth = 12
  ctx.lineCap = 'round'
  ctx.beginPath()
  ctx.moveTo(x, y)
  ctx.quadraticCurveTo(x + sway * 0.6, y + h * 0.5, x + sway, y + h)
  ctx.stroke()
  const stroke = (col, w2) => {
    ctx.strokeStyle = col
    ctx.lineWidth = w2
    ctx.beginPath()
    ctx.moveTo(x, y)
    ctx.quadraticCurveTo(x + sway * 0.6, y + h * 0.5, x + sway, y + h)
    ctx.stroke()
  }
  stroke(t.shadow, 6.4)
  stroke(t.mid, 4)
  stroke(t.light, 1.6)
  // droplets shearing off the stream
  for (let i = 0; i < 6; i++) {
    const du = ((u * 1.4 + hash(i * 7 + seed)) % 1)
    const bx = (1 - du) * (1 - du) * x + 2 * (1 - du) * du * (x + sway * 0.6) + du * du * (x + sway)
    const by = y + du * h
    ctx.fillStyle = i % 2 ? t.mid : t.light
    ctx.beginPath()
    ctx.arc(bx + (hash(i * 3 + seed) - 0.5) * 14, by, 1.4 + hash(i + seed) * 2, 0, TAU)
    ctx.fill()
  }
  // splash crown at the base
  for (let i = 0; i < 7; i++) {
    const dx = (hash(i * 5 + seed) - 0.5) * 34 * u
    const dy = -hash(i * 3 + seed + 1) * 26 * u + 30 * u * u
    ctx.fillStyle = i % 2 ? t.light : t.mid
    ctx.globalAlpha = al * (1 - u * 0.4)
    ctx.beginPath()
    ctx.arc(x + sway + dx, y + h + dy, 1.6 + hash(i * 9 + seed) * 2.6, 0, TAU)
    ctx.fill()
  }
  ctx.restore()
}
