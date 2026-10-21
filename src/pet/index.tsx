/**
 * Remygotchi (#/pet): raise your Remys like a keychain pet. The device on the left is the pet's screen; the panel on
 * the right holds status, the daily streak and quests, the shop, the closet and the adoption center. Rules live in
 * engine.ts; everything here is presentation. The save is local (`remygames.remygotchi.v1`).
 */
import '@fontsource/lilita-one/400.css'
import '@fontsource/pixelify-sans/500.css'
import '@fontsource/pixelify-sans/700.css'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useAccount } from 'wagmi'
import { loadCabald, loadPalette, pickRemys } from '../games/kit/remy'
import { useGamesMuted } from '../games/kit/sound'
import { saveGame } from '../games/kit/storage'
import { useWindowState, useWindowTitle } from '../games/kit/window'
import { useArtIndexes } from '../lib/art'
import { remyImg } from '../lib/media'
import { useOwnedIds } from '../lib/owned'
import type { AppProps } from '../os/apps'
import { messageBox } from '../os/shell'
import { ConnectPrompt } from '../os/ui'
import { HAT_PIXELS, HatArt } from './art'
import {
  COSMETICS, FOODS, HATS, ITEMS, MAX_FREEZES, MAX_STRAYS, type FoodId, type HatId, type MiniGame, type Pet, type PetEvent,
  type Result, ROOMS, type RoomId, STATS, type Save, type ShopId, activePet, addDays, adopt, bathe, buy, cannotPlay,
  claimGift, createSave, dayBonus, dayKey, feed, finishGame, giftFor, levelInfo, medicine, mood, pat,
  questText, release, rename, scoop, setRoom, streakState, switchPet, sync, toggleSleep, wearHat,
} from './engine'
import { type Bubble, type Fx, type Overlay, STAGE_W, Scene } from './Scene'
import { SAVE_ID, loadPetSave } from './save'
import { sfx } from './sound'
import './pet.css'

const SHARE_URL = 'https://basedremyboys.club/#/pet'

type Tab = 'status' | 'today' | 'shop' | 'closet' | 'remys'
type Celebration = { id: number; kind: 'streak' | 'milestone' | 'level' | 'freeze' | 'lost' | 'hatch'; title: string; text: string; big?: string }
type Toast = { id: number; text: string }

const MOOD_TEXT = {
  ecstatic: 'Over the moon',
  happy: 'Happy',
  okay: 'Doing okay',
  sad: 'Feeling down',
  miserable: 'Miserable',
  sick: 'Sick',
  sleeping: 'Sleeping',
} as const

const STAT_META = {
  hunger: { label: 'Hunger', icon: '🍙' },
  fun: { label: 'Fun', icon: '🎈' },
  energy: { label: 'Energy', icon: '⚡' },
  clean: { label: 'Clean', icon: '🫧' },
} as const

let uid = 0

/** The most colourful of a Remy's palette entries (`#rrggbb`), so suits and black hair don't make a grey device. */
function vivid(colors: string[]): string {
  let best = colors[0]
  let score = -1
  for (const c of colors) {
    const [r, g, b] = [1, 3, 5].map((i) => Number.parseInt(c.slice(i, i + 2), 16) / 255)
    const max = Math.max(r, g, b)
    const min = Math.min(r, g, b)
    const light = (max + min) / 2
    const sat = max === min ? 0 : (max - min) / (1 - Math.abs(2 * light - 1))
    const s = sat * (1 - Math.abs(light - 0.55))
    if (s > score) {
      score = s
      best = c
    }
  }
  return best
}

