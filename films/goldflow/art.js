// GOLDFLOW art: prepare-time bakes + pure per-frame painters. Full-res 1920×1080 stage,
// sprites drawn 3–4× nearest (chunky pixel actors on painted sets — the house style).
import { hash } from 'filmkit/lib.js'
import { canvas } from '../remy-bros/art.js'

// ---------- rig tinting ----------
// Solid-colour silhouette from a rig (the-shine pattern): swap .c, keep the pose rig.
export function silhouette(R, color) {
  const c = canvas(R.w, R.h), x = c.getContext('2d')
  x.drawImage(R.c, 0, 0)
  x.globalCompositeOperation = 'source-in'
  x.fillStyle = color
  x.fillRect(0, 0, R.w, R.h)
  return c
}
// Gilded statue tint: desaturate, gold colour-composite, warm multiply gradient (duo pattern).
export function gild(R, k = 0.8) {
  const c = canvas(R.w, R.h), x = c.getContext('2d')
  x.drawImage(R.c, 0, 0)
  x.globalCompositeOperation = 'saturation'
  x.fillStyle = '#808080'
  x.fillRect(0, 0, R.w, R.h)
  x.globalCompositeOperation = 'color'
  x.globalAlpha = k
  x.fillStyle = '#e8c56a'
  x.fillRect(0, 0, R.w, R.h)
  x.globalAlpha = 1
  x.globalCompositeOperation = 'multiply'
  const g = x.createLinearGradient(0, 0, 0, R.h)
  g.addColorStop(0, '#fff2cf')
  g.addColorStop(1, '#b98f3e')
  x.fillStyle = g
  x.fillRect(0, 0, R.w, R.h)
  x.globalCompositeOperation = 'source-over'
  return c
}
export async function loadOrig(id) {
  const i = new Image()
  i.src = new URL(`../../media/remy/Character${id}.webp`, import.meta.url).href
  await i.decode()
  return i
}
// Tinted head-atlas cell → k-scaled canvas (gold bald moons, briefing portraits).
export function goldHead(heads, i, k, color) {
  const base = document.createElement('canvas')
  base.width = 16, base.height = 16
  const bx = base.getContext('2d')
  bx.imageSmoothingEnabled = false
  bx.drawImage(heads, (i % 67) * 16, Math.floor(i / 67) * 16, 16, 16, 0, 0, 16, 16)
  if (color) {
    bx.globalCompositeOperation = 'source-in'
    bx.fillStyle = color
    bx.fillRect(0, 0, 16, 16)
  }
  const c = canvas(16 * k, 16 * k), x = c.getContext('2d')
  x.imageSmoothingEnabled = false
  x.drawImage(base, 0, 0, 16 * k, 16 * k)
  return c
}

// ---------- environment bakes ----------
const W = 1920, H = 1080

// Night skyline layer: seeded building strip with lit windows + rooftop blinkers.
export function cityBake(seed, w, top, colDeep, colLit, litChance, hMax) {
  const c = canvas(w, H), x = c.getContext('2d')
  let bx = -40, i = 0
  while (bx < w + 40) {
    const bw = 60 + Math.floor(hash(seed * 31 + i * 7) * 130)
    const bh = 90 + Math.floor(hash(seed * 57 + i * 13) * hMax)
    const by = H - bh
    x.fillStyle = colDeep
    x.fillRect(bx, by, bw, bh)
    x.fillStyle = 'rgba(255,255,255,0.05)'
    x.fillRect(bx, by, bw, 3)
    if (hash(seed + i * 3) > 0.55) x.fillRect(bx + bw / 2 - 2, by - 16, 4, 16) // antenna
    for (let wy = by + 16; wy < H - 12; wy += 22) {
      for (let wx = bx + 8; wx < bx + bw - 10; wx += 16) {
        if (hash(seed * 11 + wx * 3 + wy * 7) < litChance) {
          x.fillStyle = hash(wx + wy * 5) > 0.8 ? colLit : 'rgba(214,226,244,0.5)'
          x.fillRect(wx, wy, 6, 9)
        }
      }
    }
    bx += bw + 6 + Math.floor(hash(seed * 17 + i) * 26)
    i++
  }
  x.globalCompositeOperation = 'destination-out'
  const fade = x.createLinearGradient(0, top, 0, top + 260)
  fade.addColorStop(0, 'rgba(0,0,0,1)')
  fade.addColorStop(1, 'rgba(0,0,0,0)')
  x.fillStyle = fade
  x.fillRect(0, top - 4, w, 264) // soft top edge so silhouettes sink into haze
  x.globalCompositeOperation = 'source-over'
  return c
}

