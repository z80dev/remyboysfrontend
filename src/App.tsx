import { useCallback, useEffect, useRef, useState } from 'react'
import { useAccount, useDisconnect } from 'wagmi'
import { MessageBoxHost } from './os/Balloons'
import { DesktopIcons, Wallpaper, useDesktopMenu } from './os/Desktop'
import { HalloweenMint } from './os/Halloween'
import { Pocket } from './os/Pocket'
import { Session, type SessionStage, TurnOffDialog } from './os/Session'
import { Taskbar } from './os/Taskbar'
import { TASKBAR_H, type WinGeom, Window, focusActiveWindow } from './os/Window'
import { type AppDef, type AppProps, appById, isTeam, linkById } from './os/apps'
import { IconDefs } from './os/icons'
import { MobileContext, useShell } from './os/shell'
import { TeamPrompt, useSecurityBalloons } from './os/system'
import { usePetBalloon } from './pet/save'

type Win = { id: string; geom: WinGeom; z: number; min: boolean; max: boolean; title?: string; closeGuard?: () => void }

const SESSION_KEY = 'remyxp.session'

function parseHash(): { id?: string; param?: string } {
  const [id, param] = window.location.hash.replace(/^#\/?/, '').split('/')
  return { id: id && appById(id) ? id : undefined, param: param || undefined }
}

function useMobile() {
  // Phones in landscape (short, touch-first) get the Pocket shell too: the desktop shell has no room there.
  const q = '(max-width: 720px), (pointer: coarse) and (max-height: 480px)'
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

/** Keep the bypass close callback stable for the lifetime of the open application. */
function WindowApplication({ Component, param, navigate, close: onClose }: AppProps & { Component: AppDef['Component'] }) {
  const latestClose = useRef(onClose)
  latestClose.current = onClose
  const close = useCallback(() => latestClose.current(), [])
  return <Component param={param} navigate={navigate} close={close} />
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
  const [windowHost, setWindowHost] = useState<HTMLElement | null>(null)
  const pocketHost = useCallback((node: HTMLSpanElement | null) => setWindowHost(node?.parentElement ?? null), [])
  const zRef = useRef(10)

  useSecurityBalloons(session === null)
  usePetBalloon(session === null)

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
      const link = linkById(hash)
      if (link) {
        window.open(link.href, '_blank', 'noopener')
        return
      }
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
  const requestClose = (id: string) => {
    const guard = wins.find((w) => w.id === id)?.closeGuard
    if (guard) guard()
    else close(id)
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
    // The log-on/boot overlay held focus; give it back to the window the visitor is about to type into.
    requestAnimationFrame(() => focusActiveWindow())
  }, [])
  const logOff = () => {
    if (address) disconnect()
    setSession('login')
  }

  // Every open app owns one mounted instance; only its visible shell frame follows the breakpoint.
  const renderWindow = (w: Win) => {
    const def = appById(w.id)
    if (!def) return null
    const { Component } = def
    const hidden = mobile ? w.id !== active : w.min
    return (
      <Window
        key={w.id}
        host={!hidden || def.persistent ? windowHost : null}
        title={def.title}
        icon={def.icon}
        geom={w.geom}
        z={w.z}
        active={session === null && !powerDialog && w.id === active}
        maximized={w.max}
        mobile={mobile}
        dialog={def.dialog}
        resizable={def.resizable}
        skinned={def.skinned}
        hidden={hidden}
        onFocus={() => focus(w.id)}
        onClose={() => requestClose(w.id)}
        onMinimize={() => update(w.id, (x) => ({ ...x, min: true }))}
        onToggleMax={() => def.resizable !== false && update(w.id, (x) => ({ ...x, max: !x.max }))}
        onGeom={(geom) => update(w.id, (x) => ({ ...x, geom }))}
        onTitle={(title) => update(w.id, (x) => (x.title === title ? x : { ...x, title }))}
        onCloseGuard={(closeGuard) => update(w.id, (x) => (x.closeGuard === closeGuard ? x : { ...x, closeGuard }))}
      >
        <WindowApplication Component={Component} param={params[w.id]} navigate={navigate} close={() => close(w.id)} />
      </Window>
    )
  }

  const menu = useDesktopMenu(navigate)

  return (
    <MobileContext.Provider value={mobile}>
      <IconDefs />
      <div className={`xp theme-${theme}${powerDialog ? ' fading' : ''}`}>
        {mobile ? (
          <Pocket
            active={active}
            title={wins.find((w) => w.id === active)?.title}
            open={wins.map((w) => w.id)}
            onLaunch={navigate}
            onClose={requestClose}
            onToday={minimizeAll}
            onLogOff={logOff}
          >
            <span hidden ref={pocketHost} />
          </Pocket>
        ) : (
          <div className="desktop" ref={setWindowHost} onContextMenu={menu.onContextMenu}>
            <Wallpaper />
            <DesktopIcons open={navigate} />
            <HalloweenMint />
            {menu.element}
            <Taskbar
              wins={wins.map((w) => ({ id: w.id, min: w.min, title: w.title }))}
              active={active}
              onTask={toggleFromTaskbar}
              onLaunch={navigate}
              onLogOff={logOff}
              onTurnOff={() => setPowerDialog(true)}
            />
          </div>
        )}
        {wins.map(renderWindow)}
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
