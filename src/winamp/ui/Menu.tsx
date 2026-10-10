import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useShell } from '../../os/shell'

export type MenuItem =
  | '-'
  | {
      label: string
      hotkey?: string
      checked?: boolean
      /** Checked mark is a dot (one of a group). */
      radio?: boolean
      disabled?: boolean
      bold?: boolean
      onClick?: () => void
      items?: MenuItem[]
    }

export type MenuAt = { x: number; y: number; items: MenuItem[] }

/** Win32 pop-up menu (XP look, the desktop's `.ctx-menu`), with cascading submenus. Rendered on <body>, unscaled. */
export function Menu({ menu, onClose }: { menu: MenuAt; onClose: () => void }) {
  const theme = useShell((s) => s.prefs.theme)
  useEffect(() => {
    const down = (e: PointerEvent) => !(e.target as Element).closest?.('.wa-menu') && onClose()
    const key = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    // Opened by this very pointerdown: start listening after it.
    const t = window.setTimeout(() => document.addEventListener('pointerdown', down, true))
    document.addEventListener('keydown', key)
    window.addEventListener('blur', onClose)
    return () => {
      window.clearTimeout(t)
      document.removeEventListener('pointerdown', down, true)
      document.removeEventListener('keydown', key)
      window.removeEventListener('blur', onClose)
    }
  }, [onClose])
  return createPortal(
    <div className={`theme-${theme}`}>
      <MenuList items={menu.items} x={menu.x} y={menu.y} onClose={onClose} />
    </div>,
    document.body,
  )
}

type Sub = { index: number; x: number; y: number; left: number }

function MenuList(p: { items: MenuItem[]; x: number; y: number; flipX?: number; onClose: () => void }) {
  const ref = useRef<HTMLDivElement>(null)
  const [pos, setPos] = useState({ x: p.x, y: p.y })
  const [sub, setSub] = useState<Sub>()

  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    const { width, height } = el.getBoundingClientRect()
    let x = p.x
    if (x + width > window.innerWidth) x = p.flipX !== undefined ? p.flipX - width : window.innerWidth - width
    setPos({ x: Math.max(0, x), y: Math.max(0, Math.min(p.y, window.innerHeight - height)) })
  }, [p.x, p.y, p.flipX])
  const open = sub && p.items[sub.index]

  return (
    <>
      <div
        className="ctx-menu wa-menu"
        role="menu"
        ref={ref}
        style={{ left: pos.x, top: pos.y }}
        onContextMenu={(e) => e.preventDefault()}
      >
        {p.items.map((it, i) => {
          if (it === '-') {
            // biome-ignore lint/suspicious/noArrayIndexKey: separators are positional
            return <hr key={i} />
          }
          return (
            <button
              type="button"
              role="menuitem"
              key={it.label}
              disabled={it.disabled}
              className={`ctx-item wa-mi${it.bold ? ' bold' : ''}${sub?.index === i ? ' open' : ''}`}
              onPointerEnter={(e) => {
                if (!it.items) return setSub(undefined)
                const r = e.currentTarget.getBoundingClientRect()
                setSub({ index: i, x: r.right - 2, y: r.top - 3, left: r.left + 2 })
              }}
              onClick={(e) => {
                if (it.items) {
                  const r = e.currentTarget.getBoundingClientRect()
                  setSub({ index: i, x: r.right - 2, y: r.top - 3, left: r.left + 2 })
                  return
                }
                p.onClose()
                it.onClick?.()
              }}
            >
              <span className="wa-mi-check">{it.checked ? (it.radio ? '●' : '✓') : ''}</span>
              <span className="wa-mi-label">{it.label}</span>
              {it.hotkey && <span className="wa-mi-key">{it.hotkey}</span>}
              {it.items && <span className="wa-mi-arrow">▶</span>}
            </button>
          )
        })}
      </div>
      {sub && open !== '-' && open?.items && (
        <MenuList items={open.items} x={sub.x} y={sub.y} flipX={sub.left} onClose={p.onClose} />
      )}
    </>
  )
}