// Cabald Tower: black monolith, sparse lit grid, bald-head sigil near the crown, antenna.
export function towerBake() {
  const w = 460, h = 1560
  const c = canvas(w, h), x = c.getContext('2d')
  const g = x.createLinearGradient(0, 0, 0, h)
  g.addColorStop(0, '#101522')
  g.addColorStop(0.5, '#0a0e18')
  g.addColorStop(1, '#06080f')
  x.fillStyle = g
  x.fillRect(0, 0, w, h)
  x.fillStyle = 'rgba(160,190,235,0.07)'
  x.fillRect(w - 46, 0, 46, h) // moonlit edge
  for (let wy = 60; wy < h - 40; wy += 34) {
    for (let wx = 26; wx < w - 40; wx += 30) {
      const r = hash(wx * 13 + wy * 7)
      if (r < 0.1) {
        x.fillStyle = r < 0.02 ? 'rgba(233,217,166,0.85)' : 'rgba(150,175,215,0.32)'
        x.fillRect(wx, wy, 12, 16)
      }
    }
  }
  x.fillStyle = '#05070c'
  x.fillRect(w / 2 - 3, -60, 6, 62) // antenna
  // Cabald sigil: bald head in a ring
  x.strokeStyle = '#1c2434'
  x.lineWidth = 10
  x.beginPath(); x.arc(w / 2, 190, 74, 0, 7); x.stroke()
  x.fillStyle = '#131a29'
  x.beginPath(); x.arc(w / 2, 196, 52, 0, 7); x.fill()
  x.fillStyle = '#0a0e18'
  x.beginPath(); x.arc(w / 2, 186, 52, Math.PI, 0); x.fill()
  x.fillStyle = 'rgba(233,217,166,0.5)'
  x.fillRect(w / 2 + 14, 158, 14, 5) // scalp shine
  return c
}

// Vault interior: green-black chamber, a bank-vault door behind the pedestal.
export function vaultBake() {
  const c = canvas(W, H), x = c.getContext('2d')
  x.fillStyle = '#080d0a'
  x.fillRect(0, 0, W, H)
  for (let i = 0; i < 26; i++) {
    x.fillStyle = 'rgba(140,180,150,0.035)'
    x.fillRect(0, i * 46, W, 2)
  }
  // the vault door: big brass ring + spokes + hub, dim
  x.strokeStyle = '#1c2a20'
  x.lineWidth = 20
  x.beginPath(); x.arc(960, 470, 310, 0, 7); x.stroke()
  x.strokeStyle = '#16211a'
  x.lineWidth = 8
  x.beginPath(); x.arc(960, 470, 252, 0, 7); x.stroke()
  for (let i = 0; i < 8; i++) {
    const a = i / 8 * Math.PI * 2
    x.strokeStyle = '#1a271f'
    x.lineWidth = 14
    x.beginPath()
    x.moveTo(960 + Math.cos(a) * 70, 470 + Math.sin(a) * 70)
    x.lineTo(960 + Math.cos(a) * 296, 470 + Math.sin(a) * 296)
    x.stroke()
  }
  x.fillStyle = '#233327'
  x.beginPath(); x.arc(960, 470, 66, 0, 7); x.fill()
  x.fillStyle = '#3d5138'
  x.beginPath(); x.arc(960, 470, 30, 0, 7); x.fill()
  // warm floor seam
  x.fillStyle = '#0c1310'
  x.fillRect(0, 880, W, 200)
  x.fillStyle = '#14201a'
  x.fillRect(0, 880, W, 6)
  x.fillStyle = '#182620'
  x.fillRect(W / 2 - 74, 700, 148, 190) // pedestal
  x.fillStyle = '#213428'
  x.fillRect(W / 2 - 96, 688, 192, 18)
  return c
}

