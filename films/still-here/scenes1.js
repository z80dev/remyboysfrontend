// STILL HERE — ACT I–IV scene painters (boot, genesis, golden, turn).
// Every painter is a pure function of local time lt; the only module state is the
// turn-act scratch canvas, which is fully repainted every call (filmkit allows this).
import { W, H, E, seg, clamp, lerp, hash } from 'filmkit/lib.js'
import { T, FLAG, MOSAIC } from './timeline.js'
import { ART, photo, xpWindow, desktop, bootBIOS, bootXP, eqBars, scrim, counterPanel, flagMark } from './art.js'

const UI = '"Trebuchet MS", "Space Grotesk", Tahoma, sans-serif'
const MONO = '"JetBrains Mono", "Space Grotesk", monospace'
const GROT = '"Space Grotesk", "Trebuchet MS", sans-serif'

const cubicIn = (u) => u * u * u
const easeSeg = (x, a, b, ez) => ez(seg(x, a, b))

/** Right-aligned letter-spaced line (fillText has no tracking). */
function trackedRight(c, s, xRight, y, sp) {
  c.save()
  c.textAlign = 'left'; c.textBaseline = 'alphabetic'
  let w = -sp
  for (const ch of s) w += c.measureText(ch).width + sp
  let cx = xRight - w
  for (const ch of s) { c.fillText(ch, cx, y); cx += c.measureText(ch).width + sp }
  c.restore()
}

// ————————————————————————————————— ACT I — boot (0–8) —————————————————————————————————

/** Classic CRT power-on: a white line snaps open to full height, then fades into the BIOS. */
function crtPowerOn(ctx, lt) {
  const open = E.outCubic(clamp(lt / 0.22, 0, 1))
  const h = Math.max(2, H * (0.002 + 0.998 * open))
  const fade = 1 - E.inOutCubic(seg(lt, 0.22, 0.42))
  if (fade <= 0) return
  ctx.save()
  ctx.shadowColor = 'rgba(220,235,255,0.9)'; ctx.shadowBlur = 40
  ctx.fillStyle = `rgba(242,246,255,${fade})`
  ctx.fillRect(0, H / 2 - h / 2, W, h)
  ctx.restore()
}

/** The welcome window's client area: hero portrait left, intro copy right, wipe-revealed. */
function welcomeContent(ctx, cx, cy, cw, ch, wlt) {
  const rp = easeSeg(wlt, 0.25, 1.05, E.inOutCubic)
  if (rp <= 0) return
  photo(ctx, ART.hero, cx + 34, cy + 48, 180, { rot: -0.015, alpha: clamp(seg(wlt, 0.15, 0.55) * 1.6, 0, 1) })
  ctx.save()
  ctx.beginPath(); ctx.rect(cx + 240, cy - 8, cw - 254, (ch + 16) * rp); ctx.clip()
  ctx.font = `16px ${UI}`; ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic'
  ctx.fillStyle = '#3b382e'
  ctx.fillText('A community collection that outlived', cx + 240, cy + 78)
  ctx.fillText('its mint, its marketplace and one exploit.', cx + 240, cy + 102)
  ctx.fillText('4,490 hand-drawn Remys. One chain: Base.', cx + 240, cy + 152)
  ctx.font = `bold 16px ${UI}`; ctx.fillStyle = '#9a7b1f'
  ctx.fillText('· still here ·', cx + 240, cy + 198)
  ctx.restore()
  // footer: divider + a tip line and the flag mark, so the window doesn't read empty
  const fp = clamp(seg(wlt, 0.9, 1.4), 0, 1)
  if (fp > 0) {
    ctx.save()
    ctx.globalAlpha = fp
    ctx.strokeStyle = 'rgba(0,0,0,0.15)'; ctx.lineWidth = 1
    ctx.beginPath(); ctx.moveTo(cx + 22, cy + ch - 58); ctx.lineTo(cx + cw - 22, cy + ch - 58); ctx.stroke()
    ctx.font = `13px ${UI}`; ctx.textAlign = 'left'; ctx.fillStyle = '#5a584a'
    ctx.fillText('Did you know? Every bald Remy is a Cabald member.', cx + 22, cy + ch - 32)
    flagMark(ctx, cx + cw - 92, cy + ch - 50, 26)
    ctx.restore()
  }
}

