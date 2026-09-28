import { useQueryClient } from '@tanstack/react-query'
import { type CSSProperties, type MouseEvent, useCallback, useEffect, useState } from 'react'
import { TOTAL_SUPPLY_HINT } from '../config'
import { useVisibleApps } from './apps'
import { FLAG_COLORS, Icon } from './icons'
import { type Wallpaper as WallpaperPref, setPrefs, useShell } from './shell'
import { useOutside } from './Taskbar'

export function wallpaperStyle(w: WallpaperPref): CSSProperties {
  if (w.kind === 'solid') return { background: '#004e98' }
  if (w.kind === 'remy') {
    const img = `url(/images/Character${w.art}.webp)`
    if (w.fit === 'tile') return { background: `${img} 0 0 / 180px 180px repeat, #004e98` }
    if (w.fit === 'center') return { background: `${img} center / min(60vh, 600px) no-repeat, #004e98` }
    return { background: `${img} center / cover no-repeat, #004e98` }
  }
  return {}
}

/** Diamond kite in the flag colours with a Remy in every quadrant, flying over the Bliss hill. */
function Kite() {
  const art = [2069, 420, 777, 42]
  const tris = ['50,4 12,44 50,44', '50,4 88,44 50,44', '12,44 50,132 50,44', '88,44 50,132 50,44']
  const spots = [
    [10, 2],
    [46, 2],
    [12, 42],
    [46, 42],
  ]
  return (
    <svg className="kite" viewBox="0 0 200 420" aria-hidden="true" focusable="false">
      <defs>
        {tris.map((t, i) => (
          <clipPath key={t} id={`kite-${i}`}>
            <polygon points={t} />
          </clipPath>
        ))}
      </defs>
      <path className="kite-string" d="M50 64 C 70 180, 20 300, -40 430" fill="none" stroke="#fff" strokeOpacity=".7" strokeWidth="1" />
      <g className="kite-body">
        <path
          className="kite-tail"
          d="M50 132 c -14 18, 14 30, 0 48 s 14 30, 0 48 s 14 30, 0 46"
          fill="none"
          stroke="#fff"
          strokeOpacity=".85"
          strokeWidth="1.4"
        />
        {[150, 186, 222, 256].map((y, i) => (
          <path key={y} d={`M${44 + (i % 2) * 6} ${y} l -9 -6 v 12 z M${44 + (i % 2) * 6} ${y} l 9 -6 v 12 z`} fill={FLAG_COLORS[i]} opacity=".95" />
        ))}
        {tris.map((t, i) => (
          <g key={t} clipPath={`url(#kite-${i})`}>
            <polygon points={t} fill={FLAG_COLORS[i]} />
            <image href={`/images/Character${art[i]}.webp`} x={spots[i][0]} y={spots[i][1]} width="44" height="44" />
            <polygon points={t} fill={FLAG_COLORS[i]} opacity=".6" style={{ mixBlendMode: 'color' }} />
            <polygon points={t} fill={FLAG_COLORS[i]} opacity=".18" />
          </g>
        ))}
        <polygon points="50,4 88,44 50,132 12,44" fill="none" stroke="#fff" strokeWidth="1.6" strokeLinejoin="round" />
        <path d="M50 4v128M12 44h76" stroke="#5b3b1a" strokeOpacity=".55" strokeWidth="1.3" />
        <polygon points="50,4 88,44 50,44 12,44" fill="url(#xi-gloss)" opacity=".25" />
      </g>
    </svg>
  )
}

export function Wallpaper() {
  const w = useShell((s) => s.prefs.wallpaper)
  return (
    <div className={`wallpaper ${w.kind}`} style={wallpaperStyle(w)} aria-hidden="true">
      {w.kind === 'bliss' && <Kite />}
      <div className="watermark">
        Remy OS <i>xp</i> · Based Edition · Build 4490
      </div>
    </div>
  )
}

export function DesktopIcons({ open }: { open: (id: string) => void }) {
  const apps = useVisibleApps()
  const [sel, setSel] = useState<string>()
  useEffect(() => {
    const clear = (e: PointerEvent) => !(e.target as HTMLElement).closest('.desk-icon') && setSel(undefined)
    document.addEventListener('pointerdown', clear)
    return () => document.removeEventListener('pointerdown', clear)
  }, [])
  return (
    <nav className="desktop-icons" aria-label="Desktop">
      {apps.map((a) => (
        <button
          type="button"
          key={a.id}
          className={`desk-icon${sel === a.id ? ' selected' : ''}`}
          title={`${a.title}: ${a.desc}. Double-click to open.`}
          onPointerUp={(e) => e.pointerType !== 'mouse' && open(a.id)}
          onClick={() => setSel(a.id)}
          onDoubleClick={() => open(a.id)}
          onKeyDown={(e) => {
            if (e.key !== 'Enter') return
            e.preventDefault()
            open(a.id)
          }}
        >
          <Icon name={a.icon} size={48} />
          <span className="desk-label">{a.short}</span>
        </button>
      ))}
    </nav>
  )
}

type Menu = { x: number; y: number }

/** Right-click menu on the desktop background. */
export function useDesktopMenu(open: (id: string) => void) {
  const [menu, setMenu] = useState<Menu>()
  const close = useCallback(() => setMenu(undefined), [])
  const ref = useOutside<HTMLDivElement>(!!menu, close)
  const qc = useQueryClient()

  const onContextMenu = (e: MouseEvent) => {
    if ((e.target as HTMLElement).closest('.window, .taskbar, input, textarea, a')) return
    e.preventDefault()
    setMenu({ x: Math.min(e.clientX, window.innerWidth - 200), y: Math.min(e.clientY, window.innerHeight - 190) })
  }

  const item = (label: string, act: () => void, bold = false) => (
    <button
      type="button"
      role="menuitem"
      className={`ctx-item${bold ? ' bold' : ''}`}
      onClick={() => {
        close()
        act()
      }}
    >
      {label}
    </button>
  )

  const element = menu && (
    <div className="ctx-menu" ref={ref} role="menu" style={{ left: menu.x, top: menu.y }}>
      {item('Refresh', () => qc.invalidateQueries())}
      <hr />
      {item('Open a random Remy', () => open(`gallery/${Math.floor(Math.random() * TOTAL_SUPPLY_HINT)}`))}
      {item('Shuffle wallpaper', () => setPrefs({ wallpaper: { kind: 'remy', art: Math.floor(Math.random() * TOTAL_SUPPLY_HINT), fit: 'stretch' } }))}
      {item('Restore Remy Bliss', () => setPrefs({ wallpaper: { kind: 'bliss' } }))}
      <hr />
      {item('Properties', () => open('display'), true)}
    </div>
  )
  return { onContextMenu, element }
}
