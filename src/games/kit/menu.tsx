import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState } from 'react'
import type { MouseEvent as ReactMouseEvent } from 'react'
import { createPortal } from 'react-dom'
import { useShell } from '../../os/shell'
import './kit.css'
import './submenu.css'
import { useWindowState } from './window'

/** One command row of a game menu. */
export interface GameMenuCommand {
  /** Caption. `&` marks the mnemonic letter (`'&New'` underlines N); `&&` is a literal ampersand. */
  label: string
  /** Shortcut text shown right-aligned (`'F2'`, `'Ctrl+Z'`). Also registered as the accelerator unless `accel` says otherwise. */
  hotkey?: string
  /** Accelerator override: one combo or several (`'Ctrl+N'`), or `false` to show `hotkey` text without binding it. */
  accel?: string | string[] | false
  /** Draws a check mark (or a dot with `radio`). */
  checked?: boolean
  /** Check mark is a dot (one of a group). */
  radio?: boolean
  disabled?: boolean
  /** Runs when the row is chosen. Ignored on a row that has `items` (choosing it opens the submenu instead). */
  onClick?: () => void
  /** Turns the row into a cascading submenu (right arrow, flyout) holding these rows. Nests to any depth; `hotkey`/`accel` on the parent are ignored. */
  items?: GameMenuItem[]
}

/** A menu row: a command or `'-'` for a separator. */
export type GameMenuItem = '-' | GameMenuCommand

/** One pull-down of the menu bar. */
export interface GameMenu {
  /** Caption; `&` marks the mnemonic (`'&Game'`). Alt+letter opens it. */
  label: string
  items: GameMenuItem[]
}

/** Props of {@link GameMenuBar}. */
export interface GameMenuBarProps {
  menus: GameMenu[]
  /** Suspend the bar and every accelerator (e.g. while a game-owned overlay is up). In-window dialogs gate it automatically. */
  disabled?: boolean
  className?: string
  /**
   * Called with `true` when the bar enters menu mode (a title is lit — by Alt/F10, Alt+letter or the mouse — or any pull-down or submenu is open)
   * and `false` when it leaves it (item run, Esc, click outside, blur, deactivation, unmount). Fires only on changes, not on mount, and a new
   * callback identity never restarts anything: the latest one is always used. Games use it to pause while a menu is up.
   */
  onOpenChange?: (open: boolean) => void
}

type Mnemonic = { text: string; at: number; key?: string }

/** Split an `&`-marked caption into display text and mnemonic position. */
function parseMnemonic(label: string): Mnemonic {
  let text = ''
  let at = -1
  for (let i = 0; i < label.length; i++) {
    const c = label[i]
    if (c === '&') {
      if (label[i + 1] === '&') {
        text += '&'
        i++
      } else if (at < 0 && i + 1 < label.length) at = text.length
      continue
    }
    text += c
  }
  return { text, at, key: at >= 0 ? text[at].toLowerCase() : undefined }
}

function Caption({ label }: { label: string }) {
  const { text, at } = parseMnemonic(label)
  if (at < 0) return <>{text}</>
  return (
    <>
      {text.slice(0, at)}
      <u>{text[at]}</u>
      {text.slice(at + 1)}
    </>
  )
}

type Accel = { key: string; ctrl: boolean; shift: boolean; alt: boolean }

const KEY_ALIASES: Record<string, string> = {
  esc: 'escape',
  del: 'delete',
  ins: 'insert',
  pgup: 'pageup',
  pgdn: 'pagedown',
  up: 'arrowup',
  down: 'arrowdown',
  left: 'arrowleft',
  right: 'arrowright',
  space: ' ',
  spacebar: ' ',
  return: 'enter',
  plus: '+',
}

/** `'Ctrl+Shift+Z'` → matcher; Ctrl also accepts Cmd. */
function parseAccel(spec: string): Accel | undefined {
  const m = /^((?:(?:ctrl|control|shift|alt|cmd|meta|option)\+)*)(.+)$/i.exec(spec.trim())
  if (!m) return undefined
  const mods = m[1].toLowerCase()
  const key = m[2].trim().toLowerCase()
  return {
    key: KEY_ALIASES[key] ?? key,
    ctrl: /ctrl|control|cmd|meta/.test(mods),
    shift: mods.includes('shift'),
    alt: mods.includes('alt') || mods.includes('option'),
  }
}

