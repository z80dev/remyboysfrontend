import {
  type CSSProperties,
  type ReactNode,
  type PointerEvent as ReactPointerEvent,
  createContext,
  useContext,
  useEffect,
  useState,
} from 'react'
import { CHAR_H, CHAR_W, FONT, SPRITES } from '../skin/sprites'
import { type Skin, spriteStyle } from '../skin/types'

export const SkinContext = createContext<Skin | undefined>(undefined)

export function useSkin(): Skin {
  const skin = useContext(SkinContext)
  if (!skin) throw new Error('SkinContext missing')
  return skin
}

type Sprites = typeof SPRITES
export type SheetKey = Exclude<keyof Sprites, 'NUMS_EX'>
export type SpriteKey<S extends SheetKey> = keyof Sprites[S] & string

/** Background style for one sprite of the current skin. */
export function sprite<S extends SheetKey>(skin: Skin, sheet: S, name: SpriteKey<S>): CSSProperties {
  return spriteStyle(skin.sheets[sheet], SPRITES[sheet][name] as readonly [number, number, number, number])
}

/** An absolutely positioned sprite. */
export function Sprite<S extends SheetKey>(p: {
  sheet: S
  name: SpriteKey<S>
  x: number
  y: number
  className?: string
}) {
  const skin = useSkin()
  return (
    <div className={`wa-abs ${p.className ?? ''}`} style={{ left: p.x, top: p.y, ...sprite(skin, p.sheet, p.name) }} />
  )
}

/** TEXT.BMP string. */
export function Text({
  text,
  x,
  y,
  className,
  style,
}: { text: string; x?: number; y?: number; className?: string; style?: CSSProperties }) {
  const skin = useSkin()
  const bg = `url(${skin.sheets.TEXT.url})`
  return (
    <div className={`wa-text ${className ?? ''}`} style={{ left: x, top: y, ...style }}>
      {Array.from(text, (c, i) => {
        const [row, col] = FONT[c.toLowerCase()] ?? FONT[' ']
        return (
          // biome-ignore lint/suspicious/noArrayIndexKey: glyph cells are positional
          <span key={i} style={{ backgroundImage: bg, backgroundPosition: `-${col * CHAR_W}px -${row * CHAR_H}px` }} />
        )
      })}
    </div>
  )
}

/** Pointer-held state for a skinned control: pressed while the pointer that went down on it is held over it. */
export function usePress() {
  const [down, setDown] = useState(false)
  const [over, setOver] = useState(false)
  useEffect(() => {
    if (!down) return
    const up = () => setDown(false)
    window.addEventListener('pointerup', up)
    window.addEventListener('pointercancel', up)
    return () => {
      window.removeEventListener('pointerup', up)
      window.removeEventListener('pointercancel', up)
    }
  }, [down])
  return {
    pressed: down && over,
    handlers: {
      onPointerDown: (e: ReactPointerEvent) => {
        if (e.button !== 0)
          return // Touch implicitly captures the pointer to the target; release it so leave/enter work like a mouse.
        ;(e.target as Element).releasePointerCapture?.(e.pointerId)
        setDown(true)
        setOver(true)
      },
      onPointerEnter: () => setOver(true),
      onPointerLeave: () => setOver(false),
    },
  }
}

type BtnProps = {
  x: number
  y: number
  w: number
  h: number
  /** Sprite when released (omit when the window background already shows it). */
  up?: CSSProperties
  /** Sprite while pressed. */
  down?: CSSProperties
  title: string
  onClick: (e: React.MouseEvent) => void
  onDoubleClick?: (e: React.MouseEvent) => void
  className?: string
  children?: ReactNode
}

/** Skinned push button: one sprite up, another while held. */
export function Btn(p: BtnProps) {
  const { pressed, handlers } = usePress()
  const look = (pressed ? p.down : p.up) ?? {}
  return (
    <button
      type="button"
      className={`wa-btn ${p.className ?? ''}`}
      title={p.title}
      aria-label={p.title}
      tabIndex={-1}
      style={{ left: p.x, top: p.y, ...look, width: p.w, height: p.h }}
      onClick={p.onClick}
      onDoubleClick={(e) => {
        e.stopPropagation()
        p.onDoubleClick?.(e)
      }}
      {...handlers}
    >
      {p.children}
    </button>
  )
}
