// HAIRAKIRI art: ukiyo-e / sumi-e painted stage (pirates-cabald / wizard-of-floz
// lineage). prepare()-time bakes (integer dims, seeded rng/hash only) + pure
// per-frame painters (rain fields, petals, water flow, wheat sway, brush wipes,
// enso iris) + procedural props (chonmage topknots, oni mask, split-halves
// warlord wig, razor-no-dachi, pot lid, Cabald banner, collection sack, wooden
// practice swords, laundry-pole naginata, sumi horses). Every painter is a pure
// function of t: hash/rng only — no Math.random, no Date, no state between frames.
import { hash, rng } from 'filmkit/lib.js'
import { canvas } from '../remy-bros/art.js'

export const W = 1920
export const H = 1080
export const OS = 260 // overscan painted around the stage so camera moves never expose edges

// ---------- ukiyo-e palette: indigo night, washi parchment, sumi ink, vermillion + gold ----------
export const PAL = {
  ink: '#171310', sumi: '#241f19', sumiSoft: '#3a332a', sumiWash: 'rgba(28,24,20,0.55)',
  night0: '#10162a', night1: '#182138', night2: '#243252', night3: '#33426a', night4: '#485981',
  paper: '#e6dabf', paperDim: '#c4b899',
  vermillion: '#b4402e', vermillionHi: '#d45a3a', lacquer: '#571f16',
  gold: '#c9a44e', goldHi: '#ecd088', goldDim: '#8a7238',
  straw: '#c9a45c', strawLo: '#96762f',
  cloth: '#42536f', indigoCloth: '#2a3660',
  water0: '#161f33', water1: '#1f2f4c', waterHi: '#46608f',
  wheat: '#c9a44e', wheatLo: '#9a7c30', wheatHi: '#e8c878',
  blossom: '#e3b4c4', blossomHi: '#f2d4de',
  flesh: '#685240', dawn0: '#3c3a55', dawn1: '#8a5a4a', dawn2: '#c98a54', dawn3: '#e8c890',
}