function accelMatches(a: Accel, e: KeyboardEvent): boolean {
  if (a.ctrl !== (e.ctrlKey || e.metaKey) || a.alt !== e.altKey) return false
  const k = e.key.toLowerCase()
  const symbol = a.key.length === 1 && !/[a-z0-9]/.test(a.key)
  if (!symbol && a.shift !== e.shiftKey) return false
  if (k === a.key) return true
  // Option/Shift change `key` on some layouts: fall back to the physical key.
  return a.key.length === 1 && (e.code === `Key${a.key.toUpperCase()}` || e.code === `Digit${a.key}`)
}

function letterOf(e: KeyboardEvent): string | undefined {
  if (e.code.startsWith('Key')) return e.code.slice(3).toLowerCase()
  if (e.code.startsWith('Digit')) return e.code.slice(5)
  return e.key.length === 1 ? e.key.toLowerCase() : undefined
}

function commandsOf(items: GameMenuItem[], out: { accel: Accel; cmd: GameMenuCommand }[] = []): { accel: Accel; cmd: GameMenuCommand }[] {
  for (const it of items) {
    if (it === '-' || it.disabled) continue
    if (it.items) {
      commandsOf(it.items, out)
      continue
    }
    if (!it.onClick || it.accel === false) continue
    const specs = it.accel === undefined ? (it.hotkey ? [it.hotkey] : []) : [it.accel].flat()
    for (const s of specs) {
      const accel = parseAccel(s)
      if (accel) out.push({ accel, cmd: it })
    }
  }
  return out
}

const selectable = (it: GameMenuItem | undefined): it is GameMenuCommand => !!it && it !== '-' && !it.disabled

/** Next selectable index from `from` in direction `dir` (wraps); -1 when none. */
function step(items: GameMenuItem[], from: number, dir: 1 | -1): number {
  const n = items.length
  for (let k = 1; k <= n; k++) {
    const i = (((from + dir * k) % n) + n) % n
    if (selectable(items[i])) return i
  }
  return -1
}

const firstOf = (items: GameMenuItem[]) => step(items, -1, 1)
const lastOf = (items: GameMenuItem[]) => step(items, items.length, -1)

function isEditable(t: EventTarget | null): boolean {
  const el = t as HTMLElement | null
  return !!el && (el.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName))
}

/** A row that cascades into a submenu. */
const isParent = (it: GameMenuItem | undefined): it is GameMenuCommand & { items: GameMenuItem[] } => !!it && it !== '-' && !!it.items

/** Rows of the pull-down at `level` (0 = the bar's pull-down) following the lit rows in `path`. */
function itemsAt(root: GameMenuItem[], path: number[], level: number): GameMenuItem[] {
  let items = root
  for (let k = 0; k < level; k++) {
    const it = items[path[k]]
    if (!isParent(it)) return []
    items = it.items
  }
  return items
}

/**
 * Menu bar navigation state: which title is lit, whether its pull-down is open, and the lit row at every open level.
 * `path[k]` is the lit row (-1 = none) of the pull-down at depth k; a submenu is open for `path[k]` exactly when `path.length > k + 1`.
 */
type Nav = { bar: number; open: boolean; path: number[] }

/**
 * Classic Windows XP menu bar for a game window.
 *
 * - Mouse: click a title to open, hover to switch while open, click outside / blur to close.
 * - Keyboard: Alt or F10 lights the bar; ←/→ move between menus, ↑/↓/Home/End between rows, Enter/Space run,
 *   a mnemonic letter opens or runs, Esc steps back out. Alt+letter opens a menu directly. On a row with `items`
 *   → / Enter / Space / its mnemonic open the cascading submenu, ← / Esc close it.
 * - Mouse on a cascade row: hover opens its submenu (and closes a sibling's), click keeps it open.
 * - Accelerators (`hotkey` / `accel`, also on rows of enabled submenus) fire only while the game window is the active, visible window, no in-window
 *   dialog or other dialog owns focus, and the target is not a text field (modifier-less keys).
 * - Losing activation (or minimizing) closes any open menu.
 */
