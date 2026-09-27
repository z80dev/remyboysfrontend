import { useCallback, useEffect, useRef, useState } from 'react'
import { APPS, appById } from './os/apps'
import { Icon } from './os/icons'
import { Taskbar } from './os/Taskbar'
import { Window, type WinGeom } from './os/Window'

type Win = { id: string; geom: WinGeom; z: number; min: boolean; max: boolean }

const WALLPAPER = [101, 2210, 777, 3001, 42, 1869, 4200, 512, 3333, 909, 2600, 1500, 69, 4020, 250, 3777]

function parseHash(): { id?: string; param?: string } {
  const [id, param] = window.location.hash.replace(/^#\/?/, '').split('/')
  return { id: id && appById(id) ? id : undefined, param: param || undefined }
}

function useMobile() {
  const q = '(max-width: 720px)'
  const [mobile, setMobile] = useState(() => window.matchMedia(q).matches)
  useEffect(() => {
    const m = window.matchMedia(q)
    const on = () => setMobile(m.matches)
    m.addEventListener('change', on)
    return () => m.removeEventListener('change', on)
  }, [])
  return mobile
}

function initialGeom(id: string, count: number): WinGeom {
  const [w, h] = appById(id)?.size ?? [600, 500]
  const vw = window.innerWidth
  const vh = window.innerHeight - 48
  const W = Math.min(w, vw - 40)
  const H = Math.min(h, vh - 30)
  const off = (count % 6) * 28
  return { w: W, h: H, x: Math.min(Math.max(120, (vw - W) / 2 + off), Math.max(12, vw - W - 12)), y: Math.max(8, (vh - H) / 2 - 20 + off) }
}

export default function App() {
  const mobile = useMobile()
  const [wins, setWins] = useState<Win[]>([])
  const [params, setParams] = useState<Record<string, string | undefined>>({})
  const zRef = useRef(10)
  const nextZ = () => ++zRef.current

  const active = wins.filter((w) => !w.min).sort((a, b) => b.z - a.z)[0]?.id

  const openFromHash = useCallback(() => {
    const { id, param } = parseHash()
    if (!id) return
    setParams((p) => ({ ...p, [id]: param }))
    const nz = nextZ()
    setWins((ws) =>
      ws.some((w) => w.id === id)
        ? ws.map((w) => (w.id === id ? { ...w, z: nz, min: false } : w))
        : [...ws, { id, geom: initialGeom(id, ws.length), z: nz, min: false, max: false }],
    )
  }, [])

  useEffect(() => {
    if (!parseHash().id && !mobile) window.location.hash = '#/welcome'
    openFromHash()
    window.addEventListener('hashchange', openFromHash)
    return () => window.removeEventListener('hashchange', openFromHash)
  }, [openFromHash])

  const navigate = useCallback(
    (hash: string) => {
      const target = hash.startsWith('#') ? hash : `#/${hash}`
      if (window.location.hash === target) openFromHash()
      else window.location.hash = target
    },
    [openFromHash],
  )

  // Keep the URL pointing at the focused window so it can be shared.
  useEffect(() => {
    if (!active) return
    const want = `#/${active}${params[active] ? `/${params[active]}` : ''}`
    if (window.location.hash !== want) history.replaceState(null, '', want)
  }, [active, params])

  const update = (id: string, f: (w: Win) => Win) => setWins((ws) => ws.map((w) => (w.id === id ? f(w) : w)))
  const focus = (id: string) => {
    if (id === active) return
    const nz = nextZ()
    update(id, (w) => ({ ...w, z: nz, min: false }))
  }
  const close = (id: string) => {
    setWins((ws) => ws.filter((w) => w.id !== id))
    if (wins.every((w) => w.id === id || w.min)) history.replaceState(null, '', '#/')
  }
  const toggleFromTaskbar = (id: string) => {
    const w = wins.find((x) => x.id === id)
    if (w && id === active && !w.min) update(id, (x) => ({ ...x, min: true }))
    else navigate(id)
  }

  const visible = mobile ? wins.filter((w) => w.id === active) : wins.filter((w) => !w.min)

  return (
    <div className={`desktop${mobile ? ' mobile' : ''}`}>
      <div className="wallpaper" aria-hidden="true">
        <div className="wall-grid">
          {WALLPAPER.map((i) => (
            <img key={i} src={`/images/Character${i}.webp`} alt="" />
          ))}
        </div>
        <div className="wall-glow" />
      </div>

      <nav className="desktop-icons" aria-label="Apps">
        {APPS.map((a) => (
          <a key={a.id} className="desk-icon" href={`#/${a.id}`} onClick={(e) => (e.preventDefault(), navigate(a.id))}>
            <span className="desk-glyph" style={{ ['--accent' as string]: a.accent }}>
              <Icon name={a.icon} size={mobile ? 30 : 28} />
            </span>
            <span className="desk-label">{mobile ? a.short : a.title.replace('Welcome to Remy OS', 'Welcome')}</span>
          </a>
        ))}
      </nav>

      {mobile && !active && (
        <div className="mobile-hero">
          <div className="brand">Remy OS</div>
          <div className="muted">Based Remy Boys · Base</div>
        </div>
      )}

      {visible.map((w) => {
        const def = appById(w.id)
        if (!def) return null
        const { Component } = def
        return (
          <Window
            key={w.id}
            title={def.title}
            icon={def.icon}
            accent={def.accent}
            geom={w.geom}
            z={w.z}
            active={w.id === active}
            maximized={w.max}
            mobile={mobile}
            onFocus={() => focus(w.id)}
            onClose={() => close(w.id)}
            onMinimize={() => update(w.id, (x) => ({ ...x, min: true }))}
            onToggleMax={() => update(w.id, (x) => ({ ...x, max: !x.max }))}
            onGeom={(geom) => update(w.id, (x) => ({ ...x, geom }))}
          >
            <Component param={params[w.id]} navigate={navigate} />
          </Window>
        )
      })}

      <Taskbar
        mobile={mobile}
        wins={wins.map((w) => ({ id: w.id, min: w.min }))}
        active={active}
        onTask={toggleFromTaskbar}
        onLaunch={navigate}
        onHome={() => setWins((ws) => ws.map((w) => ({ ...w, min: true })))}
      />
    </div>
  )
}
