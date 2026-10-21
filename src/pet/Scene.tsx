/** The Remygotchi screen: room, wandering chibi, hats, messes, speech, effects and the overlays drawn on it. */
import { type PointerEvent, useEffect, useState } from 'react'
import { HatArt, SPRITE_H, SPRITE_W, hatSize, spriteSrc, useAnchor } from './art'
import { FOODS, type FoodId, type MiniGame, type Pet, type RoomId, type Save, levelInfo, mood, needs } from './engine'
import { CupGame, HiLo } from './games'

/** Stage size in screen pixels; pet.css scales the stage by --k. */
export const STAGE_W = 168
export const STAGE_H = 150
const FLOOR = 144
const POOP_X = [22, 148, 38, 132]

export type Fx = { id: number; x: number; y: number; kind: 'heart' | 'sparkle' | 'bubble' | 'note' | 'kernel' | 'star' }
export type Bubble = { text: string; tone: 'happy' | 'sad' | 'no' }
export type Overlay = 'feed' | 'games' | MiniGame | null

const NEED_ICON = { hunger: '🍙', fun: '🎲', energy: '💤', clean: '🧼', poop: '💩', sick: '🤒' } as const

function skyFor(hour: number) {
  if (hour >= 6 && hour < 8) return 'dawn'
  if (hour >= 8 && hour < 17) return 'day'
  if (hour >= 17 && hour < 20) return 'dusk'
  return 'night'
}

function Room({ room, hour }: { room: RoomId; hour: number }) {
  const sky = skyFor(hour)
  return (
    <div className={`pg-room pg-room-${room} sky-${sky}`} aria-hidden="true">
      <div className="pg-wall" />
      <div className="pg-floor" />
      {room === 'bedroom' && (
        <>
          <div className="pg-window">
            <i />
          </div>
          <div className="pg-frame" />
          <span className="pg-deco" style={{ left: 4, top: 96, fontSize: 18 }}>
            🪴
          </span>
          <span className="pg-deco" style={{ left: 140, top: 102, fontSize: 14 }}>
            🧸
          </span>
          <div className="pg-rug" />
        </>
      )}
      {room === 'cornfield' && (
        <>
          <div className="pg-sun" />
          <div className="pg-stalks" />
          <span className="pg-deco" style={{ left: 128, top: 92, fontSize: 18 }}>
            🎃
          </span>
        </>
      )}
      {room === 'beach' && (
        <>
          <div className="pg-sun" />
          <div className="pg-sea" />
          <span className="pg-deco" style={{ left: 2, top: 70, fontSize: 30 }}>
            🌴
          </span>
          <span className="pg-deco" style={{ left: 142, top: 118, fontSize: 12 }}>
            🐚
          </span>
          <span className="pg-deco pg-float" style={{ left: 112, top: 74, fontSize: 14 }}>
            ⛵
          </span>
        </>
      )}
      {room === 'haunted' && (
        <>
          <div className="pg-moon" />
          <div className="pg-window haunted">
            <i />
          </div>
          <span className="pg-deco pg-float" style={{ left: 128, top: 40, fontSize: 16 }}>
            👻
          </span>
          <span className="pg-deco" style={{ left: 6, top: 112, fontSize: 16 }}>
            🕯️
          </span>
          <span className="pg-deco" style={{ left: 140, top: 110, fontSize: 18 }}>
            🎃
          </span>
        </>
      )}
      {room === 'arcade' && (
        <>
          <div className="pg-neon">PLAY</div>
          <span className="pg-deco" style={{ left: 2, top: 84, fontSize: 30 }}>
            🕹️
          </span>
          <div className="pg-cabinet" />
          <div className="pg-checker" />
        </>
      )}
      {room === 'moon' && (
        <>
          <div className="pg-stars" />
          <span className="pg-deco" style={{ left: 120, top: 10, fontSize: 26 }}>
            🌍
          </span>
          <span className="pg-deco" style={{ left: 18, top: 96, fontSize: 14 }}>
            🚩
          </span>
          <div className="pg-craters" />
        </>
      )}
    </div>
  )
}