export default function Remygotchi(_: AppProps) {
  const [save, setSave] = useState<Save>(() => {
    const now = Date.now()
    return sync(loadPetSave() ?? createSave(now), now).save
  })
  const saveRef = useRef(save)
  const [now, setNow] = useState(Date.now())
  const [tab, setTab] = useState<Tab>(() => (save.pets.length === 0 ? 'remys' : save.today.done ? 'status' : 'today'))
  const [overlay, setOverlay] = useState<Overlay>(null)
  const [fx, setFx] = useState<Fx[]>([])
  const [bubble, setBubble] = useState<Bubble | null>(null)
  const [eating, setEating] = useState<FoodId | null>(null)
  const [bathing, setBathing] = useState(false)
  const [hatching, setHatching] = useState<number | null>(null)
  const [party, setParty] = useState<Celebration[]>([])
  const [toasts, setToasts] = useState<Toast[]>([])
  const { hidden, active } = useWindowState()
  const { muted, toggleMuted } = useGamesMuted()
  const pet = activePet(save)
  const timers = useRef<number[]>([])
  // The device's plastic takes the colour of the Remy's shirt.
  const [shell, setShell] = useState<string>()
  const art = pet?.art
  useEffect(() => {
    if (art === undefined) return
    let live = true
    loadPalette(art)
      .then((p) => live && setShell(vivid([p.shirt, p.hair, p.accent, p.bg])))
      .catch(() => {})
    return () => {
      live = false
    }
  }, [art])

  const later = useCallback((ms: number, fn: () => void) => {
    timers.current.push(window.setTimeout(fn, ms))
  }, [])
  useEffect(
    () => () => {
      for (const t of timers.current) window.clearTimeout(t)
    },
    [],
  )

  const burst = useCallback(
    (kind: Fx['kind'], x: number, y: number, n = 4) => {
      const add: Fx[] = Array.from({ length: n }, () => ({ id: ++uid, kind, x: x + (Math.random() - 0.5) * 24, y: y + (Math.random() - 0.5) * 10 }))
      setFx((f) => [...f, ...add])
      later(1300, () => setFx((f) => f.filter((e) => !add.includes(e))))
    },
    [later],
  )
  const say = useCallback(
    (b: Bubble, ms = 2400) => {
      setBubble(b)
      later(ms, () => setBubble((cur) => (cur === b ? null : cur)))
    },
    [later],
  )
  const toast = useCallback(
    (text: string) => {
      const t = { id: ++uid, text }
      setToasts((ts) => [...ts.slice(-2), t])
      later(3200, () => setToasts((ts) => ts.filter((x) => x !== t)))
    },
    [later],
  )
  const celebrate = useCallback((c: Omit<Celebration, 'id'>) => setParty((p) => [...p, { ...c, id: ++uid }]), [])

  const handle = useCallback(
    (events: PetEvent[], loud: boolean) => {
      const p = activePet(saveRef.current)
      const mid = STAGE_W / 2
      for (const e of events) {
        switch (e.type) {
          case 'say':
            say({ text: e.text, tone: e.tone })
            if (loud) (e.tone === 'happy' ? sfx.happy : sfx.no)()
            break
          case 'ate':
            setEating(e.food)
            sfx.chomp()
            later(1300, () => {
              setEating(null)
              burst('heart', mid, 70, 5)
              say({ text: e.food === 'golden' ? '✨ GOLDEN! ✨' : 'Yum!', tone: 'happy' }, 1400)
            })
            break
          case 'quest':
            toast(`✅ ${e.text.replace('your Remy', p?.name ?? 'your Remy')}  +${e.kernels} 🌽`)
            later(300, sfx.quest)
            break
          case 'dayDone':
            later(700, sfx.streak)
            celebrate({
              kind: 'streak',
              big: String(e.streak),
              title: e.streak === 1 ? 'Streak started!' : `${e.streak}-day streak!`,
              text: `All of today's care is done. ${p?.name ?? 'Your Remy'} loves you. +${e.kernels} 🌽 bonus — come back tomorrow to keep it going!`,
            })
            break
          case 'milestone': {
            const name = e.unlock ? COSMETICS[e.unlock]?.name : undefined
            const bits = [name && `Unlocked: ${name}!`, e.freeze && 'You earned a 🧊 Streak Freeze.'].filter(Boolean)
            if (bits.length) celebrate({ kind: 'milestone', big: '🏆', title: `${e.days} days in a row!`, text: bits.join(' ') })
            break
          }
          case 'level':
            later(400, sfx.level)
            if (e.grew)
              celebrate({ kind: 'level', big: '⭐', title: `${p?.name ?? 'Your Remy'} grew up!`, text: `Now a ${e.stage} (level ${e.level}). +20 🌽` })
            else toast(`⭐ Level ${e.level}!  +20 🌽`)
            break
          case 'freezeUsed':
            celebrate({ kind: 'freeze', big: '🧊', title: 'Streak saved!', text: `A Streak Freeze covered ${e.days === 1 ? 'the day' : `${e.days} days`} you missed. Your streak lives on!` })
            break
          case 'streakLost':
            if (loud) sfx.lost()
            celebrate({ kind: 'lost', big: '💔', title: `Your ${e.was}-day streak ended`, text: 'Everyone misses a day. Finish today\'s care to start a new streak — Streak Freezes in the shop can save the next one.' })
            break
          case 'sick':
            if (loud) sfx.sick()
            say({ text: "I don't feel so good…", tone: 'sad' }, 3000)
            break
          case 'poop':
            if (loud) sfx.poop()
            break
          case 'sleep':
            if (loud) sfx.sleep()
            break
          case 'wake':
            if (loud) sfx.wake()
            break
          case 'kernels':
            sfx.coin()
            burst('kernel', mid, 60, Math.min(6, Math.ceil(e.n / 5)))
            break
        }
      }
    },
    [burst, celebrate, later, say, toast],
  )

  const dispatch = useCallback(
    (fn: (s: Save, now: number) => Result, loud = true) => {
      const r = fn(saveRef.current, Date.now())
      saveRef.current = r.save
      setSave(r.save)
      saveGame(SAVE_ID, r.save)
      handle(r.events, loud)
      return r
    },
    [handle],
  )

  // Opening the app catches up first (overnight drain, day rollover); the pet keeps living while the window is open.
  // biome-ignore lint/correctness/useExhaustiveDependencies: mount only
  useEffect(() => {
    dispatch(sync, false)
  }, [])
  useEffect(() => {
    if (hidden) return
    setNow(Date.now())
    dispatch(sync, active)
    let n = 0
    const id = window.setInterval(() => {
      setNow(Date.now())
      if (++n % 10 === 0) dispatch(sync, active)
    }, 1000)
    return () => window.clearInterval(id)
  }, [hidden, active, dispatch])

  const want = pet ? STATS.filter((s) => pet.stats[s] < 30) : []
  useWindowTitle(pet ? `Remygotchi — ${pet.name}${pet.sick ? ' is sick!' : want.length ? ' needs you!' : ''}` : 'Remygotchi')

  // ─── Device buttons ─────────────────────────────────────────────────────────────────────────────────────────
  const busy = hatching !== null || !!eating || bathing || overlay === 'cups' || overlay === 'hilo'
  const onFeedButton = () => {
    sfx.click()
    if (pet?.asleep) return say({ text: 'Zzz…', tone: 'no' })
    setOverlay(overlay === 'feed' ? null : 'feed')
  }
  const onPlayButton = () => {
    sfx.click()
    if (!pet) return
    const no = cannotPlay(pet)
    if (no) {
      sfx.no()
      return say({ text: no, tone: 'sad' })
    }
    setOverlay(overlay === 'games' ? null : 'games')
  }
  const onBath = () => {
    if (!pet) return
    setOverlay(null)
    const r = dispatch(bathe)
    if (r.events.some((e) => e.type === 'say')) return
    setBathing(true)
    sfx.bath()
    burst('bubble', STAGE_W / 2, 70, 8)
    later(1500, () => {
      setBathing(false)
      burst('sparkle', STAGE_W / 2, 60, 6)
      say({ text: 'Squeaky clean!', tone: 'happy' }, 1500)
    })
  }
  const onLights = () => {
    setOverlay(null)
    dispatch(toggleSleep)
  }
  const onMeds = () => {
    setOverlay(null)
    dispatch(medicine)
  }

  const onPat = (x: number, y: number) => {
    if (!pet || busy) return
    if (pet.asleep) {
      say({ text: 'Zzz… (shh!)', tone: 'no' }, 1200)
      return
    }
    sfx.pat()
    burst('heart', x, y - 6, 3)
    dispatch(pat)
  }
  const onScoop = () => {
    sfx.scoop()
    burst('sparkle', STAGE_W / 2, 132, 3)
    dispatch(scoop)
  }
  const onFeed = (food: FoodId) => {
    setOverlay(null)
    dispatch((s, t) => feed(s, t, food))
  }
  const onPlay = (game: MiniGame) => {
    sfx.click()
    setOverlay(game)
  }
  const onGameDone = (won: boolean) => {
    setOverlay(null)
    dispatch((s, t) => finishGame(s, t, won))
    if (won) burst('star', STAGE_W / 2, 50, 6)
  }

  const doAdopt = (remy: { art: number; token?: string }) => {
    const known = saveRef.current.pets.some((p) => p.id === (remy.token !== undefined ? `t${remy.token}` : `a${remy.art}`))
    const r = dispatch((s, t) => adopt(s, t, remy))
    if (r.save.active === saveRef.current.active && r.events.some((e) => e.type === 'say')) return
    setOverlay(null)
    if (known) {
      sfx.click()
      setTab('status')
      return
    }
    setHatching(remy.art)
    sfx.hatch()
    later(2600, () => {
      setHatching(null)
      burst('star', STAGE_W / 2, 60, 8)
      const p = activePet(saveRef.current)
      celebrate({ kind: 'hatch', big: '🥚', title: `Say hi to ${p?.name ?? 'your Remy'}!`, text: 'Feed, play and bathe your Remy every day. Finish the three daily quests to grow your streak 🔥' })
      setTab('today')
    })
  }

  const top = party[0]

  return (
    <div className={`pg${pet?.asleep ? ' pg-dark' : ''}`}>
      <header className="pg-top">
        <div className="pg-brand">
          <span className="pg-logo" aria-hidden="true" />
          <span>Remygotchi</span>
        </div>
        <div className="pg-pills">
          <button
            type="button"
            className={`pg-pill streak ${streakState(save)}`}
            onClick={() => setTab('today')}
            title={streakState(save) === 'risk' ? 'Finish today\'s quests to keep your streak!' : 'Daily streak'}
          >
            <span className="pg-flame" aria-hidden="true">
              🔥
            </span>
            <b>{save.streak.count}</b>
            <small>day{save.streak.count === 1 ? '' : 's'}</small>
          </button>
          <button type="button" className="pg-pill" onClick={() => setTab('shop')} title="Kernels: spend them in the shop">
            🌽 <b>{save.kernels}</b>
          </button>
          <span className="pg-pill" title={`Streak Freezes (hold ${MAX_FREEZES})`}>
            🧊 <b>{save.streak.freezes}</b>
          </span>
          <button type="button" className="pg-pill icon" onClick={toggleMuted} aria-label={muted ? 'Unmute' : 'Mute'} title={muted ? 'Unmute' : 'Mute'}>
            {muted ? '🔇' : '🔊'}
          </button>
        </div>
      </header>

      <div className="pg-main">
        <section className="pg-device-col">
          <div className="pg-device" style={shell ? { ['--shell' as string]: shell } : undefined}>
            <span className="pg-loop" aria-hidden="true" />
            <div className="pg-device-print">
              <span>REMYGOTCHI</span>
              <i>{pet ? `${pet.name} · Lv ${levelInfo(pet.xp).level}` : 'insert remy'}</i>
            </div>
            <div className="pg-bezel">
              <Scene
                save={save}
                pet={pet}
                now={now}
                hatching={hatching}
                overlay={overlay}
                fx={fx}
                bubble={bubble}
                eating={eating}
                bathing={bathing}
                onPat={onPat}
                onScoop={onScoop}
                onFeed={onFeed}
                onPlay={onPlay}
                onGameDone={onGameDone}
                onCloseOverlay={() => setOverlay(null)}
              />
              <div className="pg-toasts" aria-live="polite">
                {toasts.map((t) => (
                  <div key={t.id} className="pg-toast">
                    {t.text}
                  </div>
                ))}
              </div>
            </div>
            <div className="pg-buttons">
              <DeviceButton icon="🍙" label="Feed" color="a" disabled={!pet || busy} onClick={onFeedButton} on={overlay === 'feed'} />
              <DeviceButton icon="🎲" label="Play" color="b" disabled={!pet || busy} onClick={onPlayButton} on={overlay === 'games'} />
              <DeviceButton icon="🛁" label="Bath" color="c" disabled={!pet || busy} onClick={onBath} alert={!!pet && (pet.poops > 1 || pet.stats.clean < 30)} />
              <DeviceButton
                icon={pet?.asleep ? '☀️' : '🌙'}
                label={pet?.asleep ? 'Wake' : 'Sleep'}
                color="d"
                disabled={!pet || busy}
                onClick={onLights}
                alert={!!pet && !pet.asleep && pet.stats.energy < 25}
              />
              <DeviceButton icon="💊" label="Heal" color="e" disabled={!pet || busy} onClick={onMeds} alert={!!pet?.sick} />
            </div>
          </div>
        </section>

        <section className="pg-side">
          <nav className="pg-tabs" role="tablist">
            {(
              [
                ['status', 'Status'],
                ['today', 'Today'],
                ['shop', 'Shop'],
                ['closet', 'Closet'],
                ['remys', 'Remys'],
              ] as const
            ).map(([id, label]) => (
              <button
                type="button"
                key={id}
                role="tab"
                aria-selected={tab === id}
                className={`${tab === id ? 'on' : ''}${id === 'today' && !save.today.done && save.pets.length ? ' dot' : ''}`}
                onClick={() => {
                  sfx.click()
                  setTab(id)
                }}
              >
                {label}
              </button>
            ))}
          </nav>
          <div className="pg-panel">
            {tab === 'status' && (pet ? <StatusPanel pet={pet} save={save} dispatch={dispatch} /> : <EmptyPanel onGo={() => setTab('remys')} />)}
            {tab === 'today' && <TodayPanel save={save} now={now} pet={pet} dispatch={dispatch} />}
            {tab === 'shop' && <ShopPanel save={save} dispatch={dispatch} />}
            {tab === 'closet' && (pet ? <ClosetPanel save={save} pet={pet} dispatch={dispatch} /> : <EmptyPanel onGo={() => setTab('remys')} />)}
            {tab === 'remys' && <RemysPanel save={save} now={now} onAdopt={doAdopt} dispatch={dispatch} busy={hatching !== null} />}
          </div>
        </section>
      </div>

      {top && (
        <dialog open className={`pg-party kind-${top.kind}`} aria-label={top.title}>
          {top.kind !== 'lost' && <Confetti />}
          <div className="pg-party-card">
            {top.big && <div className={`pg-party-big${top.kind === 'streak' ? ' flame' : ''}`}>{top.big}</div>}
            <h2>{top.title}</h2>
            <p>{top.text}</p>
            <div className="pg-party-actions">
              {top.kind === 'streak' && (
                <a className="pg-btn ghost" href={shareLink(save, pet)} target="_blank" rel="noreferrer">
                  Share on 𝕏
                </a>
              )}
              <button
                type="button"
                className="pg-btn"
                // biome-ignore lint/a11y/noAutofocus: modal celebration takes focus
                autoFocus
                onClick={() => {
                  sfx.click()
                  setParty((p) => p.slice(1))
                }}
              >
                {top.kind === 'lost' ? "Let's go" : 'Yay!'}
              </button>
            </div>
          </div>
        </dialog>
      )}
    </div>
  )
}