// ---------- tiny helpers ----------
export const cl = (v) => (v < 0 ? 0 : v > 1 ? 1 : v)
const mod = (x, m) => ((x % m) + m) % m
const h2 = (x, y, s = 0) => hash(Math.floor(x) * 7349 + Math.floor(y) * 92821 + s * 1013)
const hexRgb = (h) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)]
const dist2 = (a, b) => (a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2 + (a[2] - b[2]) ** 2
const css = (c, a = 1) => `rgba(${c[0]},${c[1]},${c[2]},${a})`
const mixc = (a, b, t) => [Math.round(a[0] + (b[0] - a[0]) * t), Math.round(a[1] + (b[1] - a[1]) * t), Math.round(a[2] + (b[2] - a[2]) * t)]

// a bake: offscreen canvas with the ctx translated so painters use stage coords.
// Returns { c, x, ox } — blit with drawImage(c, -ox, -oy)
function bake(w, h, ox = OS, oy = OS) {
  const c = canvas(Math.round(w), Math.round(h))
  const x = c.getContext('2d')
  x.translate(ox, oy)
  return { c, x, ox, oy, w: Math.round(w), h: Math.round(h) }
}

// gradient wash
export function skyWash(x, x0, y0, x1, y1, stops) {
  const g = x.createLinearGradient(x0, y0, x1, y1)
  for (const [p, c] of stops) g.addColorStop(p, c)
  x.fillStyle = g
  x.fillRect(x0 - 4, y0 - 4, x1 - x0 + 8, y1 - y0 + 8)
}

// ============================== rig surgery (prepare-time) ==============================

// solid-colour silhouette keeping the pose rig (sunset line, ink-blot riders)
export function silhouette(R, color = PAL.ink) {
  const c = canvas(R.w, R.h)
  const x = c.getContext('2d')
  x.drawImage(R.c, 0, 0)
  x.globalCompositeOperation = 'source-in'
  x.fillStyle = color
  x.fillRect(0, 0, R.w, R.h)
  return { ...R, c, sil: R.sil }
}

// procedural bald-cap: recolour hair-hex pixels to skin (palette-quantised sprites key reliably)
export function baldify(R, hairHex, skinHex) {
  const c = canvas(R.w, R.h)
  const x = c.getContext('2d')
  x.drawImage(R.c, 0, 0)
  const d = x.getImageData(0, 0, R.w, R.h)
  const p = d.data
  const hair = hexRgb(hairHex)
  const skin = hexRgb(skinHex)
  const skinLo = mixc(skin, [10, 10, 12], 0.35)
  const skinHi = mixc(skin, [255, 250, 240], 0.25)
  for (let i = 0; i < p.length; i += 4) {
    if (p[i + 3] === 0) continue
    const px = [p[i], p[i + 1], p[i + 2]]
    if (dist2(px, hair) < 3600) {
      const lum = (px[0] + px[1] + px[2]) / 3
      const hl = (hair[0] + hair[1] + hair[2]) / 3
      const c2 = lum > hl * 1.18 ? skinHi : lum < hl * 0.8 ? skinLo : skin
      p[i] = c2[0]
      p[i + 1] = c2[1]
      p[i + 2] = c2[2]
    }
  }
  x.putImageData(d, 0, 0)
  return { ...R, c }
}

// ============================== bakes ==============================

// S1 — FLOWAGAWA province: indigo ink-wash valley, layered ridges, terraced wheat,
// river, village + watchtower + torii. 1920+2OS stage.
export function provinceBake() {
  const B = bake(W + OS * 2, H + OS * 2)
  const x = B.x
  const r = rng(1603)
  skyWash(x, -OS, -OS, W + OS, H * 0.62, [
    [0, PAL.night0], [0.45, PAL.night1], [0.78, PAL.night2], [1, PAL.night3],
  ])
  // pale moon behind wash
  x.fillStyle = 'rgba(222,214,188,0.20)'
  x.beginPath()
  x.arc(360, 190, 74, 0, 7)
  x.fill()
  x.fillStyle = 'rgba(222,214,188,0.30)'
  x.beginPath()
  x.arc(360, 190, 52, 0, 7)
  x.fill()
  // far ridge (sumi, soft) — riders crest here at g7.2
  x.fillStyle = '#202b47'
  x.beginPath()
  x.moveTo(-OS, 430)
  for (let i = 0; i <= 14; i++) {
    const rx = -OS + (i / 14) * (W + OS * 2)
    x.quadraticCurveTo(rx - 70, 300 + h2(i, 1, 4) * 130, rx, 380 + h2(i, 2, 4) * 90)
  }
  x.lineTo(W + OS, 560)
  x.lineTo(-OS, 560)
  x.closePath()
  x.fill()
  // mid hills
  x.fillStyle = '#283453'
  x.beginPath()
  x.moveTo(-OS, 520)
  for (let i = 0; i <= 10; i++) {
    const rx = -OS + (i / 10) * (W + OS * 2)
    x.quadraticCurveTo(rx - 90, 430 + h2(i, 3, 5) * 70, rx, 470 + h2(i, 4, 5) * 60)
  }
  x.lineTo(W + OS, 660)
  x.lineTo(-OS, 660)
  x.closePath()
  x.fill()
  // terraced wheat on the near slope (night-muted gold)
  for (let t = 0; t < 7; t++) {
    const ty = 560 + t * 34
    x.fillStyle = t % 2 ? '#5c5230' : '#6a5c36'
    x.beginPath()
    x.moveTo(-OS, ty + 34)
    x.lineTo(W + OS, ty + 10 + t * 4)
    x.lineTo(W + OS, ty + 30 + t * 4)
    x.lineTo(-OS, ty + 54)
    x.closePath()
    x.fill()
  }
  // near hills + river silver
  x.fillStyle = '#31405f'
  x.beginPath()
  x.moveTo(-OS, 640)
  x.quadraticCurveTo(300, 590, 640, 650)
  x.quadraticCurveTo(1100, 720, W + OS, 660)
  x.lineTo(W + OS, 860)
  x.lineTo(-OS, 860)
  x.closePath()
  x.fill()
  x.strokeStyle = 'rgba(160,180,214,0.5)'
  x.lineWidth = 10
  x.beginPath()
  x.moveTo(-OS, 700)
  x.bezierCurveTo(400, 740, 800, 660, 1240, 740)
  x.bezierCurveTo(1500, 788, 1750, 750, W + OS, 800)
  x.stroke()
  // valley floor
  x.fillStyle = '#27334e'
  x.fillRect(-OS, 760, W + OS * 2, H + OS - 760)
  // village cluster (dark wood + indigo roofs, a few dim warm windows)
  for (let i = 0; i < 9; i++) {
    const hx = 900 + (i % 5) * 118 + r() * 30
    const hy = 640 + Math.floor(i / 5) * 74 + r() * 14
    const hw = 84 + r() * 30
    x.fillStyle = '#221a14'
    x.fillRect(hx, hy, hw, 58)
    x.fillStyle = '#1a2233'
    x.beginPath()
    x.moveTo(hx - 14, hy)
    x.lineTo(hx + hw / 2, hy - 30 - r() * 12)
    x.lineTo(hx + hw + 14, hy)
    x.closePath()
    x.fill()
    if (i % 3 === 0) {
      x.fillStyle = 'rgba(210,160,84,0.5)'
      x.fillRect(hx + 14, hy + 18, 10, 12)
    }
  }
  // torii at the village entrance (muted vermillion by night)
  torii(x, 1180, 742, 0.72, true)
  // watchtower (banner unrolls down its face at g4.6)
  const tx = 1450
  x.fillStyle = '#3a4258'
  x.fillRect(tx - 34, 350, 68, 392)
  x.fillStyle = '#2e3648'
  x.fillRect(tx - 42, 344, 84, 16)
  x.fillStyle = '#4a5470'
  x.fillRect(tx - 44, 328, 88, 18)
  x.fillStyle = '#20283e'
  x.beginPath()
  x.moveTo(tx - 52, 330)
  x.lineTo(tx, 288)
  x.lineTo(tx + 52, 330)
  x.closePath()
  x.fill()
  x.strokeStyle = '#20283e'
  x.lineWidth = 4
  for (let sy = 380; sy < 720; sy += 60) {
    x.beginPath()
    x.moveTo(tx - 30, sy)
    x.lineTo(tx + 30, sy)
    x.stroke()
  }
  // pines
  for (let i = 0; i < 16; i++) {
    const px = r() * (W + 200) - 100
    const py = 620 + r() * 200
    pine(x, px, py, 20 + r() * 26)
  }
  // foreground mud band + puddles
  x.fillStyle = '#1c1922'
  x.fillRect(-OS, 850, W + OS * 2, H + OS - 850)
  for (let i = 0; i < 26; i++) {
    const px = r() * (W + OS * 2) - OS
    const py = 870 + r() * 190
    x.fillStyle = `rgba(110,130,170,${0.10 + r() * 0.10})`
    x.beginPath()
    x.ellipse(px, py, 30 + r() * 60, 4 + r() * 6, 0, 0, 7)
    x.fill()
  }
  return B
}

// S1 brush-stroke cloud layer (drawn separately so the clouds can CRAWL)
export function provinceClouds() {
  const B = bake(W + OS * 2, 420, OS, OS)
  const x = B.x
  const r = rng(77)
  for (let i = 0; i < 11; i++) {
    const cy = 60 + r() * 300
    const cw = 320 + r() * 520
    const cx0 = r() * (W + OS * 2) - OS
    x.fillStyle = `rgba(16,20,36,${0.24 + r() * 0.2})`
    x.beginPath()
    x.ellipse(cx0, cy, cw / 2, 20 + r() * 22, 0.04 * (r() - 0.5), 0, 7)
    x.fill()
    x.fillStyle = `rgba(90,104,140,${0.10 + r() * 0.12})`
    x.beginPath()
    x.ellipse(cx0 - cw * 0.12, cy - 12, cw * 0.3, 10 + r() * 10, 0.04 * (r() - 0.5), 0, 7)
    x.fill()
  }
  return B
}

// village lane bake (S2 raid): wide world so the L->R scroll has somewhere to go.
// Covers stage x [-OS, W + OS + 1900]; blit at -ox.
export function laneBake() {
  const LW = W + OS * 2 + 1900
  const B = bake(LW, H + OS * 2, OS + 950, OS)
  const x = B.x
  const r = rng(918)
  skyWash(x, -3200, -OS, 3900, H * 0.55, [
    [0, PAL.night0], [0.5, PAL.night1], [1, PAL.night2],
  ])
  // far hills
  x.fillStyle = '#1f2942'
  x.beginPath()
  x.moveTo(-3200, 480)
  for (let i = 0; i <= 16; i++) {
    const rx = -3200 + (i / 16) * 7100
    x.quadraticCurveTo(rx - 100, 360 + h2(i, 5, 6) * 110, rx, 430 + h2(i, 6, 6) * 80)
  }
  x.lineTo(3900, 620)
  x.lineTo(-3200, 620)
  x.closePath()
  x.fill()
  // house row along the back of the lane (dark wood, indigo roofs)
  for (let i = 0; i < 15; i++) {
    const hx = -140 + i * 240 + r() * 40
    const hy = 560 + h2(i, 7, 8) * 60
    const hw = 130 + r() * 70
    x.fillStyle = '#211913'
    x.fillRect(hx, hy, hw, 130)
    x.fillStyle = '#182030'
    x.beginPath()
    x.moveTo(hx - 20, hy + 8)
    x.lineTo(hx + hw / 2, hy - 46 - r() * 16)
    x.lineTo(hx + hw + 20, hy + 8)
    x.closePath()
    x.fill()
    x.strokeStyle = '#111826'
    x.lineWidth = 3
    for (let k = 1; k < 4; k++) {
      x.beginPath()
      x.moveTo(hx - 20 + (hw + 40) * (k / 4) * 0.5, hy - 40 * (1 - k / 4))
      x.lineTo(hx + hw + 20 - (hw + 40) * (k / 4) * 0.5, hy - 40 * (1 - k / 4))
      x.stroke()
    }
    if (i % 2 === 0) {
      x.fillStyle = 'rgba(206,150,76,0.42)'
      x.fillRect(hx + 20, hy + 40, 14, 18)
    }
  }
  // hearth pit (grandmother's fire, x 2050)
  x.fillStyle = '#3a3630'
  x.beginPath()
  x.ellipse(2050, 880, 60, 16, 0, 0, 7)
  x.fill()
  x.strokeStyle = '#4a443a'
  x.lineWidth = 8
  for (const a of [-0.5, 0.2, 0.9]) {
    x.beginPath()
    x.moveTo(2050 - 30, 880)
    x.lineTo(2050 + 30 * Math.cos(a), 880 - 8 * Math.sin(a))
    x.stroke()
  }
  // lantern posts
  for (const lx of [620, 1900, 2620]) {
    x.strokeStyle = '#241d16'
    x.lineWidth = 9
    x.beginPath()
    x.moveTo(lx, 940)
    x.lineTo(lx, 560)
    x.stroke()
    x.beginPath()
    x.moveTo(lx - 26, 566)
    x.lineTo(lx + 26, 566)
    x.stroke()
  }
  // village gate frame (banner pinned at x 2830)
  x.fillStyle = '#2c2118'
  x.fillRect(2760, 560, 26, 400)
  x.fillRect(2920, 560, 26, 400)
  x.fillStyle = '#33271c'
  x.fillRect(2736, 528, 234, 34)
  x.fillStyle = '#3c2e20'
  x.fillRect(2726, 500, 254, 26)
  // lane road: packed mud, wheel ruts, puddles
  skyWash(x, -3200, 840, 3900, H + OS, [
    [0, '#241f22'], [0.4, '#2a2426'], [1, '#1a171c'],
  ])
  x.strokeStyle = 'rgba(12,10,14,0.6)'
  x.lineWidth = 8
  for (const ry of [900, 960]) {
    x.beginPath()
    x.moveTo(-3200, ry)
    x.bezierCurveTo(0, ry - 20, 1500, ry + 16, 3900, ry - 8)
    x.stroke()
  }
  for (let i = 0; i < 60; i++) {
    const px = r() * 7100 - 3200
    const py = 870 + r() * 190
    x.fillStyle = `rgba(120,140,180,${0.08 + r() * 0.10})`
    x.beginPath()
    x.ellipse(px, py, 26 + r() * 54, 3 + r() * 5, 0, 0, 7)
    x.fill()
  }
  return B
}

// S3 mochi-stand bake: locked-wide stage with the stand, lantern, torii, barrel.
export function standBake() {
  const B = bake(W + OS * 2, H + OS * 2)
  const x = B.x
  const r = rng(42)
  skyWash(x, -OS, -OS, W + OS, H * 0.6, [
    [0, PAL.night0], [0.55, PAL.night1], [1, PAL.night2],
  ])
  // rain-grey hills
  x.fillStyle = '#202b45'
  x.beginPath()
  x.moveTo(-OS, 500)
  for (let i = 0; i <= 8; i++) {
    const rx = -OS + (i / 8) * (W + OS * 2)
    x.quadraticCurveTo(rx - 90, 410 + h2(i, 9, 2) * 70, rx, 460 + h2(i, 8, 2) * 50)
  }
  x.lineTo(W + OS, 640)
  x.lineTo(-OS, 640)
  x.closePath()
  x.fill()
  // distant houses
  for (let i = 0; i < 6; i++) {
    const hx = 120 + i * 320 + r() * 60
    x.fillStyle = '#1d1712'
    x.fillRect(hx, 560, 120, 90)
    x.fillStyle = '#161e2d'
    x.beginPath()
    x.moveTo(hx - 16, 566)
    x.lineTo(hx + 60, 522)
    x.lineTo(hx + 136, 566)
    x.closePath()
    x.fill()
  }
  // lane ground
  skyWash(x, -OS, 780, W + OS, H + OS, [
    [0, '#262024'], [1, '#191519'],
  ])
  for (let i = 0; i < 30; i++) {
    const px = r() * (W + OS * 2) - OS
    const py = 830 + r() * 220
    x.fillStyle = `rgba(120,140,180,${0.08 + r() * 0.10})`
    x.beginPath()
    x.ellipse(px, py, 24 + r() * 50, 3 + r() * 5, 0, 0, 7)
    x.fill()
  }
  // torii (right; the giant ducks it)
  torii(x, 1560, 934, 1.05, true)
  // mochi stand at x 640: wood stall + hanging noren + counter
  const sx = 560
  x.strokeStyle = '#2a2018'
  x.lineWidth = 14
  x.beginPath()
  x.moveTo(sx, 960)
  x.lineTo(sx, 500)
  x.moveTo(sx + 260, 960)
  x.lineTo(sx + 260, 500)
  x.stroke()
  x.fillStyle = '#33261a'
  x.fillRect(sx - 30, 520, 320, 26)
  x.fillStyle = '#3e2e1e'
  x.beginPath()
  x.moveTo(sx - 46, 524)
  x.lineTo(sx + 130, 462)
  x.lineTo(sx + 306, 524)
  x.closePath()
  x.fill()
  // noren curtain (indigo, split)
  x.fillStyle = '#243049'
  x.fillRect(sx + 16, 546, 100, 88)
  x.fillRect(sx + 132, 546, 100, 88)
  x.fillStyle = '#e6dabf'
  x.font = '22px serif'
  x.save()
  x.globalAlpha = 0.5
  x.fillText('餅', sx + 52, 606)
  x.restore()
  // counter
  x.fillStyle = '#4a3826'
  x.fillRect(sx - 20, 810, 300, 26)
  x.fillStyle = '#33261a'
  x.fillRect(sx - 6, 836, 272, 90)
  // stool behind counter for 42
  x.fillStyle = '#2c2118'
  x.fillRect(sx + 96, 900, 64, 14)
  return B
}

// S4 training courtyard bake: first warm light, drizzle-wet stones, cherry tree.
export function courtyardBake() {
  const B = bake(W + OS * 2 + 800, H + OS * 2, OS + 400, OS)
  const x = B.x
  const r = rng(459)
  skyWash(x, -2900, -OS, 3900, 700, [
    [0, '#b9a88c'], [0.55, '#c9b898'], [1, '#d8c8a4'],
  ])
  // pale sun patch behind drizzle
  x.fillStyle = 'rgba(240,224,180,0.5)'
  x.beginPath()
  x.ellipse(1500, 180, 220, 110, 0, 0, 7)
  x.fill()
  // clay wall along the back
  x.fillStyle = '#7c6850'
  x.fillRect(-2900, 520, 6900, 150)
  x.fillStyle = '#6a5844'
  x.fillRect(-2900, 520, 6900, 18)
  x.fillStyle = '#544536'
  for (let wx = -2900; wx < 3900; wx += 160) x.fillRect(wx, 560, 8, 110)
  // wooden gate in the wall
  x.fillStyle = '#4a3826'
  x.fillRect(300, 470, 150, 200)
  x.fillStyle = '#3a2c1e'
  x.fillRect(300, 470, 150, 16)
  // fence
  x.strokeStyle = '#544536'
  x.lineWidth = 8
  for (let fx = -2900; fx < 3900; fx += 120) {
    x.beginPath()
    x.moveTo(fx, 660)
    x.lineTo(fx, 760)
    x.stroke()
  }
  x.lineWidth = 6
  x.beginPath()
  x.moveTo(-2900, 700)
  x.lineTo(3900, 696)
  x.stroke()
  // cherry tree right (petal source)
  x.strokeStyle = '#3a2c24'
  x.lineWidth = 22
  x.beginPath()
  x.moveTo(2260, 880)
  x.bezierCurveTo(2240, 700, 2300, 620, 2210, 520)
  x.stroke()
  x.lineWidth = 12
  for (const [dx, dy] of [[-60, -60], [40, -90], [90, -30]]) {
    x.beginPath()
    x.moveTo(2210, 540)
    x.lineTo(2210 + dx, 540 + dy)
    x.stroke()
  }
  for (let i = 0; i < 16; i++) {
    x.fillStyle = i % 2 ? PAL.blossom : PAL.blossomHi
    x.beginPath()
    x.ellipse(2210 + (r() - 0.5) * 300, 470 + (r() - 0.5) * 160, 34 + r() * 40, 24 + r() * 22, r(), 0, 7)
    x.fill()
  }
  // lantern posts to polish + bucket stack + bokken rack
  for (const lx of [940, 1520]) {
    x.strokeStyle = '#3a2c1e'
    x.lineWidth = 10
    x.beginPath()
    x.moveTo(lx, 900)
    x.lineTo(lx, 540)
    x.moveTo(lx - 30, 548)
    x.lineTo(lx + 30, 548)
    x.stroke()
  }
  x.fillStyle = '#544536'
  for (let i = 0; i < 4; i++) x.fillRect(1180, 820 - i * 22, 74, 20)
  x.strokeStyle = '#4a3826'
  x.lineWidth = 8
  x.beginPath()
  x.moveTo(700, 700)
  x.lineTo(700, 880)
  x.moveTo(860, 700)
  x.lineTo(860, 880)
  x.moveTo(700, 716)
  x.lineTo(860, 716)
  x.stroke()
  for (let i = 0; i < 3; i++) bokken(x, 724 + i * 58, 726, -1.35 + i * 0.06, 1.0)
  // wet stone ground
  skyWash(x, -2900, 760, 3900, H + OS, [
    [0, '#8a7a64'], [0.5, '#75665a'], [1, '#5c5148'],
  ])
  for (let i = 0; i < 90; i++) {
    const px = r() * 6900 - 2900
    const py = 790 + r() * 260
    x.fillStyle = `rgba(235,240,235,${0.05 + r() * 0.07})`
    x.beginPath()
    x.ellipse(px, py, 20 + r() * 44, 3 + r() * 4, 0, 0, 7)
    x.fill()
  }
  x.strokeStyle = 'rgba(50,40,34,0.5)'
  x.lineWidth = 3
  for (let sy = 800; sy < 1040; sy += 56) {
    x.beginPath()
    x.moveTo(-2900, sy)
    x.bezierCurveTo(-500, sy - 10, 1500, sy + 10, 3900, sy)
    x.stroke()
  }
  return B
}

// S5 night-battle bake: high wide over rice-bunds, moon, paddy water, gate + well.
export function battleBake() {
  const B = bake(W + OS * 2, H + OS * 2)
  const x = B.x
  const r = rng(1520)
  skyWash(x, -OS, -OS, W + OS, 500, [
    [0, PAL.night0], [0.7, PAL.night1], [1, PAL.night2],
  ])
  // moon (the glint grammar source)
  x.fillStyle = 'rgba(226,222,204,0.9)'
  x.beginPath()
  x.arc(400, 200, 62, 0, 7)
  x.fill()
  x.fillStyle = 'rgba(226,222,204,0.14)'
  x.beginPath()
  x.arc(400, 200, 130, 0, 7)
  x.fill()
  for (let i = 0; i < 8; i++) {
    x.fillStyle = `rgba(14,18,32,${0.5 + r() * 0.3})`
    x.beginPath()
    x.ellipse(r() * (W + OS * 2) - OS, 80 + r() * 200, 180 + r() * 240, 20 + r() * 26, 0, 0, 7)
    x.fill()
  }
  // far treeline
  x.fillStyle = '#1a2338'
  x.fillRect(-OS, 460, W + OS * 2, 120)
  for (let i = 0; i < 40; i++) pine(x, r() * (W + OS * 2) - OS, 470 + r() * 60, 16 + r() * 20, '#141c30')
  // paddies: bunds + water bands
  x.fillStyle = '#2c3a30'
  x.fillRect(-OS, 580, W + OS * 2, H + OS - 580)
  const bands = [[620, 90], [750, 110], [900, 180]]
  for (const [by, bh] of bands) {
    x.fillStyle = '#243226'
    x.fillRect(-OS, by - 14, W + OS * 2, 14)
    x.fillStyle = PAL.water0
    x.fillRect(-OS, by, W + OS * 2, bh)
    x.fillStyle = 'rgba(70,96,143,0.35)'
    x.fillRect(-OS, by, W + OS * 2, 8)
    // moon streak on each paddy
    x.fillStyle = 'rgba(210,214,196,0.14)'
    x.beginPath()
    x.ellipse(430 + (by - 620) * 1.2, by + bh * 0.4, 26, bh * 0.3, 0, 0, 7)
    x.fill()
  }
  // rice stubble rows
  x.strokeStyle = 'rgba(190,200,150,0.16)'
  x.lineWidth = 2
  for (let i = 0; i < 120; i++) {
    const px = r() * (W + OS * 2) - OS
    const py = 640 + r() * 400
    x.beginPath()
    x.moveTo(px, py)
    x.lineTo(px + 3, py - 10)
    x.stroke()
  }
  // village gate right (the banner 42 cuts down hangs here)
  x.fillStyle = '#2c2118'
  x.fillRect(1660, 540, 30, 420)
  x.fillRect(1850, 540, 30, 420)
  x.fillStyle = '#3c2e20'
  x.fillRect(1636, 508, 268, 34)
  // well foreground right
  wellP(x, 1440, 1010, 1.15)
  // scarecrow field mid-left (wig scarecrows; wigs drawn per-frame so they can fall)
  for (let i = 0; i < 4; i++) {
    const sx = 640 + i * 130
    x.strokeStyle = '#4a4036'
    x.lineWidth = 12
    x.beginPath()
    x.moveTo(sx, 800)
    x.lineTo(sx, 660)
    x.moveTo(sx - 36, 700)
    x.lineTo(sx + 36, 688)
    x.stroke()
  }
  // mud lane along the bottom
  x.fillStyle = '#211c20'
  x.fillRect(-OS, 1030, W + OS * 2, H + OS - 1030)
  return B
}

// S6 duel bake: the bridge at Sanogawa, straight-on; ONE lantern post far right.
export function bridgeBake() {
  const B = bake(W + OS * 2, H + OS * 2)
  const x = B.x
  const r = rng(64)
  skyWash(x, -OS, -OS, W + OS, 560, [
    [0, PAL.night0], [0.6, PAL.night1], [1, '#202c4a'],
  ])
  for (let i = 0; i < 9; i++) {
    x.fillStyle = `rgba(12,16,30,${0.4 + r() * 0.3})`
    x.beginPath()
    x.ellipse(r() * (W + OS * 2) - OS, 60 + r() * 260, 200 + r() * 260, 22 + r() * 30, 0, 0, 7)
    x.fill()
  }
  // far banks
  x.fillStyle = '#182236'
  x.beginPath()
  x.moveTo(-OS, 560)
  x.lineTo(340, 560)
  x.lineTo(340, 900)
  x.lineTo(-OS, 900)
  x.closePath()
  x.fill()
  x.beginPath()
  x.moveTo(1580, 560)
  x.lineTo(W + OS, 560)
  x.lineTo(W + OS, 900)
  x.lineTo(1580, 900)
  x.closePath()
  x.fill()
  for (let i = 0; i < 12; i++) {
    pine(x, -OS + r() * 500, 590 + r() * 90, 18 + r() * 22, '#121a2c')
    pine(x, 1650 + r() * 500, 590 + r() * 90, 18 + r() * 22, '#121a2c')
  }
  // river
  x.fillStyle = PAL.water0
  x.fillRect(-OS, 850, W + OS * 2, H + OS - 850)
  // the bridge: wooden arch from (240,880) to (1680,880), crest (960,690)
  const deck = (dx) => 880 - 190 * Math.sin(Math.PI * mod(dx - 240, 1) )
  x.fillStyle = '#2e2418'
  x.beginPath()
  x.moveTo(190, 900)
  x.quadraticCurveTo(960, 620, 1730, 900)
  x.lineTo(1730, 956)
  x.quadraticCurveTo(960, 676, 190, 956)
  x.closePath()
  x.fill()
  // plank lines
  x.strokeStyle = '#1e160e'
  x.lineWidth = 4
  for (let i = 0; i <= 16; i++) {
    const bx = 190 + (1540 * i) / 16
    const ty = 900 - 190 * Math.sin(Math.PI * (i / 16)) + 6
    x.beginPath()
    x.moveTo(bx, ty)
    x.lineTo(bx - 12, 956 - 190 * Math.sin(Math.PI * (i / 16)) + 30)
    x.stroke()
  }
  // railing: posts + rail following the arch
  x.strokeStyle = '#241b10'
  x.lineWidth = 10
  for (let i = 0; i <= 10; i++) {
    const bx = 260 + (1400 * i) / 10
    const ty = 886 - 190 * Math.sin(Math.PI * ((bx - 190) / 1540))
    x.beginPath()
    x.moveTo(bx, ty)
    x.lineTo(bx, ty - 66)
    x.stroke()
  }
  x.lineWidth = 9
  x.beginPath()
  for (let bx = 250; bx <= 1690; bx += 40) {
    const ty = 820 - 190 * Math.sin(Math.PI * ((bx - 190) / 1540))
    if (bx === 250) x.moveTo(bx, ty)
    else x.lineTo(bx, ty)
  }
  x.stroke()
  // lantern post far right (the only warm pixel) — flame drawn per frame
  x.strokeStyle = '#241b10'
  x.lineWidth = 12
  x.beginPath()
  x.moveTo(1620, 852)
  x.lineTo(1620, 560)
  x.stroke()
  x.lineWidth = 7
  x.beginPath()
  x.moveTo(1620, 574)
  x.quadraticCurveTo(1652, 566, 1652, 596)
  x.stroke()
  // abutment stones
  x.fillStyle = '#2a303f'
  x.fillRect(-OS, 940, 700, H + OS - 940)
  x.fillRect(1240, 940, W + OS - 1240, H + OS - 940)
  return B
}

// S7 resolution bake: first sun over the wheat; mist line; distant village.
export function wheatBake() {
  const B = bake(W + OS * 2, H + OS * 2)
  const x = B.x
  const r = rng(757)
  skyWash(x, -OS, -OS, W + OS, 620, [
    [0, '#b9c4d8'], [0.35, '#d8ccb0'], [0.7, '#e8d4a8'], [1, '#eeddb0'],
  ])
  // sun cracking the clouds
  x.fillStyle = 'rgba(244,228,180,0.85)'
  x.beginPath()
  x.arc(960, 210, 84, 0, 7)
  x.fill()
  const g = x.createRadialGradient(960, 210, 40, 960, 210, 420)
  g.addColorStop(0, 'rgba(244,228,180,0.5)')
  g.addColorStop(1, 'rgba(244,228,180,0)')
  x.fillStyle = g
  x.fillRect(540, -100, 840, 700)
  for (let i = 0; i < 8; i++) {
    const cx0 = r() * (W + OS * 2) - OS
    const cy0 = 100 + r() * 240
    x.fillStyle = 'rgba(250,244,224,0.75)'
    x.beginPath()
    x.ellipse(cx0, cy0, 150 + r() * 200, 22 + r() * 20, 0, 0, 7)
    x.fill()
    x.fillStyle = 'rgba(150,140,120,0.28)'
    x.beginPath()
    x.ellipse(cx0 - 40, cy0 + 14, 120 + r() * 140, 10 + r() * 10, 0, 0, 7)
    x.fill()
  }
  // distant village + hills
  x.fillStyle = '#a89a80'
  x.beginPath()
  x.moveTo(-OS, 560)
  for (let i = 0; i <= 8; i++) {
    const rx = -OS + (i / 8) * (W + OS * 2)
    x.quadraticCurveTo(rx - 80, 500 + h2(i, 2, 9) * 40, rx, 530 + h2(i, 3, 9) * 30)
  }
  x.lineTo(W + OS, 640)
  x.lineTo(-OS, 640)
  x.closePath()
  x.fill()
  for (let i = 0; i < 5; i++) {
    const hx = 180 + i * 90 + r() * 30
    x.fillStyle = '#6a5a48'
    x.fillRect(hx, 540, 60, 40)
    x.fillStyle = '#4a4038'
    x.beginPath()
    x.moveTo(hx - 8, 544)
    x.lineTo(hx + 30, 516)
    x.lineTo(hx + 68, 544)
    x.closePath()
    x.fill()
  }
  // wheat field base
  skyWash(x, -OS, 620, W + OS, H + OS, [
    [0, '#b8903c'], [0.4, '#c9a44e'], [1, '#d8b45c'],
  ])
  x.strokeStyle = 'rgba(122,92,32,0.5)'
  x.lineWidth = 2
  for (let i = 0; i < 240; i++) {
    const px = r() * (W + OS * 2) - OS
    const py = 640 + r() * 420
    x.beginPath()
    x.moveTo(px, py)
    x.lineTo(px + (r() - 0.5) * 8, py - 12 - r() * 10)
    x.stroke()
  }
  // a path through the wheat
  x.fillStyle = 'rgba(210,190,150,0.55)'
  x.beginPath()
  x.moveTo(880, 620)
  x.quadraticCurveTo(940, 800, 900, H + OS)
  x.lineTo(1060, H + OS)
  x.quadraticCurveTo(1060, 800, 1000, 620)
  x.closePath()
  x.fill()
  // young green sprouts along the path (regrowth)
  x.strokeStyle = '#5c8a4a'
  x.lineWidth = 3
  for (let i = 0; i < 60; i++) {
    const px = 900 + (r() - 0.5) * 150 + (r() - 0.5) * 40
    const py = 700 + r() * 360
    x.beginPath()
    x.moveTo(px, py)
    x.quadraticCurveTo(px + 4, py - 10, px + 2, py - 18)
    x.stroke()
  }
  return B
}

// ============================== atmosphere painters (pure f(t)) ==============================

// seeded rain-streak field. Same slant/speed family across the 22.0 hard cut.
export function rain(x, t, o) {
  const n = o.n ?? 120
  const seed = o.seed ?? 5
  const x0 = o.x0 ?? -300
  const x1 = o.x1 ?? W + 300
  const y0 = o.y0 ?? -200
  const y1 = o.y1 ?? H + 200
  const span = x1 - x0 + 500
  const vspan = y1 - y0 + 500
  const sp = o.speed ?? 1500
  const slant = o.slant ?? -0.22
  const len = o.len ?? 46
  const lw = o.w ?? 2
  x.strokeStyle = o.col ?? 'rgba(190,206,232,0.34)'
  x.lineWidth = lw
  x.lineCap = 'round'
  x.beginPath()
  for (let i = 0; i < n; i++) {
    const dv = 0.65 + h2(i, 1, seed) * 0.7
    const px = x0 - 250 + mod(h2(i, 2, seed) * span + t * slant * sp * dv, span)
    const py = y0 - 250 + mod(h2(i, 3, seed) * vspan + t * sp * dv, vspan)
    const tl = len * dv
    x.moveTo(px, py)
    x.lineTo(px + slant * tl, py + tl)
  }
  x.stroke()
}

// broad translucent sheets (S1 rain in sheets / S2 after the rain hardens)
export function rainCurtains(x, t, a = 1) {
  for (let i = 0; i < 5; i++) {
    const sp = 220 + i * 90
    const off = mod(t * sp, 2400) - 600
    x.fillStyle = `rgba(150,168,200,${(0.045 + i * 0.012) * a})`
    x.save()
    x.transform(1, 0, -0.22, 1, 0, 0)
    x.fillRect(off + i * 460, -400, 90 + i * 26, H + 900)
    x.fillRect(mod(off + 1300 + i * 300, 2400) - 600, -400, 70 + i * 20, H + 900)
    x.restore()
  }
}

// cherry petals: analytic particles with sway (never appended in draw)
export function petals(x, t, o = {}) {
  const n = o.n ?? 22
  const seed = o.seed ?? 11
  const x0 = o.x0 ?? -200
  const x1 = o.x1 ?? W + 200
  const y0 = o.y0 ?? -100
  const y1 = o.y1 ?? H + 100
  const fall = o.fall ?? 130
  const drift = o.drift ?? -60
  for (let i = 0; i < n; i++) {
    const sx = h2(i, 4, seed)
    const sy = h2(i, 5, seed)
    const ph = h2(i, 6, seed) * 7
    const px = x0 + mod(sx * (x1 - x0) + t * drift + Math.sin(t * 1.7 + ph) * 46, x1 - x0)
    const py = y0 + mod(sy * (y1 - y0) + t * fall * (0.7 + sx * 0.6), y1 - y0)
    const rot = ph + t * (1.1 + sx)
    x.save()
    x.translate(px, py)
    x.rotate(rot)
    x.fillStyle = i % 3 ? PAL.blossom : PAL.blossomHi
    x.beginPath()
    x.ellipse(0, 0, 6.5, 3.2, 0, 0, 7)
    x.fill()
    x.restore()
  }
}

// river flow lines (under the bridge; moon streak)
export function waterFlow(x, t, x0, x1, y0, y1, seed = 3) {
  x.strokeStyle = 'rgba(110,140,190,0.20)'
  x.lineWidth = 3
  x.beginPath()
  for (let i = 0; i < 26; i++) {
    const ly = y0 + h2(i, 7, seed) * (y1 - y0)
    const span = (x1 - x0) * 0.4
    const px = x0 + mod(h2(i, 8, seed) * (x1 - x0) + t * (60 + h2(i, 9, seed) * 60), x1 - x0 + span) - span * 0.5
    x.moveTo(px, ly)
    x.lineTo(px + 70 + h2(i, 10, seed) * 60, ly + 2)
  }
  x.stroke()
}

// wheat sway layer (over wheatBake): stalks bending in the wind, pure f(t)
export function wheatSway(x, t, o = {}) {
  const n = o.n ?? 150
  const x0 = o.x0 ?? -OS
  const x1 = o.x1 ?? W + OS
  const y0 = o.y0 ?? 660
  const y1 = o.y1 ?? H + 60
  x.lineWidth = 3
  x.lineCap = 'round'
  for (let i = 0; i < n; i++) {
    const px = x0 + h2(i, 11, 21) * (x1 - x0)
    const py = y0 + h2(i, 12, 21) * (y1 - y0)
    const hh = 26 + h2(i, 13, 21) * 26
    const sway = Math.sin(t * 1.9 + px * 0.014) * (10 + 8 * h2(i, 14, 21))
    x.strokeStyle = i % 4 ? 'rgba(232,200,120,0.75)' : 'rgba(154,124,48,0.8)'
    x.beginPath()
    x.moveTo(px, py)
    x.quadraticCurveTo(px + sway * 0.4, py - hh * 0.6, px + sway, py - hh)
    x.stroke()
    if (i % 3 === 0) {
      x.fillStyle = 'rgba(232,200,120,0.8)'
      x.beginPath()
      x.ellipse(px + sway, py - hh - 4, 3.4, 8, sway * 0.02, 0, 7)
      x.fill()
    }
  }
}

// drifting mist band (S7 mist walk / S1 valley breath)
export function mist(x, t, o = {}) {
  const n = o.n ?? 10
  const y0 = o.y0 ?? 560
  const y1 = o.y1 ?? 760
  for (let i = 0; i < n; i++) {
    const sp = 26 + h2(i, 15, 31) * 40
    const px = mod(h2(i, 16, 31) * 2400 + t * sp, 2600) - 400
    const py = y0 + h2(i, 17, 31) * (y1 - y0)
    const a = (o.alpha ?? 0.16) * (0.5 + h2(i, 18, 31) * 0.5)
    const g = x.createRadialGradient(px, py, 10, px, py, 220 + h2(i, 19, 31) * 180)
    g.addColorStop(0, `rgba(226,222,208,${a})`)
    g.addColorStop(1, 'rgba(226,222,208,0)')
    x.fillStyle = g
    x.fillRect(px - 420, py - 160, 840, 320)
  }
}

// ============================== light / fire / impact ==============================

export function glowSpot(x, cx, cy, r, col, a = 0.3) {
  const g = x.createRadialGradient(cx, cy, 2, cx, cy, r)
  g.addColorStop(0, col.replace('%A', String(a)))
  g.addColorStop(1, col.replace('%A', '0'))
  x.fillStyle = g
  x.fillRect(cx - r, cy - r, r * 2, r * 2)
}

// flame with wind lean (torch / lantern / hearth); lean = px of tip drift
export function flame(x, cx, cy, s, t, seed = 0, lean = 6, col = 'rgba(238,160,60,') {
  const fl = Math.sin(t * 11 + seed * 3) * 0.18 + Math.sin(t * 23 + seed) * 0.08
  const hh = 26 * s * (1 + fl * 0.3)
  const tipX = cx + lean * s + fl * 5 * s
  const g = x.createLinearGradient(cx, cy, tipX, cy - hh)
  g.addColorStop(0, col + '0.85)')
  g.addColorStop(0.55, 'rgba(230,120,40,0.55)')
  g.addColorStop(1, 'rgba(200,70,30,0)')
  x.fillStyle = g
  x.beginPath()
  x.moveTo(cx - 7 * s, cy)
  x.quadraticCurveTo(cx - 8 * s, cy - hh * 0.5, tipX, cy - hh)
  x.quadraticCurveTo(cx + 8 * s, cy - hh * 0.5, cx + 7 * s, cy)
  x.closePath()
  x.fill()
  x.fillStyle = 'rgba(250,230,170,0.9)'
  x.beginPath()
  x.ellipse(cx, cy - 4 * s, 3.6 * s, 7 * s, fl * 0.3, 0, 7)
  x.fill()
}

export function puff(x, cx, cy, age, life, seed = 0, col = '230,224,206') {
  if (age < 0 || age > life) return
  const u = age / life
  for (let i = 0; i < 6; i++) {
    const a = h2(i, 20, seed) * 7
    const d = 8 + u * (26 + h2(i, 21, seed) * 30)
    const r0 = (5 + h2(i, 22, seed) * 7) * (0.5 + u)
    x.fillStyle = `rgba(${col},${0.5 * (1 - u)})`
    x.beginPath()
    x.arc(cx + Math.cos(a) * d, cy + Math.sin(a) * d * 0.6 - u * 12, r0, 0, 7)
    x.fill()
  }
}

export function splashFlat(x, cx, cy, age, life = 0.45, seed = 0) {
  if (age < 0 || age > life) return
  const u = age / life
  x.strokeStyle = `rgba(190,206,236,${0.8 * (1 - u)})`
  x.lineWidth = 3
  x.beginPath()
  x.ellipse(cx, cy, 14 + u * 70, (4 + u * 12) * 0.5, 0, 0, 7)
  x.stroke()
  for (let i = 0; i < 7; i++) {
    const a = -Math.PI * (0.15 + h2(i, 23, seed) * 0.7)
    const d = u * (40 + h2(i, 24, seed) * 60)
    x.fillStyle = `rgba(190,206,236,${0.85 * (1 - u)})`
    x.fillRect(cx + Math.cos(a) * d * (i % 2 ? 1 : -1), cy + Math.sin(a) * d, 3.4, 3.4)
  }
}

export function sparkRing(x, cx, cy, age, life = 0.5) {
  if (age < 0 || age > life) return
  const u = age / life
  x.strokeStyle = `rgba(255,244,214,${0.9 * (1 - u)})`
  x.lineWidth = 5 * (1 - u) + 1.5
  x.beginPath()
  x.arc(cx, cy, 12 + u * 150, 0, 7)
  x.stroke()
  x.strokeStyle = `rgba(238,180,90,${0.7 * (1 - u)})`
  x.lineWidth = 2
  x.beginPath()
  x.arc(cx, cy, 6 + u * 96, 0, 7)
  x.stroke()
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * 7 + h2(i, 25, 3) * 0.5
    const d = 20 + u * (130 + h2(i, 26, 3) * 90)
    x.fillStyle = `rgba(255,240,200,${0.9 * (1 - u)})`
    x.fillRect(cx + Math.cos(a) * d - 2, cy + Math.sin(a) * d - 2, 5, 5)
  }
}

