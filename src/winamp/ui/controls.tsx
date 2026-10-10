import { player, usePlayer } from '../player/player'
import { Text } from './skin'
import { useUi } from './ui'
import { useTicker } from './util'

export const volumeText = (v: number) => `VOLUME: ${Math.round(v)}%`

export function balanceText(b: number) {
  const v = Math.round(b)
  return v === 0 ? 'BALANCE: CENTER' : `BALANCE: ${Math.abs(v)}% ${v < 0 ? 'LEFT' : 'RIGHT'}`
}

/** Winamp snaps the balance to centre near the middle. */
export const snapBalance = (b: number) => (Math.abs(b) < 25 ? 0 : Math.round(b))

/** Seconds shown by the time displays (elapsed or, in remaining mode, negative-less remaining). */
export function useDisplayTime(): { seconds: number; minus: boolean } | undefined {
  const status = usePlayer((s) => s.status)
  const duration = usePlayer((s) => s.duration)
  const remaining = useUi().layout.remaining
  useTicker(status !== 'stopped', 200)
  if (status === 'stopped') return undefined
  const t = player.time()
  return remaining && duration > 0 ? { seconds: Math.max(0, duration - t), minus: true } : { seconds: t, minus: false }
}

/** TEXT-font "-mm:ss" of the windowshade and playlist (the colon is part of the background). */
export function MiniTime({ x, y }: { x: number; y: number }) {
  const ui = useUi()
  const paused = usePlayer((s) => s.status === 'paused')
  const time = useDisplayTime()
  const s = time ? Math.floor(time.seconds) : 0
  const mm = String(Math.floor(s / 60) % 100).padStart(2, '0')
  const ss = String(s % 60).padStart(2, '0')
  const chars = time ? [time.minus ? '-' : ' ', mm[0], mm[1], ss[0], ss[1]] : [' ', ' ', ' ', ' ', ' ']
  return (
    <button
      type="button"
      tabIndex={-1}
      className={`wa-btn wa-minitime${paused ? ' wa-blink' : ''}`}
      style={{ left: x, top: y, width: 30, height: 6 }}
      title="Toggle elapsed/remaining time"
      onClick={() => ui.setLayout((l) => ({ ...l, remaining: !l.remaining }))}
    >
      {[1, 7, 12, 20, 25].map((left, i) => (
        <Text key={left} text={chars[i]} x={left} y={0} />
      ))}
    </button>
  )
}