function shareLink(save: Save, pet: Pet | undefined) {
  const n = save.streak.count
  const who = pet ? `${pet.name} (Remy #${pet.token ?? pet.art})` : 'my Remy'
  const text = `🔥 ${n}-day Remygotchi streak with ${who}! Come raise your Remy:`
  return `https://x.com/intent/post?text=${encodeURIComponent(text)}&url=${encodeURIComponent(SHARE_URL)}&via=basedremyboys`
}

function DeviceButton(props: { icon: string; label: string; color: string; disabled?: boolean; on?: boolean; alert?: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      className={`pg-dbtn c-${props.color}${props.on ? ' on' : ''}${props.alert ? ' alert' : ''}`}
      disabled={props.disabled}
      onClick={props.onClick}
    >
      <span className="pg-dbtn-cap" aria-hidden="true">
        {props.icon}
      </span>
      <small>{props.label}</small>
    </button>
  )
}

function Confetti() {
  const bits = useMemo(
    () =>
      Array.from({ length: 36 }, (_, i) => ({
        left: Math.random() * 100,
        delay: Math.random() * 0.6,
        dur: 1.8 + Math.random() * 1.4,
        hue: (i * 47) % 360,
        rot: Math.random() * 360,
      })),
    [],
  )
  return (
    <div className="pg-confetti" aria-hidden="true">
      {bits.map((b, i) => (
        <i
          // biome-ignore lint/suspicious/noArrayIndexKey: static decoration
          key={i}
          style={{
            left: `${b.left}%`,
            animationDelay: `${b.delay}s`,
            animationDuration: `${b.dur}s`,
            background: `hsl(${b.hue} 90% 60%)`,
            transform: `rotate(${b.rot}deg)`,
          }}
        />
      ))}
    </div>
  )
}