// one specular lighthouse glint (scalp / moon-on-water grammar)
export function glint(x, cx, cy, s, k, col = '#fff6d8') {
  if (k <= 0) return
  x.save()
  x.globalAlpha = Math.min(1, k)
  x.translate(cx, cy)
  x.rotate(-0.5)
  x.fillStyle = col
  x.beginPath()
  x.ellipse(0, 0, 30 * s * k, 4.5 * s * k, 0, 0, 7)
  x.fill()
  x.fillStyle = '#ffffff'
  x.beginPath()
  x.ellipse(0, 0, 14 * s * k, 2.2 * s * k, 0, 0, 7)
  x.fill()
  x.restore()
}

// 2-frame ink-slash stroke over the exchanges (white, angled)
export function inkSlash(x, x0, y0, x1, y1, k, wdt = 9) {
  if (k <= 0) return
  x.save()
  x.globalAlpha = Math.min(1, k)
  x.strokeStyle = '#f6f2e4'
  x.lineCap = 'round'
  x.lineWidth = wdt
  x.beginPath()
  x.moveTo(x0, y0)
  x.quadraticCurveTo((x0 + x1) / 2 + 18, (y0 + y1) / 2 - 18, x1, y1)
  x.stroke()
  x.lineWidth = wdt * 0.4
  x.strokeStyle = '#ffffff'
  x.stroke()
  x.restore()
}

