// =====================================================================
// THE TERMHAIRNATOR — actors.js  (CONTRACTS.md §actors.js)
// ---------------------------------------------------------------------
// Rigs per casting.md (hero 42 near, machine 347 near, bystanders 11/191
// far) + THE MONEY ASSET: drawMachine — the Termhairnator. flesh 1.0 is
// the plain rig sprite; flesh 0.0 is a fully procedural chrome
// endoskeleton (skull + red lens, neck pistons, ribcage/chest seam,
// pelvis, limb plates, shaver gauntlet) driven by the same pose solver
// as the flesh band-composition so both stay registered at any blend.
// burn burns the flesh away on the SPRITE-LEFT side first (half-skull +
// chrome arm) with a glowing char edge. Coherent metal = LOOK.palette
// chromeHi/chromeMid/chromeLo ramps + molten rim when glow > 0.
// Every painter is a pure function of its params (+ optional o.t for
// buzz/flicker detail); the only seeded rng lives here in loadActors
// and bakes texture constants. No Math.random, no state across frames.
// =====================================================================
import { hash, rng, vnoise, seg, lerp, clamp, smooth, E, F, txt, measure, rgb } from 'filmkit/lib.js'
import { canvas, loadRemy, loadHeads } from '../remy-bros/art.js'
import { LOOK } from './timeline.js'

const PAL = LOOK.palette
const INK = '#0a1016'
const HUD_RED = '#ff5a5a'

const mixC = (a, b, t) => [Math.round(lerp(a[0], b[0], t)), Math.round(lerp(a[1], b[1], t)), Math.round(lerp(a[2], b[2], t))]
const css = (c, a = 1) => `rgba(${c[0]},${c[1]},${c[2]},${a})`
const RED = rgb(PAL.eyeRed)
const AMBER = [255, 179, 71]
const MOLTEN = rgb(PAL.molten)
const MOLTEN_HI = rgb(PAL.moltenHi)
const EMBER = rgb(PAL.ember)
const CH_HI = rgb(PAL.chromeHi)
const CH_MID = rgb(PAL.chromeMid)
const CH_LO = rgb(PAL.chromeLo)
// night-biased metal ramp off the LOOK palette: mid+lo carry the body,
// hi is edge/spec only — reads METAL, not flat grey
const M_DARK = mixC(CH_LO, [6, 10, 14], 0.35)
const M_MID = mixC(CH_MID, CH_LO, 0.45)
const M_LITE = mixC(CH_MID, CH_HI, 0.55)

// module scratch pool — fully cleared on every grab (BRIEF pitfall 10)
const POOL = {}
function scratch(key, w, h) {
  let s = POOL[key]
  if (!s || s.width < w || s.height < h) s = POOL[key] = canvas(Math.ceil(w) + 8, Math.ceil(h) + 8)
  const x = s.getContext('2d')
  x.setTransform(1, 0, 0, 1, 0, 0)
  x.globalCompositeOperation = 'source-over'
  x.globalAlpha = 1
  x.shadowBlur = 0
  x.clearRect(0, 0, s.width, s.height)
  x.imageSmoothingEnabled = false
  return { c: s, x, w: s.width, h: s.height }
}