type Dispatch = (fn: (s: Save, now: number) => Result, loud?: boolean) => Result

function EmptyPanel({ onGo }: { onGo: () => void }) {
  return (
    <div className="pg-empty">
      <div className="pg-empty-egg" />
      <h3>No Remy yet!</h3>
      <p>Hatch one of your own Remys, or adopt a stray from today's adoption center.</p>
      <button type="button" className="pg-btn" onClick={onGo}>
        Choose a Remy
      </button>
    </div>
  )
}

function Meter({ label, icon, value, tone }: { label: string; icon: string; value: number; tone?: string }) {
  const v = Math.round(value)
  const level = v < 25 ? 'low' : v < 55 ? 'mid' : 'high'
  return (
    <div className={`pg-meter ${tone ?? level}`}>
      <span className="pg-meter-icon" aria-hidden="true">
        {icon}
      </span>
      <span className="pg-meter-label">{label}</span>
      <span className="pg-meter-bar" aria-hidden="true">
        <i style={{ width: `${v}%` }} />
        {Array.from({ length: 9 }, (_, i) => (
          // biome-ignore lint/suspicious/noArrayIndexKey: tick marks
          <b key={i} style={{ left: `${(i + 1) * 10}%` }} />
        ))}
      </span>
      <span className="pg-meter-num">{v}</span>
    </div>
  )
}