// Lair interior: crater sky + razor dish, rock walls, catwalk, consoles (vat/glowlive).
export function lairBake() {
  const c = canvas(W, H), x = c.getContext('2d')
  x.fillStyle = '#0b0710'
  x.fillRect(0, 0, W, H)
  // crater opening
  x.fillStyle = '#0e1626'
  x.beginPath()
  x.moveTo(0, 0); x.lineTo(560, 0); x.lineTo(640, 120); x.lineTo(1280, 120); x.lineTo(1360, 0); x.lineTo(W, 0)
  x.lineTo(W, 300); x.lineTo(1240, 380); x.lineTo(680, 380); x.lineTo(0, 300)
  x.closePath(); x.fill()
  for (let i = 0; i < 60; i++) {
    x.fillStyle = 'rgba(220,230,250,0.8)'
    x.fillRect(Math.floor(hash(i * 3 + 900) * (W - 200)) + 100, Math.floor(hash(i * 7 + 300) * 90) + 8, 3, 3)
  }
  // RAZOR MOON dish on the rim
  x.save()
  x.translate(1500, 60)
  x.fillStyle = '#0a1220'
  x.beginPath(); x.arc(0, 0, 150, 0, 7); x.fill()
  x.fillStyle = '#16233c'
  for (let i = 0; i < 8; i++) {
    const a = i / 8 * Math.PI * 2
    x.beginPath()
    x.moveTo(Math.cos(a) * 150, Math.sin(a) * 150)
    x.lineTo(Math.cos(a + 0.18) * 226, Math.sin(a + 0.18) * 226)
    x.lineTo(Math.cos(a + 0.34) * 150, Math.sin(a + 0.34) * 150)
    x.closePath(); x.fill()
  }
  x.fillStyle = '#23324e'
  x.beginPath(); x.arc(0, 0, 56, 0, 7); x.fill()
  x.restore()
  // moonlight shaft into the vat (soft, under the runtime glow)
  x.globalAlpha = 0.07
  x.fillStyle = '#dce6ff'
  x.beginPath()
  x.moveTo(1100, 60); x.lineTo(1420, 60); x.lineTo(1560, 940); x.lineTo(1120, 940)
  x.closePath(); x.fill()
  x.globalAlpha = 1
  // rock strata
  for (let wy = 360; wy < H; wy += 54) {
    x.fillStyle = `rgba(70,46,60,${0.16 + 0.05 * ((wy / 54) % 2)})`
    x.fillRect(0, wy, W, 20)
    x.fillStyle = 'rgba(0,0,0,0.24)'
    x.fillRect(0, wy + 20, W, 6)
  }
  // catwalk: deck + rail + stanchions
  x.fillStyle = '#1d1626'
  x.fillRect(120, 764, 1680, 22)
  x.fillStyle = '#2b2138'
  x.fillRect(120, 764, 1680, 6)
  x.fillStyle = '#0f0a16'
  for (let sx = 150; sx < 1800; sx += 120) x.fillRect(sx, 786, 10, 150)
  x.fillStyle = '#3a2d4c'
  for (let sx = 150; sx < 1800; sx += 120) x.fillRect(sx, 690, 6, 74)
  x.fillRect(120, 688, 1680, 6)
  x.fillStyle = '#52406c'
  for (let sx = 126; sx < 1800; sx += 48) x.fillRect(sx, 688, 4, 4)
  // console block (left)
  x.fillStyle = '#151020'
  x.fillRect(430, 640, 210, 130)
  x.fillStyle = '#221a33'
  x.fillRect(430, 640, 210, 10)
  return c
}

// Briefing room: dark wall, framed screen, desk edge, floor line.
export function briefBake() {
  const c = canvas(W, H), x = c.getContext('2d')
  const g = x.createLinearGradient(0, 0, 0, H)
  g.addColorStop(0, '#10141d')
  g.addColorStop(1, '#0a0d14')
  x.fillStyle = g
  x.fillRect(0, 0, W, H)
  x.fillStyle = 'rgba(150,170,205,0.04)'
  for (let i = 0; i < 14; i++) x.fillRect(0, 90 + i * 52, W, 2)
  x.fillStyle = '#070a10'
  x.fillRect(560, 130, 1240, 560)
  x.strokeStyle = '#232c3d'
  x.lineWidth = 14
  x.strokeRect(560, 130, 1240, 560)
  x.fillStyle = '#0d1119'
  x.fillRect(0, 830, W, 250)
  x.fillStyle = '#141a26'
  x.fillRect(0, 830, W, 8)
  return c
}