export function GameMenuBar({ menus, disabled, className, onOpenChange }: GameMenuBarProps) {
  const { active, hidden } = useWindowState()
  const live = active && !hidden && !disabled
  const id = useId()
  const theme = useShell((s) => s.prefs.theme)
  const rootRef = useRef<HTMLDivElement>(null)
  const barRefs = useRef<(HTMLButtonElement | null)[]>([])
  const menusRef = useRef(menus)
  menusRef.current = menus
  const navRef = useRef<Nav | null>(null)
  const [nav, setNav] = useState<Nav | null>(null)

  const go = useCallback((next: Nav | null) => {
    navRef.current = next
    setNav(next)
  }, [])

  // Report entering/leaving menu mode through the latest callback; only real transitions fire it.
  const onOpenChangeRef = useRef(onOpenChange)
  onOpenChangeRef.current = onOpenChange
  const reported = useRef(false)
  const inMenu = nav !== null
  useEffect(() => {
    if (reported.current === inMenu) return
    reported.current = inMenu
    onOpenChangeRef.current?.(inMenu)
  }, [inMenu])
  useEffect(
    () => () => {
      if (reported.current) onOpenChangeRef.current?.(false)
    },
    [],
  )

  useEffect(() => {
    if (!live) go(null)
  }, [live, go])

  useEffect(() => {
    if (!live) return
    let altPending = false

    /** True when a dialog (ours or any `[role=dialog]` holding focus) owns the keyboard. */
    const blocked = () => {
      if ((document.activeElement as Element | null)?.closest('[role=dialog],[role=alertdialog]')) return true
      const win = rootRef.current?.closest('.window') ?? document
      return !!win.querySelector('.gk-modal')
    }
    const run = (cmd: GameMenuCommand) => {
      go(null)
      cmd.onClick?.()
    }
    const open = (bar: number, path: number[]) => go({ bar, open: true, path })
    const eat = (e: Event) => {
      e.preventDefault()
      e.stopPropagation()
    }

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.isComposing) return
      if (blocked()) {
        altPending = false
        if (navRef.current) go(null)
        return
      }
      if (e.key === 'Alt') {
        if (!e.repeat) altPending = true
        return
      }
      altPending = false
      const ms = menusRef.current
      const plain = !e.ctrlKey && !e.metaKey

      if (e.key === 'F10' && plain && !e.shiftKey && !e.altKey) {
        eat(e)
        go(navRef.current ? null : { bar: 0, open: false, path: [] })
        return
      }
      if (e.altKey && plain && !e.shiftKey) {
        const k = letterOf(e)
        const i = k ? ms.findIndex((m) => parseMnemonic(m.label).key === k) : -1
        if (i >= 0) {
          eat(e)
          open(i, [-1])
          return
        }
      }

      const n = navRef.current
      if (n && plain && !e.altKey) {
        const root = ms[n.bar]?.items ?? []
        // The pull-down that has the keyboard: the deepest open level.
        const depth = Math.max(0, n.path.length - 1)
        const items = itemsAt(root, n.path, depth)
        const cur = n.open ? (n.path[depth] ?? -1) : -1
        const parents = n.path.slice(0, depth)
        /** Light row `i` of the deepest level. */
        const at = (i: number) => open(n.bar, [...parents, i])
        /** Run a row, or open its submenu with the first row lit. */
        const choose = (it: GameMenuCommand, i: number) => {
          if (it.items) open(n.bar, [...parents, i, firstOf(it.items)])
          else run(it)
        }
        const sideways = (dir: 1 | -1) => {
          const bar = (n.bar + dir + ms.length) % ms.length
          go({ bar, open: n.open, path: n.open ? [firstOf(ms[bar].items)] : [] })
        }
        eat(e)
        switch (e.key) {
          case 'Escape':
            if (n.open && depth > 0) go({ bar: n.bar, open: true, path: parents })
            else go(n.open ? { bar: n.bar, open: false, path: [] } : null)
            return
          case 'Tab':
            go(null)
            return
          case 'ArrowLeft':
            if (n.open && depth > 0) go({ bar: n.bar, open: true, path: parents })
            else sideways(-1)
            return
          case 'ArrowRight': {
            const it = items[cur]
            if (n.open && selectable(it) && it.items) choose(it, cur)
            else sideways(1)
            return
          }
          case 'ArrowDown':
            at(n.open ? step(items, cur, 1) : firstOf(items))
            return
          case 'ArrowUp':
            at(n.open ? step(items, cur < 0 ? 0 : cur, -1) : lastOf(items))
            return
          case 'Home':
            if (n.open) at(firstOf(items))
            return
          case 'End':
            if (n.open) at(lastOf(items))
            return
          case 'Enter':
          case ' ': {
            if (!n.open) return open(n.bar, [firstOf(items)])
            const it = items[cur]
            if (selectable(it)) choose(it, cur)
            return
          }
        }
        const k = e.key.length === 1 ? e.key.toLowerCase() : undefined
        if (!k) return
        if (n.open) {
          const hits = items.flatMap((it, i) => (selectable(it) && parseMnemonic(it.label).key === k ? [i] : []))
          if (hits.length === 1) choose(items[hits[0]] as GameMenuCommand, hits[0])
          else if (hits.length > 1) at(hits.find((i) => i > cur) ?? hits[0])
        } else {
          const i = ms.findIndex((m) => parseMnemonic(m.label).key === k)
          if (i >= 0) open(i, [firstOf(ms[i].items)])
        }
        return
      }

      const typing = isEditable(e.target)
      for (const { accel, cmd } of ms.flatMap((m) => commandsOf(m.items))) {
        if (!accelMatches(accel, e)) continue
        if (typing && !accel.ctrl && !accel.alt && !/^f\d+$/.test(accel.key)) continue
        eat(e)
        run(cmd)
        return
      }
    }
    const onKeyUp = (e: KeyboardEvent) => {
      if (e.key !== 'Alt' || !altPending) return
      altPending = false
      if (blocked()) return
      e.preventDefault()
      go(navRef.current ? null : { bar: 0, open: false, path: [] })
    }
    const onPointerDown = (e: PointerEvent) => {
      altPending = false
      if (navRef.current && !(e.target as Element).closest?.(`[data-gk-menu="${id}"]`)) go(null)
    }
    const onBlur = () => {
      altPending = false
      go(null)
    }

    window.addEventListener('keydown', onKeyDown, true)
    window.addEventListener('keyup', onKeyUp, true)
    window.addEventListener('pointerdown', onPointerDown, true)
    window.addEventListener('blur', onBlur)
    return () => {
      window.removeEventListener('keydown', onKeyDown, true)
      window.removeEventListener('keyup', onKeyUp, true)
      window.removeEventListener('pointerdown', onPointerDown, true)
      window.removeEventListener('blur', onBlur)
    }
  }, [live, go, id])

  // Keep the page focus where it was (the game surface) when clicking the bar.
  const keepFocus = (e: ReactMouseEvent) => e.preventDefault()
  const current = nav?.open ? menus[nav.bar] : undefined
  const anchor = nav?.open ? barRefs.current[nav.bar] : null

  return (
    <div ref={rootRef} role="menubar" className={`gk-menubar${className ? ` ${className}` : ''}`} data-gk-menu={id} onMouseDown={keepFocus}>
      {menus.map((m, i) => {
        const lit = nav?.bar === i
        return (
          <button
            type="button"
            role="menuitem"
            aria-haspopup="menu"
            aria-expanded={lit && nav?.open}
            // biome-ignore lint/suspicious/noArrayIndexKey: menus are positional
            key={i}
            ref={(el) => {
              barRefs.current[i] = el
            }}
            tabIndex={-1}
            disabled={disabled}
            className={`gk-mb${lit ? (nav?.open ? ' open' : ' hl') : ''}`}
            onClick={() => (lit && nav?.open ? go(null) : go({ bar: i, open: true, path: [-1] }))}
            onPointerEnter={() => {
              const n = navRef.current
              if (n && n.bar !== i) go({ bar: i, open: n.open, path: n.open ? [-1] : [] })
            }}
          >
            <Caption label={m.label} />
          </button>
        )
      })}
      {current && anchor && nav && (
        <Dropdown
          owner={id}
          theme={theme}
          anchor={anchor}
          level={0}
          items={current.items}
          path={nav.path}
          onPath={(path) => go({ bar: nav.bar, open: true, path })}
          onRun={(cmd) => {
            go(null)
            cmd.onClick?.()
          }}
        />
      )}
    </div>
  )
}