function StatusPanel({ pet, save, dispatch }: { pet: Pet; save: Save; dispatch: Dispatch }) {
  const [editing, setEditing] = useState(false)
  const [name, setName] = useState(pet.name)
  useEffect(() => setName(pet.name), [pet.name])
  const lvl = levelInfo(pet.xp)
  const m = mood(pet)
  const days = Math.max(1, Math.floor((Date.now() - pet.born) / 86_400_000) + 1)
  const commit = () => {
    setEditing(false)
    dispatch((s, t) => rename(s, t, name))
  }
  return (
    <div className="pg-status">
      <div className="pg-card-hero">
        <img {...remyImg(pet.art, '72px')} alt="" className="pg-portrait" />
        <div className="pg-hero-text">
          {editing ? (
            <form
              onSubmit={(e) => {
                e.preventDefault()
                commit()
              }}
            >
              {/* biome-ignore lint/a11y/noAutofocus: rename field opened on request */}
              <input className="pg-name-input" value={name} maxLength={16} autoFocus onChange={(e) => setName(e.target.value)} onBlur={commit} />
            </form>
          ) : (
            <button type="button" className="pg-name" onClick={() => setEditing(true)} title="Rename">
              {pet.name} <span aria-hidden="true">✎</span>
            </button>
          )}
          <div className="pg-sub">
            {pet.token !== undefined ? <span className="pg-tag holder">Remy #{pet.token}</span> : <span className="pg-tag">Stray · art {pet.art}</span>}
            <span className={`pg-tag mood-${m}`}>{MOOD_TEXT[m]}</span>
          </div>
          <div className="pg-xp">
            <span>
              <b>{lvl.stage}</b> · Level {lvl.level}
            </span>
            <span className="pg-xp-bar">
              <i style={{ width: `${(lvl.into / lvl.need) * 100}%` }} />
            </span>
            <small>
              {lvl.into}/{lvl.need} XP
            </small>
          </div>
        </div>
      </div>
      <div className="pg-meters">
        {STATS.map((s) => (
          <Meter key={s} label={STAT_META[s].label} icon={STAT_META[s].icon} value={pet.stats[s]} />
        ))}
        <Meter label="Health" icon={pet.sick ? '🤒' : '❤️'} value={pet.health} tone={pet.sick ? 'low sick' : undefined} />
      </div>
      {pet.poops > 0 && (
        <p className="pg-hint">
          💩 ×{pet.poops} on the floor — tap a mess to scoop it or give {pet.name} a bath.
        </p>
      )}
      {pet.sick && <p className="pg-hint warn">🤒 {pet.name} is sick. Use 💊 Heal (you have {save.items.medicine}).</p>}
      <dl className="pg-life">
        <div>
          <dt>Together</dt>
          <dd>
            {days} day{days === 1 ? '' : 's'}
          </dd>
        </div>
        <div>
          <dt>Meals</dt>
          <dd>{save.life.fed}</dd>
        </div>
        <div>
          <dt>Games won</dt>
          <dd>
            {save.life.wins}/{save.life.games}
          </dd>
        </div>
        <div>
          <dt>Best streak</dt>
          <dd>{save.streak.best}</dd>
        </div>
      </dl>
    </div>
  )
}

function untilMidnight(now: number) {
  const d = new Date(now)
  const end = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1).getTime()
  const mins = Math.max(0, Math.floor((end - now) / 60_000))
  return `${Math.floor(mins / 60)}h ${String(mins % 60).padStart(2, '0')}m`
}

