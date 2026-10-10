/**
 * Status bar (health, weapon + ammo, the player's Remy face, score, wave) and in-view overlays: crosshair, damage and
 * pickup flashes, announcements, score popups, combo meter, boss bar and the touch stick. Drawn with canvas 2D on top
 * of the raycast frame at internal resolution, in Press Start 2P.
 */
import { type Game, WEAPONS } from './game'
import { type Stick, STICK_R } from './input'

export const BAR = 32
const FONT = '"Press Start 2P", monospace'

export interface Faces {
  normal: HTMLCanvasElement
  hurt: HTMLCanvasElement
  grin: HTMLCanvasElement
  dead: HTMLCanvasElement
}

type Ctx = CanvasRenderingContext2D

export function text(x: Ctx, s: string, px: number, py: number, size: number, color: string, align: CanvasTextAlign = 'left') {
  x.font = `${size}px ${FONT}`
  x.textAlign = align
  x.textBaseline = 'top'
  x.fillStyle = '#0a0410'
  const o = size >= 16 ? 2 : 1
  for (const [dx, dy] of [
    [-o, 0],
    [o, 0],
    [0, -o],
    [0, o],
    [o, o],
  ])
    x.fillText(s, px + dx, py + dy)
  x.fillStyle = color
  x.fillText(s, px, py)
}

/** The left status panel (health + weapon); tapping it cycles weapons on touch screens. */
export const isAmmoPanel = (W: number, H: number, x: number, y: number) => y >= H - BAR && x < W / 2 - 16

/** Face portraits from the player's Remy art: normal, hurt (bloodied red), grin (gold glow), dead (ashen). */
export function makeFaces(img: CanvasImageSource | null): Faces {
  const size = 26
  const make = (fx: (x: Ctx) => void) => {
    const c = document.createElement('canvas')
    c.width = size
    c.height = size
    const x = c.getContext('2d') as Ctx
    x.imageSmoothingEnabled = true
    x.imageSmoothingQuality = 'high'
    if (img) x.drawImage(img, 0, 0, 128, 128, 0, 0, size, size)
    else {
      x.fillStyle = '#e8a060'
      x.fillRect(0, 0, size, size)
    }
    fx(x)
    return c
  }
  return {
    normal: make(() => {}),
    hurt: make((x) => {
      x.globalCompositeOperation = 'multiply'
      x.fillStyle = '#ff5050'
      x.fillRect(0, 0, size, size)
      x.globalCompositeOperation = 'source-over'
      x.fillStyle = '#a00010'
      for (const [dx, h] of [
        [4, 7],
        [9, 4],
        [18, 9],
        [22, 5],
      ])
        x.fillRect(dx, 0, 2, h)
    }),
    grin: make((x) => {
      x.globalCompositeOperation = 'screen'
      x.fillStyle = 'rgba(255,190,60,0.35)'
      x.fillRect(0, 0, size, size)
    }),
    dead: make((x) => {
      const d = x.getImageData(0, 0, size, size)
      for (let i = 0; i < d.data.length; i += 4) {
        const l = d.data[i] * 0.3 + d.data[i + 1] * 0.59 + d.data[i + 2] * 0.11
        d.data[i] = l * 0.6
        d.data[i + 1] = l * 0.75
        d.data[i + 2] = l * 0.6
      }
      x.putImageData(d, 0, 0)
      x.fillStyle = '#ff2030'
      for (const cx of [8, 16]) {
        x.fillRect(cx - 2, 9, 1, 1)
        x.fillRect(cx - 1, 10, 1, 1)
        x.fillRect(cx, 11, 1, 1)
        x.fillRect(cx, 9, 1, 1)
        x.fillRect(cx - 2, 11, 1, 1)
      }
    }),
  }
}