export type SceneProps = {
  save: Save
  pet: Pet | undefined
  now: number
  hatching: number | null
  overlay: Overlay
  fx: Fx[]
  bubble: Bubble | null
  eating: FoodId | null
  bathing: boolean
  onPat: (x: number, y: number) => void
  onScoop: () => void
  onFeed: (food: FoodId) => void
  onPlay: (game: MiniGame) => void
  onGameDone: (won: boolean) => void
  onCloseOverlay: () => void
}

export function Scene(props: SceneProps) {
  const { save, pet, now, hatching, overlay, fx, bubble, eating, bathing } = props
  const anchor = useAnchor(pet?.art)
  const [x, setX] = useState(STAGE_W / 2)
  const [walking, setWalking] = useState(false)
  const m = pet ? mood(pet) : 'okay'
  const still = !pet || pet.asleep || !!overlay || !!eating || bathing || hatching !== null

  // Wander: a new spot every few seconds while awake and idle (sprites are never mirrored: slogans are art).
  useEffect(() => {
    if (still) {
      setWalking(false)
      return
    }
    let t: number
    const step = () => {
      const lazy = m === 'sad' || m === 'miserable' || m === 'sick'
      t = window.setTimeout(
        () => {
          setX((prev) => {
            const target = 52 + Math.random() * (STAGE_W - 104)
            return Math.abs(target - prev) < 12 ? prev : target
          })
          setWalking(true)
          window.setTimeout(() => setWalking(false), 1500)
          step()
        },
        (lazy ? 6000 : 3000) + Math.random() * 3000,
      )
    }
    step()
    return () => window.clearTimeout(t)
  }, [still, m])

  useEffect(() => {
    if (eating || bathing) setX(STAGE_W / 2)
  }, [eating, bathing])

  const hour = new Date(now).getHours()
  const lvl = pet ? levelInfo(pet.xp) : undefined
  const scale = lvl?.scale ?? 1
  const headY = FLOOR - (SPRITE_H - anchor.top) * scale
  const headX = x + (anchor.cx - SPRITE_W / 2) * scale
  const want = pet ? needs(pet) : []
  const hat = pet?.hat ? hatSize(pet.hat) : undefined

  const pat = (e: PointerEvent) => {
    const r = (e.currentTarget.closest('.pg-stage') as HTMLElement).getBoundingClientRect()
    const k = r.width / STAGE_W
    props.onPat((e.clientX - r.left) / k, (e.clientY - r.top) / k)
  }

  return (
    <div className={`pg-screen${pet?.asleep ? ' asleep' : ''}`}>
      <div className="pg-stage">
        <Room room={pet?.room ?? 'bedroom'} hour={hour} />

        {!pet && hatching === null && (
          <div className="pg-egg-wrap">
            <div className="pg-egg idle" />
            <div className="pg-egg-hint">Pick a Remy to hatch →</div>
          </div>
        )}

        {hatching !== null && (
          <div className="pg-egg-wrap">
            <div className="pg-egg hatch" />
            <img className="pg-hatchling" src={spriteSrc(hatching)} alt="" draggable={false} />
            <div className="pg-flash" />
          </div>
        )}

        {pet && hatching === null && (
          <>
            {Array.from({ length: pet.poops }, (_, i) => (
              <button
                type="button"
                // biome-ignore lint/suspicious/noArrayIndexKey: messes are interchangeable slots
                key={i}
                className="pg-poop"
                style={{ left: POOP_X[i] - 7 }}
                onClick={props.onScoop}
                aria-label="Scoop the mess"
              >
                💩
              </button>
            ))}

            <div
              className={`pg-remy-pos${walking ? ' walking' : ''}`}
              style={{ transform: `translateX(${x - SPRITE_W / 2}px)` }}
            >
              <div className="pg-shadow" style={{ width: 44 * scale }} />
              <button
                type="button"
                className={`pg-remy mood-${m}${eating ? ' eat' : ''}${bathing ? ' bath' : ''}${lvl?.stage === 'Legend' ? ' legend' : ''}`}
                style={{ transform: `scale(${scale})` }}
                onPointerDown={pat}
                aria-label={`Pet ${pet.name}`}
              >
                <span className="pg-body">
                  <img src={spriteSrc(pet.art)} alt="" width={SPRITE_W} height={SPRITE_H} draggable={false} />
                  {pet.hat && hat && (
                    <HatArt
                      hat={pet.hat}
                      className={`pg-hat hat-${pet.hat}`}
                      style={{ left: Math.round(anchor.cx - hat.w / 2), top: anchor.top - hat.h + hat.sink, width: hat.w, height: hat.h }}
                    />
                  )}
                </span>
              </button>
            </div>

            {eating && (
              <span className="pg-food" style={{ left: headX - 7, top: headY + 40 * scale }}>
                <span className={eating === 'golden' ? 'golden' : ''}>{FOODS[eating].emoji}</span>
              </span>
            )}
            {bathing && <div className="pg-shower" />}

            {pet.asleep && (
              <div className="pg-zzz" style={{ left: headX + 14, top: headY - 4 }}>
                <i>z</i>
                <i>z</i>
                <i>Z</i>
              </div>
            )}
            {m === 'miserable' && !pet.asleep && <div className="pg-cloud" style={{ left: headX - 14, top: headY - 22 }} />}

            {(bubble || (want.length > 0 && !pet.asleep)) && !overlay && (
              <div
                className={`pg-bubble ${bubble ? `tone-${bubble.tone}` : 'need'}`}
                style={{ left: Math.max(4, Math.min(STAGE_W - 4, headX)), top: Math.max(4, headY - (hat ? hat.h * scale : 0) - 4) }}
              >
                {bubble ? bubble.text : want.slice(0, 3).map((n) => NEED_ICON[n]).join(' ')}
              </div>
            )}
          </>
        )}

        {fx.map((f) => (
          <span key={f.id} className={`pg-fx fx-${f.kind}`} style={{ left: f.x, top: f.y }}>
            {f.kind === 'heart' ? '♥' : f.kind === 'note' ? '♪' : f.kind === 'kernel' ? '🌽' : f.kind === 'star' ? '★' : ''}
          </span>
        ))}

        {pet?.asleep && <div className="pg-night" />}

        {overlay === 'feed' && pet && (
          <div className="pg-tray">
            <div className="pg-tray-head">
              <span>WHAT'S FOR DINNER?</span>
              <button type="button" className="pg-x" onClick={props.onCloseOverlay} aria-label="Close">
                ×
              </button>
            </div>
            <div className="pg-tray-grid">
              {(Object.keys(FOODS) as FoodId[]).map((id) => {
                const f = FOODS[id]
                const have = f.price === 0 ? '∞' : String(save.items[id] ?? 0)
                return (
                  <button
                    type="button"
                    key={id}
                    className={`pg-tray-item${have === '0' ? ' empty' : ''}`}
                    onClick={() => props.onFeed(id)}
                    title={f.name}
                  >
                    <span className={id === 'golden' ? 'golden' : ''}>{f.emoji}</span>
                    <small>{f.name.split(' ')[0]}</small>
                    <em>×{have}</em>
                  </button>
                )
              })}
            </div>
          </div>
        )}

        {overlay === 'games' && pet && (
          <div className="pg-tray">
            <div className="pg-tray-head">
              <span>LET'S PLAY!</span>
              <button type="button" className="pg-x" onClick={props.onCloseOverlay} aria-label="Close">
                ×
              </button>
            </div>
            <div className="pg-tray-games">
              <button type="button" className="pg-tray-game" onClick={() => props.onPlay('cups')}>
                <span>🥤🥤🥤</span>
                <b>Cup Game</b>
                <small>Find the golden kernel</small>
              </button>
              <button type="button" className="pg-tray-game" onClick={() => props.onPlay('hilo')}>
                <span>🃏</span>
                <b>Higher / Lower</b>
                <small>Guess Remy's next card</small>
              </button>
            </div>
          </div>
        )}

        {overlay === 'cups' && pet && <CupGame art={pet.art} onDone={props.onGameDone} />}
        {overlay === 'hilo' && pet && <HiLo art={pet.art} onDone={props.onGameDone} />}
      </div>
      <div className="pg-lcd" aria-hidden="true" />
    </div>
  )
}
