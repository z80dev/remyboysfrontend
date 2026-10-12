// STILL HERE — art foundation. prepareArt() loads everything once (deterministic picks,
// no Math.random): the Bliss wallpaper, cast portraits, the 160-tile wall of Remys and
// the Cabald roster out of Quest's art.json. The painters below are pure functions of
// local time — scenes call them, they never keep frame state.
import { rng, E, seg, clamp, lerp } from 'filmkit/lib.js'
import { CAST, HERO, LUNA, FLAG, MOSAIC, SEED } from './timeline.js'

const F = { vt: 'VT323', mono: '"JetBrains Mono"', grot: '"Space Grotesk"', anton: 'Anton' }
const UI = '"Trebuchet MS", "Space Grotesk", Tahoma, sans-serif'

export const ART = {
  bliss: null,       // 1920×1080 rasterized wallpaper
  rows: null,        // art.json rows (palettes + bald flags + epithets)
  cast: {},          // name -> { img, idx, pal }
  hero: null,        // { img, idx, pal } — #2069, the baguette boy
  pool: [],          // 160 mosaic entries { img, idx, pal, col, row, x, y, q }
  wall: null,        // pre-composited 1920×800 wall canvas
  cabald: [],        // 48 bald { img, idx, pal }
}

const remyUrl = (i) => new URL(`../../media/remy/Character${i}.webp`, import.meta.url).href

function loadImg(url) {
  return new Promise((res, rej) => {
    const img = new Image()
    img.onload = () => res(img)
    img.onerror = () => rej(new Error(`load failed: ${url}`))
    img.src = url
  }).then((img) => img.decode().then(() => img, () => img))
}

// The SVG has a viewBox but no fixed raster size; bake it to a 1920×1080 bitmap so the
// desktop painter can blit it crisply every frame.
async function loadBliss() {
  const url = new URL('../../public/wallpaper/remy-bliss.svg', import.meta.url).href
  const svg = await (await fetch(url)).text()
  const sized = svg.replace('<svg', '<svg width="1920" height="1080"')
  const blob = new Blob([sized], { type: 'image/svg+xml' })
  const href = URL.createObjectURL(blob)
  const img = await loadImg(href)
  const c = document.createElement('canvas')
  c.width = 1920; c.height = 1080
  c.getContext('2d').drawImage(img, 0, 0, 1920, 1080)
  URL.revokeObjectURL(href)
  return c
}

function pal(i) {
  const r = ART.rows[i]
  return { skin: `#${r[0]}`, hair: `#${r[1]}`, shirt: `#${r[2]}`, bg: `#${r[3]}`, accent: `#${r[4]}`, eye: `#${r[5]}` }
}

export async function prepareArt() {
  ART.bliss = await loadBliss()
  ART.rows = (await (await fetch(new URL('../../media/quest/art.json', import.meta.url).href)).json()).rows

  // cast + hero
  await Promise.all(Object.entries(CAST).map(async ([name, idx]) => {
    ART.cast[name] = { idx, img: await loadImg(remyUrl(idx)), pal: pal(idx) }
  }))
  ART.hero = { idx: HERO, img: await loadImg(remyUrl(HERO)), pal: pal(HERO) }

  // the wall: 160 deterministic picks from all 4,490, hero locked into the centre tile
  const order = [...ART.rows.keys()]
  const r = rng(SEED.mosaic)
  for (let i = order.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [order[i], order[j]] = [order[j], order[i]] }
  const picks = order.slice(0, MOSAIC.cols * MOSAIC.rows)
  const heroTile = Math.floor(MOSAIC.rows / 2) * MOSAIC.cols + Math.floor(MOSAIC.cols / 2)
  picks[heroTile] = HERO
  const { tw, th, cols } = MOSAIC
  await Promise.all(picks.map(async (idx, i) => {
    const col = i % cols, row = Math.floor(i / cols)
    ART.pool.push({
      idx, img: await loadImg(remyUrl(idx)), pal: pal(idx), col, row,
      x: col * tw, y: row * th,
      q: row < MOSAIC.rows / 2 ? (col < cols / 2 ? 0 : 1) : (col < cols / 2 ? 2 : 3),
    })
  }))
  ART.wall = document.createElement('canvas')
  ART.wall.width = 1920; ART.wall.height = MOSAIC.rows * th
  const wx = ART.wall.getContext('2d')
  for (const t of ART.pool) {
    wx.fillStyle = t.pal.bg
    wx.fillRect(t.x, t.y, tw - 2, th - 2)
    wx.drawImage(t.img, t.x + 1, t.y + 1, tw - 4, th - 4)
  }

  // the Cabald: every bald Remy is a member; take 48, RUG LORD first
  const balds = ART.rows.map((row, i) => (row[9] ? i : -1)).filter((i) => i >= 0)
  const rc = rng(SEED.cabald)
  for (let i = balds.length - 1; i > 0; i--) { const j = Math.floor(rc() * (i + 1)); [balds[i], balds[j]] = [balds[j], balds[i]] }
  const cabaldPicks = [CAST.RUG_LORD, ...balds.filter((i) => i !== CAST.RUG_LORD).slice(0, 47)]
  await Promise.all(cabaldPicks.map(async (idx) => ART.cabald.push({ idx, img: await loadImg(remyUrl(idx)), pal: pal(idx) })))
}