// Mission "map" for the briefing screen: a top-down scalp survey. The one surviving
// hair is the summit; the widow's peak marks the lair. Route drawn live over it.
export function mapBake() {
  const w = 1240, h = 560
  const c = canvas(w, h), x = c.getContext('2d')
  x.fillStyle = '#0b1420'
  x.fillRect(0, 0, w, h)
  x.strokeStyle = 'rgba(110,150,190,0.12)'
  x.lineWidth = 1
  for (let gx = 40; gx < w; gx += 62) { x.beginPath(); x.moveTo(gx, 0); x.lineTo(gx, h); x.stroke() }
  for (let gy = 40; gy < h; gy += 62) { x.beginPath(); x.moveTo(0, gy); x.lineTo(w, gy); x.stroke() }
  // the scalp
  const g = x.createRadialGradient(560, 240, 60, 620, 280, 520)
  g.addColorStop(0, '#caa287')
  g.addColorStop(0.7, '#a9855f')
  g.addColorStop(1, '#7d6146')
  x.fillStyle = g
  x.beginPath(); x.ellipse(620, 280, 470, 240, -0.06, 0, 7); x.fill()
  x.strokeStyle = 'rgba(40,28,22,0.5)'
  x.lineWidth = 5
  x.beginPath(); x.ellipse(620, 280, 470, 240, -0.06, 0, 7); x.stroke()
  // stubble field
  for (let i = 0; i < 900; i++) {
    const a = hash(i * 13 + 2) * 6.283, rr = Math.sqrt(hash(i * 7 + 5))
    const px = 620 + Math.cos(a) * rr * 440, py = 280 + Math.sin(a) * rr * 215
    x.fillStyle = `rgba(52,38,30,${0.25 + hash(i) * 0.35})`
    x.fillRect(px, py, 3, 3)
  }
  // sheen
  x.globalAlpha = 0.12
  x.fillStyle = '#f4e8d8'
  x.beginPath(); x.ellipse(430, 170, 240, 90, -0.35, 0, 7); x.fill()
  x.globalAlpha = 1
  // widow's peak (the lair)
  x.fillStyle = '#3a2a20'
  x.beginPath()
  x.moveTo(560, 512); x.quadraticCurveTo(600, 452, 640, 512); x.quadraticCurveTo(680, 452, 720, 512)
  x.quadraticCurveTo(640, 548, 560, 512)
  x.closePath(); x.fill()
  // the one surviving hair (the summit), gold
  x.strokeStyle = '#e8cf7e'
  x.lineWidth = 5
  x.lineCap = 'round'
  x.beginPath()
  x.moveTo(850, 130)
  x.bezierCurveTo(880, 60, 950, 54, 980, 96)
  x.stroke()
  x.fillStyle = '#e8cf7e'
  x.beginPath(); x.arc(850, 130, 6, 0, 7); x.fill()
  // survey labels
  x.fillStyle = '#8fa4bd'
  x.font = '500 21px "JetBrains Mono"'
  x.textAlign = 'left'
  x.fillText('ONE (1) SURVIVING HAIR', 940, 120)
  x.strokeStyle = 'rgba(143,164,189,0.6)'
  x.lineWidth = 2
  x.beginPath(); x.moveTo(936, 124); x.lineTo(896, 128); x.stroke()
  x.fillText('WIDOW’S PEAK (LAIR)', 430, 545)
  x.fillText('ELEV. 3 IN.', 250, 150)
  return c
}

// ---------- props & painters (pure in t) ----------
export function strands(x, cx, cy, r, t, alpha) {
  x.save()
  x.globalAlpha = alpha
  if (r > 8) {
    x.strokeStyle = '#d9d2b4'
    x.lineWidth = 9
    x.beginPath(); x.arc(cx, cy, r, 0, 7); x.stroke()
  }
  // rifling: arcs that slowly precess
  if (r > 60) {
    x.lineWidth = 5
    x.strokeStyle = 'rgba(217,210,180,0.8)'
    for (let i = 0; i < 9; i++) {
      const a0 = t * 0.24 + i * 0.698
      x.beginPath(); x.arc(cx, cy, r - 44, a0, a0 + 0.42); x.stroke()
    }
    x.lineWidth = 3
    x.strokeStyle = 'rgba(217,210,180,0.28)'
    x.beginPath(); x.arc(cx, cy, r * 0.62, 0, 7); x.stroke()
    x.beginPath(); x.arc(cx, cy, r * 0.34, 0, 7); x.stroke()
  }
  x.restore()
}