// mochi steam / tea steam
export function steam(x, cx, cy, t, seed = 0) {
  for (let i = 0; i < 3; i++) {
    const ph = t * (1.6 + i * 0.3) + seed + i * 2.1
    const px = cx + Math.sin(ph) * 8 + i * 4 - 4
    const py = cy - ((t * 46 + i * 30 + seed * 20) % 64)
    const u = ((t * 46 + i * 30 + seed * 20) % 64) / 64
    x.fillStyle = `rgba(232,226,210,${0.30 * (1 - u)})`
    x.beginPath()
    x.arc(px, py, 3 + u * 7, 0, 7)
    x.fill()
  }
}

// ============================== procedural props ==============================

// chonmage topknot: the film's central object. o: { rot, rise, strands }
export function chonmage(x, cx, cy, s, o = {}) {
  x.save()
  x.translate(cx, cy)
  x.rotate(o.rot ?? 0)
  const sway = o.sway ?? 0
  // severed strands dangling
  if (o.strands) {
    x.strokeStyle = '#1d1712'
    x.lineWidth = 2.4 * s
    for (let i = 0; i < 3; i++) {
      x.beginPath()
      x.moveTo(-4 * s + i * 4 * s, 6 * s)
      x.quadraticCurveTo(-6 * s + i * 5 * s + sway * 6, 16 * s, -8 * s + i * 6 * s + sway * 14, 26 * s)
      x.stroke()
    }
  }
  // the knot: puffed loop folded forward
  x.fillStyle = '#211a14'
  x.beginPath()
  x.ellipse(0, 0, 11 * s, 7.4 * s, -0.25, 0, 7)
  x.fill()
  x.beginPath()
  x.ellipse(6 * s, -5 * s, 6.4 * s, 4.6 * s, 0.5, 0, 7)
  x.fill()
  // tie band (indigo cord)
  x.strokeStyle = '#2a3660'
  x.lineWidth = 2.6 * s
  x.beginPath()
  x.moveTo(-9 * s, 2 * s)
  x.quadraticCurveTo(0, 6.4 * s, 9 * s, -1 * s)
  x.stroke()
  // sheared fringe edge
  x.fillStyle = '#33281e'
  x.beginPath()
  x.ellipse(-6 * s, 4 * s, 5 * s, 2.4 * s, 0.4, 0, 7)
  x.fill()
  x.restore()
}