// ————————————————————————————————— painters —————————————————————————————————

/** Framed portrait card — white matte, hairline edge, soft shadow. Pure draw. */
export function photo(ctx, remy, x, y, size, o = {}) {
  const rot = o.rot || 0, m = Math.round(size * 0.055)
  ctx.save()
  ctx.globalAlpha = o.alpha ?? 1
  ctx.translate(x + size / 2, y + size * 0.52)
  ctx.rotate(rot)
  if (o.shadow !== false) {
    ctx.save()
    ctx.shadowColor = 'rgba(0,0,0,0.5)'; ctx.shadowBlur = size * 0.22; ctx.shadowOffsetX = size * 0.05; ctx.shadowOffsetY = size * 0.09
    ctx.fillStyle = '#fff'
    ctx.fillRect(-size / 2, -size * 0.52, size, size * 1.04, 0)
    ctx.restore()
  }
  ctx.fillStyle = '#f7f5ee'
  ctx.fillRect(-size / 2, -size * 0.52, size, size * 1.04)
  ctx.fillStyle = 'rgba(0,0,0,0.18)'
  ctx.fillRect(-size / 2 + 1, size * 0.52 - 1, size - 2, 1)
  ctx.drawImage(remy.img, -size / 2 + m, -size * 0.52 + m, size - 2 * m, size - 2 * m)
  ctx.restore()
}

/** Big trailer type, drawn on the OVERLAY canvas so it stays crisp through post.
 *  Pops in at t0 (outBack scale + settle shake), holds, optional sub line under. */
export function slam(ov, text, lt, t0, o = {}) {
  const p = seg(lt, t0, t0 + (o.dur || 0.4))
  if (p <= 0) return
  const scale = E.outBack(clamp(p * 1.06, 0, 1))
  const settle = clamp((lt - t0) / (o.dur || 0.4), 0, 1)
  const shake = settle < 1 ? (1 - settle) * 10 : 0
  const dx = shake ? (hash01(lt * 61) - 0.5) * 2 * shake : 0
  const dy = shake ? (hash01(lt * 47 + 9) - 0.5) * 2 * shake : 0
  const y = o.y || 540
  ov.save()
  ov.translate(960 + dx, y + dy)
  ov.scale(scale, scale)
  ov.globalAlpha = clamp(p * 3, 0, 1)
  const size = o.size || 200
  ov.font = `${o.weight || ''} ${size}px ${o.font || F.anton}`.trim()
  ov.textAlign = 'center'; ov.textBaseline = 'alphabetic'
  if (o.glow !== false) { ov.shadowColor = o.glowColor || 'rgba(255,255,255,0.35)'; ov.shadowBlur = 34 }
  ov.fillStyle = o.color || '#ffffff'
  ov.fillText(text, 0, 0)
  ov.shadowBlur = 0
  if (o.sub) {
    ov.font = `${o.subWeight || 600} ${o.subSize || Math.round(size * 0.22)}px ${o.subFont || F.grot}`
    ov.fillStyle = o.subColor || FLAG[3]
    const sp = o.subTrack ?? 14
    tracked(ov, o.sub.toUpperCase(), 0, o.subDy || size * 0.42, sp)
  }
  ov.restore()
}