/** Windows arrow pointer, drawn as a polygon at (x, y). */
function cursor(ctx, x, y) {
  ctx.save()
  ctx.translate(x, y); ctx.scale(1.7, 1.7)
  ctx.beginPath()
  ctx.moveTo(0, 0); ctx.lineTo(0, 14.8); ctx.lineTo(3.4, 11.6); ctx.lineTo(6.0, 17.4)
  ctx.lineTo(8.3, 16.4); ctx.lineTo(5.7, 10.6); ctx.lineTo(10.2, 10.6); ctx.closePath()
  ctx.shadowColor = 'rgba(0,0,0,0.45)'; ctx.shadowBlur = 4; ctx.shadowOffsetY = 1
  ctx.fillStyle = '#fff'; ctx.fill()
  ctx.shadowBlur = 0; ctx.shadowOffsetY = 0
  ctx.strokeStyle = '#101018'; ctx.lineWidth = 0.9; ctx.stroke()
  ctx.restore()
}

export function drawBoot(ctx, lt, t, ov) {
  void t
  if (lt < 2.4) {
    // BIOS POST, warming up through the CRT power-on
    bootBIOS(ctx, lt)
    crtPowerOn(ctx, lt)
  } else if (lt < T.desk) {
    bootXP(ctx, lt - 2.4)
  } else {
    // desktop reveal: welcome window slides in while the black lifts
    const p = seg(lt, 6, 7.2)
    const wy = 250 - 40 * (1 - E.outCubic(p))
    desktop(ctx, lt - 6, {
      dusk: 0.25 * (1 - p),
      windows: [{ x: 1180, y: wy, w: 620, h: 520, title: 'welcome to Remy OS xp', content: welcomeContent }],
    })
    // the pointer glides to the gallery icon (T.dblclick) and double-clicks it open
    const cp = easeSeg(lt, T.dblclick, T.dblclick + 0.6, E.inOutCubic)
    if (cp > 0) {
      // soft hover glow under the folder
      if (cp > 0.8) {
        const hg = (cp - 0.8) / 0.2
        ctx.save()
        ctx.globalAlpha = 0.16 * hg
        ctx.fillStyle = '#fff'
        ctx.beginPath(); ctx.arc(80, 228, 44, 0, Math.PI * 2); ctx.fill()
        ctx.restore()
      }
      cursor(ctx, lerp(600, 96, cp), lerp(700, 246, cp))
    }
    // double-click ring pulse, two rings 0.13 s apart
    for (const k of [0, 0.13]) {
      const a = seg(lt, 7.55 + k, 8.0 + k)
      if (a <= 0 || a >= 1) continue
      ctx.save()
      ctx.globalAlpha = (1 - a) * 0.85
      ctx.strokeStyle = '#fff'; ctx.lineWidth = 2.5 * (1 - a) + 0.5
      ctx.shadowColor = 'rgba(255,255,255,0.8)'; ctx.shadowBlur = 8
      ctx.beginPath(); ctx.arc(80, 234, 12 + E.outCubic(a) * 30, 0, Math.PI * 2); ctx.stroke()
      ctx.restore()
    }
  }
  void ov
}

// ————————————————————————————— ACT II — genesis (8–16) ———————————————————————————————

// the wall of 4,490: 20×8 tiles of 96×100, translated to y=140, zooming 1.12 → 1.0
function wallZoom(lt) {
  return 1.12 - 0.12 * E.outCubic(seg(lt, 0.8, 8))
}