// Barrel after the Combush pass: the curled rifling snaps into straight radial spokes.
export function strandsStraight(x, cx, cy, r, alpha) {
  x.save()
  x.globalAlpha = alpha
  x.strokeStyle = '#e9d9a6'
  x.lineWidth = 4
  for (let i = 0; i < 28; i++) {
    const a = i / 28 * Math.PI * 2
    x.beginPath()
    x.moveTo(cx + Math.cos(a) * r * 0.36, cy + Math.sin(a) * r * 0.36)
    x.lineTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r)
    x.stroke()
  }
  x.lineWidth = 9
  x.strokeStyle = '#d9d2b4'
  x.beginPath(); x.arc(cx, cy, r, 0, 7); x.stroke()
  x.restore()
}

// Serum-leak pompadour: a hair tuft blooming on a head (drawn over the sprite crown).
export function tuft(x, cx, cy, k, t, color) {
  if (k <= 0.01) return
  x.save()
  x.translate(cx, cy)
  const sway = Math.sin(t * 3.1) * 0.12 * k
  x.rotate(-0.18 + sway)
  x.scale(k, k)
  x.fillStyle = color
  x.beginPath()
  x.moveTo(-46, 10)
  x.bezierCurveTo(-64, -60, -6, -104, 26, -78)
  x.bezierCurveTo(66, -96, 84, -40, 52, 8)
  x.closePath(); x.fill()
  x.fillStyle = 'rgba(255,236,190,0.35)'
  x.beginPath(); x.ellipse(8, -52, 22, 30, -0.5, 0, 7); x.fill()
  x.restore()
}

// Fluttering playing card (NO-HAIR is a gambler; they scatter as he goes over).
export function playingCard(x, cx, cy, rot, s) {
  x.save()
  x.translate(cx, cy)
  x.rotate(rot)
  x.scale(s, s)
  x.fillStyle = '#e7e2d2'
  x.fillRect(-16, -23, 32, 46)
  x.fillStyle = '#1a1d2a'
  x.font = '700 20px "JetBrains Mono"'
  x.textAlign = 'center'
  x.textBaseline = 'middle'
  x.fillText('0', 0, -10)
  x.fillStyle = '#b3392f'
  x.beginPath(); x.moveTo(0, 14); x.lineTo(7, 4); x.lineTo(-7, 4); x.closePath(); x.fill()
  x.restore()
}

// Hanging field radio for the tag scene: waves pulse while M talks.
export function radio(x, cx, cy, t, talk) {
  x.save()
  x.translate(cx, cy)
  x.strokeStyle = '#39324a'
  x.lineWidth = 4
  x.beginPath(); x.moveTo(0, -160); x.lineTo(0, -34); x.stroke()
  x.fillStyle = '#232031'
  x.fillRect(-34, -34, 68, 68)
  x.strokeStyle = '#3a3450'
  x.lineWidth = 3
  x.strokeRect(-34, -34, 68, 68)
  x.fillStyle = '#e8cf7e'
  x.fillRect(-22, -20, 44, 20)
  x.fillStyle = '#12101c'
  x.fillRect(-22, 6, 12, 18); x.fillRect(-4, 6, 12, 18); x.fillRect(14, 6, 8, 18)
  if (talk > 0) {
    x.globalAlpha = talk * (0.5 + 0.5 * Math.sin(t * 18))
    x.strokeStyle = '#e8cf7e'
    x.lineWidth = 3
    for (let i = 0; i < 3; i++) {
      x.beginPath(); x.arc(0, 0, 54 + i * 22, -2.35, -0.79); x.stroke()
    }
  }
  x.restore()
}