function hash01(n) { const s = Math.sin(n * 12.9898) * 43758.5453; return s - Math.floor(s) }

function tracked(ov, s, x, y, sp) {
  // centred letter-spaced line (fillText has no tracking)
  const chars = [...s]
  const w = chars.reduce((a, c) => a + ov.measureText(c).width + sp, -sp)
  let cx = x - w / 2
  for (const c of chars) { ov.fillText(c, cx + ov.measureText(c).width / 2, y); cx += ov.measureText(c).width + sp }
}

/** Luna window chrome. content(ctx, x, y, w, h, lt) paints the client area. */
export function xpWindow(ctx, x, y, w, h, title, content, lt, o = {}) {
  const active = o.active !== false
  ctx.save()
  ctx.shadowColor = 'rgba(0,0,0,0.45)'; ctx.shadowBlur = 30; ctx.shadowOffsetY = 12
  ctx.fillStyle = active ? LUNA.frame : '#9d9db8'
  ctx.beginPath(); ctx.roundRect(x, y, w, h, [8, 8, 3, 3]); ctx.fill()
  ctx.restore()
  // title bar
  const th = 30
  const g = ctx.createLinearGradient(0, y, 0, y + th)
  if (active) { g.addColorStop(0, LUNA.titleA); g.addColorStop(0.55, LUNA.titleB); g.addColorStop(1, LUNA.titleC) }
  else { g.addColorStop(0, '#d8d8e8'); g.addColorStop(1, '#a8a8c0') }
  ctx.fillStyle = g
  ctx.beginPath(); ctx.roundRect(x + 3, y + 3, w - 6, th, [6, 6, 0, 0]); ctx.fill()
  ctx.fillStyle = 'rgba(255,255,255,0.28)'
  ctx.beginPath(); ctx.roundRect(x + 3, y + 3, w - 6, th * 0.5, [6, 6, 0, 0]); ctx.fill()
  // caption
  flagMark(ctx, x + 14, y + 9, 16)
  ctx.font = `bold 15px ${UI}`; ctx.textAlign = 'left'; ctx.textBaseline = 'middle'
  ctx.fillStyle = active ? '#fff' : '#1b1b2b'
  ctx.shadowColor = 'rgba(0,0,0,0.5)'; ctx.shadowBlur = 2
  ctx.fillText(title, x + 38, y + 3 + th / 2 + 1)
  ctx.shadowBlur = 0
  // window buttons
  const by = y + 8, bs = 17
  for (let i = 0; i < 3; i++) {
    const bx = x + w - 12 - (3 - i) * (bs + 3) + bs + 3
    const isClose = i === 2
    ctx.fillStyle = isClose ? '#e2574a' : active ? '#c9d8f2' : '#cfD8e8'
    ctx.beginPath(); ctx.roundRect(bx - bs, by, bs, bs, 3); ctx.fill()
    ctx.strokeStyle = 'rgba(255,255,255,0.6)'; ctx.lineWidth = 1
    ctx.beginPath(); ctx.roundRect(bx - bs + 0.5, by + 0.5, bs - 1, bs - 1, 3); ctx.stroke()
    ctx.strokeStyle = isClose ? '#fff' : '#12336e'; ctx.lineWidth = 1.6
    const cxx = bx - bs / 2, cyy = by + bs / 2
    ctx.beginPath()
    if (i === 0) { ctx.moveTo(cxx - 4, cyy - 2.5); ctx.lineTo(cxx - 4, cyy + 3.5); ctx.moveTo(cxx, cyy - 2.5); ctx.lineTo(cxx, cyy + 3.5); }
    else if (i === 1) { ctx.rect(cxx - 3.5, cyy - 2.5, 7, 6) }
    else { ctx.moveTo(cxx - 3.5, cyy - 3.5); ctx.lineTo(cxx + 3.5, cyy + 3.5); ctx.moveTo(cxx + 3.5, cyy - 3.5); ctx.lineTo(cxx - 3.5, cyy + 3.5) }
    ctx.stroke()
  }
  // client area
  ctx.fillStyle = o.bg ?? LUNA.face
  ctx.fillRect(x + 3, y + 3 + th, w - 6, h - th - 9)
  if (content) content(ctx, x + 3, y + 3 + th, w - 6, h - th - 9, lt)
  ctx.strokeStyle = 'rgba(0,0,0,0.25)'; ctx.lineWidth = 1
  ctx.strokeRect(x + 3.5, y + 3 + th + 0.5, w - 7, h - th - 10)
}

