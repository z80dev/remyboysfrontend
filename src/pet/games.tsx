/** Remygotchi mini-games, drawn inside the pet screen (stage pixels, see pet.css). Each reports win/lose once. */
import { useEffect, useRef, useState } from 'react'
import { spriteSrc } from './art'
import { sfx } from './sound'

type Props = { art: number; onDone: (won: boolean) => void }

/** Cancellable sleeps for a scripted animation: every await throws once the component unmounts. */
function useScript() {
  const alive = useRef(true)
  useEffect(() => {
    alive.current = true
    return () => {
      alive.current = false
    }
  }, [])
  return (ms: number) =>
    new Promise<void>((resolve, reject) => {
      window.setTimeout(() => (alive.current ? resolve() : reject(new Error('unmounted'))), ms)
    })
}

function Result({ won, art, line, onDone }: { won: boolean; art: number; line: string; onDone: (won: boolean) => void }) {
  return (
    <div className={`pg-result ${won ? 'won' : 'lost'}`}>
      <img className="pg-result-remy" src={spriteSrc(art)} alt="" draggable={false} />
      <div className="pg-result-card">
        <b>{won ? 'YOU WIN!' : 'NICE TRY!'}</b>
        <span>{line}</span>
        <span className="pg-result-prize">+{won ? 15 : 5} 🌽</span>
        <button type="button" className="pg-chip" onClick={() => onDone(won)}>
          OK
        </button>
      </div>
    </div>
  )
}

const SLOTS = [34, 84, 134]
const ROUNDS = [
  { swaps: 4, ms: 420 },
  { swaps: 6, ms: 320 },
  { swaps: 9, ms: 240 },
]

/** Shell game: a golden kernel goes under a cup, the cups swap, pick the right one. Two of three wins. */
export function CupGame({ art, onDone }: Props) {
  const wait = useScript()
  const [round, setRound] = useState(0)
  const [slot, setSlot] = useState([0, 1, 2])
  const [ball, setBall] = useState(1)
  const [lifted, setLifted] = useState<number[]>([])
  const [arc, setArc] = useState<Record<number, 'up' | 'down'>>({})
  const [phase, setPhase] = useState<'show' | 'shuffle' | 'pick' | 'reveal' | 'done'>('show')
  const [hits, setHits] = useState<boolean[]>([])
  const [speed, setSpeed] = useState(ROUNDS[0].ms)

  // biome-ignore lint/correctness/useExhaustiveDependencies: one scripted run per round
  useEffect(() => {
    if (round >= ROUNDS.length) return
    const { swaps, ms } = ROUNDS[round]
    const run = async () => {
      const b = Math.floor(Math.random() * 3)
      setBall(b)
      setSpeed(ms)
      setPhase('show')
      setLifted([b])
      await wait(1100)
      setLifted([])
      await wait(450)
      setPhase('shuffle')
      const pos = slot.slice()
      for (let i = 0; i < swaps; i++) {
        const a = Math.floor(Math.random() * 3)
        const c = (a + 1 + Math.floor(Math.random() * 2)) % 3
        const ca = pos.indexOf(a)
        const cc = pos.indexOf(c)
        pos[ca] = c
        pos[cc] = a
        setArc({ [ca]: 'up', [cc]: 'down' })
        setSlot(pos.slice())
        sfx.shuffle()
        await wait(ms + 40)
      }
      setArc({})
      setPhase('pick')
    }
    run().catch(() => {})
  }, [round])

  const pick = async (cup: number) => {
    if (phase !== 'pick') return
    const hit = cup === ball
    setPhase('reveal')
    setLifted(hit ? [cup] : [cup, ball])
    hit ? sfx.win() : sfx.lose()
    const next = [...hits, hit]
    setHits(next)
    try {
      await wait(1300)
    } catch {
      return
    }
    setLifted([])
    if (next.length >= ROUNDS.length) setPhase('done')
    else setRound(round + 1)
  }

  const won = hits.filter(Boolean).length >= 2
  return (
    <div className="pg-game pg-cups" style={{ ['--swap' as string]: `${speed}ms` }}>
      <div className="pg-game-head">
        <span>CUP GAME</span>
        <span className="pg-dots">
          {ROUNDS.map((_, i) => (
            // biome-ignore lint/suspicious/noArrayIndexKey: fixed three rounds
            <i key={i} className={hits[i] === undefined ? '' : hits[i] ? 'hit' : 'miss'} />
          ))}
        </span>
      </div>
      <div className="pg-game-tip">
        {phase === 'show' ? 'Watch the kernel…' : phase === 'shuffle' ? 'Shuffling!' : phase === 'pick' ? 'Which cup?' : ''}
      </div>
      {[0, 1, 2].map((cup) => (
        <button
          type="button"
          key={cup}
          className={`pg-cup${lifted.includes(cup) ? ' lift' : ''}${arc[cup] ? ` ${arc[cup]}` : ''}${phase === 'pick' ? ' pickable' : ''}`}
          style={{ left: SLOTS[slot[cup]] - 13 }}
          onClick={() => void pick(cup)}
          disabled={phase !== 'pick'}
          aria-label={`Cup ${slot[cup] + 1}`}
        >
          {cup === ball && <span className="pg-kernel" />}
          <span className="pg-cup-body" />
        </button>
      ))}
      {phase === 'done' && (
        <Result won={won} art={art} line={`${hits.filter(Boolean).length} of 3 found`} onDone={onDone} />
      )}
    </div>
  )
}