export function slash(x, cx, cy, k) {
  if (k <= 0 || k >= 1.6) return
  x.save()
  x.translate(cx, cy)
  x.rotate(-0.62)
  const fade = Math.max(0, 1 - k)
  x.lineCap = 'round'
  x.strokeStyle = '#ffe9ad'
  x.globalAlpha = fade
  x.lineWidth = 46 * (1 - k * 0.5)
  x.beginPath(); x.arc(0, 0, 210 + 150 * k, -0.8, 0.8); x.stroke()
  x.strokeStyle = '#fffdf2'
  x.lineWidth = 13 * (1 - k)
  x.beginPath(); x.arc(0, 0, 210 + 150 * k, -0.66, 0.66); x.stroke()
  // trailing speed streaks behind the cut
  x.strokeStyle = 'rgba(255,240,190,0.75)'
  x.lineWidth = 9
  for (let i = 0; i < 3; i++) {
    const off = 54 + i * 30
    x.globalAlpha = fade * (0.8 - i * 0.22)
    x.beginPath(); x.moveTo(-360 - k * 300, off); x.lineTo(-100 - k * 230, off - 46); x.stroke()
  }
  x.restore()
}

export function razor(x, cx, cy, rot, s, color) {
  x.save()
  x.translate(cx, cy)
  x.rotate(rot)
  x.scale(s, s)
  x.fillStyle = color
  // handle
  x.beginPath()
  x.moveTo(-64, 16); x.lineTo(-14, 6); x.lineTo(-14, -6); x.lineTo(-64, -16)
  x.closePath(); x.fill()
  // blade
  x.beginPath()
  x.moveTo(-14, -30); x.lineTo(70, -44); x.lineTo(86, 0); x.lineTo(70, 44); x.lineTo(-14, 30)
  x.closePath(); x.fill()
  x.fillStyle = 'rgba(255,255,255,0.16)'
  x.fillRect(-14, -30, 100, 7)
  x.restore()
}

// Giant flowing hair ribbon for the title sequence: a thick sine strand whose exact
// path is shared with actors (ribbonY) so silhouettes can run along it.
export function ribbonY(px, t, y0, phase) {
  return y0 - 150 * Math.sin(px / 620 + t * 1.3 + phase) - 60 * Math.sin(px / 240 - t * 0.9 + phase * 2)
}
export function ribbon(x, t, y0, phase, color, alpha, x0 = -120, x1 = 2040) {
  x.save()
  x.strokeStyle = color
  x.lineCap = 'round'
  for (let l = 0; l < 3; l++) {
    x.lineWidth = 88 - l * 30
    x.globalAlpha = alpha * (l === 0 ? 1 : 0.5)
    x.beginPath()
    for (let px = x0; px <= x1; px += 48) {
      const py = ribbonY(px, t, y0, phase)
      if (px === x0) x.moveTo(px, py)
      else x.lineTo(px, py)
    }
    x.stroke()
  }
  x.restore()
}

export function umbrella(x, cx, cy, rot, k) {
  x.save()
  x.translate(cx, cy)
  x.rotate(rot)
  x.scale(k, k)
  x.strokeStyle = '#26222e'
  x.lineWidth = 5
  x.beginPath(); x.moveTo(0, 0); x.lineTo(0, 64); x.stroke() // hero hangs below
  x.fillStyle = '#241d33'
  x.beginPath(); x.moveTo(-108, 0); x.arc(0, 0, 108, Math.PI, 0); x.closePath(); x.fill()
  x.strokeStyle = '#3d3355'
  x.lineWidth = 4
  for (let i = 0; i <= 6; i++) {
    const a = Math.PI + i / 6 * Math.PI
    x.beginPath(); x.moveTo(0, 0); x.lineTo(Math.cos(a) * 106, Math.sin(a) * 106); x.stroke()
  }
  x.fillStyle = '#ffe9ad'
  x.fillRect(-112, -10, 224, 12)
  x.restore()
}

export function hatDisc(x, cx, cy, rot, s) {
  x.save()
  x.translate(cx, cy)
  x.rotate(rot)
  x.scale(s, s)
  x.fillStyle = '#100c16'
  x.beginPath(); x.ellipse(0, 0, 66, 20, 0, 0, 7); x.fill()
  x.fillStyle = '#191324'
  x.beginPath(); x.ellipse(0, -10, 40, 34, 0, Math.PI, 0); x.fill()
  x.strokeStyle = '#e8cf7e'
  x.lineWidth = 5
  x.beginPath(); x.ellipse(0, 0, 66, 20, 0, 0, 7); x.stroke()
  x.restore()
}