function TodayPanel({ save, now, pet, dispatch }: { save: Save; now: number; pet: Pet | undefined; dispatch: Dispatch }) {
  const state = streakState(save)
  const today = dayKey(now)
  const { count, last } = save.streak
  const gift = giftFor(count)
  // The last seven days: done if inside the current streak run.
  const week = Array.from({ length: 7 }, (_, i) => {
    const date = addDays(today, i - 6)
    const done = !!last && count > 0 && date <= last && date > addDays(last, -count)
    return { date, done, today: date === today, label: new Date(`${date}T12:00`).toLocaleDateString(undefined, { weekday: 'narrow' }) }
  })
  return (
    <div className="pg-today">
      <div className={`pg-streak-card ${state}`}>
        <div className="pg-streak-flame" aria-hidden="true">
          🔥
        </div>
        <div className="pg-streak-num">
          <b>{count}</b>
          <span>day streak</span>
        </div>
        <div className="pg-streak-msg">
          {state === 'safe' && "Today's care is done! See you tomorrow 💛"}
          {state === 'risk' && (
            <>
              Keep it alive! <b>{untilMidnight(now)}</b> left today.
            </>
          )}
          {state === 'none' && 'Finish all three quests to start a streak.'}
        </div>
        <div className="pg-week">
          {week.map((d) => (
            <span key={d.date} className={`${d.done ? 'done' : ''}${d.today ? ' is-today' : ''}`} title={d.date}>
              <i>{d.done ? '🔥' : ''}</i>
              <small>{d.label}</small>
            </span>
          ))}
        </div>
      </div>

      <button
        type="button"
        className={`pg-gift${save.today.gift ? ' claimed' : ''}`}
        disabled={save.today.gift}
        onClick={() => dispatch(claimGift)}
      >
        <span className="pg-gift-box" aria-hidden="true">
          {save.today.gift ? '📭' : '🎁'}
        </span>
        <span>
          <b>{save.today.gift ? 'Daily gift claimed' : 'Open your daily gift!'}</b>
          <small>
            {save.today.gift
              ? 'A new gift tomorrow. Bigger with a longer streak.'
              : `+${gift.kernels} 🌽${gift.golden ? ' and a golden corn ✨' : ''}`}
          </small>
        </span>
      </button>

      <h3 className="pg-h">
        Daily quests{' '}
        <small>{state === 'safe' ? 'all done — streak secured for today' : `secure today & earn +${dayBonus(count + 1)} 🌽 bonus`}</small>
      </h3>
      <ul className="pg-quests">
        {save.today.quests.map((q) => {
          const done = q.have >= q.goal
          return (
            <li key={q.kind} className={done ? 'done' : ''}>
              <span className="pg-check" aria-hidden="true">
                {done ? '✓' : ''}
              </span>
              <span className="pg-quest-text">
                {questText(q).replace('your Remy', pet?.name ?? 'your Remy')}
                <span className="pg-quest-bar">
                  <i style={{ width: `${(q.have / q.goal) * 100}%` }} />
                </span>
              </span>
              <span className="pg-quest-n">
                {q.have}/{q.goal}
              </span>
            </li>
          )
        })}
      </ul>
      <p className="pg-small">
        Streak rewards: 3 days 🎉 Party Hat · 7 👑 Crown + 🧊 · 14 😇 Halo · 30 🧙 Wizard Hat · 50 🌙 The Moon · 100 💎 Diamond
        Crown. Every 7 days earns a Streak Freeze.
      </p>
      {count > 0 && (
        <a className="pg-btn ghost wide" href={shareLink(save, pet)} target="_blank" rel="noreferrer">
          Share my streak on 𝕏
        </a>
      )}
    </div>
  )
}