/** The wavy four-pane flag mark (FLAG_COLORS), drawn around x,y at width w. */
export function flagMark(ctx, x, y, w) {
  const h = w * 0.8, wq = w / 2 - w * 0.06, hq = h / 2 - h * 0.06
  const wave = (px, py, pw, ph, c) => {
    ctx.fillStyle = c
    ctx.beginPath()
    ctx.moveTo(px, py)
    ctx.lineTo(px + pw, py + ph * 0.12)
    ctx.quadraticCurveTo(px + pw * 1.18, py + ph * 0.5, px + pw, py + ph * 0.94)
    ctx.lineTo(px, py + ph)
    ctx.closePath(); ctx.fill()
  }
  wave(x, y, wq, hq, FLAG[0]); wave(x + w / 2 + w * 0.03, y + h * 0.02, wq, hq, FLAG[1])
  wave(x + w * 0.04, y + h / 2 + h * 0.03, wq, hq, FLAG[2]); wave(x + w / 2 + w * 0.06, y + h / 2 + h * 0.04, wq, hq, FLAG[3])
}

/** Bliss desktop: wallpaper, icons, taskbar, then o.windows (xpWindow specs). */
export function desktop(ctx, lt, o = {}) {
  const drift = o.drift || 0
  ctx.save()
  const s = 1.06
  ctx.translate(960, 540); ctx.scale(s, s); ctx.translate(-960 - drift * 14, -540 - drift * 5)
  ctx.drawImage(ART.bliss, 0, 0, 1920, 1080)
  ctx.restore()
  if (o.dusk) { ctx.fillStyle = `rgba(40,10,20,${o.dusk})`; ctx.fillRect(0, 0, 1920, 1080) }

  // desktop icons
  const icons = o.icons ?? [
    { g: 'computer', label: 'Remy Vault' },
    { g: 'folder', label: 'gallery' },
    { g: 'heart', label: 'the boys' },
    { g: 'bin', label: 'Recycle Bin' },
  ]
  ctx.textAlign = 'center'
  icons.forEach((ic, i) => {
    const iy = (o.iconY ?? 110) + i * 118
    ctx.save(); ctx.translate(80, iy)
    ctx.shadowColor = 'rgba(0,0,0,0.4)'; ctx.shadowBlur = 3; ctx.shadowOffsetY = 2
    glyph(ctx, ic.g, 0, 0, 52)
    ctx.restore()
    ctx.font = `15px ${UI}`
    const lw = ctx.measureText(ic.label).width
    ctx.fillStyle = 'rgba(10,20,60,0.55)'
    ctx.beginPath(); ctx.roundRect(80 - lw / 2 - 7, iy + 60, lw + 14, 24, 4); ctx.fill()
    ctx.fillStyle = '#fff'
    ctx.shadowColor = 'rgba(0,0,0,0.8)'; ctx.shadowBlur = 3
    ctx.fillText(ic.label, 80, iy + 77)
    ctx.shadowBlur = 0
  })

  // keep the shell readable inside the 2.39:1 band: taskbar bottom sits at y 938, not 1080
  if (o.taskbar !== false) taskbar(ctx, { ...o, bottom: o.bandBottom ?? 938 })
  for (const w of o.windows || []) xpWindow(ctx, w.x, w.y, w.w, w.h, w.title, w.content, lt, w)
}