export function drawGenesis(ctx, lt, t, ov) {
  // Phase A — the act-I desktop persists, dusk falls, slight push-in
  const zoomA = 1 + 0.08 * E.inOutCubic(seg(lt, 0, 2.5))
  ctx.save()
  ctx.translate(960, 540); ctx.scale(zoomA, zoomA); ctx.translate(-960, -540)
  desktop(ctx, lt, { dusk: 0.85 * E.inOutCubic(seg(lt, 0, 2.2)) })
  // the welcome window floats up and away (lt+2 keeps its content reveal continuous with ACT I's end)
  const wa = 1 - seg(lt, 0.15, 1.0)
  if (wa > 0) {
    ctx.save()
    ctx.globalAlpha = wa
    xpWindow(ctx, 1180, 250 - 10 * seg(lt, 0.15, 1.0), 620, 520, 'welcome to Remy OS xp', welcomeContent, lt + 2)
    ctx.restore()
  }
  ctx.restore()

  // deep navy-black backdrop settling in behind the wall
  const nb = seg(lt, 0.9, 2.8)
  if (nb > 0) {
    const g = ctx.createLinearGradient(0, 0, 0, H)
    g.addColorStop(0, '#04060d'); g.addColorStop(0.5, '#0a1124'); g.addColorStop(1, '#05070f')
    ctx.save(); ctx.globalAlpha = nb
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H)
    ctx.restore()
  }

  // Phase B — the wall builds: each tile pops (outBack) with a 30px rise, staggered L→R, top→bottom
  const zw = wallZoom(lt)
  const { tw, th } = MOSAIC
  ctx.save()
  ctx.translate(960, 540); ctx.scale(zw, zw); ctx.translate(-960, -540)
  for (const tile of ART.pool) {
    const d = (tile.x / W) * 1.6 + (tile.y / 800) * 1.4 + hash(tile.idx) * 0.9
    const q = seg(lt, 0.8 + d, 0.8 + d + 0.5)
    if (q <= 0) continue
    const s = E.outBack(q)
    const cx = tile.x + tw / 2, cy = 140 + tile.y + th / 2 + 30 * (1 - q)
    ctx.save()
    ctx.globalAlpha = clamp(q * 1.5, 0, 1)
    ctx.translate(cx, cy); ctx.scale(s, s)
    ctx.fillStyle = tile.pal.bg
    ctx.fillRect(-tw / 2, -th / 2, tw - 2, th - 2)
    ctx.drawImage(tile.img, -tw / 2 + 1, -th / 2 + 1, tw - 4, th - 4)
    ctx.restore()
  }
  // Phase C — the hero tile breathes at the centre of the finished wall
  const hero = ART.pool[(MOSAIC.rows >> 1) * MOSAIC.cols + (MOSAIC.cols >> 1)]
  const hp = seg(lt, 6.5, 7.0)
  if (hp > 0) {
    ctx.save()
    ctx.globalAlpha = hp * (0.5 + 0.5 * Math.sin(t * 6))
    ctx.strokeStyle = '#fff'; ctx.lineWidth = 2 / zw
    ctx.shadowColor = 'rgba(255,255,255,0.9)'; ctx.shadowBlur = 12
    ctx.strokeRect(hero.x + 1, 140 + hero.y + 1, tw - 2, th - 2)
    ctx.restore()
  }
  ctx.restore()

  // HUD counter — panel + scrim keep it legible over the brightening tiles
  const cs = seg(lt, 1.2, 2.4)
  if (cs > 0) {
    ctx.save()
    ctx.globalAlpha = cs
    counterPanel(ctx)
    ctx.restore()
  }
  // ...spins up with outExpo and settles on 4,490 at lt 6.2 (overlay: crisp type)
  const cp = seg(lt, 1.2, 6.2)
  if (cp > 0) {
    const pulse = lt > 6.2 ? 1 + 0.09 * Math.exp(-(lt - 6.2) * 9) * Math.sin((lt - 6.2) * 34) : 1
    ov.save()
    ov.translate(1790, 250)
    ov.scale(pulse, pulse)
    ov.globalAlpha = seg(lt, 1.2, 1.7)
    ov.font = `700 64px ${MONO}`
    ov.textAlign = 'right'; ov.textBaseline = 'alphabetic'
    ov.shadowColor = 'rgba(255,255,255,0.5)'; ov.shadowBlur = 26
    ov.fillStyle = '#fff'
    ov.fillText(Math.round(E.outExpo(cp) * 4490).toLocaleString('en-US'), 0, 0)
    ov.shadowColor = 'rgba(255,190,26,0.45)'; ov.shadowBlur = 12
    ov.fillStyle = FLAG[3]
    ov.font = `600 18px ${GROT}`
    trackedRight(ov, 'REMYS MINTED', 0, 36, 6)
    ov.restore()
  }
  // hero label under the wall's bottom-centre
  if (hp > 0) {
    ov.save()
    ov.globalAlpha = hp * 0.92
    ov.font = `16px ${MONO}`
    ov.textAlign = 'center'; ov.textBaseline = 'alphabetic'
    ov.shadowColor = 'rgba(0,0,0,0.85)'; ov.shadowBlur = 6
    ov.fillStyle = '#fff'
    ov.fillText('REMY BOY #2069', 960, 830)
    ov.restore()
  }
}

