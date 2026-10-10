import { useEffect, useRef } from 'react'
import { player, usePlayer } from '../player/player'
import type { VisMode } from './layout'
import { useSkin } from './skin'

type Props = { x: number; y: number; w: number; h: number; mode: VisMode; onClick?: () => void; title?: string }

/** Oscilloscope row → VISCOLOR 18..22 (brightest in the middle). */
const OSC_ROW = [3, 3, 2, 2, 1, 1, 0, 0, 1, 1, 2, 2, 3, 3, 4, 4]

/**
 * Winamp's visualizer: 3px spectrum bars with falling peak dots, or the oscilloscope, painted 1:1 in VISCOLOR.
 * `h` 16 is the main window's, 5 the windowshade's.
 */
export function Visualizer({ x, y, w, h, mode, onClick, title }: Props) {
  const skin = useSkin()
  const playing = usePlayer((s) => s.status === 'playing')
  const ref = useRef<HTMLCanvasElement>(null)
  const levels = useRef<{ bars: Float32Array; peaks: Float32Array; fall: Float32Array }>()
  useEffect(() => {
    const ctx = ref.current?.getContext('2d')
    if (!ctx) return
    const colors = skin.viscolor
    const small = h < 16
    const n = Math.floor(w / 4)
    // Kept across play/pause so the bars fall off after a stop.
    if (levels.current?.bars.length !== n)
      levels.current = { bars: new Float32Array(n), peaks: new Float32Array(n), fall: new Float32Array(n) }
    const { bars, peaks, fall } = levels.current
    let freq = new Uint8Array(0)
    let wave = new Uint8Array(0)
    let frame = 0
    let last = performance.now()

    const background = () => {
      ctx.fillStyle = colors[0]
      ctx.fillRect(0, 0, w, h)
      if (small) return
      ctx.fillStyle = colors[1]
      for (let dx = 1; dx < w; dx += 2) for (let dy = 1; dy < h; dy += 2) ctx.fillRect(dx, dy, 1, 1)
    }
    // Spectrum colours by row from the top: VISCOLOR 2..17 (shade: a 5-row subset).
    const barColor = (row: number) => (small ? colors[[4, 8, 11, 14, 17][row]] : colors[2 + row])

    const analyzer = (k: number, a: AnalyserNode | undefined) => {
      let alive = false
      if (a && freq.length !== a.frequencyBinCount) freq = new Uint8Array(a.frequencyBinCount)
      if (a && playing) a.getByteFrequencyData(freq)
      else freq.fill(0)
      const nyquist = (a?.context.sampleRate ?? 44100) / 2
      for (let i = 0; i < n; i++) {
        // Log-spaced bands, 40 Hz .. 16 kHz.
        const lo = Math.floor(((40 * 400 ** (i / n)) / nyquist) * freq.length)
        const hi = Math.max(lo + 1, Math.floor(((40 * 400 ** ((i + 1) / n)) / nyquist) * freq.length))
        let v = 0
        for (let b = lo; b < hi && b < freq.length; b++) v = Math.max(v, freq[b])
        const level = Math.max(0, (v - 48) / 207) ** 1.4 * h
        bars[i] = Math.max(level, bars[i] - 0.75 * k * (small ? 0.4 : 1))
        if (bars[i] >= peaks[i]) {
          peaks[i] = bars[i]
          fall[i] = 3 / 256
        } else {
          peaks[i] = Math.max(0, peaks[i] - fall[i] * k)
          fall[i] *= 1.1 ** k
        }
        const top = Math.round(bars[i])
        for (let row = h - top; row < h; row++) {
          ctx.fillStyle = barColor(row)
          ctx.fillRect(i * 4, row, 3, 1)
        }
        const peak = Math.round(peaks[i])
        if (peak >= 1 && !small) {
          ctx.fillStyle = colors[23]
          ctx.fillRect(i * 4, h - peak, 3, 1)
        }
        if (bars[i] > 0 || peaks[i] > 0) alive = true
      }
      return alive
    }

    const scope = (a: AnalyserNode | undefined) => {
      if (!a || !playing) return false
      if (wave.length !== a.fftSize) wave = new Uint8Array(a.fftSize)
      a.getByteTimeDomainData(wave)
      const step = Math.max(1, Math.floor(Math.min(576, wave.length) / w))
      let prev = -1
      for (let i = 0; i < w; i++) {
        let row = Math.round(wave[i * step] / 8) - 9
        if (small) row -= 5
        row = Math.min(h - 1, Math.max(0, row))
        const from = prev < 0 ? row : Math.min(prev, row)
        const to = prev < 0 ? row : Math.max(prev, row)
        for (let r = from; r <= to; r++) {
          ctx.fillStyle = colors[18 + (small ? 0 : OSC_ROW[r])]
          ctx.fillRect(i, r, 1, 1)
        }
        prev = row
      }
      return true
    }

    const paint = (now: number) => {
      const k = Math.min(4, (now - last) / (1000 / 60))
      last = now
      const a = player.analyser()
      background()
      const alive = mode === 'bars' ? analyzer(k, a) : scope(a)
      frame = alive || playing ? requestAnimationFrame(paint) : 0
    }

    if (mode === 'off') ctx.clearRect(0, 0, w, h)
    else frame = requestAnimationFrame(paint)
    return () => cancelAnimationFrame(frame)
  }, [skin, mode, playing, w, h])

  return (
    <button
      type="button"
      tabIndex={-1}
      className="wa-btn wa-c"
      style={{ left: x, top: y, width: w, height: h }}
      title={title}
      aria-label={title ?? 'Visualization'}
      onClick={onClick}
    >
      <canvas
        ref={ref}
        className="wa-abs wa-vis"
        width={w}
        height={h}
        style={{ left: 0, top: 0, width: w, height: h }}
      />
    </button>
  )
}