export function taskbar(ctx, o = {}) {
  const h = 44, bottom = o.bottom ?? 1080, y = bottom - h
  const g = ctx.createLinearGradient(0, y, 0, 1080)
  g.addColorStop(0, LUNA.taskA); g.addColorStop(0.5, LUNA.taskB); g.addColorStop(1, LUNA.taskC)
  ctx.fillStyle = g; ctx.fillRect(0, y, 1920, h)
  ctx.fillStyle = '#4a86e8'; ctx.fillRect(0, y, 1920, 2)
  ctx.fillStyle = 'rgba(0,0,0,0.25)'; ctx.fillRect(0, y + 2, 1920, 1)
  // start button
  ctx.save()
  ctx.shadowColor = 'rgba(0,0,0,0.4)'; ctx.shadowBlur = 6; ctx.shadowOffsetY = 2
  const sg = ctx.createLinearGradient(0, y + 4, 0, y + h - 4)
  sg.addColorStop(0, '#5eb84e'); sg.addColorStop(1, '#2f7d24')
  ctx.fillStyle = sg
  ctx.beginPath(); ctx.roundRect(8, y + 4, 116, h - 8, [8, 12, 12, 8]); ctx.fill()
  ctx.restore()
  ctx.fillStyle = 'rgba(255,255,255,0.3)'
  ctx.beginPath(); ctx.roundRect(10, y + 6, 112, (h - 8) * 0.45, [8, 10, 0, 0]); ctx.fill()
  flagMark(ctx, 20, y + 12, 22)
  ctx.font = `bold italic 19px ${UI}`; ctx.fillStyle = '#fff'; ctx.textAlign = 'left'; ctx.textBaseline = 'middle'
  ctx.shadowColor = 'rgba(0,0,0,0.6)'; ctx.shadowBlur = 3; ctx.shadowOffsetY = 1
  ctx.fillText('start', 50, y + h / 2 + 1)
  ctx.shadowBlur = 0; ctx.shadowOffsetY = 0
  // tray
  const tg = ctx.createLinearGradient(0, y + 2, 0, 1080)
  tg.addColorStop(0, LUNA.trayA); tg.addColorStop(1, LUNA.trayB)
  ctx.fillStyle = tg; ctx.fillRect(1920 - 190, y + 3, 190, h - 3)
  ctx.fillStyle = 'rgba(255,255,255,0.35)'; ctx.fillRect(1920 - 190, y + 3, 2, h - 3)
  ctx.fillStyle = '#fff'
  ctx.font = `15px ${UI}`; ctx.textAlign = 'center'
  ctx.fillText(o.clock ?? '4:49', 1920 - 95, y + h / 2 + 1)
}