// ————————————————————————————— ACT III — golden (16–24) ——————————————————————————————

// gallery window — a 3×3 wall of framed cast picks (ART.cast is keyed by cast NAME)
function galleryContent(ctx, cx, cy, cw, ch, lt) {
  const picks = ['AMY', 'CARL', 'RAY', 'GWEI', 'NURSE', 'GOLD', 'MAXI', 'CURATOR', 'RIVAL']
  const size = 164, cw3 = cw / 3, ch3 = ch / 3
  picks.forEach((name, i) => {
    const pp = seg(lt, 0.35 + i * 0.12, 0.78 + i * 0.12)
    if (pp <= 0) return
    const px = cx + (i % 3) * cw3 + (cw3 - size) / 2
    const py = cy + ((i / 3) | 0) * ch3 + (ch3 - size * 1.04) / 2
    const ax = px + size / 2, ay = py + size * 0.52
    ctx.save()
    const s = E.outBack(pp)
    ctx.translate(ax, ay); ctx.scale(s, s); ctx.translate(-ax, -ay)
    photo(ctx, ART.cast[name], px, py, size, { rot: (hash(i + 40) - 0.5) * 0.14, alpha: clamp(pp * 2, 0, 1) })
    ctx.restore()
  })
}

// Remyamp — album art, equalizer, bitrate line, green marquee
function ampContent(ctx, cx, cy, cw, ch, lt) {
  void ch
  const pp = seg(lt, 0.25, 0.6)
  if (pp > 0) photo(ctx, ART.hero, cx + 16, cy + 20, 70, { rot: -0.03, alpha: pp })
  eqBars(ctx, cx + 110, cy + 64, cw - 180, 110, lt, 7)
  ctx.font = `12px ${MONO}`; ctx.textAlign = 'right'; ctx.textBaseline = 'alphabetic'
  ctx.fillStyle = '#7a7a8c'
  ctx.fillText('44 kHz · 4490 kbps · stereo', cx + cw - 14, cy + 26)
  ctx.strokeStyle = 'rgba(255,255,255,0.08)'; ctx.lineWidth = 1
  ctx.beginPath(); ctx.moveTo(cx + 12, cy + 194.5); ctx.lineTo(cx + cw - 12, cy + 194.5); ctx.stroke()
  // clipped marquee, seamless two-copy loop (lt-driven so it stays continuous through the turn)
  const txt = 'REMY BOYS — STILL HERE · 16-BIT REMAKES ··· '
  ctx.font = `18px ${MONO}`
  const loop = ctx.measureText(txt).width + 60
  ctx.save()
  ctx.beginPath(); ctx.rect(cx + 104, cy + 202, cw - 118, 32); ctx.clip()
  ctx.fillStyle = '#3ddc84'; ctx.textAlign = 'left'
  const mx = cx + 104 - ((lt * 160) % loop)
  ctx.fillText(txt, mx, cy + 224)
  ctx.fillText(txt, mx + loop, cy + 224)
  ctx.restore()
}

