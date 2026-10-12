export const FIREWORK_PARTICLES = 48

/** Director-approved canonical flag grid and ragged ring, written into reusable buffers. */
export function burstPositions(x: Float32Array, y: Float32Array, shell: number, age: number, cx: number, cy: number, flagScale = 1) {
  const t = Math.max(0, (age - 350) / 900)
  for (let i = 0; i < FIREWORK_PARTICLES; i++) {
    if (shell % 4 === 3) {
      const pane = Math.floor(i / 12)
      const j = i % 12
      const gx = (pane % 2 ? 52 : 4) + 44 * (j % 4 + .5) / 4
      const gy = (pane >= 2 ? 46 : 8) + 34 * (Math.floor(j / 4) + .5) / 3
      const wave = 7 * Math.sin(gx / 100 * Math.PI * 1.7 + .2) - gx * .05
      const lean = (gy - 44) * -.12
      const settle = 1 - (1 - Math.min(1, t / .25)) ** 3
      x[i] = cx + (gx + lean - 50) * settle * flagScale
      y[i] = cy + ((gy + wave - 44) * settle + 2 * Math.sin(gx / 14 + age * .012) * settle) * flagScale
        + .05 * (Math.max(0, t - .65) * 60) ** 2
    } else {
      const angle = i / FIREWORK_PARTICLES * Math.PI * 2
      const k = .78 + .22 * ((i * 7) % 5) / 4
      const radius = 78 * k * (1 - (1 - Math.min(1, t / .6)) ** 3)
      x[i] = cx + Math.cos(angle) * radius
      y[i] = cy + Math.sin(angle) * radius + .05 * (t * 60) ** 2
    }
  }
}