function ShopPanel({ save, dispatch }: { save: Save; dispatch: Dispatch }) {
  const buyIt = (id: ShopId) => {
    const r = dispatch((s, t) => buy(s, t, id))
    if (r.save.kernels < save.kernels) sfx.coin()
  }
  const Price = ({ id, price, owned, disabled }: { id: ShopId; price: number; owned?: boolean; disabled?: boolean }) =>
    owned ? (
      <span className="pg-owned">Owned</span>
    ) : (
      <button type="button" className="pg-buy" disabled={disabled || save.kernels < price} onClick={() => buyIt(id)}>
        🌽 {price}
      </button>
    )
  return (
    <div className="pg-shop">
      <h3 className="pg-h">Snacks</h3>
      <div className="pg-shop-grid">
        {(Object.keys(FOODS) as FoodId[])
          .filter((id) => FOODS[id].price > 0)
          .map((id) => {
            const f = FOODS[id]
            return (
              <div key={id} className="pg-item">
                <span className={`pg-item-art${id === 'golden' ? ' golden' : ''}`}>{f.emoji}</span>
                <b>{f.name}</b>
                <small>
                  {[f.hunger && `+${f.hunger} hunger`, f.fun && `+${f.fun} fun`, f.health > 0 && `+${f.health} health`].filter(Boolean).join(' · ')}
                </small>
                <small className="pg-have">You have {save.items[id] ?? 0}</small>
                <Price id={id} price={f.price} />
              </div>
            )
          })}
        {(['medicine', 'freeze'] as const).map((id) => (
          <div key={id} className="pg-item">
            <span className="pg-item-art">{ITEMS[id].emoji}</span>
            <b>{ITEMS[id].name}</b>
            <small>{ITEMS[id].desc}</small>
            <small className="pg-have">You have {id === 'freeze' ? save.streak.freezes : save.items.medicine}</small>
            <Price id={id} price={ITEMS[id].price} disabled={id === 'freeze' && save.streak.freezes >= MAX_FREEZES} />
          </div>
        ))}
      </div>
      <h3 className="pg-h">Hats</h3>
      <div className="pg-shop-grid">
        {(Object.keys(HATS) as HatId[]).map((id) => {
          const { name, price } = COSMETICS[id]
          return price ? (
            <div key={id} className="pg-item">
              <span className="pg-item-art hat">
                <HatArt hat={id} />
              </span>
              <b>{name}</b>
              <Price id={id} price={price} owned={save.owned.includes(id)} />
            </div>
          ) : null
        })}
      </div>
      <h3 className="pg-h">Rooms</h3>
      <div className="pg-shop-grid">
        {(Object.keys(ROOMS) as RoomId[]).map((id) => {
          const { name, price } = COSMETICS[id]
          return price ? (
            <div key={id} className="pg-item">
              <span className={`pg-item-art room room-${id}`} />
              <b>{name}</b>
              <Price id={id} price={price} owned={save.owned.includes(id)} />
            </div>
          ) : null
        })}
      </div>
      <p className="pg-small">Earn kernels from quests, mini-games, level-ups and your daily gift. Kernels are just for fun — not a token.</p>
    </div>
  )
}

function ClosetPanel({ save, pet, dispatch }: { save: Save; pet: Pet; dispatch: Dispatch }) {
  const lock = (def: { price?: number; streak?: number }) => (def.streak ? `🔒 ${def.streak}-day streak` : `🔒 Shop · 🌽 ${def.price}`)
  return (
    <div className="pg-closet">
      <h3 className="pg-h">Hats</h3>
      <div className="pg-closet-grid">
        <button type="button" className={`pg-wear${pet.hat === null ? ' on' : ''}`} onClick={() => dispatch((s, t) => wearHat(s, t, null))}>
          <span className="pg-wear-art">🚫</span>
          <small>No hat</small>
        </button>
        {(Object.keys(HATS) as HatId[]).map((id) => {
          const owned = save.owned.includes(id)
          return (
            <button
              type="button"
              key={id}
              className={`pg-wear${pet.hat === id ? ' on' : ''}${owned ? '' : ' locked'}`}
              disabled={!owned}
              onClick={() => {
                sfx.click()
                dispatch((s, t) => wearHat(s, t, id))
              }}
              title={HATS[id].name}
            >
              <span className="pg-wear-art" style={{ ['--hw' as string]: HAT_PIXELS[id].rows[0].length }}>
                <HatArt hat={id} />
              </span>
              <small>{owned ? HATS[id].name : lock(HATS[id])}</small>
            </button>
          )
        })}
      </div>
      <h3 className="pg-h">Rooms</h3>
      <div className="pg-closet-grid rooms">
        {(Object.keys(ROOMS) as RoomId[]).map((id) => {
          const owned = save.owned.includes(id)
          return (
            <button
              type="button"
              key={id}
              className={`pg-wear room${pet.room === id ? ' on' : ''}${owned ? '' : ' locked'}`}
              disabled={!owned}
              onClick={() => {
                sfx.click()
                dispatch((s, t) => setRoom(s, t, id))
              }}
            >
              <span className={`pg-item-art room room-${id}`} />
              <small>{owned ? ROOMS[id].name : lock(ROOMS[id])}</small>
            </button>
          )
        })}
      </div>
    </div>
  )
}

const OWNED_PAGE = 12