// hand-drawn mini glyphs for the games window, centred on (x, y) in a 56px box
const GAMES = [
  ['JezzBald', (c, x, y) => {
    c.fillStyle = '#26262e'; c.beginPath(); c.roundRect(x - 24, y - 24, 48, 48, 9); c.fill()
    c.fillStyle = '#fff'; c.fillRect(x - 3, y - 15, 6, 30); c.fillRect(x - 15, y - 3, 30, 6)
    c.fillStyle = '#ffbe1a'; c.fillRect(x + 10, y + 10, 6, 6)
  }],
  ['Remy Hearts', (c, x, y) => {
    c.fillStyle = '#e0484a'
    c.beginPath(); c.moveTo(x, y + 18)
    c.bezierCurveTo(x - 30, y - 3, x - 17, y - 24, x, y - 7)
    c.bezierCurveTo(x + 17, y - 24, x + 30, y - 3, x, y + 18)
    c.fill()
    c.fillStyle = 'rgba(255,255,255,0.55)'
    c.beginPath(); c.ellipse(x - 9, y - 8, 4, 3, -0.6, 0, Math.PI * 2); c.fill()
  }],
  ['Mines', (c, x, y) => {
    c.strokeStyle = '#151515'; c.lineWidth = 3.5; c.lineCap = 'round'
    for (let a = 0; a < 8; a++) {
      c.beginPath()
      c.moveTo(x + Math.cos(a * Math.PI / 4) * 10, y + Math.sin(a * Math.PI / 4) * 10)
      c.lineTo(x + Math.cos(a * Math.PI / 4) * 22, y + Math.sin(a * Math.PI / 4) * 22)
      c.stroke()
    }
    c.fillStyle = '#151515'; c.beginPath(); c.arc(x, y, 15, 0, Math.PI * 2); c.fill()
    c.fillStyle = '#fff'; c.fillRect(x - 5, y - 8, 4, 4)
  }],
  ['3D Pinball', (c, x, y) => {
    c.fillStyle = '#1f6fe0'; c.beginPath(); c.arc(x - 4, y - 5, 15, 0, Math.PI * 2); c.fill()
    c.fillStyle = 'rgba(255,255,255,0.6)'; c.beginPath(); c.arc(x - 9, y - 10, 4, 0, Math.PI * 2); c.fill()
    c.fillStyle = '#ffbe1a'; c.fillRect(x + 8, y - 18, 6, 6)
    c.strokeStyle = '#c9d3de'; c.lineWidth = 5; c.lineCap = 'round'
    c.beginPath(); c.moveTo(x - 16, y + 15); c.lineTo(x + 16, y + 8); c.stroke()
  }],
  ['Solitaire', (c, x, y) => {
    c.save(); c.translate(x, y); c.rotate(-0.12)
    c.fillStyle = '#fff'; c.beginPath(); c.roundRect(-16, -23, 32, 46, 5); c.fill()
    c.strokeStyle = 'rgba(0,0,0,0.3)'; c.lineWidth = 1; c.beginPath(); c.roundRect(-15.5, -22.5, 31, 45, 5); c.stroke()
    c.fillStyle = '#d0262e'; c.font = '22px serif'; c.textAlign = 'center'; c.textBaseline = 'middle'
    c.fillText('♥', 0, 1)
    c.restore()
  }],
  ['Nibbles', (c, x, y) => {
    c.strokeStyle = '#3ddc84'; c.lineWidth = 6; c.lineJoin = 'round'; c.lineCap = 'round'
    c.beginPath()
    c.moveTo(-18 + x, 12 + y); c.lineTo(-18 + x, -6 + y); c.lineTo(x, -6 + y)
    c.lineTo(x, 12 + y); c.lineTo(18 + x, 12 + y); c.lineTo(18 + x, -8 + y)
    c.stroke()
    c.fillStyle = '#ff4a3d'; c.beginPath(); c.arc(18 + x, -16 + y, 4.5, 0, Math.PI * 2); c.fill()
  }],
  ['RemyTris', (c, x, y) => {
    c.fillStyle = '#3ecfe0'; c.fillRect(x - 16, y - 19, 15, 15)
    c.fillStyle = '#ffd34a'; c.fillRect(x - 16, y - 2, 15, 15)
    c.fillStyle = '#b06ae0'; c.fillRect(x + 1, y - 2, 15, 15)
    c.strokeStyle = 'rgba(0,0,0,0.35)'; c.lineWidth = 1
    c.strokeRect(x - 15.5, y - 18.5, 14, 14); c.strokeRect(x - 15.5, y - 1.5, 14, 14); c.strokeRect(x + 1.5, y - 1.5, 14, 14)
  }],
  ['SkiFree', (c, x, y) => {
    c.fillStyle = '#e8f0f8'
    c.beginPath(); c.moveTo(x - 24, y - 24); c.lineTo(x + 24, y + 24); c.lineTo(x - 24, y + 24); c.closePath(); c.fill()
    c.strokeStyle = '#20242c'; c.lineWidth = 3; c.lineCap = 'round'
    c.beginPath(); c.moveTo(x - 2, y + 3); c.lineTo(x + 7, y - 8); c.stroke()
    c.fillStyle = '#20242c'; c.beginPath(); c.arc(x + 8, y - 12, 4, 0, Math.PI * 2); c.fill()
    c.lineWidth = 3.5
    c.beginPath(); c.moveTo(x - 9, y + 8); c.lineTo(x + 12, y - 5); c.stroke()
  }],
]