export function combP(x, cx, cy, rot, s, col = '#8a6238') {
  x.save()
  x.translate(cx, cy)
  x.rotate(rot)
  x.fillStyle = col
  x.fillRect(-13 * s, -7 * s, 26 * s, 12 * s)
  x.fillStyle = '#6a4a28'
  for (let i = 0; i < 6; i++) x.fillRect(-11 * s + i * 4.2 * s, 5 * s, 1.8 * s, 7 * s)
  x.fillStyle = '#a8823f'
  x.fillRect(-13 * s, -7 * s, 26 * s, 3 * s)
  x.restore()
}

export function potLid(x, cx, cy, s, rot = 0) {
  x.save()
  x.translate(cx, cy)
  x.rotate(rot)
  x.fillStyle = '#8a7250'
  x.beginPath()
  x.ellipse(0, 0, 34 * s, 11 * s, 0, Math.PI, 0)
  x.fill()
  x.fillStyle = '#6e5a3e'
  x.beginPath()
  x.ellipse(0, 0, 34 * s, 11 * s, 0, 0, Math.PI)
  x.fill()
  x.strokeStyle = '#4a3a28'
  x.lineWidth = 2.4 * s
  x.beginPath()
  x.ellipse(0, 0, 34 * s, 11 * s, 0, 0, 7)
  x.stroke()
  x.beginPath()
  x.moveTo(-22 * s, -4 * s)
  x.quadraticCurveTo(0, -16 * s, 22 * s, -4 * s)
  x.stroke()
  x.fillStyle = '#4a3a28'
  x.beginPath()
  x.arc(0, -11 * s, 3.6 * s, 0, 7)
  x.fill()
  x.restore()
}

export function teaBowl(x, cx, cy, s) {
  x.fillStyle = '#3d4a63'
  x.beginPath()
  x.ellipse(cx, cy, 13 * s, 9 * s, 0, Math.PI, 0)
  x.fill()
  x.fillStyle = '#2c3648'
  x.beginPath()
  x.ellipse(cx, cy, 13 * s, 5 * s, 0, 0, Math.PI)
  x.fill()
  x.fillStyle = 'rgba(220,214,196,0.5)'
  x.beginPath()
  x.ellipse(cx, cy - 3 * s, 9 * s, 3 * s, 0, 0, 7)
  x.fill()
}

// oni mask — drawn in head-local space, origin at head centre. hinged at top (lift angle)
export function oniMask(x, s, lift = 0) {
  x.save()
  x.rotate(-lift)
  x.translate(0, lift * 26 * s)
  // plate
  x.fillStyle = '#a8321f'
  x.beginPath()
  x.ellipse(0, 2 * s, 16.5 * s, 19 * s, 0, 0, 7)
  x.fill()
  x.fillStyle = '#c2442a'
  x.beginPath()
  x.ellipse(-3 * s, -2 * s, 12 * s, 14 * s, 0, 0, 7)
  x.fill()
  // horns (gold-tipped)
  x.fillStyle = '#e8ddc8'
  for (const sd of [-1, 1]) {
    x.beginPath()
    x.moveTo(sd * 8 * s, -14 * s)
    x.quadraticCurveTo(sd * 15 * s, -24 * s, sd * 11 * s, -27 * s)
    x.quadraticCurveTo(sd * 10 * s, -20 * s, sd * 4 * s, -16 * s)
    x.closePath()
    x.fill()
  }
  // brow + eye slits (fierce)
  x.fillStyle = '#1d130f'
  x.fillRect(-12 * s, -8 * s, 24 * s, 3.4 * s)
  for (const sd of [-1, 1]) {
    x.beginPath()
    x.moveTo(sd * 4 * s, -2 * s)
    x.lineTo(sd * 12 * s, -4.4 * s)
    x.lineTo(sd * 11 * s, 0.4 * s)
    x.closePath()
    x.fill()
  }
  // grin teeth
  x.fillStyle = '#e8ddc8'
  x.fillRect(-9 * s, 9 * s, 18 * s, 3.4 * s)
  x.fillStyle = '#1d130f'
  for (let i = 0; i < 5; i++) x.fillRect(-8.4 * s + i * 3.7 * s, 9 * s, 1.4 * s, 3.4 * s)
  // lacquer trim
  x.strokeStyle = '#571f16'
  x.lineWidth = 1.8 * s
  x.beginPath()
  x.ellipse(0, 2 * s, 16.5 * s, 19 * s, 0, 0, 7)
  x.stroke()
  x.restore()
}