function glyph(ctx, kind, x, y, s) {
  const cx = x, cy = y
  if (kind === 'computer') {
    ctx.fillStyle = '#3a6ea5'; ctx.fillRect(cx - s * 0.4, cy - s * 0.36, s * 0.8, s * 0.56)
    ctx.fillStyle = '#9fd0ff'; ctx.fillRect(cx - s * 0.34, cy - s * 0.3, s * 0.68, s * 0.44)
    ctx.fillStyle = LUNA.ok; ctx.fillRect(cx - s * 0.34, cy + 0, s * 0.68, s * 0.09)
    ctx.fillStyle = '#d8d8c8'; ctx.fillRect(cx - s * 0.12, cy + s * 0.22, s * 0.24, s * 0.1)
    ctx.fillStyle = '#b8b8a8'; ctx.fillRect(cx - s * 0.25, cy + s * 0.3, s * 0.5, s * 0.07)
  } else if (kind === 'folder') {
    ctx.fillStyle = '#e8b53a'
    ctx.beginPath(); ctx.roundRect(cx - s * 0.45, cy - s * 0.28, s * 0.9, s * 0.6, 4); ctx.fill()
    ctx.fillStyle = '#f6d26f'
    ctx.beginPath(); ctx.roundRect(cx - s * 0.45, cy - s * 0.34, s * 0.42, s * 0.16, 3); ctx.fill()
    flagMark(ctx, cx - s * 0.16, cy - s * 0.16, s * 0.34)
  } else if (kind === 'heart') {
    ctx.fillStyle = '#e0484a'
    ctx.beginPath()
    ctx.moveTo(cx, cy + s * 0.32)
    ctx.bezierCurveTo(cx - s * 0.55, cy - s * 0.05, cx - s * 0.3, cy - s * 0.42, cx, cy - s * 0.12)
    ctx.bezierCurveTo(cx + s * 0.3, cy - s * 0.42, cx + s * 0.55, cy - s * 0.05, cx, cy + s * 0.32)
    ctx.fill()
  } else if (kind === 'bin') {
    ctx.fillStyle = '#cfd8e8'
    ctx.beginPath(); ctx.moveTo(cx - s * 0.28, cy - s * 0.3); ctx.lineTo(cx + s * 0.28, cy - s * 0.3)
    ctx.lineTo(cx + s * 0.22, cy + s * 0.36); ctx.lineTo(cx - s * 0.22, cy + s * 0.36); ctx.closePath(); ctx.fill()
    ctx.fillStyle = '#8a97ad'; ctx.fillRect(cx - s * 0.34, cy - s * 0.38, s * 0.68, s * 0.09)
  } else if (kind === 'mine') {
    ctx.fillStyle = '#151515'
    ctx.beginPath(); ctx.arc(cx, cy, s * 0.3, 0, Math.PI * 2); ctx.fill()
    ctx.strokeStyle = '#151515'; ctx.lineWidth = 5
    for (let a = 0; a < 8; a++) { const r = s * 0.42; ctx.beginPath(); ctx.moveTo(cx + Math.cos(a * Math.PI / 4) * s * 0.24, cy + Math.sin(a * Math.PI / 4) * s * 0.24); ctx.lineTo(cx + Math.cos(a * Math.PI / 4) * r, cy + Math.sin(a * Math.PI / 4) * r); ctx.stroke() }
    ctx.fillStyle = '#fff'; ctx.fillRect(cx - 4, cy - 6, 3, 3)
  } else if (kind === 'card') {
    ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.roundRect(cx - s * 0.3, cy - s * 0.4, s * 0.6, s * 0.8, 5); ctx.fill()
    ctx.fillStyle = '#d0262e'; ctx.font = `${Math.round(s * 0.5)}px serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
    ctx.fillText('♥', cx, cy)
  } else if (kind === 'note') {
    ctx.fillStyle = '#f2d34e'
    ctx.beginPath(); ctx.arc(cx - s * 0.14, cy + s * 0.2, s * 0.14, 0, Math.PI * 2); ctx.fill()
    ctx.fillRect(cx - s * 0.02, cy - s * 0.3, s * 0.07, s * 0.5)
    ctx.fillRect(cx - s * 0.02, cy - s * 0.3, s * 0.3, s * 0.08)
  }
}

/** BIOS POST screen, amber on black, lines revealed by lt. */
export function bootBIOS(ctx, lt) {
  ctx.fillStyle = '#000'; ctx.fillRect(0, 0, 1920, 1080)
  const lines = [
    'REMY BIOS v4.49 — (c) 2023 Based Remy Boys',
    '',
    'Detecting IDE drives ............. OK',
    'Memory test: 4490 MB ............. OK',
    'Detecting Remys: 4490 of 4490 .... OK',
    'CABALD check ..................... none found',
    '',
    'Loading Remy OS xp ...',
  ]
  ctx.font = `34px ${F.vt}`; ctx.textAlign = 'left'; ctx.textBaseline = 'top'
  lines.forEach((s, i) => {
    if (lt < i * 0.26 + 0.15) return
    const last = lt < (i + 1) * 0.26 + 0.15
    ctx.fillStyle = s.startsWith('REMY BIOS') ? '#ffb000' : s.includes('CABALD') ? '#7fd8ff' : '#e8e2c8'
    ctx.fillText(s, 140, 150 + i * 46)
    if (last && Math.floor(lt * 3) % 2 === 0) ctx.fillRect(140 + ctx.measureText(s).width + 8, 152, 18, 34)
  })
  ctx.font = `22px ${F.vt}`; ctx.fillStyle = '#8a7f60'
  ctx.fillText('Press DEL to enter SETUP (there is no setup)', 140, 950)
}

/** Remy OS xp boot logo with the marquee progress blocks. */
export function bootXP(ctx, lt) {
  ctx.fillStyle = '#000'; ctx.fillRect(0, 0, 1920, 1080)
  flagMark(ctx, 640, 388, 110)
  ctx.font = `bold 72px ${UI}`; ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic'
  ctx.fillStyle = '#fff'
  ctx.shadowColor = 'rgba(0,0,0,0.6)'; ctx.shadowBlur = 2
  ctx.fillText('Remy OS', 780, 470)
  const osW = ctx.measureText('Remy OS').width
  ctx.fillStyle = '#ff8c00'
  ctx.font = `bold italic 72px ${UI}`
  ctx.fillText('xp', 780 + osW + 26, 470)
  ctx.shadowBlur = 0
  // marquee
  const bw = 240, bx = 960 - bw / 2, by = 590
  ctx.fillStyle = '#3a3a3a'
  ctx.beginPath(); ctx.roundRect(bx, by, bw, 14, 7); ctx.fill()
  ctx.save()
  ctx.beginPath(); ctx.roundRect(bx, by, bw, 14, 7); ctx.clip()
  const off = (lt * 130) % 60
  for (let i = -3; i < 6; i++) {
    const x = bx + i * 60 + off
    const g = ctx.createLinearGradient(x, 0, x + 26, 0)
    g.addColorStop(0, 'rgba(61,152,255,0)'); g.addColorStop(0.5, '#6fd2ff'); g.addColorStop(1, 'rgba(61,152,255,0)')
    ctx.fillStyle = g; ctx.fillRect(x, by + 2, 26, 10)
  }
  ctx.restore()
  ctx.font = `20px ${UI}`; ctx.fillStyle = '#d8d8d8'; ctx.textAlign = 'center'
  ctx.fillText('Copyright © 2023–2026 Based Remy Boys', 960, 900)
}

/** The blue screen of (liquidity) death. */
export function bsod(ctx, lt) {
  ctx.fillStyle = '#000082'; ctx.fillRect(0, 0, 1920, 1080)
  const lines = [
    'A problem has been detected and Remy OS has been shut down',
    'to prevent damage to your liquidity.',
    '',
    'PAYMENT_PROCESSOR_V2_HAS_STOPPED_WORKING',
    '',
    'If this is the first time you have seen this Stop error screen,',
    'contact your Cabald administrator. (There is no Cabald.)',
    '',
    'Technical information:',
    '',
    '*** STOP: 0x0000CABALD (0x4490RUG, 0x0000FLOOR, 0xBA1D0057)',
    '',
    'Beginning dump of liquidity ......... 98% ......... rugged',
  ]
  ctx.font = `28px ${F.mono}`; ctx.textAlign = 'left'; ctx.textBaseline = 'top'
  lines.forEach((s, i) => {
    if (lt < 0.1 + i * 0.14) return
    ctx.fillStyle = i === 3 || i === 10 ? '#7fd8ff' : '#e8e8f4'
    ctx.fillText(s, 150, 170 + i * 46)
  })
}

/** Bottom scrim so declarative captions stay legible over busy footage. Pure draw. */
export function scrim(ctx, a = 0.4) {
  const g = ctx.createLinearGradient(0, 730, 0, 948)
  g.addColorStop(0, 'rgba(4,6,12,0)')
  g.addColorStop(1, `rgba(4,6,12,${a})`)
  ctx.fillStyle = g
  ctx.fillRect(0, 730, 1920, 218)
}

/** Dark rounded panel behind the HUD counter, top-right. Pure draw. */
export function counterPanel(ctx, w = 330) {
  ctx.fillStyle = 'rgba(6,9,16,0.45)'
  ctx.beginPath(); ctx.roundRect(1790 - w - 22, 176, w + 44, 128, 10); ctx.fill()
  ctx.strokeStyle = 'rgba(255,255,255,0.12)'; ctx.lineWidth = 1
  ctx.beginPath(); ctx.roundRect(1790 - w - 21.5, 176.5, w + 43, 127, 10); ctx.stroke()
}

/** Candlestick-ish chart. mode 'crash' (red staircase down) or 'recover' (green V).
 *  p = draw progress 0..1 of the line. */
export function chart(ctx, x, y, w, h, p, o = {}) {
  ctx.save()
  ctx.beginPath(); ctx.rect(x, y, w, h); ctx.clip()
  ctx.fillStyle = 'rgba(6,10,18,0.85)'; ctx.fillRect(x, y, w, h)
  ctx.strokeStyle = 'rgba(255,255,255,0.07)'; ctx.lineWidth = 1
  for (let i = 1; i < 10; i++) { ctx.beginPath(); ctx.moveTo(x + (w / 10) * i, y); ctx.lineTo(x + (w / 10) * i, y + h); ctx.stroke() }
  for (let i = 1; i < 6; i++) { ctx.beginPath(); ctx.moveTo(x, y + (h / 6) * i); ctx.lineTo(x + w, y + (h / 6) * i); ctx.stroke() }
  const n = 60
  const pts = []
  for (let i = 0; i <= n; i++) {
    const u = i / n
    let v
    if (o.mode === 'recover') {
      const fall = 1 - Math.pow(Math.min(u / 0.45, 1), 0.65)
      const rise = u > 0.45 ? 1 - Math.pow(1 - (u - 0.45) / 0.55, 2.2) * 0.92 : 0
      v = 0.86 - fall * 0.72 + rise
    } else {
      const step = Math.floor(u * 7) / 7
      v = 0.88 - step * 0.74 - (o.jitter ? Math.sin(u * 40) * 0.018 * u : 0)
    }
    pts.push([x + u * w, y + (1 - v) * h])
  }
  const upto = Math.max(2, Math.floor(p * n))
  const col = o.mode === 'recover' ? '#3ddc84' : '#ff4a3d'
  // area fill
  ctx.beginPath(); ctx.moveTo(pts[0][0], y + h)
  for (let i = 0; i < upto; i++) ctx.lineTo(pts[i][0], pts[i][1])
  ctx.lineTo(pts[upto - 1][0], y + h); ctx.closePath()
  const g = ctx.createLinearGradient(0, y, 0, y + h)
  g.addColorStop(0, o.mode === 'recover' ? 'rgba(61,220,132,0.3)' : 'rgba(255,74,61,0.34)')
  g.addColorStop(1, 'rgba(0,0,0,0)')
  ctx.fillStyle = g; ctx.fill()
  // line
  ctx.beginPath(); ctx.moveTo(pts[0][0], pts[0][1])
  for (let i = 1; i < upto; i++) ctx.lineTo(pts[i][0], pts[i][1])
  ctx.strokeStyle = col; ctx.lineWidth = 4; ctx.lineJoin = 'round'; ctx.shadowColor = col; ctx.shadowBlur = 14
  ctx.stroke()
  ctx.shadowBlur = 0
  // head dot
  const [hx, hy] = pts[upto - 1]
  ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(hx, hy, 5.5, 0, Math.PI * 2); ctx.fill()
  if (o.label) {
    ctx.font = `bold 15px ${F.mono}`; ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic'
    ctx.fillStyle = col
    ctx.fillText(o.label, Math.min(hx + 12, x + w - 150), hy - 12)
  }
  ctx.restore()
}

/** Winamp-ish equalizer bars for the golden act. */
export function eqBars(ctx, x, y, w, h, lt, seed = 3) {
  const bands = 22, bw = (w - (bands - 1) * 4) / bands
  ctx.fillStyle = '#101418'
  ctx.beginPath(); ctx.roundRect(x - 10, y - 10, w + 20, h + 20, 6); ctx.fill()
  for (let i = 0; i < bands; i++) {
    const f = 0.5 + 0.5 * Math.sin(lt * (5 + (i % 5)) + i * 1.7 + seed)
    const f2 = 0.5 + 0.5 * Math.sin(lt * 2.2 + i * 0.6 + seed * 2)
    const v = (f * 0.7 + f2 * 0.3) * (0.45 + 0.55 * Math.sin((i / bands) * Math.PI))
    const bh = Math.max(4, v * h)
    const bx = x + i * (bw + 4), by = y + h - bh
    const g = ctx.createLinearGradient(0, by, 0, y + h)
    g.addColorStop(0, '#3ddc84'); g.addColorStop(0.75, '#1f9b50'); g.addColorStop(1, '#0c5a2a')
    ctx.fillStyle = g
    ctx.fillRect(bx, by, bw, bh)
    ctx.fillStyle = '#ff4a3d'
    ctx.fillRect(bx, by, bw, 3)
  }
}