export function vial(x, cx, cy, s, t, glow) {
  x.save()
  x.translate(cx, cy)
  x.scale(s, s)
  x.globalAlpha = 0.1 + 0.05 * Math.sin(t * 6)
  x.fillStyle = '#ffe9ad'
  x.beginPath(); x.arc(0, 0, 56, 0, 7); x.fill()
  x.globalAlpha = 1
  x.fillStyle = 'rgba(20,26,20,0.9)'
  x.fillRect(-11, -34, 22, 12)
  const g = x.createLinearGradient(0, -22, 0, 30)
  g.addColorStop(0, '#ffe9ad')
  g.addColorStop(1, '#d9a92e')
  x.fillStyle = g
  x.beginPath()
  x.moveTo(-11, -22); x.lineTo(11, -22); x.lineTo(15, 18); x.arc(0, 18, 15, 0, Math.PI)
  x.closePath(); x.fill()
  x.fillStyle = 'rgba(255,255,255,0.55)'
  x.fillRect(-6, -18, 3, 30)
  if (glow > 0) {
    x.globalAlpha = glow
    x.strokeStyle = '#ffe9ad'
    x.lineWidth = 3
    x.beginPath(); x.arc(0, 0, 40 + 14 * Math.sin(t * 5), 0, 7); x.stroke()
  }
  x.restore()
}

export function searchlight(x, ox, oy, ang, len, alpha) {
  x.save()
  x.translate(ox, oy)
  x.rotate(ang)
  const g = x.createLinearGradient(0, 0, len, 0)
  g.addColorStop(0, `rgba(235,240,255,${alpha})`)
  g.addColorStop(1, 'rgba(235,240,255,0)')
  x.fillStyle = g
  x.beginPath()
  x.moveTo(0, 0)
  x.lineTo(len, -len * 0.16)
  x.lineTo(len, len * 0.16)
  x.closePath(); x.fill()
  x.restore()
}

export function cat(x, cx, cy, t) {
  x.save()
  x.translate(cx, cy)
  const sway = Math.sin(t * 2.2) * 0.24
  x.fillStyle = '#e9e4da'
  x.beginPath(); x.ellipse(0, -20, 30, 22, 0, 0, 7); x.fill() // body
  x.beginPath(); x.arc(24, -40, 15, 0, 7); x.fill() // head
  x.beginPath() // ears
  x.moveTo(16, -52); x.lineTo(20, -62); x.lineTo(26, -52); x.closePath(); x.fill()
  x.beginPath(); x.moveTo(28, -52); x.lineTo(33, -61); x.lineTo(37, -50); x.closePath(); x.fill()
  x.strokeStyle = '#e9e4da'
  x.lineWidth = 6
  x.lineCap = 'round'
  x.beginPath()
  x.moveTo(-26, -24)
  x.quadraticCurveTo(-52, -30 + sway * 26, -44, -58 + sway * 18)
  x.stroke() // tail
  x.fillStyle = '#0a0a12'
  x.fillRect(19, -43, 3, 3); x.fillRect(27, -43, 3, 3) // eyes
  x.restore()
}

export function starGlint(x, cx, cy, s, k) {
  if (k <= 0 || k >= 1) return
  x.save()
  x.translate(cx, cy)
  x.globalAlpha = Math.sin(k * Math.PI)
  x.fillStyle = '#fff6d8'
  const r = s * (0.4 + 0.6 * Math.sin(k * Math.PI))
  x.beginPath()
  x.moveTo(0, -r); x.quadraticCurveTo(2, -2, r, 0); x.quadraticCurveTo(2, 2, 0, r)
  x.quadraticCurveTo(-2, 2, -r, 0); x.quadraticCurveTo(-2, -2, 0, -r)
  x.closePath(); x.fill()
  x.restore()
}