// warlord wig half: pivot at the top-front seam point, halves translate laterally
// (shift in RIG-LOCAL px — caller converts the spec's 90 screen px) and rotate
// -/+10 deg (sine-eased by the caller). side = +1 viewer-right half, -1 viewer-left.
// The shogun crest sits on the inner lining, visible while parting.
export function wigHalf(x, s, side, openK, shiftLocal = 0) {
  const shift = side * shiftLocal * openK
  const rot = side * 10 * openK * Math.PI / 180
  const px0 = 0
  const py0 = -14 * s
  x.save()
  x.translate(shift, 0)
  x.translate(px0, py0)
  x.rotate(rot)
  x.translate(-px0, -py0)
  // half-shell: wide low back mass + front bob, cut at x=0 seam
  x.fillStyle = '#15100c'
  x.beginPath()
  x.moveTo(0, -16 * s)
  x.bezierCurveTo(side * 20 * s, -22 * s, side * 28 * s, -8 * s, side * 26 * s, 6 * s)
  x.bezierCurveTo(side * 24 * s, 16 * s, side * 14 * s, 22 * s, side * 5 * s, 24 * s)
  x.lineTo(0, 18 * s)
  x.closePath()
  x.fill()
  // front lock hanging by the ear
  x.beginPath()
  x.moveTo(side * 16 * s, 2 * s)
  x.quadraticCurveTo(side * 21 * s, 16 * s, side * 14 * s, 30 * s)
  x.quadraticCurveTo(side * 9 * s, 18 * s, side * 9 * s, 6 * s)
  x.closePath()
  x.fill()
  // ink sheen
  x.strokeStyle = 'rgba(90,80,66,0.5)'
  x.lineWidth = 1.6 * s
  for (let i = 0; i < 3; i++) {
    x.beginPath()
    x.moveTo(side * (3 + i * 7) * s, -12 * s)
    x.quadraticCurveTo(side * (8 + i * 7) * s, 0, side * (5 + i * 6) * s, 12 * s)
    x.stroke()
  }
  // shogun crest (gold comb motif) on the inner lining, visible while parting
  if (openK > 0.05 && openK < 0.95) {
    x.fillStyle = PAL.gold
    const a = Math.sin(Math.min(1, openK) * Math.PI)
    x.save()
    x.globalAlpha = a
    x.translate(side * 2 * s, 0)
    x.scale(side, 1)
    x.fillRect(-1.6 * s, -10 * s, 3.2 * s, 20 * s)
    for (let i = 0; i < 4; i++) x.fillRect(1.6 * s, -10 * s + i * 5 * s, 6 * s, 1.8 * s)
    x.restore()
  }
  x.restore()
}

// razor-no-dachi: long curved blade, pivot at the pommel end. ang in radians.
export function noDachi(x, cx, cy, ang, s) {
  x.save()
  x.translate(cx, cy)
  x.rotate(ang)
  // hilt (diamond wrap)
  x.fillStyle = '#241b12'
  x.fillRect(-6 * s, -3.4 * s, 74 * s, 6.8 * s)
  x.fillStyle = '#c9b090'
  for (let i = 0; i < 7; i++) {
    x.beginPath()
    x.moveTo(i * 10 * s + 4 * s, -3.4 * s)
    x.lineTo(i * 10 * s + 9 * s, 0)
    x.lineTo(i * 10 * s + 4 * s, 3.4 * s)
    x.lineTo(i * 10 * s - 1 * s, 0)
    x.closePath()
    x.fill()
  }
  // tsuba + habaki
  x.fillStyle = '#3a3020'
  x.beginPath()
  x.ellipse(80 * s, 0, 4 * s, 11 * s, 0, 0, 7)
  x.fill()
  x.fillStyle = '#b49a68'
  x.fillRect(84 * s, -4.4 * s, 12 * s, 8.8 * s)
  // blade (curved, razor edge line)
  x.fillStyle = '#cdd4de'
  x.beginPath()
  x.moveTo(96 * s, -4.4 * s)
  x.quadraticCurveTo(210 * s, -26 * s, 330 * s, -60 * s)
  x.lineTo(336 * s, -52 * s)
  x.quadraticCurveTo(216 * s, -12 * s, 96 * s, 4.4 * s)
  x.closePath()
  x.fill()
  x.strokeStyle = '#f2f6fa'
  x.lineWidth = 2 * s
  x.beginPath()
  x.moveTo(96 * s, 2.8 * s)
  x.quadraticCurveTo(214 * s, -18 * s, 334 * s, -55 * s)
  x.stroke()
  x.restore()
}

// small ritual razor
export function razorP(x, cx, cy, ang, s) {
  x.save()
  x.translate(cx, cy)
  x.rotate(ang)
  x.fillStyle = '#241b12'
  x.fillRect(-10 * s, -2.6 * s, 16 * s, 5.2 * s)
  x.fillStyle = '#d8dee8'
  x.beginPath()
  x.moveTo(6 * s, -3 * s)
  x.quadraticCurveTo(20 * s, -7 * s, 34 * s, -11 * s)
  x.lineTo(35 * s, -8 * s)
  x.quadraticCurveTo(21 * s, -2 * s, 6 * s, 3 * s)
  x.closePath()
  x.fill()
  x.restore()
}

// laundry-pole naginata
export function naginata(x, cx, cy, ang, s) {
  x.save()
  x.translate(cx, cy)
  x.rotate(ang)
  x.strokeStyle = '#8a7250'
  x.lineWidth = 7 * s
  x.beginPath()
  x.moveTo(-150 * s, 0)
  x.lineTo(60 * s, 0)
  x.stroke()
  // lashing
  x.strokeStyle = '#5c4a30'
  x.lineWidth = 3 * s
  for (let i = 0; i < 4; i++) {
    x.beginPath()
    x.moveTo((52 + i * 5) * s, -5 * s)
    x.lineTo((56 + i * 5) * s, 5 * s)
    x.stroke()
  }
  x.fillStyle = '#cdd4de'
  x.beginPath()
  x.moveTo(62 * s, -4 * s)
  x.quadraticCurveTo(96 * s, -16 * s, 118 * s, -34 * s)
  x.lineTo(112 * s, -36 * s)
  x.quadraticCurveTo(88 * s, -14 * s, 62 * s, 4 * s)
  x.closePath()
  x.fill()
  x.restore()
}

// wooden practice sword (bokken)
export function bokken(x, cx, cy, ang, s) {
  x.save()
  x.translate(cx, cy)
  x.rotate(ang)
  x.fillStyle = '#b28c50'
  x.beginPath()
  x.moveTo(-44 * s, -3 * s)
  x.quadraticCurveTo(10 * s, -6 * s, 48 * s, -5 * s)
  x.lineTo(48 * s, 2.4 * s)
  x.quadraticCurveTo(4 * s, 2.4 * s, -44 * s, 3.4 * s)
  x.closePath()
  x.fill()
  x.fillStyle = '#8a6a38'
  x.fillRect(-8 * s, -6 * s, 5 * s, 12 * s)
  x.restore()
}

// Cabald tax banner: vertical panel, razor-over-bald-sigil crest. unrollK clips it.
export function bannerCabald(x, cx, cy, w, hgt, unrollK = 1) {
  x.save()
  x.beginPath()
  x.rect(cx - w / 2, cy, w, Math.max(1, hgt * cl(unrollK)))
  x.clip()
  x.fillStyle = '#1c2742'
  x.fillRect(cx - w / 2, cy, w, hgt)
  x.strokeStyle = PAL.gold
  x.lineWidth = 5
  x.strokeRect(cx - w / 2 + 5, cy + 5, w - 10, hgt - 10)
  // crest: pale bald head disc + vermillion razor slash (mirror-safe: centred)
  const ccx = cx
  const ccy = cy + hgt * 0.30
  x.fillStyle = PAL.paper
  x.beginPath()
  x.arc(ccx, ccy, w * 0.24, 0, 7)
  x.fill()
  x.strokeStyle = PAL.vermillion
  x.lineWidth = 8
  x.lineCap = 'round'
  x.beginPath()
  x.moveTo(ccx - w * 0.30, ccy + w * 0.30)
  x.quadraticCurveTo(ccx, ccy - w * 0.06, ccx + w * 0.30, ccy - w * 0.34)
  x.stroke()
  // tax strip
  x.fillStyle = PAL.gold
  for (let i = 0; i < 3; i++) x.fillRect(cx - w * 0.30, cy + hgt * 0.52 + i * 26, w * 0.60, 8)
  x.restore()
}

// collection sack (topknots inside)
export function sackP(x, cx, cy, s, tipK = 0) {
  x.save()
  x.translate(cx, cy)
  x.rotate(tipK * 1.2)
  x.fillStyle = '#7a6244'
  x.beginPath()
  x.moveTo(-24 * s, -20 * s)
  x.bezierCurveTo(-34 * s, 4 * s, -26 * s, 24 * s, 0, 26 * s)
  x.bezierCurveTo(26 * s, 24 * s, 34 * s, 4 * s, 24 * s, -20 * s)
  x.closePath()
  x.fill()
  x.fillStyle = '#64503a'
  x.fillRect(-14 * s, -30 * s, 28 * s, 12 * s)
  x.strokeStyle = '#4a3a26'
  x.lineWidth = 3.4 * s
  x.beginPath()
  x.moveTo(-14 * s, -24 * s)
  x.lineTo(14 * s, -24 * s)
  x.stroke()
  // stolen topknots poking out
  for (let i = 0; i < 3; i++) {
    chonmage(x, (-10 + i * 10) * s, -32 * s - (i % 2) * 4 * s, s * 0.8, { rot: -0.3 + i * 0.4 })
  }
  x.restore()
}

// rain barrel → broken hoop
export function barrelP(x, cx, groundY, s, brokenK = 0) {
  x.save()
  x.translate(cx, groundY)
  if (brokenK <= 0) {
    x.fillStyle = '#5c4a34'
    x.fillRect(-30 * s, -66 * s, 60 * s, 66 * s)
    x.strokeStyle = '#3c2f20'
    x.lineWidth = 5 * s
    for (const ry of [-46, -20] ) {
      x.beginPath()
      x.moveTo(-30 * s, ry * s)
      x.lineTo(30 * s, ry * s)
      x.stroke()
    }
    x.fillStyle = '#4a3a28'
    x.beginPath()
    x.ellipse(0, -66 * s, 30 * s, 8 * s, 0, 0, 7)
    x.fill()
  } else {
    // the hoop
    x.strokeStyle = '#6a5438'
    x.lineWidth = 8 * s
    x.beginPath()
    x.ellipse(0, -6 * s, 40 * s, 13 * s, 0, 0, 7)
    x.stroke()
    // scattered staves
    x.fillStyle = '#5c4a34'
    for (let i = 0; i < 5; i++) {
      const a = -0.5 - i * 0.4
      x.save()
      x.translate(Math.cos(a * 2 + i) * (44 + i * 8) * s, -2 * s)
      x.rotate(a)
      x.fillRect(-3 * s, -22 * s, 6 * s, 30 * s)
      x.restore()
    }
  }
  x.restore()
}