function gamesContent(ctx, cx, cy, cw, ch, lt) {
  const cw4 = cw / 4, ch2 = ch / 2
  GAMES.forEach(([label, g], i) => {
    const pp = seg(lt, 0.3 + i * 0.09, 0.72 + i * 0.09)
    if (pp <= 0) return
    const gx = cx + (i % 4) * cw4 + cw4 / 2
    const gy = cy + ((i / 4) | 0) * ch2 + ch2 / 2 - 8
    ctx.save()
    ctx.globalAlpha = clamp(pp * 2, 0, 1)
    if (i === 0 && pp > 0.5) { // XP selection halo on the first game
      ctx.fillStyle = 'rgba(49,106,197,0.30)'
      ctx.beginPath(); ctx.roundRect(gx - cw4 / 2 + 10, gy - 54, cw4 - 20, 112, 8); ctx.fill()
    }
    const s = E.outBack(pp)
    ctx.translate(gx, gy); ctx.scale(s, s)
    g(ctx, 0, 0)
    ctx.font = `15px ${UI}`; ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic'
    ctx.fillStyle = i === 0 ? '#fff' : '#20202a'
    ctx.fillText(label, 0, 52)
    ctx.restore()
  })
}

// the golden-act composition, shared with the turn act (which re-renders it into a scratch canvas)
function goldenComp(c, lt, t, clock) {
  desktop(c, lt, { drift: Math.sin(lt * 0.35), clock })
  // windows cascade in: slide up 40px with an outBack settle, focus follows open order
  const wins = [
    { t0: 0.0, x: 140, y: 170, w: 660, h: 560, title: 'gallery — 4,490 items', content: galleryContent },
    { t0: 1.5, x: 880, y: 520, w: 800, h: 310, title: 'Remyamp — it really whips the llama\'s ass', content: ampContent, bg: '#1a1a22' },
    { t0: 3.0, x: 960, y: 170, w: 600, h: 380, title: 'games', content: gamesContent },
  ]
  wins.forEach((wd, i) => {
    if (lt < wd.t0) return
    const bob = 2.2 * Math.sin(lt * 0.9 + i * 2.1) * seg(lt, 5.5, 6.3)
    const y = wd.y - 40 * (1 - E.outBack(seg(lt, wd.t0, wd.t0 + 0.55))) + bob
    c.save()
    c.globalAlpha = clamp(seg(lt, wd.t0, wd.t0 + 0.22) * 1.6, 0, 1)
    xpWindow(c, wd.x, y, wd.w, wd.h, wd.title, wd.content, lt, { bg: wd.bg, active: !(wins[i + 1] && lt >= wins[i + 1].t0) })
    c.restore()
  })
}