// Molten vat: gradient pool + slow bubbles (pure in t).
export function vat(x, cx, cy, t, redAlert) {
  const g = x.createRadialGradient(cx, cy - 40, 60, cx, cy, 660)
  g.addColorStop(0, redAlert > 0.5 ? '#f2b48a' : '#f6d98a')
  g.addColorStop(0.4, '#c8872e')
  g.addColorStop(1, '#120b16')
  x.fillStyle = g
  x.beginPath(); x.ellipse(cx, cy, 620, 190, 0, 0, 7); x.fill()
  x.fillStyle = 'rgba(255,240,200,0.25)'
  x.beginPath(); x.ellipse(cx - 120 * Math.sin(t * 0.7), cy - 60, 210, 34, 0, 0, 7); x.fill()
  x.fillStyle = 'rgba(255,236,180,0.5)'
  for (let i = 0; i < 14; i++) {
    const ph = hash(i * 17 + 5), sp = 0.24 + hash(i * 31) * 0.5
    const u = ((t * sp + ph) % 1)
    const bx = cx + (hash(i * 7) - 0.5) * 900 * u, by = cy - 8 - u * 26
    x.beginPath(); x.arc(bx, by, 3 + hash(i * 3) * 5 * (1 - u), 0, 7); x.fill()
  }
}

// Analytic particle burst: events [{t, x, y, seed}] drawn by age (no simulation state).
export function burst(x, evts, t, life, color, n, up) {
  for (const e of evts) {
    const age = t - e.t
    if (age < 0 || age > life) continue
    for (let i = 0; i < n; i++) {
      const a = hash(e.seed + i * 13) * 6.283
      const sp = (0.3 + hash(e.seed + i * 29) * 0.7) * (up ? 620 : 320)
      const d = sp * age
      const px = e.x + Math.cos(a) * d * (up ? 0.5 : 1)
      const py = e.y + Math.sin(a) * d - (up ? 260 * age * age : 0)
      if (py > 1060) continue
      x.globalAlpha = Math.max(0, 1 - age / life)
      x.fillStyle = i % 3 ? color : '#fff6d8'
      const s = 4 + hash(e.seed + i) * 5
      x.fillRect(px - s / 2, py - s / 2, s, s)
    }
    x.globalAlpha = 1
  }
}

// GOLDFLOW shimmering title: text on a scratch canvas, specular band swept via source-atop.
export function titleDraw(ov, text, cx, cy, k, bandX) {
  ov.save()
  ov.translate(cx, cy)
  ov.scale(k, k)
  ov.font = '700 176px "Cormorant Garamond"'
  ov.textAlign = 'center'
  ov.textBaseline = 'middle'
  ov.fillStyle = '#0c0a06'
  ov.fillText(text, 6, 8)
  const g = ov.createLinearGradient(0, -90, 0, 90)
  g.addColorStop(0, '#f4e3ae')
  g.addColorStop(0.5, '#e9d9a6')
  g.addColorStop(1, '#c19a49')
  ov.fillStyle = g
  ov.fillText(text, 0, 0)
  const b = ov.createLinearGradient(bandX - 160, 0, bandX + 160, 0)
  b.addColorStop(0, 'rgba(255,252,240,0)')
  b.addColorStop(0.5, 'rgba(255,252,240,0.85)')
  b.addColorStop(1, 'rgba(255,252,240,0)')
  ov.globalCompositeOperation = 'source-atop'
  ov.fillStyle = b
  ov.fillRect(bandX - 180, -130, 360, 260)
  ov.restore()
}

// COMBUSH gadget: gold-toothed comb pistol. barCol tints the charge LED (gold in the barrel scene).
export function combush(x, cx, cy, s, charges, barCol = '#7de08a') {
  x.save()
  x.translate(cx, cy)
  x.scale(s, s)
  x.fillStyle = '#2a2436'
  x.beginPath()
  x.moveTo(-70, 18); x.lineTo(58, 18); x.lineTo(70, 2); x.lineTo(46, -14); x.lineTo(-70, -14)
  x.closePath(); x.fill()
  x.fillStyle = '#e8cf7e'
  for (let i = 0; i < 9; i++) x.fillRect(-62 + i * 13, -34, 6, 22)
  x.fillStyle = '#191420'
  x.fillRect(-70, 18, 20, 26)
  x.fillStyle = barCol
  x.fillRect(-40, 26, charges / 80 * 96, 7)
  x.restore()
}