// vermillion torii (night-muted when night)
export function torii(x, cx, groundY, s, night = false) {
  const col = night ? '#7a3a34' : '#b4402e'
  const colLo = night ? '#5c2c28' : '#8a2f22'
  const hgt = 190 * s
  x.fillStyle = col
  x.fillRect(cx - 60 * s, groundY - hgt, 16 * s, hgt)
  x.fillRect(cx + 44 * s, groundY - hgt, 16 * s, hgt)
  x.fillStyle = colLo
  x.fillRect(cx - 78 * s, groundY - hgt + 26 * s, 156 * s, 12 * s)
  x.fillStyle = col
  x.fillRect(cx - 92 * s, groundY - hgt - 14 * s, 184 * s, 18 * s)
  x.fillStyle = '#2a2018'
  x.fillRect(cx - 100 * s, groundY - hgt - 24 * s, 200 * s, 10 * s)
}

export function wellP(x, cx, cy, s) {
  x.fillStyle = '#3c3a38'
  x.beginPath()
  x.ellipse(cx, cy, 52 * s, 18 * s, 0, 0, 7)
  x.fill()
  x.fillStyle = '#171c28'
  x.beginPath()
  x.ellipse(cx, cy - 4 * s, 40 * s, 12 * s, 0, 0, 7)
  x.fill()
  x.strokeStyle = '#4a3826'
  x.lineWidth = 7 * s
  x.beginPath()
  x.moveTo(cx - 44 * s, cy)
  x.lineTo(cx - 44 * s, cy - 80 * s)
  x.moveTo(cx + 44 * s, cy)
  x.lineTo(cx + 44 * s, cy - 80 * s)
  x.stroke()
  x.fillStyle = '#2e2418'
  x.beginPath()
  x.moveTo(cx - 66 * s, cy - 74 * s)
  x.lineTo(cx, cy - 108 * s)
  x.lineTo(cx + 66 * s, cy - 74 * s)
  x.closePath()
  x.fill()
}

export function scarecrowP(x, cx, cy, s, t, i) {
  const sway = Math.sin(t * 1.3 + i * 1.7) * 0.03
  x.save()
  x.translate(cx, cy)
  x.rotate(sway)
  x.strokeStyle = '#3a3026'
  x.lineWidth = 7 * s
  x.beginPath()
  x.moveTo(0, 0)
  x.lineTo(0, -95 * s)
  x.moveTo(-30 * s, -62 * s)
  x.lineTo(30 * s, -68 * s)
  x.stroke()
  x.fillStyle = '#8a7a5c'
  x.fillRect(-13 * s, -88 * s, 26 * s, 36 * s)
  x.restore()
}

export function stoolP(x, cx, cy, s) {
  x.fillStyle = '#4a3826'
  x.fillRect(cx - 22 * s, cy - 8 * s, 44 * s, 8 * s)
  x.fillStyle = '#3a2c1e'
  x.fillRect(cx - 17 * s, cy, 7 * s, 20 * s)
  x.fillRect(cx + 10 * s, cy, 7 * s, 20 * s)
}

// lantern on a post: litK 0..1, flame leans with the wind
export function lanternP(x, cx, cy, s, litK, t, lean = 5) {
  x.fillStyle = '#d8c8a0'
  x.beginPath()
  x.ellipse(cx, cy, 15 * s, 20 * s, 0, 0, 7)
  x.fill()
  x.strokeStyle = '#241d16'
  x.lineWidth = 2.4 * s
  x.beginPath()
  x.ellipse(cx, cy, 15 * s, 20 * s, 0, 0, 7)
  x.stroke()
  x.beginPath()
  x.moveTo(cx - 15 * s, cy)
  x.lineTo(cx + 15 * s, cy)
  x.stroke()
  x.fillStyle = '#241d16'
  x.fillRect(cx - 9 * s, cy - 23 * s, 18 * s, 4 * s)
  x.fillRect(cx - 7 * s, cy + 19 * s, 14 * s, 3.4 * s)
  if (litK > 0.01) {
    x.fillStyle = `rgba(244,196,110,${0.16 * litK})`
    x.beginPath()
    x.ellipse(cx, cy, 15 * s, 20 * s, 0, 0, 7)
    x.fill()
    flame(x, cx, cy + 8 * s, 0.8 * s * 1.2, t, cx, lean * litK)
  }
}

// sumi horse with walk cycle; faces +x unless flipped via o.flip
export function horseP(x, cx, cy, s, ph, o = {}) {
  x.save()
  x.translate(cx, cy)
  if (o.flip) x.scale(-1, 1)
  x.scale(s, s)
  const bodyY = -46
  // legs (4, phase-offset walk)
  x.strokeStyle = '#241d30'
  x.lineWidth = 9
  x.lineCap = 'round'
  for (let i = 0; i < 4; i++) {
    const lx = -22 + (i % 2) * 44
    const ph2 = ph + (i < 2 ? 0 : Math.PI) + (i % 2) * 0.6
    const sw = Math.sin(ph2) * 10
    const lift = Math.max(0, Math.cos(ph2)) * 8
    x.beginPath()
    x.moveTo(lx, bodyY + 12)
    x.quadraticCurveTo(lx + sw * 0.4, bodyY + 30, lx + sw, -lift)
    x.stroke()
  }
  // body + neck + head (ink masses with a moonlit top edge)
  x.fillStyle = '#2a2338'
  x.beginPath()
  x.ellipse(0, bodyY, 40, 20, -0.05, 0, 7)
  x.fill()
  x.strokeStyle = 'rgba(120,110,140,0.55)'
  x.lineWidth = 3
  x.beginPath()
  x.ellipse(0, bodyY - 6, 36, 14, -0.05, Math.PI * 1.1, Math.PI * 1.9)
  x.stroke()
  x.fillStyle = '#2a2338'
  x.beginPath()
  x.moveTo(26, bodyY - 10)
  x.quadraticCurveTo(48, bodyY - 34, 58, bodyY - 40)
  x.quadraticCurveTo(66, bodyY - 36, 62, bodyY - 24)
  x.quadraticCurveTo(52, bodyY - 12, 36, bodyY - 2)
  x.closePath()
  x.fill()
  x.beginPath()
  x.ellipse(60, bodyY - 42, 12, 7, 0.35, 0, 7)
  x.fill()
  x.beginPath()
  x.moveTo(52, bodyY - 48)
  x.lineTo(56, bodyY - 60)
  x.lineTo(60, bodyY - 48)
  x.closePath()
  x.fill()
  // tail + mane (wind-blown)
  x.strokeStyle = '#2a2338'
  x.lineWidth = 6
  x.beginPath()
  x.moveTo(-38, bodyY - 8)
  x.quadraticCurveTo(-58, bodyY - 2 + Math.sin(ph) * 5, -64, bodyY + 14)
  x.stroke()
  x.beginPath()
  x.moveTo(30, bodyY - 26)
  x.quadraticCurveTo(40, bodyY - 40, 52, bodyY - 50)
  x.lineWidth = 5
  x.stroke()
  x.restore()
}

// mochi (white rounds)
export function mochiP(x, cx, cy, s, rot = 0) {
  x.save()
  x.translate(cx, cy)
  x.rotate(rot)
  x.fillStyle = '#efe9da'
  x.beginPath()
  x.ellipse(0, 0, 12 * s, 8.6 * s, 0, 0, 7)
  x.fill()
  x.fillStyle = 'rgba(180,170,150,0.5)'
  x.beginPath()
  x.ellipse(3 * s, 2.6 * s, 7 * s, 4 * s, 0, 0, 7)
  x.fill()
  x.restore()
}

// shuriken (razor-star)
export function shuriken(x, cx, cy, rot, s) {
  x.save()
  x.translate(cx, cy)
  x.rotate(rot)
  x.fillStyle = '#cdd4de'
  for (let i = 0; i < 4; i++) {
    x.rotate(Math.PI / 2)
    x.beginPath()
    x.moveTo(0, -3 * s)
    x.lineTo(13 * s, -5 * s)
    x.lineTo(4 * s, 3 * s)
    x.closePath()
    x.fill()
  }
  x.fillStyle = '#3a3020'
  x.beginPath()
  x.arc(0, 0, 2.6 * s, 0, 7)
  x.fill()
  x.restore()
}

export function pine(x, px, py, s, col = '#1a2438') {
  x.fillStyle = col
  for (let i = 0; i < 3; i++) {
    const wy = py - i * s * 0.7
    const ww = s * (1 - i * 0.24)
    x.beginPath()
    x.moveTo(px - ww, wy)
    x.lineTo(px, wy - s * 0.9)
    x.lineTo(px + ww, wy)
    x.closePath()
    x.fill()
  }
}

// straw mino cape (drawn over 42 from S3 on). sway = wind factor
export function mino(x, cx, topY, w, hgt, sway) {
  x.save()
  x.beginPath()
  x.moveTo(cx - w * 0.5, topY)
  x.quadraticCurveTo(cx - w * 0.62 + sway * 10, topY + hgt * 0.6, cx - w * 0.55 + sway * 16, topY + hgt)
  x.lineTo(cx + w * 0.55 + sway * 16, topY + hgt)
  x.quadraticCurveTo(cx + w * 0.62 + sway * 10, topY + hgt * 0.6, cx + w * 0.5, topY)
  x.closePath()
  x.fillStyle = '#a8823f'
  x.fill()
  x.strokeStyle = '#7a5c28'
  x.lineWidth = 3
  for (let i = 0; i < 8; i++) {
    const u = i / 7
    x.beginPath()
    x.moveTo(cx - w * 0.5 + w * u * 0.96, topY + 4)
    x.quadraticCurveTo(cx - w * 0.56 + w * u + sway * 12, topY + hgt * 0.6, cx - w * 0.55 + w * u * 1.06 + sway * 16, topY + hgt)
    x.stroke()
  }
  x.strokeStyle = '#5c4418'
  x.lineWidth = 4
  x.beginPath()
  x.moveTo(cx - w * 0.5, topY + 2)
  x.quadraticCurveTo(cx, topY + 14, cx + w * 0.5, topY + 2)
  x.stroke()
  x.restore()
}

// ============================== sumi brush wipes ==============================
// Each stroke is a filled polygon sweeping across the frame with dry-brush nubs
// (hash bristles) and a 0.1 s alpha ramp on the edge — never a rect, never a fade.