/** One pull-down of the cascade. Level 0 hangs under the bar title; deeper levels fly out beside their parent row and render themselves recursively. */
function Dropdown(p: {
  owner: string
  theme: string
  anchor: HTMLElement
  level: number
  items: GameMenuItem[]
  /** Lit row per open level of the whole cascade (see {@link Nav}). */
  path: number[]
  onPath: (path: number[]) => void
  onRun: (cmd: GameMenuCommand) => void
}) {
  const ref = useRef<HTMLDivElement>(null)
  const rowRefs = useRef<(HTMLButtonElement | null)[]>([])
  const [pos, setPos] = useState<{ x: number; y: number }>()
  const side = p.level > 0
  const lit = p.path[p.level] ?? -1
  const deeper = p.path.length > p.level + 1
  const parents = p.path.slice(0, p.level)
  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    const r = p.anchor.getBoundingClientRect()
    const { width, height } = el.getBoundingClientRect()
    if (side) {
      // Overlap the parent's border by 2px; the 3px is this menu's own border + padding so the first rows line up.
      const right = r.right - 2
      const x = right + width > window.innerWidth ? Math.max(0, r.left - width + 2) : right
      const y = Math.max(0, Math.min(r.top - 3, window.innerHeight - height))
      setPos({ x, y })
      return
    }
    const x = Math.max(0, Math.min(r.left, window.innerWidth - width))
    const below = r.bottom
    const y = below + height > window.innerHeight ? Math.max(0, r.top - height) : below
    setPos({ x, y })
  }, [p.anchor, side])

  const litItem = p.items[lit]
  const subAnchor = deeper && selectable(litItem) && litItem.items ? rowRefs.current[lit] : null

  return createPortal(
    <div className={`theme-${p.theme}`}>
      <div
        ref={ref}
        role="menu"
        data-gk-menu={p.owner}
        className="ctx-menu gk-menu"
        style={pos ? { left: pos.x, top: pos.y } : { left: 0, top: 0, visibility: 'hidden' }}
        onMouseDown={(e) => e.preventDefault()}
        onContextMenu={(e) => e.preventDefault()}
      >
        {p.items.map((it, i) => {
          if (it === '-') {
            // biome-ignore lint/suspicious/noArrayIndexKey: separators are positional
            return <hr key={i} />
          }
          const cascade = !!it.items
          // Light the row, opening its submenu (nothing lit inside) when it cascades; leave an already open one alone.
          const light = () => {
            if (it.disabled) {
              if (deeper) p.onPath([...parents, -1])
            } else if (cascade) {
              if (lit !== i || !deeper) p.onPath([...parents, i, -1])
            } else if (lit !== i || deeper) p.onPath([...parents, i])
          }
          return (
            <button
              // biome-ignore lint/suspicious/noArrayIndexKey: rows are positional
              key={i}
              ref={(el) => {
                rowRefs.current[i] = el
              }}
              type="button"
              role={it.radio ? 'menuitemradio' : it.checked !== undefined ? 'menuitemcheckbox' : 'menuitem'}
              aria-checked={it.checked}
              aria-haspopup={cascade ? 'menu' : undefined}
              aria-expanded={cascade ? lit === i && deeper : undefined}
              tabIndex={-1}
              disabled={it.disabled}
              className={`ctx-item gk-mi${lit === i ? ' hl' : ''}`}
              onPointerEnter={light}
              onClick={() => (cascade ? light() : p.onRun(it))}
            >
              <span className="gk-mi-check">{it.checked ? (it.radio ? '●' : '✓') : ''}</span>
              <span className="gk-mi-label">
                <Caption label={it.label} />
              </span>
              {it.hotkey && !cascade && <span className="gk-mi-key">{it.hotkey}</span>}
              {cascade && <span className="gk-mi-arrow">▶</span>}
            </button>
          )
        })}
      </div>
      {subAnchor && selectable(litItem) && litItem.items && (
        <Dropdown
          key={lit}
          owner={p.owner}
          theme={p.theme}
          anchor={subAnchor}
          level={p.level + 1}
          items={litItem.items}
          path={p.path}
          onPath={p.onPath}
          onRun={p.onRun}
        />
      )}
    </div>,
    document.body,
  )
}