const HILO_ROUNDS = 5

/** Higher or lower: guess whether Remy's next card beats the one showing. Three of five wins. */
export function HiLo({ art, onDone }: Props) {
  const wait = useScript()
  const draw = (not?: number) => {
    let n = 1 + Math.floor(Math.random() * 9)
    while (n === not) n = 1 + Math.floor(Math.random() * 9)
    return n
  }
  const [card, setCard] = useState(() => draw())
  const [next, setNext] = useState<number | null>(null)
  const [hits, setHits] = useState<boolean[]>([])
  const [busy, setBusy] = useState(false)
  const [verdict, setVerdict] = useState<boolean | null>(null)

  const guess = async (higher: boolean) => {
    if (busy || hits.length >= HILO_ROUNDS) return
    setBusy(true)
    sfx.click()
    const n = draw(card)
    setNext(n)
    const hit = higher ? n > card : n < card
    try {
      await wait(350)
      hit ? sfx.win() : sfx.lose()
      setHits((h) => [...h, hit])
      setVerdict(hit)
      await wait(900)
    } catch {
      return
    }
    setCard(n)
    setNext(null)
    setVerdict(null)
    setBusy(false)
  }

  const done = hits.length >= HILO_ROUNDS
  const score = hits.filter(Boolean).length
  const verdictClass = verdict ? 'hit' : 'miss'
  return (
    <div className="pg-game pg-hilo">
      <div className="pg-game-head">
        <span>HIGHER / LOWER</span>
        <span className="pg-dots">
          {Array.from({ length: HILO_ROUNDS }, (_, i) => (
            // biome-ignore lint/suspicious/noArrayIndexKey: fixed rounds
            <i key={i} className={hits[i] === undefined ? '' : hits[i] ? 'hit' : 'miss'} />
          ))}
        </span>
      </div>
      <img className="pg-hilo-remy" src={spriteSrc(art)} alt="" draggable={false} />
      <div className="pg-cards">
        <div className="pg-card">{card}</div>
        <div className={`pg-card back${next !== null ? ' flip' : ''}`}>
          <span>{next ?? '?'}</span>
        </div>
      </div>
      {verdict !== null && <div className={`pg-hilo-verdict ${verdictClass}`}>{verdict ? 'YES!' : 'NOPE'}</div>}
      <div className="pg-hilo-btns">
        <button type="button" className="pg-chip" disabled={busy || done} onClick={() => void guess(true)}>
          ▲ Higher
        </button>
        <button type="button" className="pg-chip" disabled={busy || done} onClick={() => void guess(false)}>
          ▼ Lower
        </button>
      </div>
      {done && <Result won={score >= 3} art={art} line={`${score} of ${HILO_ROUNDS} right`} onDone={onDone} />}
    </div>
  )
}