export function drawHud(x: Ctx, g: Game, W: number, H: number, faces: Faces, stick: Stick | null, touch: boolean, best: number) {
  const VH = H - BAR
  // ---- in-view effects
  if (g.hurtT > 0) {
    x.fillStyle = `rgba(200,0,10,${g.hurtT * 0.7})`
    x.fillRect(0, 0, W, VH)
    if (Math.abs(g.hurtFrom) > 0.35) {
      x.fillStyle = `rgba(255,20,20,${g.hurtT * 1.6})`
      x.fillRect(g.hurtFrom > 0 ? W - 6 : 0, 0, 6, VH)
    }
  }
  if (g.pickupT > 0) {
    x.fillStyle = `rgba(255,220,110,${g.pickupT * 0.9})`
    x.fillRect(0, 0, W, VH)
  }
  if (!g.dead && g.hp < 30) {
    const k = (0.5 + Math.sin(g.time * 6) * 0.5) * (1 - g.hp / 30) * 0.5
    const grad = x.createRadialGradient(W / 2, VH / 2, VH * 0.25, W / 2, VH / 2, VH * 0.8)
    grad.addColorStop(0, 'rgba(120,0,0,0)')
    grad.addColorStop(1, `rgba(150,0,0,${k})`)
    x.fillStyle = grad
    x.fillRect(0, 0, W, VH)
  }
  if (g.dead) {
    x.fillStyle = `rgba(110,0,0,${Math.min(0.65, g.dead * 0.5)})`
    x.fillRect(0, 0, W, VH)
  }
  if (!g.dead) {
    x.fillStyle = '#ffb21e'
    const cx = Math.floor(W / 2)
    const cy = Math.floor(VH / 2)
    x.fillRect(cx - 4, cy, 3, 1)
    x.fillRect(cx + 2, cy, 3, 1)
    x.fillRect(cx, cy - 4, 1, 3)
    x.fillRect(cx, cy + 2, 1, 3)
  }

  // ---- top line: wave + left, combo, boss bar
  const left = g.alive
  text(x, g.phase === 'fight' ? `WAVE ${g.wave} · ${left} LEFT` : g.wave ? `WAVE ${g.wave + 1} SOON` : 'GET READY', 4, 4, 8, '#d8c8ff')
  if (g.combo > 1) {
    const k = Math.max(0, g.comboT / 2.5)
    text(x, `x${Math.min(g.combo, 10)} COMBO`, W - 4, 4, 8, g.combo >= 7 ? '#ff5a3a' : '#ffd040', 'right')
    x.fillStyle = '#0a0410'
    x.fillRect(W - 76, 14, 72, 3)
    x.fillStyle = '#ff9a1a'
    x.fillRect(W - 76, 14, Math.round(72 * k), 3)
  }
  const boss = g.enemies.find((e) => e.kind === 'boss' && !e.dead && !e.rise)
  if (boss) {
    const bw = Math.min(W - 40, 160)
    const bx = Math.round((W - bw) / 2)
    text(x, 'THE CABALD', W / 2, 20, 8, '#d080ff', 'center')
    x.fillStyle = '#0a0410'
    x.fillRect(bx - 1, 30, bw + 2, 6)
    x.fillStyle = '#3a1050'
    x.fillRect(bx, 31, bw, 4)
    x.fillStyle = '#b040ff'
    x.fillRect(bx, 31, Math.round((bw * boss.hp) / boss.max), 4)
  }
  // ---- announcements and popups
  if (g.messageT > 0 && !g.dead) {
    const pop = Math.min(1, (2.4 - g.messageT) * 8)
    const size = g.message.length * 16 > W - 8 ? 8 : 16
    const y = Math.round(VH * 0.26 - (1 - pop) * 6)
    text(x, g.message, W / 2, y, size, '#ff8a1a', 'center')
    if (g.sub) {
      const sub = g.sub.length * 8 > W - 8 ? g.sub.slice(0, Math.floor((W - 8) / 8)) : g.sub
      text(x, sub, W / 2, y + size + 6, 8, '#f0e0ff', 'center')
    }
  }
  g.popups.forEach((p, i) => {
    const y = Math.round(VH * 0.62 - i * 11 - (1.2 - p.t) * 10)
    text(x, p.text, W / 2 + 18, y, 8, p.color)
  })

  // ---- touch stick
  if (touch && stick) {
    x.strokeStyle = 'rgba(255,200,120,0.5)'
    x.lineWidth = 1
    x.beginPath()
    x.arc(stick.ox, stick.oy, STICK_R, 0, Math.PI * 2)
    x.stroke()
    const dx = stick.x - stick.ox
    const dy = stick.y - stick.oy
    const d = Math.hypot(dx, dy)
    const k = d > STICK_R ? STICK_R / d : 1
    x.fillStyle = 'rgba(255,160,40,0.6)'
    x.beginPath()
    x.arc(stick.ox + dx * k, stick.oy + dy * k, 9, 0, Math.PI * 2)
    x.fill()
  }

  // ---- status bar
  const grad = x.createLinearGradient(0, VH, 0, H)
  grad.addColorStop(0, '#2a1838')
  grad.addColorStop(1, '#120a1a')
  x.fillStyle = grad
  x.fillRect(0, VH, W, BAR)
  x.fillStyle = '#ff8a1a'
  x.fillRect(0, VH, W, 1)
  x.fillStyle = '#5a2a10'
  x.fillRect(0, VH + 1, W, 1)
  for (let i = 8; i < W; i += 24) {
    x.fillStyle = '#1a0f22'
    x.fillRect(i, VH + 4, 1, BAR - 8)
  }
  // Health
  const hp = Math.ceil(g.hp)
  const hpColor = hp > 60 ? '#ff4a5a' : hp > 30 ? '#ffaa2a' : '#ff2020'
  drawHeart(x, 4, VH + 6, hpColor)
  text(x, `${hp}`, 16, VH + 5, 16, hpColor)
  // Weapon + ammo
  const w = WEAPONS[g.weapon]
  const ammo = w.ammo ? g.ammo[w.ammo] : '--'
  const label = `${g.weapon + 1}:${w.name.split(' ')[w.name.split(' ').length - 1]} ${ammo}`
  text(x, label, 4, VH + 23, 8, '#ffd27a')
  // Face
  const fx = Math.round(W / 2 - 15)
  x.fillStyle = '#ff8a1a'
  x.fillRect(fx - 1, VH + 2, 32, 29)
  x.fillStyle = '#0a0410'
  x.fillRect(fx, VH + 3, 30, 27)
  const face = g.dead ? faces.dead : g.hurtT > 0 || g.hp < 25 ? faces.hurt : g.grinT > 0 ? faces.grin : faces.normal
  const look = g.hurtT > 0 ? Math.round(g.hurtFrom * 2) : 0
  x.drawImage(face, fx + 2 + look, VH + 4)
  if (!g.dead && g.hp < 60) {
    x.fillStyle = '#9a0010'
    x.fillRect(fx + 6, VH + 4, 1, 4 + Math.floor((60 - g.hp) / 10))
    if (g.hp < 40) x.fillRect(fx + 21, VH + 4, 1, 3 + Math.floor((40 - g.hp) / 8))
  }
  // Score + best
  const score = g.score.toLocaleString('en-US')
  const size = score.length * 16 > W / 2 - 22 ? 8 : 16
  text(x, score, W - 4, VH + (size === 16 ? 5 : 9), size, '#ffe680', 'right')
  text(x, `BEST ${Math.max(best, g.score).toLocaleString('en-US')}`, W - 4, VH + 23, 8, '#9a8ab0', 'right')
}

function drawHeart(x: Ctx, px: number, py: number, color: string) {
  x.fillStyle = color
  for (const [dx, dy, w] of [
    [1, 0, 2],
    [5, 0, 2],
    [0, 1, 8],
    [0, 2, 8],
    [0, 3, 8],
    [1, 4, 6],
    [2, 5, 4],
    [3, 6, 2],
  ])
    x.fillRect(px + dx, py + dy + 3, w, 1)
}