// swept-region half-plane test per direction; returns polygon points of the
// swept area for progress p (dir: 'ul-lr' | 'ur-ll' | 'lr' | 'bt')
export function wipeRegionPath(x, dir, p) {
  const corn = [[0, 0], [W, 0], [W, H], [0, H]]
  const dOf = (px, py) => {
    if (dir === 'ul-lr') return (px / W + py / H) / 2
    if (dir === 'ur-ll') return ((W - px) / W + py / H) / 2
    if (dir === 'lr') return px / W
    return 1 - py / H // 'bt'
  }
  const grad = (() => {
    if (dir === 'ul-lr') return [1 / W, 1 / H]
    if (dir === 'ur-ll') return [-1 / W, 1 / H]
    if (dir === 'lr') return [1 / W, 0]
    return [0, -1 / H]
  })()
  const pts = []
  for (const [px, py] of corn) if (dOf(px, py) <= p + 1e-9) pts.push([px, py])
  // clip the level line against the four rect edges
  const level = (px, py) => dOf(px, py) - p
  const edges = [[[0, 0], [W, 0]], [[W, 0], [W, H]], [[W, H], [0, H]], [[0, H], [0, 0]]]
  for (const [[ax, ay], [bx, by]] of edges) {
    const la = level(ax, ay)
    const lb = level(bx, by)
    if ((la < 0) === (lb < 0)) continue
    const u = la / (la - lb)
    pts.push([ax + (bx - ax) * u, ay + (by - ay) * u])
  }
  if (pts.length < 3) return false
  // order around the frame centre (the region is convex)
  const cx0 = W / 2, cy0 = H / 2
  pts.sort((a, b) => Math.atan2(a[1] - cy0, a[0] - cx0) - Math.atan2(b[1] - cy0, b[0] - cx0))
  x.beginPath()
  x.moveTo(pts[0][0], pts[0][1])
  for (let i = 1; i < pts.length; i++) x.lineTo(pts[i][0], pts[i][1])
  x.closePath()
  return { pts, grad }
}

// the ink band riding the front edge + dry-brush nubs ahead of it
export function wipeBand(x, w, p, dir, seed) {
  const bandW = w.bandW ?? 84
  // front line segment: level set of d at p, clipped to the frame
  const dOf = (px, py) => {
    if (dir === 'ul-lr') return (px / W + py / H) / 2
    if (dir === 'ur-ll') return ((W - px) / W + py / H) / 2
    if (dir === 'lr') return px / W
    return 1 - py / H
  }
  const grad = (() => {
    if (dir === 'ul-lr') return [1 / W, 1 / H]
    if (dir === 'ur-ll') return [-1 / W, 1 / H]
    if (dir === 'lr') return [1 / W, 0]
    return [0, -1 / H]
  })()
  const gl = Math.hypot(grad[0], grad[1])
  const nrm = [-grad[0] / gl, -grad[1] / gl] // points INTO the swept region (behind the front)
  // sample the level line
  const samples = []
  for (let i = 0; i <= 40; i++) {
    const sx = (i / 40) * W
    const sy = (() => {
      if (dir === 'ul-lr') return H * (2 * p - sx / W)
      if (dir === 'ur-ll') return H * (2 * p - (W - sx) / W)
      if (dir === 'lr') return 0
      return H * (1 - p)
    })()
    if (dir === 'lr') {
      samples.push([p * W, (i / 40) * H])
      continue
    }
    if (sy >= -8 && sy <= H + 8) samples.push([sx, sy])
  }
  if (samples.length < 2) return
  const edgeRamp = Math.min(1, p * (w.dur ?? 0.6) / 0.1) // the 0.1 s alpha ramp
  const front = []
  const rear = []
  for (let i = 0; i < samples.length; i++) {
    const u = i / (samples.length - 1)
    const [bx, by] = samples[i]
    const wob = Math.sin(u * 34 + seed) * 7 + (h2(Math.floor(u * 30), 1, seed) - 0.5) * 16
    const rearW = bandW * (0.72 + 0.4 * h2(Math.floor(u * 26), 2, seed))
    front.push([bx - nrm[0] * wob, by - nrm[1] * wob])
    rear.push([bx + nrm[0] * rearW, by + nrm[1] * rearW])
  }
  x.save()
  x.globalAlpha = 0.97 * edgeRamp
  x.fillStyle = PAL.ink
  x.beginPath()
  x.moveTo(front[0][0], front[0][1])
  for (const [px, py] of front) x.lineTo(px, py)
  for (let i = rear.length - 1; i >= 0; i--) x.lineTo(rear[i][0], rear[i][1])
  x.closePath()
  x.fill()
  // dry-brush nubs ahead of the edge
  x.fillStyle = PAL.ink
  for (let i = 0; i < 9; i++) {
    const u = h2(i, 3, seed)
    const idx = Math.min(samples.length - 1, Math.floor(u * (samples.length - 1)))
    const [bx, by] = samples[idx]
    const ahead = bandW * (0.30 + 0.85 * h2(i, 4, seed))
    x.beginPath()
    x.ellipse(bx - nrm[0] * ahead, by - nrm[1] * ahead, 5 + h2(i, 5, seed) * 14, 3.4, Math.atan2(nrm[1], nrm[0]) + Math.PI / 2, 0, 7)
    x.fill()
  }
  // wet leading edge highlight
  x.globalAlpha = 0.5 * edgeRamp
  x.strokeStyle = '#4a4438'
  x.lineWidth = 5
  x.beginPath()
  x.moveTo(front[0][0], front[0][1])
  for (const [px, py] of front) x.lineTo(px, py)
  x.stroke()
  // gold tip (the regrowth stroke)
  if (w.gold) {
    x.globalAlpha = 0.95 * edgeRamp
    x.strokeStyle = PAL.goldHi
    x.lineWidth = 16
    x.beginPath()
    x.moveTo(front[0][0], front[0][1])
    for (const [px, py] of front) x.lineTo(px, py)
    x.stroke()
    for (let i = 0; i < 16; i++) {
      const u = h2(i, 6, seed)
      const idx = Math.floor(u * (samples.length - 1))
      const [bx, by] = samples[idx]
      const back = bandW * (0.1 + 0.6 * h2(i, 7, seed))
      x.fillStyle = PAL.gold
      x.beginPath()
      x.ellipse(bx + nrm[0] * back, by + nrm[1] * back, 6 + h2(i, 8, seed) * 13, 3.6, 0.6, 0, 7)
      x.fill()
    }
  }
  x.restore()
}

// T1 underline: one short horizontal stroke drawing L->R beneath HAIRAKIRI
export function brushUnderline(x, x0, x1, cy, k, wdt = 10, col = PAL.gold) {
  if (k <= 0) return
  const tip = x0 + (x1 - x0) * cl(k)
  x.save()
  x.fillStyle = col
  x.beginPath()
  x.moveTo(x0, cy - wdt * 0.5)
  x.quadraticCurveTo((x0 + tip) / 2, cy - wdt * 0.9, tip, cy - wdt * 0.2)
  x.lineTo(tip, cy + wdt * 0.4)
  x.quadraticCurveTo((x0 + tip) / 2, cy + wdt * 0.8, x0, cy + wdt * 0.55)
  x.closePath()
  x.fill()
  x.fillStyle = PAL.goldHi
  x.fillRect(x0 + 6, cy - wdt * 0.42, (tip - x0) * 0.8, wdt * 0.16)
  for (let i = 0; i < 5; i++) {
    const u = h2(i, 30, 9)
    const px = x0 + (tip - x0) * u
    x.fillStyle = col
    x.beginPath()
    x.ellipse(px, cy + wdt * (0.6 + h2(i, 31, 9) * 0.7), 3 + h2(i, 32, 9) * 7, 2, 0, 0, 7)
    x.fill()
  }
  x.restore()
}

// ============================== the ensō iris (the film's ONLY iris) ==============================
// One clockwise brush stroke from 8 o'clock sweeping 320 deg; the unpainted 40 deg
// is the aperture. Dry-brush start, wet tail-lift; bristles are hash-of-angle.

export function ensoStroke(x, cx, cy, R, p, o = {}) {
  if (p <= 0) return
  const a0 = (150 * Math.PI) / 180
  const sweep = (320 * Math.PI / 180) * cl(p)
  const base = o.width ?? 30
  const steps = Math.max(10, Math.ceil(sweep / 0.05))
  const outer = []
  const inner = []
  for (let i = 0; i <= steps; i++) {
    const u = i / steps
    const th = a0 + sweep * u
    const tail = cl((u - 0.94) / 0.06)
    const wd = base * (1 - 0.72 * tail * tail) * (0.88 + 0.24 * Math.sin(u * 11 + 2))
    const wob = (h2(Math.floor(th * 220), 3, 41) - 0.5) * base * 0.4
    const rO = R + wd / 2 + wob
    const rI = Math.max(2, R - wd / 2 + wob)
    outer.push([cx + Math.cos(th) * rO, cy + Math.sin(th) * rO])
    inner.push([cx + Math.cos(th) * rI, cy + Math.sin(th) * rI])
  }
  x.save()
  x.fillStyle = o.col ?? PAL.ink
  x.beginPath()
  x.moveTo(outer[0][0], outer[0][1])
  for (const [px, py] of outer) x.lineTo(px, py)
  for (let i = inner.length - 1; i >= 0; i--) x.lineTo(inner[i][0], inner[i][1])
  x.closePath()
  x.fill()
  // dry-brush slivers near the start of the stroke
  for (let i = 0; i < 10; i++) {
    const u = h2(i, 33, 43) * 0.16
    if (u > p) continue
    const th = a0 + sweep * u
    const r0 = R - base * 0.5 + h2(i, 34, 43) * base
    x.strokeStyle = o.behind ?? 'rgba(230,218,191,0.55)'
    x.lineWidth = 2 + h2(i, 35, 43) * 3
    x.beginPath()
    x.moveTo(cx + Math.cos(th - 0.02) * r0, cy + Math.sin(th - 0.02) * r0)
    x.lineTo(cx + Math.cos(th + 0.02) * (r0 + base * 0.7), cy + Math.sin(th + 0.02) * (r0 + base * 0.7))
    x.stroke()
  }
  // bristle nubs on both edges
  x.fillStyle = o.col ?? PAL.ink
  const nB = Math.floor(sweep / 0.09)
  for (let i = 0; i < nB; i++) {
    const th = a0 + (i / nB) * sweep
    const side = h2(i, 36, 43) > 0.5 ? 1 : -1
    const rr = R + side * (base * 0.55 + h2(i, 37, 43) * base * 0.5)
    x.beginPath()
    x.ellipse(cx + Math.cos(th) * rr, cy + Math.sin(th) * rr, 6 + h2(i, 38, 43) * 12, 3.2, th + Math.PI / 2, 0, 7)
    x.fill()
  }
  x.restore()
}

// aperture seal: the last 40 deg close behind the tail-lift
export function ensoSeal(x, cx, cy, R, k, base = 16) {
  if (k <= 0) return
  const a0 = (110 * Math.PI) / 180
  const sweep = (40 * Math.PI / 180) * cl(k)
  x.save()
  x.strokeStyle = PAL.ink
  x.lineCap = 'round'
  x.lineWidth = base * (1 - 0.5 * cl(k))
  x.beginPath()
  x.arc(cx, cy, R, a0, a0 + sweep, false)
  x.stroke()
  x.restore()
}

// dim everything OUTSIDE the circle (iris): hole via moveTo+arc evenodd
export function ensoDim(x, cx, cy, R, k, margin = OS) {
  if (k <= 0) return
  x.save()
  x.fillStyle = `rgba(10,8,7,${cl(k)})`
  x.beginPath()
  x.rect(-margin, -margin, W + margin * 2, H + margin * 2)
  x.moveTo(cx + R, cy)
  x.arc(cx, cy, R, 0, 7, true)
  x.fill('evenodd')
  x.restore()
}