// =====================================================================
// loadActors — the one export. Bakes rigs + machine metrics + texture.
// =====================================================================
export async function loadActors() {
  const hero = await loadRemy(42)
  const machineFlesh = await loadRemy(347)
  const bystanderA = await loadRemy(11, true)
  const bystanderB = await loadRemy(191, true)
  const heads = await loadHeads()

  // ---------------- machine metrics (baked once, silhouette-derived) ---
  const G = buildMachineMetrics(machineFlesh)
  const texR = rng(34713)
  const STREAKS = Array.from({ length: 10 }, () => ({ u: texR(), v: texR(), len: 0.3 + texR() * 0.5 }))

  // ---------------- pose solver (pure) ----------------
  // Shared by chrome joints AND the flesh band-composer so both sides of
  // any blend stay registered. y-up native rig units, feet at 0.
  function machinePose(o) {
    const ph = o.phase ?? 0
    const pose = o.pose ?? 'stand'
    const P = { k: 1, lean: 0.02, bow: 0, liftL: 0, liftR: 0, strL: 0, strR: 0, swing: 0, crouch: 0, thumbU: 0, headTilt: 0 }
    if (pose === 'walk' || pose === 'stride') {
      const amp = pose === 'stride' ? 7 : 4
      const step = pose === 'stride' ? 3.2 : 2
      const sn = Math.sin(ph)
      P.liftL = Math.round(Math.max(0, sn) * amp)
      P.liftR = Math.round(Math.max(0, -sn) * amp)
      P.strL = Math.round(sn * step)
      P.strR = Math.round(-sn * step)
      P.lean = pose === 'stride' ? 0.1 : 0.05
      P.swing = sn
    } else if (pose === 'crouch') {
      P.k = 0.52
      P.lean = 0.24
      P.bow = 0.55
      P.crouch = 1
    } else if (pose === 'rise') {
      const u = smooth(clamp(ph))
      P.k = lerp(0.52, 1, u)
      P.lean = lerp(0.24, 0.02, u)
      P.bow = lerp(0.55, 0, u)
      P.crouch = 1 - u
    } else if (pose === 'kneel') {
      P.k = 0.55
      P.lean = 0.16
      P.bow = 0.7
      P.crouch = 1
    } else if (pose === 'sink') {
      P.lean = 0.04
    } else if (pose === 'thumbs') {
      P.lean = -0.03
      P.headTilt = -0.12
      P.thumbU = clamp(ph <= 0 ? 1 : ph)
    }
    P.lean += o.lean ?? 0
    return P
  }

  // ---------------- flesh composer (posed + burned sprite in scratch) ----
  const PADX = 26
  function blitFlesh(ctx, P, flesh, burn, t) {
    const R = machineFlesh
    const Mw = 8
    const sw = R.w + PADX * 2
    const sh = R.h + Mw * 2
    const sc = scratch('mflesh', sw, sh)
    const g = sc.x
    const legH = R.h - R.legTop
    if (P.k > 0.985) {
      // walk halves — exactly the drawRemy leg convention
      g.drawImage(R.c, 0, R.legTop, R.cx, legH, PADX + P.strL, Mw + R.legTop - P.liftL, R.cx, legH)
      g.drawImage(R.c, R.cx, R.legTop, R.w - R.cx, legH, PADX + R.cx + P.strR, Mw + R.legTop - P.liftR, R.w - R.cx, legH)
    } else {
      // compressed legs: feet stay planted, hips drop (nearest-neighbour)
      const dstH = Math.max(2, Math.round(legH * P.k))
      g.drawImage(R.c, 0, R.legTop, R.w, legH, PADX, Mw + R.bottom + 1 - dstH, R.w, dstH)
    }
    // torso/head band: drops by the leg delta and shears forward with lean
    const d = Math.round(legH * (1 - P.k))
    for (let y = R.top; y < R.legTop; y += 2) {
      const hgt = Math.min(2, R.legTop - y)
      const dx = Math.round((R.legTop - y) * P.lean)
      g.drawImage(R.c, 0, y, R.w, hgt, PADX + dx, Mw + y + d, R.w, hgt)
    }
    if (burn > 0.01) burnMask(g, R, PADX, Mw, P, burn, t)
    ctx.globalAlpha = flesh
    ctx.drawImage(sc.c, -(PADX + R.cx), -(Mw + R.bottom + 1))
    ctx.globalAlpha = 1
  }

  // per-pixel burn: erase sprite-left past the wobbling edge, char-tint the rim
  function burnMask(g, R, PADX, Mw, P, burn, t) {
    const w = g.canvas.width, h = g.canvas.height
    const img = g.getImageData(0, 0, w, h)
    const p = img.data
    const flick = 0.82 + 0.18 * hash(Math.floor(t * 24) + 5)
    for (let y = 0; y < h; y++) {
      const sy = y - Mw
      if (sy < R.top || sy > R.bottom) continue
      const span = G.spanAt[sy]
      if (!span || span[0] < 0) continue
      const shearDx = sy < R.legTop ? (R.legTop - sy) * P.lean : 0
      const cap = burnCap(sy)
      const edge = lerp(span[0], span[0] + (span[1] - span[0]) * cap, burn) + (vnoise(y * 0.13, 7) - 0.5) * 2.2 * Math.min(1, burn * 3)
      for (let x = 0; x < w; x++) {
        const i = (y * w + x) * 4
        if (p[i + 3] === 0) continue
        const sx = x - PADX - shearDx
        if (sx < edge - 0.6 + hash(x * 7 + y * 13) * 1.6) {
          p[i + 3] = 0
          continue
        }
        const dt = sx - edge
        if (dt < 2.4) {
          const u = clamp(1 - dt / 2.4) * 0.85 * flick
          const c = mixC(EMBER, MOLTEN, clamp(u))
          p[i] = Math.round(lerp(p[i], c[0], u))
          p[i + 1] = Math.round(lerp(p[i + 1], c[1], u))
          p[i + 2] = Math.round(lerp(p[i + 2], c[2], u))
        }
      }
    }
    g.putImageData(img, 0, 0)
  }
  // fraction of the row width the fire can eat (half-skull / arm / whole leg)
  function burnCap(sy) {
    const yup = machineFlesh.bottom + 1 - sy
    if (yup > G.neckYup) return 0.55
    if (yup > G.legH + 2) return 0.44
    return 0.55
  }

  // glowing char edge on the scene (local chrome space)
  function burnEdge(ctx, P, burn, glow, t) {
    const R = machineFlesh
    const flick = 0.75 + 0.25 * hash(Math.floor(t * 26) + 9)
    const pts = []
    for (let yup = 2; yup < R.bottom - R.top + 2; yup += 2.5) {
      const sy = Math.round(R.bottom + 1 - yup)
      const span = G.spanAt[sy]
      if (!span || span[0] < 0) continue
      const shearDx = P.lean * Math.max(0, yup - G.legH * P.k - 1)
      const edge = lerp(span[0], span[0] + (span[1] - span[0]) * burnCap(sy), burn) + (vnoise(sy * 0.13, 7) - 0.5) * 2.2 * Math.min(1, burn * 3)
      pts.push([edge - R.cx + shearDx, yup])
    }
    if (pts.length < 3) return
    ctx.save()
    ctx.lineJoin = 'round'
    ctx.lineCap = 'round'
    ctx.globalAlpha = (0.3 + glow * 0.4) * flick
    ctx.strokeStyle = PAL.molten
    ctx.lineWidth = 2.2
    strokePts(ctx, pts)
    ctx.globalAlpha = 0.9 * flick
    ctx.strokeStyle = PAL.moltenHi
    ctx.lineWidth = 0.9
    strokePts(ctx, pts)
    for (let i = 0; i < 6; i++) {
      const q = pts[Math.floor(hash(i * 31 + 3) * (pts.length - 1))]
      const fl = 0.4 + 0.6 * hash(Math.floor(t * 18) + i * 7)
      ctx.globalAlpha = 0.7 * fl * burn
      ctx.fillStyle = i % 2 ? PAL.moltenHi : PAL.molten
      ctx.fillRect(q[0] - 0.6 - hash(i * 3) * 1.5, -q[1] - i * 2.2 - ((t * 6) % 14), 1.3, 1.3)
    }
    ctx.restore()
  }
  function strokePts(ctx, pts) {
    ctx.beginPath()
    ctx.moveTo(pts[0][0], -pts[0][1])
    for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], -pts[i][1])
    ctx.stroke()
  }

  // ---------------- chrome painters (local space, y-up helpers) ----------
  const Y = (v) => -v
  function mtl(ctx, build, x0, y0, x1, y1, alpha = 1, bright = 0) {
    ctx.globalAlpha = alpha
    ctx.beginPath()
    build()
    const gr = ctx.createLinearGradient(x0, Y(y0), x1, Y(y1))
    gr.addColorStop(0, bright ? css(mixC(M_MID, CH_MID, 0.5)) : css(M_DARK))
    gr.addColorStop(0.26, bright ? css(M_LITE) : css(M_MID))
    gr.addColorStop(0.5, bright ? css(CH_MID) : css(M_LITE))
    gr.addColorStop(0.56, css(CH_HI))
    gr.addColorStop(0.66, bright ? css(M_LITE) : css(M_MID))
    gr.addColorStop(1, bright ? css(M_MID) : css(M_DARK))
    ctx.fillStyle = gr
    ctx.fill()
    ctx.strokeStyle = INK
    ctx.lineWidth = 1.1
    ctx.stroke()
    ctx.globalAlpha = 1
  }
  // tapered limb segment between two joints (y-up coords)
  function limb(ctx, ax, ay, bx, by, w0, w1) {
    const dx = bx - ax, dy = -(by - ay)
    const L = Math.hypot(dx, dy) || 1
    const nx = -dy / L, ny = dx / L
    mtl(ctx, () => {
      ctx.moveTo(ax + nx * w0 / 2, Y(ay) + ny * w0 / 2)
      ctx.lineTo(bx + nx * w1 / 2, Y(by) + ny * w1 / 2)
      ctx.lineTo(bx - nx * w1 / 2, Y(by) - ny * w1 / 2)
      ctx.lineTo(ax - nx * w0 / 2, Y(ay) - ny * w0 / 2)
      ctx.closePath()
    }, Math.min(ax, bx) - 3, Math.min(ay, by), Math.max(ax, bx) + 3, Math.max(ay, by))
  }
  function disc(ctx, x, y, r, fill) {
    ctx.beginPath()
    ctx.arc(x, Y(y), r, 0, 7)
    ctx.fillStyle = fill || '#39434f'
    ctx.fill()
    ctx.strokeStyle = INK
    ctx.lineWidth = 1
    ctx.stroke()
    ctx.beginPath()
    ctx.arc(x - r * 0.25, Y(y + r * 0.25), r * 0.55, 0, 7)
    ctx.fillStyle = 'rgba(223,233,242,0.4)'
    ctx.fill()
  }
  const shearX = (yup, P) => P.lean * Math.max(0, yup - (G.legH * P.k + 1))

  function legChrome(ctx, P, side) {
    const lift = side < 0 ? P.liftL : P.liftR
    const str = side < 0 ? P.strL : P.strR
    const spread = P.crouch > 0.5 ? 1.35 : 1
    const hipY = G.legH * P.k + 0.5
    const hip = [side * G.hipX, hipY]
    let ankle = [side * G.ankleX * spread + str * 0.9, 1.6 + lift]
    let knee = [side * G.ankleX * spread * 1.4 + str * 0.5, lerp(G.legH * 0.55, G.legH * P.k * 0.8, P.crouch) + lift * 0.35]
    if (P.crouch > 0.5) {
      ankle = [side * G.ankleX * 1.45, 1.4]
      knee = [side * G.ankleX * 2.1, G.legH * P.k * 0.72]
    }
    limb(ctx, hip[0], hip[1], knee[0], knee[1], 5, 3.8)
    limb(ctx, knee[0], knee[1], ankle[0], ankle[1], 3.4, 2.3)
    mtl(ctx, () => {
      ctx.moveTo(ankle[0] - 2.4, Y(ankle[1] + 0.8))
      ctx.lineTo(ankle[0] + side * 6, Y(0.4))
      ctx.lineTo(ankle[0] + side * 6, Y(0))
      ctx.lineTo(ankle[0] - 2.6, Y(0))
      ctx.closePath()
    }, ankle[0] - 4, 0, ankle[0] + 7, ankle[1])
    disc(ctx, knee[0], knee[1], 2)
    disc(ctx, ankle[0], ankle[1], 1.4)
    if (P.glow > 0.03) rimLine(ctx, ankle[0] + side * 1.6, ankle[1] + 0.8, knee[0] + side * 1.2, knee[1], P.glow)
  }

  function pelvisChrome(ctx, P) {
    const hipY = G.legH * P.k + 0.5
    const w = G.pelvisW
    // pelvis slab
    mtl(ctx, () => {
      ctx.moveTo(-w, Y(hipY + 8))
      ctx.lineTo(w, Y(hipY + 8))
      ctx.lineTo(w * 0.7, Y(hipY - 1))
      ctx.lineTo(-w * 0.7, Y(hipY - 1))
      ctx.closePath()
    }, -w, hipY - 1, w, hipY + 8)
    disc(ctx, -G.hipX, hipY + 1, 2)
    disc(ctx, G.hipX, hipY + 1, 2)
    // spine column hip->neck (keeps the chassis continuous)
    const topY = G.shoulderYup - 1
    mtl(ctx, () => {
      ctx.moveTo(-1.8, Y(topY))
      ctx.lineTo(1.8, Y(topY))
      ctx.lineTo(1.4, Y(hipY + 6))
      ctx.lineTo(-1.4, Y(hipY + 6))
      ctx.closePath()
    }, -2, hipY + 6, 2, topY, 0.96)
    // abdomen segments on the column
    for (let i = 0; i < 2; i++) {
      const y0 = lerp(hipY + 9, G.chestYup - 2, i / 2)
      const y1 = lerp(hipY + 9, G.chestYup - 2, (i + 1) / 2) - 1.2
      const wAb = lerp(G.pelvisW + 1.5, G.chestW * 0.92, (i + 1) / 2)
      mtl(ctx, () => {
        ctx.moveTo(-wAb, Y(y1))
        ctx.lineTo(wAb, Y(y1))
        ctx.lineTo(wAb * 0.92, Y(y0))
        ctx.lineTo(-wAb * 0.92, Y(y0))
        ctx.closePath()
      }, -wAb, y0, wAb, y1)
    }
  }

  function chestChrome(ctx, P, env) {
    const shY = G.shoulderYup * (1 - P.crouch * 0.04) + G.legH * (P.k - 1) * 0.6
    const shX = shearX(shY, P)
    const chestY = G.chestYup
    const topW = G.chestW
    const botW = G.waistW * 1.15
    // chest plate: tapered cuirass, wide at the clavicle, in at the waist
    mtl(ctx, () => {
      ctx.moveTo(shX - topW, Y(shY))
      ctx.quadraticCurveTo(shX - topW - 2, Y((shY + chestY) / 2), shX * 0.35 - botW, Y(chestY))
      ctx.lineTo(shX * 0.35 + botW, Y(chestY))
      ctx.quadraticCurveTo(shX + topW + 2, Y((shY + chestY) / 2), shX + topW, Y(shY))
      ctx.quadraticCurveTo(shX, Y(shY + 3), shX - topW, Y(shY))
      ctx.closePath()
    }, shX - topW - 2.5, chestY, shX + topW + 2.5, shY)
    // sternum ridge highlight + pectoral seams
    ctx.strokeStyle = css(CH_HI, 0.5)
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.moveTo(shX, Y(shY - 2))
    ctx.lineTo(shX * 0.35, Y(chestY + 2))
    ctx.stroke()
    ctx.strokeStyle = 'rgba(8,12,18,0.85)'
    ctx.lineWidth = 1.1
    ctx.beginPath()
    ctx.moveTo(shX - topW * 0.6, Y(shY - 6))
    ctx.quadraticCurveTo(shX, Y(shY - 10), shX + topW * 0.6, Y(shY - 6))
    ctx.moveTo(shX - topW * 0.46, Y(chestY + 9))
    ctx.quadraticCurveTo(shX * 0.6, Y(chestY + 6), shX + topW * 0.46, Y(chestY + 9))
    ctx.stroke()
    // THE CHEST SEAM (core 0..1 glow)
    const seamY0 = chestY + 3, seamY1 = shY - 4
    const cx0 = shX * 0.4
    ctx.strokeStyle = INK
    ctx.lineWidth = 1.6
    ctx.beginPath()
    ctx.moveTo(cx0, Y(seamY0))
    ctx.lineTo(cx0 + (shearX(seamY1, P) - shearX(seamY0, P)) * 0.5, Y(seamY1))
    ctx.stroke()
    if (env.core > 0.02) {
      const midY = (seamY0 + seamY1) / 2
      const gx = cx0 + (shearX(seamY1, P) - shearX(seamY0, P)) * 0.25
      ctx.save()
      ctx.globalCompositeOperation = 'lighter'
      const rg = ctx.createRadialGradient(gx, Y(midY), 0.5, gx, Y(midY), G.torsoH * 0.16)
      rg.addColorStop(0, css(MOLTEN_HI, 0.8 * env.core))
      rg.addColorStop(0.4, css(MOLTEN, 0.35 * env.core))
      rg.addColorStop(1, css(MOLTEN, 0))
      ctx.fillStyle = rg
      ctx.fillRect(gx - G.torsoH * 0.2, Y(midY + G.torsoH * 0.2), G.torsoH * 0.4, G.torsoH * 0.4)
      ctx.strokeStyle = css(MOLTEN_HI, env.core)
      ctx.lineWidth = 1.4
      ctx.beginPath()
      ctx.moveTo(gx, Y(seamY0 + 1))
      ctx.lineTo(gx + (shearX(seamY1, P) - shearX(seamY0, P)) * 0.5, Y(seamY1))
      ctx.stroke()
      ctx.restore()
    }
    // clavicle bar
    mtl(ctx, () => {
      ctx.moveTo(shX - topW * 0.92, Y(shY - 1.6))
      ctx.lineTo(shX + topW * 0.92, Y(shY - 1.6))
      ctx.lineTo(shX + topW * 0.8, Y(shY + 1.8))
      ctx.lineTo(shX - topW * 0.8, Y(shY + 1.8))
      ctx.closePath()
    }, shX - topW, shY - 2.5, shX + topW, shY + 2.5)
    // seeded streak texture
    ctx.strokeStyle = 'rgba(223,233,242,0.22)'
    ctx.lineWidth = 0.8
    for (let i = 0; i < 3; i++) {
      const st = STREAKS[i]
      const yy = chestY + 5 + st.u * Math.max(4, shY - chestY - 10)
      ctx.beginPath()
      ctx.moveTo(shX - topW * 0.5 * st.v, Y(yy))
      ctx.lineTo(shX + topW * 0.5 * st.len, Y(yy + 0.8))
      ctx.stroke()
    }
    return { shX, shY, chestY }
  }

  function armChrome(ctx, P, env, side, body) {
    const shY = body.shY, shX = body.shX
    const sw = P.swing * (side < 0 ? 1 : -1)
    const cr = P.crouch
    const armLen = G.shoulderYup - G.chestYup
    const elbY = lerp(shY - armLen * 0.52, shY - armLen * 0.42, cr)
    const wriY = elbY - armLen * 0.46
    const thumb = side < 0 && P.thumbU > 0.01
    const sh = [side * G.shoulderX + shearX(shY, P) * 0.6, shY - 1]
    let elb = [side * G.elbowX + shearX(elbY, P) * 0.7 + sw * 2 + cr * side * 1.5, elbY]
    let wri = [side * G.wristX + shearX(wriY, P) * 0.7 + sw * 3.2 + cr * side * 1, wriY]
    if (thumb) {
      // THE iconic raise: arm folds up and out, fist + thumb above shoulder
      const u = E.outBack(clamp(P.thumbU))
      const upE = [side * (G.shoulderX + 4.5), shY + armLen * 0.5]
      const upW = [side * (G.shoulderX + 3), shY + armLen * 1.05]
      elb = [lerp(elb[0], upE[0], u), lerp(elb[1], upE[1], u)]
      wri = [lerp(wri[0], upW[0], u), lerp(wri[1], upW[1], u)]
    }
    limb(ctx, sh[0], sh[1], elb[0], elb[1], 4.2, 3.4)
    disc(ctx, sh[0], sh[1], 3)
    disc(ctx, elb[0], elb[1], 2)
    const isShaver = side < 0 && env.arm === 'shaver'
    const isRetr = side < 0 && (env.arm === 'retracted' || thumb)
    if (isShaver) {
      // forearm = the SHAVE-CANNON gauntlet
      limb(ctx, elb[0], elb[1], wri[0], wri[1], 4.6, 5.6)
      const hx = wri[0], hy = wri[1] - 1.5
      disc(ctx, hx, hy, 4, '#2c3540')
      ctx.save()
      ctx.translate(hx, Y(hy))
      const spin = (env.t ?? 0) * 38
      for (let b = 0; b < 3; b++) {
        ctx.save()
        ctx.rotate(spin + b * (Math.PI * 2 / 3))
        ctx.beginPath()
        ctx.moveTo(1, 0)
        ctx.quadraticCurveTo(2.9, 0.95, 3.7, 0)
        ctx.quadraticCurveTo(2.9, -0.95, 1, 0)
        ctx.closePath()
        ctx.fillStyle = PAL.chromeHi
        ctx.fill()
        ctx.strokeStyle = INK
        ctx.lineWidth = 0.7
        ctx.stroke()
        ctx.restore()
      }
      ctx.beginPath()
      ctx.arc(0, 0, 1.1, 0, 7)
      ctx.fillStyle = '#12181f'
      ctx.fill()
      ctx.restore()
      // red edge light + LED
      ctx.save()
      ctx.globalCompositeOperation = 'lighter'
      ctx.strokeStyle = css(RED, 0.85)
      ctx.lineWidth = 1.2
      ctx.beginPath()
      ctx.arc(hx, Y(hy), 4, -0.6, 2.2)
      ctx.stroke()
      const buzz = 0.6 + 0.4 * hash(Math.floor((env.t ?? 0) * 30))
      ctx.fillStyle = css(RED, 0.9 * buzz)
      ctx.fillRect(elb[0] - 1.2, Y(elb[1] + 2.6), 2.4, 1.2)
      ctx.restore()
    } else if (isRetr) {
      // blades folded flat: two slim plates stacked along the forearm
      limb(ctx, elb[0], elb[1], wri[0], wri[1], 3.2, 3.8)
      const ang = Math.atan2(Y(elb[1]) - Y(wri[1]), elb[0] - wri[0])
      ctx.save()
      ctx.translate(wri[0], Y(wri[1]))
      ctx.rotate(ang)
      mtl(ctx, () => { ctx.rect(-7, -1.2, 11, 1.7) }, -8, -2, 4, 2)
      ctx.restore()
      ctx.fillStyle = '#2a323c'
      ctx.beginPath()
      ctx.arc(wri[0], Y(wri[1] - 1), 1, 0, 7)
      ctx.fill()
    } else {
      limb(ctx, elb[0], elb[1], wri[0], wri[1], 3, 2.4)
      disc(ctx, wri[0], wri[1], 1.4)
    }
    // hand: three claw bars fanning past the wrist
    const fang = isShaver || isRetr ? 2.6 : 3.8
    for (let f = -1; f <= 1; f++) {
      ctx.strokeStyle = '#8ea3b5'
      ctx.lineWidth = 1.1
      ctx.beginPath()
      ctx.moveTo(wri[0] + f * 1.3, Y(wri[1] - 1))
      ctx.lineTo(wri[0] + f * 2 - (thumb ? 1.5 : 0), Y(wri[1] - 1 - fang))
      ctx.stroke()
    }
    if (thumb) {
      // the thumb itself: unmistakable at distance
      const tx = wri[0] - side * 0.5, ty = wri[1] + 1.5
      mtl(ctx, () => {
        ctx.moveTo(tx - 1.3, Y(ty))
        ctx.lineTo(tx + 1.7, Y(ty))
        ctx.lineTo(tx + 1.2, Y(ty + 5.6))
        ctx.lineTo(tx - 0.6, Y(ty + 5.4))
        ctx.closePath()
      }, tx - 2, ty, tx + 2, ty + 6)
      disc(ctx, wri[0], wri[1], 2.7)
    }
    if (P.glow > 0.03) rimLine(ctx, elb[0] + side, elb[1], wri[0] + side, wri[1], P.glow)
  }

  function skullChrome(ctx, P, env) {
    const hx = shearX(G.headCY, P) + P.headTilt * G.torsoH * 0.06
    const hy = G.headCY - P.bow * G.torsoH * 0.05
    const rx = G.skullRX, ry = G.skullRY
    ctx.save()
    ctx.translate(hx, Y(hy))
    ctx.rotate(P.headTilt * 0.6 + P.bow * 0.3)
    // cranium dome — bone-bright, the iconic chrome skull
    mtl(ctx, () => {
      ctx.beginPath()
      ctx.moveTo(-rx, ry * 0.2)
      ctx.bezierCurveTo(-rx * 1.06, ry * 0.98, rx * 1.06, ry * 0.98, rx, ry * 0.2)
      ctx.quadraticCurveTo(rx * 0.9, -ry * 0.85, 0, -ry)
      ctx.quadraticCurveTo(-rx * 0.9, -ry * 0.85, -rx, ry * 0.2)
      ctx.closePath()
    }, -rx, -ry, rx, ry, 1, 1)
    // brow band
    ctx.fillStyle = 'rgba(8,12,18,0.92)'
    ctx.beginPath()
    ctx.ellipse(0, ry * 0.08, rx * 0.86, ry * 0.3, 0, 0, 7)
    ctx.fill()
    // jaw plate with the tooth grille
    const jw = rx * 0.58
    mtl(ctx, () => {
      ctx.moveTo(-jw, -ry * 0.22)
      ctx.lineTo(jw, -ry * 0.22)
      ctx.quadraticCurveTo(jw * 1.15, -ry * 1.25, jw * 0.5, -ry * 1.38)
      ctx.lineTo(-jw * 0.5, -ry * 1.38)
      ctx.quadraticCurveTo(-jw * 1.15, -ry * 1.25, -jw, -ry * 0.22)
      ctx.closePath()
    }, -jw, -ry * 1.42, jw, -ry * 0.18, 1, 1)
    ctx.strokeStyle = INK
    ctx.lineWidth = 0.9
    for (let f = -1; f <= 1; f++) {
      ctx.beginPath()
      ctx.moveTo(f * jw * 0.4, -ry * 0.42)
      ctx.lineTo(f * jw * 0.4, -ry * 1.0)
      ctx.stroke()
    }
    // the non-lens socket (lens drawn separately at the detected eye spot)
    ctx.fillStyle = '#05070b'
    ctx.beginPath()
    ctx.ellipse(rx * 0.38, ry * 0.2, rx * 0.24, ry * 0.2, 0, 0, 7)
    ctx.fill()
    // ear discs + cheek seams
    disc(ctx, -rx * 0.82, ry * 0.3, 1.6)
    disc(ctx, rx * 0.82, ry * 0.3, 1.6)
    ctx.strokeStyle = 'rgba(10,16,22,0.55)'
    ctx.lineWidth = 0.8
    ctx.beginPath()
    ctx.moveTo(-rx * 0.48, -ry * 0.08)
    ctx.lineTo(-rx * 0.26, -ry * 0.5)
    ctx.moveTo(rx * 0.48, -ry * 0.08)
    ctx.lineTo(rx * 0.26, -ry * 0.5)
    ctx.stroke()
    ctx.restore()
    // neck pistons (skull underside -> shoulders)
    const nkY = hy - ry * 1.15
    for (const off of [-2.4, 2.4]) {
      limb(ctx, hx + off * 0.35, G.shoulderYup - 1, hx + off, nkY, 1.8, 1.3)
    }
    if (P.glow > 0.03) rimLine(ctx, hx + rx * 0.85, hy - ry * 0.3, hx + rx * 0.65, hy + ry * 0.9, P.glow)
    return { hx, hy, rx, ry }
  }

  // the red lens — ONE draw, shared by flesh + chrome (same screen spot)
  function lensEye(ctx, P, env) {
    const on = env.eyeOn, warm = env.eyeWarm
    const hx = shearX(G.headCY, P) + P.headTilt * G.torsoH * 0.06
    const hy = G.headCY - P.bow * G.torsoH * 0.05
    const lx = hx + G.lens.dx
    const ly = hy + G.lens.dy
    const r = 1.5
    const col = mixC(RED, AMBER, warm)
    if (on > 0.01) {
      ctx.save()
      ctx.globalCompositeOperation = 'lighter'
      const halo = ctx.createRadialGradient(lx, Y(ly), 0.4, lx, Y(ly), 10)
      halo.addColorStop(0, css(col, 0.85 * on))
      halo.addColorStop(0.35, css(RED, 0.32 * on))
      halo.addColorStop(1, css(RED, 0))
      ctx.fillStyle = halo
      ctx.fillRect(lx - 11, Y(ly + 11), 22, 22)
      ctx.restore()
    }
    ctx.fillStyle = '#05070b'
    ctx.beginPath()
    ctx.ellipse(lx, Y(ly), r + 0.9, r + 0.5, 0, 0, 7)
    ctx.fill()
    ctx.fillStyle = css(col, 0.35 + 0.65 * on)
    ctx.beginPath()
    ctx.arc(lx, Y(ly), r, 0, 7)
    ctx.fill()
    if (on > 0.75) {
      ctx.fillStyle = css([255, 240, 220], (on - 0.75) * 3)
      ctx.beginPath()
      ctx.arc(lx - 0.4, Y(ly + 0.4), 0.55, 0, 7)
      ctx.fill()
    }
  }

  function rimLine(ctx, x0, y0, x1, y1, glow) {
    ctx.save()
    ctx.globalCompositeOperation = 'lighter'
    ctx.strokeStyle = css(MOLTEN, 0.5 * glow)
    ctx.lineWidth = 1.4
    ctx.beginPath()
    ctx.moveTo(x0, Y(y0))
    ctx.lineTo(x1, Y(y1))
    ctx.stroke()
    ctx.restore()
  }

  // ---------------- drawMachine — THE money asset ----------------
  function drawMachine(ctx, x, feet, o = {}) {
    const flesh = clamp(o.flesh ?? 1)
    const burn = clamp(o.burn ?? 0)
    const eyeOn = clamp((o.eye && o.eye.on) ?? 0)
    const eyeWarm = clamp((o.eye && o.eye.warm) ?? 0)
    const core = clamp(o.core ?? 0)
    const sink = clamp(o.sink ?? 0)
    const glow = clamp(o.glow ?? 0)
    const arm = o.arm ?? 'down'
    const s = o.scale ?? 2.55
    const t = o.t ?? 0
    const P = machinePose(o)
    P.glow = glow
    ctx.save()
    ctx.imageSmoothingEnabled = false
    ctx.translate(Math.round(x), Math.round(feet))
    ctx.scale((o.flip ? -1 : 1) * s, s)
    // sink: body translated down so waist->neck meets the waterline at feet
    let dropped = false
    if (sink > 0.001) {
      const drop = lerp(G.legH + G.torsoH * 0.16, G.legH + G.torsoH * 0.68, sink)
      ctx.translate(0, drop)
      ctx.beginPath()
      ctx.rect(-400, -500, 800, 500) // keep everything ABOVE the waterline (local y<=0)
      ctx.clip()
      dropped = true
    }
    if (!dropped && o.shadow !== 0) {
      ctx.save()
      ctx.globalAlpha = 0.3
      ctx.fillStyle = '#04070c'
      ctx.beginPath()
      ctx.ellipse(0, 1.2, G.pelvisW * (2.1 + P.crouch * 0.9), 2.4, 0, 0, 7)
      ctx.fill()
      ctx.restore()
    }
    const chromeNeeded = flesh < 0.995 || burn > 0.02
    // chrome UNDER flesh: it only reads where the blend thins the flesh or
    // burn has eaten it away (half-skull + arm), never over opaque pixels
    if (chromeNeeded) {
      const env = { eyeOn, eyeWarm, core, arm, t, glow }
      legChrome(ctx, P, -1)
      legChrome(ctx, P, 1)
      pelvisChrome(ctx, P)
      const body = chestChrome(ctx, P, env)
      armChrome(ctx, P, env, 1, body)
      armChrome(ctx, P, env, -1, body)
      skullChrome(ctx, P, env)
    }
    if (flesh > 0.004) blitFlesh(ctx, P, flesh, burn, t)
    if (burn > 0.03 && burn < 0.99 && flesh > 0.03) burnEdge(ctx, P, burn, glow, t)
    lensEye(ctx, P, { eyeOn, eyeWarm })
    if (dropped) waterline(ctx, glow || 0.85)
    ctx.restore()
  }

  function waterline(ctx, glow) {
    const w = G.pelvisW + 8
    ctx.save()
    const gr = ctx.createLinearGradient(0, 2, 0, -16)
    gr.addColorStop(0, css(MOLTEN_HI, 0.3 * glow))
    gr.addColorStop(0.5, css(MOLTEN, 0.14 * glow))
    gr.addColorStop(1, css(MOLTEN, 0))
    ctx.fillStyle = gr
    ctx.fillRect(-w, -16, w * 2, 18)
    ctx.globalCompositeOperation = 'lighter'
    ctx.fillStyle = css(MOLTEN_HI, 0.75 * glow)
    ctx.fillRect(-w * 1.15, -1.4, w * 2.3, 2.4)
    const rg = ctx.createRadialGradient(0, 0, 1, 0, 0, w * 1.6)
    rg.addColorStop(0, css(MOLTEN, 0.22 * glow))
    rg.addColorStop(1, css(MOLTEN, 0))
    ctx.fillStyle = rg
    ctx.fillRect(-w * 1.8, -w * 0.9, w * 3.6, w * 1.8)
    ctx.restore()
  }

  // =================================================================
  // props + fx
  // =================================================================

  // white-hot sword arc with orange falloff; u = sweep progress 0..1
  function drawSwordSlash(ctx, x, y, r0, r1, a0, a1, u) {
    const p = clamp(u)
    if (p <= 0) return
    const rm = (r0 + r1) / 2
    const sweep = lerp(a0, a1, p)
    const N = 8
    ctx.save()
    ctx.lineCap = 'round'
    for (let i = 0; i <= N; i++) {
      const a = sweep - i * 0.17
      if (a < Math.min(a0, a1) - 0.2) break
      const f = 1 - i / N
      const col = i === 0 ? [255, 255, 255] : i < 3 ? mixC([255, 255, 255], MOLTEN_HI, i / 3) : mixC(MOLTEN_HI, MOLTEN, (i - 2) / 6)
      ctx.strokeStyle = css(col, f * f * 0.9)
      ctx.lineWidth = lerp(1.1, 5.5, f) * clamp((r1 - r0 + 6) / 34, 0.5, 1.6)
      ctx.beginPath()
      ctx.arc(x, y, rm, a - 0.045 - f * 0.02, a + 0.045 + f * 0.02)
      ctx.stroke()
    }
    const tx = x + Math.cos(sweep) * rm, ty = y + Math.sin(sweep) * rm
    const fg = ctx.createRadialGradient(tx, ty, 0.5, tx, ty, 13)
    fg.addColorStop(0, 'rgba(255,255,255,0.95)')
    fg.addColorStop(0.4, css(MOLTEN_HI, 0.5))
    fg.addColorStop(1, css(MOLTEN, 0))
    ctx.fillStyle = fg
    ctx.fillRect(tx - 13, ty - 13, 26, 26)
    for (let i = 0; i < 5; i++) {
      const an = sweep + (hash(i * 17) - 0.5) * 1.6
      const d = 10 + hash(i * 7) * 26
      ctx.strokeStyle = css(MOLTEN_HI, 0.7 - hash(i * 3) * 0.3)
      ctx.lineWidth = 1.4
      ctx.beginPath()
      ctx.moveTo(tx, ty)
      ctx.lineTo(tx + Math.cos(an) * d, ty + Math.sin(an) * d)
      ctx.stroke()
    }
    ctx.restore()
  }

  // ONE green strand growing 0..1 with sway (sway = bend value, e.g. sin(t))
  function drawSprout(ctx, x, y, grow, sway = 0) {
    const g = clamp(grow)
    if (g <= 0.01) return
    const hgt = 46 * E.outQuad(g)
    const bend = sway * 9 * g
    const tipX = x + bend, tipY = y - hgt
    const cX = x + bend * 0.25, cY = y - hgt * 0.55
    ctx.save()
    ctx.lineCap = 'round'
    ctx.strokeStyle = '#2f9a3a'
    ctx.lineWidth = 2.2
    ctx.beginPath()
    ctx.moveTo(x, y)
    ctx.quadraticCurveTo(cX, cY, tipX, tipY)
    ctx.stroke()
    ctx.strokeStyle = PAL.sprout
    ctx.lineWidth = 1.1
    ctx.beginPath()
    ctx.moveTo(x, y + 1)
    ctx.quadraticCurveTo(cX, cY, tipX, tipY)
    ctx.stroke()
    if (g > 0.55) {
      const cu = clamp((g - 0.55) / 0.45)
      ctx.strokeStyle = PAL.sprout
      ctx.lineWidth = 1
      ctx.beginPath()
      ctx.moveTo(tipX, tipY)
      ctx.quadraticCurveTo(tipX + bend * 0.3 + 3 * cu, tipY - 4 * cu, tipX + bend * 0.2 + 1.5 * cu, tipY - 7 * cu)
      ctx.stroke()
    }
    if (g > 0.6) {
      const lu = clamp((g - 0.6) / 0.4)
      const lx = lerp(x, tipX, 0.45), ly = y - hgt * 0.45
      ctx.fillStyle = '#4fc458'
      for (const sgn of [-1, 1]) {
        ctx.beginPath()
        ctx.ellipse(lx + sgn * 2.6 * lu, ly - 1.5 * lu, 3 * lu, 1.4 * lu, sgn * -0.7, 0, 7)
        ctx.fill()
      }
    }
    ctx.restore()
  }

  // epilogue fuzz sapling: a curl of seeded strands + dew
  function drawSapling(ctx, x, y, grow) {
    const g = clamp(grow)
    if (g <= 0.01) return
    ctx.save()
    ctx.fillStyle = 'rgba(20,26,20,0.55)'
    ctx.beginPath()
    ctx.ellipse(x, y + 1, 9 * g + 2, 2.4 * g + 0.5, 0, 0, 7)
    ctx.fill()
    const strands = []
    for (let i = 0; i < 7; i++) {
      strands.push({
        h: (16 + hash(i * 13.7) * 34) * E.outQuad(clamp(g * 1.25 - hash(i * 3.1) * 0.25)),
        bend: (hash(i * 7.9) - 0.5) * 16 * g,
        dx: (hash(i * 5.3) - 0.5) * 7,
        w: 1 + hash(i * 11.3) * 0.9,
      })
    }
    ctx.lineCap = 'round'
    for (const st of strands) {
      if (st.h <= 1) continue
      ctx.strokeStyle = '#2f9a3a'
      ctx.lineWidth = st.w + 0.6
      ctx.beginPath()
      ctx.moveTo(x + st.dx * 0.3, y)
      ctx.quadraticCurveTo(x + st.dx + st.bend * 0.2, y - st.h * 0.6, x + st.dx + st.bend, y - st.h)
      ctx.stroke()
      ctx.strokeStyle = PAL.sprout
      ctx.lineWidth = st.w * 0.5
      ctx.beginPath()
      ctx.moveTo(x + st.dx * 0.3, y)
      ctx.quadraticCurveTo(x + st.dx + st.bend * 0.2, y - st.h * 0.6, x + st.dx + st.bend, y - st.h)
      ctx.stroke()
      ctx.lineWidth = st.w * 0.4
      ctx.beginPath()
      ctx.moveTo(x + st.dx + st.bend, y - st.h)
      ctx.quadraticCurveTo(x + st.dx + st.bend + 3, y - st.h - 3, x + st.dx + st.bend + 1, y - st.h - 5)
      ctx.stroke()
    }
    if (g > 0.7) {
      const du = clamp((g - 0.7) / 0.3)
      for (let i = 0; i < 4; i++) {
        const st = strands[Math.floor(hash(i * 17.3) * strands.length)]
        ctx.fillStyle = `rgba(240,250,255,${0.75 * du})`
        ctx.beginPath()
        ctx.arc(x + st.dx + st.bend * 0.7, y - st.h * (0.5 + hash(i * 9.1) * 0.4), 1.1, 0, 7)
        ctx.fill()
      }
    }
    ctx.restore()
  }

  // stolen motorcycle: lean / wheelSpin / headlight / wrecked
  function drawBike(ctx, x, groundY, o = {}) {
    const s = o.scale ?? 1
    ctx.save()
    ctx.translate(x, groundY)
    if (o.lean) ctx.rotate(o.lean)
    ctx.scale((o.flip ? -1 : 1) * s, s)
    const wreck = o.wrecked ?? 0
    const wheel = (wx, wy, r, spin) => {
      ctx.beginPath()
      ctx.arc(wx, wy, r, 0, 7)
      ctx.strokeStyle = '#0c0f13'
      ctx.lineWidth = 5.5
      ctx.stroke()
      ctx.beginPath()
      ctx.arc(wx, wy, r - 3.4, 0, 7)
      ctx.strokeStyle = '#2c3540'
      ctx.lineWidth = 2
      ctx.stroke()
      ctx.fillStyle = '#39434f'
      ctx.beginPath()
      ctx.arc(wx, wy, r * 0.28, 0, 7)
      ctx.fill()
      ctx.strokeStyle = '#5a6b7c'
      ctx.lineWidth = 1.4
      for (let i = 0; i < 5; i++) {
        const a = spin + i * (Math.PI * 2 / 5)
        ctx.beginPath()
        ctx.moveTo(wx, wy)
        ctx.lineTo(wx + Math.cos(a) * (r - 4), wy + Math.sin(a) * (r - 4))
        ctx.stroke()
      }
    }
    const spin = o.wheelSpin ?? 0
    const frontBend = wreck * 9
    wheel(-36, -23, 22, spin)
    wheel(36 - frontBend, -23 + wreck * 5, 22 - wreck * 2, spin * 0.4)
    if ((o.headlight ?? 0) > 0.02 && !wreck) {
      ctx.save()
      ctx.globalCompositeOperation = 'lighter'
      const hg = ctx.createLinearGradient(44, -40, 190, -46)
      hg.addColorStop(0, `rgba(255,236,180,${0.4 * o.headlight})`)
      hg.addColorStop(1, 'rgba(255,236,180,0)')
      ctx.fillStyle = hg
      ctx.beginPath()
      ctx.moveTo(44, -42)
      ctx.lineTo(190, -70)
      ctx.lineTo(190, -18)
      ctx.closePath()
      ctx.fill()
      ctx.restore()
    }
    const body = () => {
      ctx.beginPath()
      ctx.moveTo(-52, -30)
      ctx.quadraticCurveTo(-44, -52, -26, -54)
      ctx.quadraticCurveTo(-14, -62, 2, -58)
      ctx.quadraticCurveTo(20, -56, 30, -44 + wreck * 6)
      ctx.quadraticCurveTo(40, -38, 42 - frontBend, -30)
      ctx.lineTo(24, -26)
      ctx.quadraticCurveTo(-6, -34, -30, -24)
      ctx.closePath()
    }
    const bg = ctx.createLinearGradient(0, -62, 0, -22)
    bg.addColorStop(0, PAL.chromeMid)
    bg.addColorStop(0.45, '#3d4c5c')
    bg.addColorStop(1, '#141a22')
    body()
    ctx.fillStyle = bg
    ctx.fill()
    ctx.strokeStyle = INK
    ctx.lineWidth = 1.4
    ctx.stroke()
    ctx.fillStyle = '#10151b'
    ctx.beginPath()
    ctx.moveTo(-50, -36)
    ctx.quadraticCurveTo(-38, -46, -24, -46)
    ctx.lineTo(-26, -38)
    ctx.closePath()
    ctx.fill()
    ctx.fillStyle = wreck ? '#20161a' : PAL.eyeRed
    ctx.fillRect(-53, -40, 3, 3)
    ctx.strokeStyle = '#8ea3b5'
    ctx.lineWidth = 3
    ctx.beginPath()
    ctx.moveTo(34 - frontBend, -26 + wreck * 4)
    ctx.lineTo(26 - frontBend * 1.6, -50 + wreck * 8)
    ctx.stroke()
    ctx.strokeStyle = '#0c0f13'
    ctx.lineWidth = 3.4
    ctx.beginPath()
    ctx.moveTo(18 - frontBend * 1.8, -54 + wreck * 8)
    ctx.lineTo(32 - frontBend * 1.2, -58 + wreck * 9)
    ctx.stroke()
    ctx.strokeStyle = '#6a7a8a'
    ctx.lineWidth = 3.6
    ctx.beginPath()
    ctx.moveTo(-14, -20)
    ctx.lineTo(-48, -16)
    ctx.stroke()
    if (wreck > 0.3) {
      ctx.fillStyle = 'rgba(8,10,12,0.7)'
      ctx.beginPath()
      ctx.ellipse(-20, -1, 26, 3.4, 0, 0, 7)
      ctx.fill()
      ctx.fillStyle = '#2c3540'
      ctx.save()
      ctx.translate(-8, -6)
      ctx.rotate(0.7)
      ctx.fillRect(-6, -3, 12, 5)
      ctx.restore()
    }
    ctx.restore()
  }

  // tiny arching cat silhouette (the HUD's NON-TARGET gag)
  function drawCat(ctx, x, y, t) {
    const arch = 1 + Math.sin(t * 2.3) * 0.22
    ctx.save()
    ctx.translate(x, y)
    ctx.fillStyle = '#0d1116'
    ctx.beginPath()
    ctx.moveTo(-14, 0)
    ctx.quadraticCurveTo(-13, -7 - 3 * arch, -6, -9 - 5 * arch)
    ctx.quadraticCurveTo(0, -12 - 6 * arch, 6, -8 - 3 * arch)
    ctx.quadraticCurveTo(10, -6, 12, -2)
    ctx.lineTo(12, 0)
    ctx.closePath()
    ctx.fill()
    ctx.beginPath()
    ctx.arc(13.5, -9 - 2 * arch, 3.6, 0, 7)
    ctx.fill()
    ctx.beginPath()
    ctx.moveTo(11, -11.5 - 2 * arch)
    ctx.lineTo(11.8, -15 - 2.4 * arch)
    ctx.lineTo(13.8, -12 - 2 * arch)
    ctx.closePath()
    ctx.moveTo(14.6, -11.6 - 2 * arch)
    ctx.lineTo(16.4, -14.6 - 2.2 * arch)
    ctx.lineTo(16.8, -11 - 2 * arch)
    ctx.closePath()
    ctx.fill()
    ctx.strokeStyle = '#0d1116'
    ctx.lineWidth = 2.2
    ctx.lineCap = 'round'
    ctx.beginPath()
    ctx.moveTo(-13, -4)
    ctx.quadraticCurveTo(-19, -10 - 4 * arch, -17 + Math.sin(t * 3.1) * 2, -17 - 5 * arch)
    ctx.stroke()
    ctx.lineWidth = 2
    for (const lx of [-10, -4, 5, 10]) {
      ctx.beginPath()
      ctx.moveTo(lx, -3)
      ctx.lineTo(lx + (lx > 0 ? 1 : -1), 0)
      ctx.stroke()
    }
    ctx.strokeStyle = 'rgba(90,110,130,0.35)'
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.moveTo(-8, -8.5 - 4.5 * arch)
    ctx.quadraticCurveTo(0, -12.5 - 6 * arch, 7, -8 - 3 * arch)
    ctx.stroke()
    ctx.restore()
  }

  // =================================================================
  // HUD / CRT type (picture-side; mono >= 24 px, #ff5a5a — LOOK.hud)
  // =================================================================
  function hudText(ctx, s, x, y, o = {}) {
    const size = Math.max(24, o.size ?? 26)
    const body = o.typed ? s.slice(0, Math.max(0, Math.floor(o.typed.t * (o.typed.cps ?? 22)))) : s
    if (!body) return
    ctx.save()
    ctx.font = `700 ${size}px ${F.mono}`
    ctx.letterSpacing = `${o.track ?? 2}px`
    ctx.textAlign = o.align ?? 'left'
    ctx.textBaseline = o.base ?? 'alphabetic'
    if (o.glow !== 0) {
      ctx.shadowColor = PAL.eyeRed
      ctx.shadowBlur = o.glowBlur ?? 9
    }
    ctx.globalAlpha = o.alpha ?? 1
    ctx.fillStyle = o.color ?? HUD_RED
    ctx.fillText(body, x, y)
    if (o.typed && o.cursor !== 0 && (o.typed.t * (o.typed.cps ?? 22)) % 1 < 0.55 && body.length < s.length) {
      ctx.fillRect(x + ctx.measureText(body).width + 3, y - size * 0.72, size * 0.5, 2)
    }
    ctx.restore()
  }

  function hudBracket(ctx, x, y, w, h, o = {}) {
    const p = clamp(o.p ?? 1)
    if (p <= 0) return
    const out = (1 - E.outCubic(p)) * 14
    const L = Math.min(w, h) * 0.22 + 4
    ctx.save()
    ctx.globalAlpha = p
    ctx.strokeStyle = o.color ?? HUD_RED
    ctx.lineWidth = o.lw ?? 2.2
    ctx.beginPath()
    for (const [cx, cy, sx, sy] of [[x - out, y - out, 1, 1], [x + w + out, y - out, -1, 1], [x - out, y + h + out, 1, -1], [x + w + out, y + h + out, -1, -1]]) {
      ctx.moveTo(cx + sx * L, cy)
      ctx.lineTo(cx, cy)
      ctx.lineTo(cx, cy + sy * L)
    }
    ctx.stroke()
    ctx.lineWidth = 1.4
    ctx.beginPath()
    ctx.moveTo(x + w / 2 - 5, y - out)
    ctx.lineTo(x + w / 2 + 5, y - out)
    ctx.moveTo(x + w / 2 - 5, y + h + out)
    ctx.lineTo(x + w / 2 + 5, y + h + out)
    ctx.stroke()
    ctx.restore()
  }

  function hudScanlines(ctx, x, y, w, h, t) {
    ctx.save()
    ctx.beginPath()
    ctx.rect(x, y, w, h)
    ctx.clip()
    ctx.fillStyle = 'rgba(32,6,6,0.12)'
    for (let yy = y; yy < y + h; yy += 3) ctx.fillRect(x, yy, w, 1)
    const band = y + ((t * 95) % h)
    const bg = ctx.createLinearGradient(0, band - 24, 0, band + 24)
    bg.addColorStop(0, 'rgba(255,90,90,0)')
    bg.addColorStop(0.5, `rgba(255,90,90,${0.1 * (0.8 + 0.2 * hash(Math.floor(t * 30)))})`)
    bg.addColorStop(1, 'rgba(255,90,90,0)')
    ctx.fillStyle = bg
    ctx.fillRect(x, band - 24, w, 48)
    ctx.restore()
  }

  // =================================================================
  // steel type: shared tile renderer for title + endcard
  // =================================================================
  let measureCtx = null
  function ctx0() {
    if (!measureCtx) measureCtx = canvas(8, 8).getContext('2d')
    return measureCtx
  }
  function steelTile(key, s, size, track, glintK) {
    const mw = measure(ctx0(), s, size, F.anton, track)
    const tw = mw + 40
    const th = size * 1.5
    const sc = scratch(key, tw, th)
    const c = sc.x
    const cxm = sc.w / 2, cym = sc.h / 2
    c.font = `${size}px ${F.anton}`
    c.letterSpacing = `${track}px`
    c.textAlign = 'center'
    c.textBaseline = 'middle'
    c.fillStyle = '#04070b'
    c.fillText(s, cxm + 3, cym + 4)
    c.strokeStyle = '#0a0f16'
    c.lineWidth = 3
    c.strokeText(s, cxm, cym)
    const gr = c.createLinearGradient(0, cym - size * 0.5, 0, cym + size * 0.5)
    gr.addColorStop(0, '#32404e')
    gr.addColorStop(0.2, PAL.chromeMid)
    gr.addColorStop(0.44, PAL.chromeHi)
    gr.addColorStop(0.58, '#9db0c0')
    gr.addColorStop(0.8, '#4a5a6a')
    gr.addColorStop(1, '#2a3644')
    c.fillStyle = gr
    c.fillText(s, cxm, cym)
    c.strokeStyle = 'rgba(223,233,242,0.4)'
    c.lineWidth = 1
    c.strokeText(s, cxm, cym)
    if (glintK > 0 && glintK < 1) {
      c.save()
      c.globalCompositeOperation = 'source-atop'
      c.globalAlpha = Math.sin(glintK * Math.PI)
      c.translate(cxm, cym)
      c.rotate(-0.32)
      const gx = lerp(-tw * 0.75, tw * 0.75, glintK)
      const gg = c.createLinearGradient(gx - 30, 0, gx + 30, 0)
      gg.addColorStop(0, 'rgba(255,255,255,0)')
      gg.addColorStop(0.5, 'rgba(240,248,255,0.85)')
      gg.addColorStop(1, 'rgba(255,255,255,0)')
      c.fillStyle = gg
      c.fillRect(-tw, -th, tw * 2, th * 2)
      c.restore()
    }
    return { c: sc.c, w: sc.w, h: sc.h, size, cx: cxm, cy: cym, textW: mw }
  }

  function dustBurst(ctx, x, y, age, seed, o = {}) {
    const life = o.life ?? 1.0
    if (age <= 0 || age > life) return
    const n = o.n ?? 22
    for (let i = 0; i < n; i++) {
      const a = hash(seed * 7 + i * 13) * 6.28
      const sp = (0.4 + hash(seed * 3 + i * 29) * 0.8) * (o.spread ?? 230)
      const px = x + Math.cos(a) * sp * age * (0.5 + hash(i * 3.3) * 0.5)
      const py = y - Math.abs(Math.sin(a)) * sp * 0.5 * age + 300 * age * age
      const uu = age / life
      ctx.globalAlpha = (1 - uu) * (0.3 + hash(i * 7.7) * 0.3)
      ctx.fillStyle = i % 4 === 0 ? PAL.chromeMid : '#9a8c76'
      ctx.beginPath()
      ctx.arc(px, py, (2 + hash(i * 5.1) * 5) * (0.5 + uu), 0, 7)
      ctx.fill()
    }
    ctx.globalAlpha = 1
  }

  // "THE TERMHAIRNATOR" — steel Anton slam at local 2.5 + dust + glint.
  // Also carries the "A REMY BOYS FILM" subtitle (timeline: g3.2; not a caption).
  function drawTitle(ctx, lt) {
    const SLAM = 2.5
    const p = seg(lt, SLAM, SLAM + 0.3)
    if (p <= 0) return
    const size = 150
    const tile = steelTile('title', 'THE TERMHAIRNATOR', size, 4, seg(lt, SLAM + 0.55, SLAM + 1.8))
    const k = lerp(2.15, 1, E.outBack(p))
    const shake = Math.sin(p * Math.PI * 14) * (1 - p) * 7
    ctx.save()
    ctx.translate(960 + shake, 540)
    ctx.scale(k, k)
    ctx.globalAlpha = clamp(p * 5)
    ctx.drawImage(tile.c, -tile.cx, -tile.cy)
    ctx.restore()
    dustBurst(ctx, 960, 540 + size * 0.42, lt - SLAM, 71, { n: 26, spread: 300 })
    dustBurst(ctx, 620, 560, lt - SLAM - 0.08, 72, { n: 9, spread: 170, life: 0.8 })
    dustBurst(ctx, 1300, 560, lt - SLAM - 0.08, 73, { n: 9, spread: 170, life: 0.8 })
    const sp = seg(lt, 3.2, 3.7)
    if (sp > 0) {
      ctx.save()
      ctx.globalAlpha = sp * 0.92
      txt(ctx, 'A REMY BOYS FILM', 960, 660, { size: 30, font: F.grot, color: '#cdd6de', align: 'center', base: 'middle', track: 9 })
      ctx.restore()
    }
  }

  // endcard: card slam 2.0 (steel + red eye dot on the first A of TERMHAIRNATOR),
  // kicker "NO FATE BUT WHAT WE GROW." at 2.6, credit line at 3.4 (CAPTIONS card*).
  function drawEndcard(ctx, lt) {
    const SLAM = 2.0
    const p = seg(lt, SLAM, SLAM + 0.26)
    if (p <= 0) return
    const size = 96
    const tile = steelTile('card', 'THE TERMHAIRNATOR', size, 3, seg(lt, SLAM + 0.5, SLAM + 1.6))
    const k = lerp(2.0, 1, E.outBack(p))
    const shake = Math.sin(p * Math.PI * 14) * (1 - p) * 5
    ctx.save()
    ctx.translate(960 + shake, 430)
    ctx.scale(k, k)
    ctx.globalAlpha = clamp(p * 5)
    ctx.drawImage(tile.c, -tile.cx, -tile.cy)
    ctx.restore()
    if (p > 0.4) {
      const mctx = ctx0()
      mctx.font = `${size}px ${F.anton}`
      mctx.letterSpacing = '3px'
      const startX = 960 - tile.textW / 2
      const pre = mctx.measureText('THE TERMHAIR').width - 3
      const aw = mctx.measureText('A').width
      const ax = startX + pre + aw / 2
      const ay = 430 - size * 0.26
      const pulse = 0.8 + 0.2 * Math.sin(lt * 2.6)
      ctx.save()
      ctx.globalAlpha = clamp((p - 0.4) * 4) * pulse
      const eg = ctx.createRadialGradient(ax, ay, 0.5, ax, ay, 13)
      eg.addColorStop(0, css(RED, 0.8))
      eg.addColorStop(1, css(RED, 0))
      ctx.fillStyle = eg
      ctx.fillRect(ax - 13, ay - 13, 26, 26)
      ctx.fillStyle = '#3a0a0a'
      ctx.beginPath()
      ctx.arc(ax, ay, 6, 0, 7)
      ctx.fill()
      ctx.fillStyle = PAL.eyeRed
      ctx.beginPath()
      ctx.arc(ax, ay, 4.4, 0, 7)
      ctx.fill()
      ctx.fillStyle = '#ffd6c8'
      ctx.beginPath()
      ctx.arc(ax - 1.3, ay - 1.5, 1.2, 0, 7)
      ctx.fill()
      ctx.restore()
    }
    const kp = seg(lt, 2.6, 2.95)
    if (kp > 0) {
      ctx.save()
      ctx.globalAlpha = kp
      txt(ctx, 'NO FATE BUT WHAT WE GROW.', 960, 560, { size: 34, font: F.mono, weight: 700, color: '#d9e4ee', align: 'center', base: 'middle', track: 6, glow: '#0a1420', glowBlur: 8 })
      ctx.restore()
    }
    const cp = seg(lt, 3.4, 3.75)
    if (cp > 0) {
      ctx.save()
      ctx.globalAlpha = cp
      txt(ctx, 'A REMY BOYS FILM · MMXXVI', 960, 896, { size: 24, font: F.mono, color: '#71818f', align: 'center', base: 'middle', track: 3 })
      ctx.restore()
    }
  }

  return {
    hero, machineFlesh, bystanderA, bystanderB, heads,
    drawMachine, drawSwordSlash, drawSprout, drawSapling, drawBike, drawCat,
    hudText, hudBracket, hudScanlines, drawTitle, drawEndcard,
  }
}

