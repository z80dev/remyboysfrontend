import { useCallback, useEffect, useRef, useState } from 'react'
import { useAccount, useDisconnect } from 'wagmi'
import { appById, isTeam } from './os/apps'
import { MessageBoxHost } from './os/Balloons'
import { DesktopIcons, Wallpaper, useDesktopMenu } from './os/Desktop'
import { HalloweenMint } from './os/Halloween'
import { IconDefs } from './os/icons'
import { Pocket } from './os/Pocket'
import { Session, type SessionStage, TurnOffDialog } from './os/Session'
import { MobileContext, useShell } from './os/shell'
import { TeamPrompt, useSecurityBalloons } from './os/system'
import { Taskbar } from './os/Taskbar'
import { TASKBAR_H, Window, type WinGeom } from './os/Window'

type Win = { id: string; geom: WinGeom; z: number; min: boolean; max: boolean }

const SESSION_KEY = 'remyxp.session'

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
  const vh = window.innerHeight - TASKBAR_H
  const W = Math.min(w, vw - 120)
  const H = Math.min(h, vh - 24)
  const off = (count % 6) * 26
  const x = Math.min(Math.max(112, (vw - W) / 2 + off), Math.max(8, vw - W - 8))
  const y = Math.max(8, Math.min((vh - H) / 2 - 12 + off, vh - H - 8))
  return { w: W, h: H, x: Math.round(x), y: Math.round(y) }
}

export default function App() {
  const mobile = useMobile()
  const theme = useShell((s) => s.prefs.theme)
  const { address } = useAccount()
  const { disconnect } = useDisconnect()
  const [session, setSession] = useState<SessionStage | null>(() => (sessionStorage.getItem(SESSION_KEY) ? null : 'boot'))
  const [powerDialog, setPowerDialog] = useState(false)
  const [wins, setWins] = useState<Win[]>([])
  const [params, setParams] = useState<Record<string, string | undefined>>({})
  const zRef = useRef(10)

  useSecurityBalloons(session === null)

  const active = wins.filter((w) => !w.min).sort((a, b) => b.z - a.z)[0]?.id

  const openFromHash = useCallback(() => {
    const { id, param } = parseHash()
    if (!id) return
    setParams((p) => ({ ...p, [id]: param }))
    const nz = ++zRef.current
    setWins((ws) =>
      ws.some((w) => w.id === id)
        ? ws.map((w) => (w.id === id ? { ...w, z: nz, min: false } : w))
        : [...ws, { id, geom: initialGeom(id, ws.length), z: nz, min: false, max: false }],
    )
  }, [])

  // Mount only: desktop visitors without a deep link land on Welcome; phones land on Today.
  // biome-ignore lint/correctness/useExhaustiveDependencies: must not re-run when the viewport crosses the breakpoint
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
    const nz = ++zRef.current
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
  const minimizeAll = () => setWins((ws) => ws.map((w) => ({ ...w, min: true })))
  const closeAll = () => {
    setWins([])
    history.replaceState(null, '', '#/')
  }

  const endSession = useCallback(() => {
    sessionStorage.setItem(SESSION_KEY, '1')
    setSession(null)
  }, [])
  const logOff = () => {
    if (address) disconnect()
    setSession('login')
  }

  // Apps flagged `persistent` (Winamp) stay mounted while minimized so they keep playing; unmount means closed.
  const persistent = (w: Win) => !!appById(w.id)?.persistent
  const renderWindow = (w: Win, hidden = false) => {
    const def = appById(w.id)
    if (!def) return null
    const { Component } = def
    return (
      <Window
        key={w.id}
        title={def.title}
        icon={def.icon}
        geom={w.geom}
        z={w.z}
        active={w.id === active}
        maximized={w.max}
        mobile={mobile}
        dialog={def.dialog}
        skinned={def.skinned}
        hidden={hidden}
        onFocus={() => focus(w.id)}
        onClose={() => close(w.id)}
        onMinimize={() => update(w.id, (x) => ({ ...x, min: true }))}
        onToggleMax={() => update(w.id, (x) => ({ ...x, max: !x.max }))}
        onGeom={(geom) => update(w.id, (x) => ({ ...x, geom }))}
      >
        <Component param={params[w.id]} navigate={navigate} close={() => close(w.id)} />
      </Window>
    )
  }

  const menu = useDesktopMenu(navigate)

  return (
    <MobileContext.Provider value={mobile}>
      <IconDefs />
      <div className={`xp theme-${theme}${powerDialog ? ' fading' : ''}`}>
        {mobile ? (
          <Pocket active={active} open={wins.map((w) => w.id)} onLaunch={navigate} onClose={close} onToday={minimizeAll} onLogOff={logOff}>
            {wins.filter((w) => w.id === active || persistent(w)).map((w) => renderWindow(w, w.id !== active))}
          </Pocket>
        ) : (
          <div className="desktop" onContextMenu={menu.onContextMenu}>
            <Wallpaper />
            <DesktopIcons open={navigate} />
            <HalloweenMint />
            {wins.filter((w) => !w.min || persistent(w)).map((w) => renderWindow(w, w.min))}
            {menu.element}
            <Taskbar
              wins={wins.map((w) => ({ id: w.id, min: w.min }))}
              active={active}
              onTask={toggleFromTaskbar}
              onLaunch={navigate}
              onLogOff={logOff}
              onTurnOff={() => setPowerDialog(true)}
            />
          </div>
        )}
      </div>
      {powerDialog && (
        <TurnOffDialog
          onCancel={() => setPowerDialog(false)}
          onStandBy={() => {
            setPowerDialog(false)
            minimizeAll()
          }}
          onTurnOff={() => {
            setPowerDialog(false)
            closeAll()
            logOff()
          }}
          onRestart={() => {
            setPowerDialog(false)
            closeAll()
            setSession('boot')
          }}
        />
      )}
      {session === null && isTeam(address) && <TeamPrompt navigate={navigate} />}
      <MessageBoxHost />
      {session && <Session key={session} stage={session} onDone={endSession} />}
    </MobileContext.Provider>
  )
}