function RemysPanel({
  save,
  now,
  onAdopt,
  dispatch,
  busy,
}: { save: Save; now: number; onAdopt: (r: { art: number; token?: string }) => void; dispatch: Dispatch; busy: boolean }) {
  const { address } = useAccount()
  const [page, setPage] = useState(0)
  const owned = useOwnedIds(address, page, OWNED_PAGE)
  const { map: arts } = useArtIndexes(owned.ids)
  const [cabald, setCabald] = useState<Set<number> | null>(null)
  const [pick, setPick] = useState('')
  useEffect(() => {
    let live = true
    loadCabald()
      .then((b) => live && setCabald(new Set(b)))
      .catch(() => live && setCabald(new Set()))
    return () => {
      live = false
    }
  }, [])
  const date = dayKey(now)
  const strays = useMemo(
    () => (cabald ? pickRemys(Number(date.split('-').join('')), 24).filter((i) => !cabald.has(i)).slice(0, 6) : []),
    [date, cabald],
  )
  const strayCount = save.pets.filter((p) => p.token === undefined).length
  const strayFull = strayCount >= MAX_STRAYS

  const confirmRelease = (p: Pet) =>
    messageBox({
      title: 'Remygotchi',
      icon: 'question',
      text: `Send ${p.name} to live on the farm? Their level and outfit will be forgotten. (Your NFT is not affected.)`,
      onConfirm: () => dispatch((s, t) => release(s, t, p.id)),
    })

  return (
    <div className="pg-remys">
      {save.pets.length > 0 && (
        <>
          <h3 className="pg-h">
            Your pets <small>only the pet out of the house gets hungry — the rest nap at daycare</small>
          </h3>
          <div className="pg-pets">
            {save.pets.map((p) => {
              const lvl = levelInfo(p.xp)
              const out = p.id === save.active
              return (
                <div key={p.id} className={`pg-pet-row${out ? ' out' : ''}`}>
                  <img {...remyImg(p.art, '40px')} alt="" />
                  <span className="pg-pet-meta">
                    <b>{p.name}</b>
                    <small>
                      {lvl.stage} · Lv {lvl.level} · {p.token !== undefined ? `#${p.token}` : 'stray'}
                    </small>
                  </span>
                  {out ? (
                    <span className="pg-tag holder">Out & about</span>
                  ) : (
                    <button
                      type="button"
                      className="pg-buy"
                      disabled={busy}
                      onClick={() => {
                        sfx.click()
                        dispatch((s, t) => switchPet(s, t, p.id))
                      }}
                    >
                      Bring out
                    </button>
                  )}
                  <button type="button" className="pg-x small" onClick={() => confirmRelease(p)} aria-label={`Release ${p.name}`} title="Release">
                    ×
                  </button>
                </div>
              )
            })}
          </div>
        </>
      )}

      <h3 className="pg-h">
        From your wallet <small>{address ? `${owned.total} Remy${owned.total === 1 ? '' : 's'}` : ''}</small>
      </h3>
      {!address ? (
        <div className="pg-connect">
          <ConnectPrompt title="Raise the Remys you hold" why="Connect a wallet to hatch any Remy you own as your pet. No transaction, nothing to sign." />
        </div>
      ) : owned.total === 0 && !owned.loading ? (
        <p className="pg-small">No Remys in this wallet yet — adopt a stray below, or pick one up in the Remy Vault.</p>
      ) : (
        <>
          <div className="pg-adopt-grid">
            {owned.ids.map((id) => {
              const art = arts.get(id)
              const token = id.toString()
              const has = save.pets.some((p) => p.id === `t${token}`)
              return (
                <button
                  type="button"
                  key={token}
                  className={`pg-adopt${has ? ' has' : ''}`}
                  disabled={art === undefined || busy}
                  onClick={() => art !== undefined && onAdopt({ art, token })}
                >
                  {art !== undefined ? <img {...remyImg(art, '84px')} alt="" loading="lazy" /> : <span className="pg-ph" />}
                  <small>#{token}</small>
                  <em>{has ? 'Play' : 'Hatch'}</em>
                </button>
              )
            })}
          </div>
          {owned.pages > 1 && (
            <div className="pg-pager">
              <button type="button" className="pg-buy" disabled={page === 0} onClick={() => setPage(page - 1)}>
                ‹ Prev
              </button>
              <small>
                Page {page + 1} of {owned.pages}
              </small>
              <button type="button" className="pg-buy" disabled={page >= owned.pages - 1} onClick={() => setPage(page + 1)}>
                Next ›
              </button>
            </div>
          )}
        </>
      )}

      <h3 className="pg-h">
        Adoption center{' '}
        <small>
          today's strays · {strayCount}/{MAX_STRAYS} stray slots used
        </small>
      </h3>
      <div className="pg-adopt-grid">
        {strays.map((art) => {
          const has = save.pets.some((p) => p.id === `a${art}`)
          return (
            <button type="button" key={art} className={`pg-adopt${has ? ' has' : ''}`} disabled={busy || (strayFull && !has)} onClick={() => onAdopt({ art })}>
              <img {...remyImg(art, '84px')} alt="" loading="lazy" />
              <small>art {art}</small>
              <em>{has ? 'Play' : 'Adopt'}</em>
            </button>
          )
        })}
      </div>
      <form
        className="pg-pick"
        onSubmit={(e) => {
          e.preventDefault()
          const art = Number(pick)
          if (Number.isInteger(art) && art >= 0 && art < 4490 && !cabald?.has(art)) onAdopt({ art })
        }}
      >
        <label>
          Know your favourite? Adopt by art number:
          <input type="number" min={0} max={4489} value={pick} onChange={(e) => setPick(e.target.value)} placeholder="0–4489" />
        </label>
        <button type="submit" className="pg-buy" disabled={busy || strayFull || pick === '' || !!cabald?.has(Number(pick))}>
          Adopt
        </button>
        {cabald?.has(Number(pick)) && pick !== '' && <small className="pg-warn">That one's in the Cabald. They don't do pets.</small>}
      </form>
      {strayFull && <p className="pg-small">Stray slots are full — release one to adopt another. Remys from your wallet have no limit.</p>}
    </div>
  )
}