// =====================================================================
// machine rig analysis: silhouette landmarks (neck pinch, shoulder row,
// head box, eye zone) + per-row spans + red-lens eye position
// =====================================================================
function buildMachineMetrics(R) {
  const probe = canvas(R.w, R.h)
  const px = probe.getContext('2d')
  px.drawImage(R.c, 0, 0)
  const d = px.getImageData(0, 0, R.w, R.h).data
  const spanAt = []
  for (let y = 0; y < R.h; y++) {
    let a = -1, b = -1
    for (let x = 0; x < R.w; x++) {
      if (d[(y * R.w + x) * 4 + 3] > 40) {
        if (a < 0) a = x
        b = x
      }
    }
    spanAt.push([a, b])
  }
  const halfAt = (row) => {
    if (row < 0 || row >= R.h) return 9
    const s = spanAt[row]
    return s[0] < 0 ? 9 : (s[1] - s[0] + 1) / 2
  }
  const legH = R.h - R.legTop
  const torsoH = R.legTop - R.top
  const H = R.bottom - R.top + 1
  // neck pinch: narrowest row between the head mass and the hips
  let neckRow = R.top + Math.round(H * 0.45), neckW = 1e9
  for (let y = R.top + Math.round(H * 0.28); y < R.top + Math.round(H * 0.72); y++) {
    const s = spanAt[y]
    if (!s || s[0] < 0) continue
    const w = s[1] - s[0]
    if (w < neckW) {
      neckW = w
      neckRow = y
    }
  }
  // shoulders: widest row below the neck
  let shRow = Math.min(R.legTop - 1, neckRow + Math.round(H * 0.14)), shW = -1
  for (let y = neckRow; y < Math.min(R.legTop + 2, R.h); y++) {
    const s = spanAt[y]
    if (!s || s[0] < 0) continue
    const w = s[1] - s[0]
    if (w > shW) {
      shW = w
      shRow = y
    }
  }
  // head box + widest head half-width (skull scale)
  let headW = 0
  for (let y = R.top + Math.round((neckRow - R.top) * 0.3); y < neckRow; y++) headW = Math.max(headW, spanAt[y] && spanAt[y][0] >= 0 ? spanAt[y][1] - spanAt[y][0] : 0)
  const headH = neckRow - R.top
  const G = { R, spanAt, legH, torsoH, H }
  G.neckYup = R.bottom + 1 - neckRow
  G.shoulderYup = R.bottom + 1 - shRow
  G.headCY = (G.neckYup + (R.bottom + 1 - R.top)) / 2
  G.skullRX = Math.max(6, headW * 0.43)
  G.skullRY = Math.max(7, headH * 0.46)
  G.chestYup = (G.shoulderYup + legH) / 2 + 2
  G.chestW = halfAt(shRow) * 0.5
  G.waistYup = legH + (G.shoulderYup - legH) * 0.22
  G.waistW = halfAt(Math.round(R.bottom + 1 - G.waistYup)) * 0.48
  G.pelvisYup = legH + 4
  G.pelvisW = halfAt(Math.round(R.bottom + 1 - G.pelvisYup)) * 0.52
  G.hipX = Math.max(3.2, halfAt(Math.round(R.bottom + 1 - legH * 0.7)) * 0.45)
  G.ankleX = Math.max(3.8, halfAt(Math.round(R.bottom - 2)) * 0.55)
  G.shoulderX = halfAt(shRow) * 0.42
  G.elbowX = G.shoulderX * 1.24
  G.wristX = G.shoulderX * 1.3
  // red-lens eye: darkest cluster in the lower-middle of the head box,
  // inset from the silhouette edges (avoids the ink outline + crown hair)
  let sx = 0, sy = 0, n = 0
  const y0 = R.top + Math.round(headH * 0.45), y1 = R.top + Math.round(headH * 0.82)
  for (let y = y0; y < y1; y++) {
    const sp = spanAt[y]
    if (!sp || sp[0] < 0) continue
    for (let x = sp[0] + 4; x <= (sp[0] + sp[1]) / 2 - 1; x++) {
      const i = (y * R.w + x) * 4
      const lum = (d[i] + d[i + 1] + d[i + 2]) / 3
      if (d[i + 3] > 100 && lum < 60) {
        sx += x
        sy += y
        n++
      }
    }
  }
  G.lens = n > 4
    ? { dx: sx / n - R.cx, dy: (R.bottom + 1 - sy / n) - G.headCY }
    : { dx: -G.skullRX * 0.35, dy: -G.skullRY * 0.1 }
  return G
}