export function drawGolden(ctx, lt, t, ov) {
  goldenComp(ctx, lt, t, lt >= 6.8 ? '4:50' : '4:49')
  // caption scrim + a soft crossfade up from the wall (ACT II ends on the mosaic)
  scrim(ctx, 0.42)
  const fade = 1 - seg(lt, 0, 0.5)
  if (fade > 0) { ctx.fillStyle = `rgba(4,6,12,${fade})`; ctx.fillRect(0, 0, W, H) }
  void ov
}

// ————————————————————————————— ACT IV — the turn (24–26) ——————————————————————————————

// scratch canvas: rebuilt from scratch every call (the allowed module-state pattern)
const scratch = { c: null, x: null }

export function drawTurn(ctx, lt, t, ov) {
  if (!scratch.c) {
    scratch.c = document.createElement('canvas')
    scratch.c.width = W; scratch.c.height = H
    scratch.x = scratch.c.getContext('2d')
  }
  const sx = scratch.x
  sx.setTransform(1, 0, 0, 1, 0, 0)
  sx.globalAlpha = 1; sx.globalCompositeOperation = 'source-over'
  goldenComp(sx, 6 + lt, t, '4:50') // the golden world as we last saw it

  const amp = cubicIn(seg(lt, 0, 1.2)) // the storm ramps in fast
  const col = seg(lt, 1.6, 2.0) // collapse toward centre
  const s = 1 - 0.14 * E.inOutCubic(col)

  if (col > 0) { ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H) }
  ctx.save()
  ctx.translate(960, 540); ctx.scale(s, s); ctx.translate(-960, -540)

  // base frame, then 26 horizontal slices sheared left/right and occasionally squashed
  ctx.drawImage(scratch.c, 0, 0)
  const jx = Math.floor(lt * 22), jt = Math.floor(lt * 17)
  for (let i = 0; i < 26; i++) {
    const sy = i * 42, sh = Math.min(42, H - sy)
    const off = (hash(i * 7 + jx) - 0.5) * 300 * amp
    let dy = sy, dh = sh
    if (hash(i * 13 + jt) > 1 - 0.3 * amp) {
      const f = 1 - 0.4 * amp
      dy = sy + sh * (1 - f) / 2; dh = sh * f
    }
    if (off !== 0 || dh !== sh) ctx.drawImage(scratch.c, 0, sy, W, sh, off, dy, W, dh)
  }

  // hash-noise strips tearing across the frame
  ctx.globalAlpha = amp * 0.5
  for (let k = 0; k < 3; k++) {
    const seed = Math.floor(lt * 13) + k * 57
    const ny = 30 + hash(seed) * (H - 80)
    for (let nx = 0; nx < W; nx += 6) {
      const v = hash(nx * 0.37 + seed * 13.7)
      if (v > 0.35 && v < 0.65) continue
      ctx.fillStyle = v > 0.5 ? '#fff' : '#000'
      ctx.fillRect(nx, ny, 6, 8)
    }
  }
  // scanline shimmer
  ctx.globalAlpha = 0.1 * amp
  ctx.fillStyle = '#000'
  for (let y = 0; y < H; y += 4) ctx.fillRect(0, y, W, 1)
  ctx.globalAlpha = 1
  ctx.restore()

  // whole-screen brightness flicker
  const fk = hash(Math.floor(lt * 24))
  if (amp > 0) {
    ctx.fillStyle = (hash(Math.floor(lt * 24) + 91) > 0.5 ? 'rgba(255,255,255,' : 'rgba(0,0,0,') + fk * 0.25 * amp + ')'
    ctx.fillRect(0, 0, W, H)
  }
  // collapse to black — pure black for the last beat before ACT V
  const bo = Math.max(seg(lt, 1.55, 1.98), seg(lt, 1.85, 2.0))
  if (bo > 0) { ctx.fillStyle = `rgba(0,0,0,${clamp(bo, 0, 1)})`; ctx.fillRect(0, 0, W, H) }
  void ov
}
