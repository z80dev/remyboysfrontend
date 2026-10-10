import { useEffect, useRef, useState, useSyncExternalStore } from 'react'
import { GameDialog, isRemyIndex, loadCabald, loadGame, saveGame } from '../kit'
import { BACKS, drawBack, subscribeCardArt } from './render'
import { CARD_H, CARD_W } from './model'
import { deckStrings as s } from './strings'
import './cards.css'

export type DeckChoice = { back: number; remy: number }
const isChoice = (value: unknown): value is DeckChoice => {
  if (typeof value !== 'object' || value === null) return false
  const choice = value as Record<string, unknown>
  return typeof choice.back === 'number' && Number.isInteger(choice.back) && choice.back >= 0 && choice.back < 13 &&
    typeof choice.remy === 'number' && isRemyIndex(choice.remy)
}
let choice: DeckChoice | undefined
const listeners = new Set<() => void>()
const current = () => {
  if (!choice) choice = loadGame('cards', { back: 0, remy: 46 }, isChoice)
  return choice
}
const subscribe = (listener: () => void) => {
  listeners.add(listener)
  return () => { listeners.delete(listener) }
}
const setBack = (back: number, remy = current().remy) => {
  if (!isChoice({ back, remy })) return
  choice = { back, remy }
  saveGame('cards', choice)
  for (const listener of listeners) listener()
}

export function useDeckBack() {
  const selected = useSyncExternalStore(subscribe, current, current)
  useEffect(() => {
    if (selected.back !== 12) return
    let cancelled = false
    void loadCabald().then((bald) => {
      if (!cancelled && bald.includes(selected.remy) && current() === selected) setBack(12, 46)
    }).catch(() => {})
    return () => { cancelled = true }
  }, [selected])
  return { ...selected, setBack }
}

function BackPreview({ back, remy }: { back: number; remy: number }) {
  const ref = useRef<HTMLCanvasElement>(null)
  useEffect(() => {
    const paint = () => {
      const canvas = ref.current
      if (!canvas) return
      const dpr = window.devicePixelRatio || 1
      canvas.width = Math.round(CARD_W * dpr)
      canvas.height = Math.round(CARD_H * dpr)
      const ctx = canvas.getContext('2d')
      if (!ctx) return
      ctx.scale(dpr, dpr)
      drawBack(ctx, back, 0, 0, 0, remy)
    }
    paint()
    return subscribeCardArt(paint)
  }, [back, remy])
  return <canvas ref={ref} width={CARD_W} height={CARD_H} style={{ width: CARD_W, height: CARD_H }} aria-hidden="true" />
}

export function DeckDialog({ onClose }: { onClose: () => void }) {
  const saved = useDeckBack()
  const [selected, setSelected] = useState(saved.back)
  const [remy, setRemy] = useState(saved.remy)
  const [prompt, setPrompt] = useState(false)
  const [input, setInput] = useState(String(saved.remy))
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const grid = useRef<HTMLDivElement>(null)
  const alive = useRef(true)
  useEffect(() => {
    alive.current = true
    return () => { alive.current = false }
  }, [])

  const commit = () => {
    saved.setBack(selected, remy)
    onClose()
  }
  const choose = (back: number) => {
    setSelected(back)
    if (back === 12) {
      setInput(String(remy))
      setError('')
      setPrompt(true)
    }
  }
  const pickRemy = async (random = false) => {
    const idx = Number(input)
    if (!random && (input.trim() === '' || !isRemyIndex(idx))) {
      setError(s.invalid)
      return
    }
    setBusy(true)
    setError('')
    try {
      const bald = new Set(await loadCabald())
      if (!alive.current) return
      let candidate = idx
      if (random) {
        const start = Math.floor(Math.random() * 4490)
        candidate = start
        while (bald.has(candidate)) candidate = (candidate + 1) % 4490
      }
      if (bald.has(candidate)) {
        setError(s.bald)
        return
      }
      setRemy(candidate)
      setInput(String(candidate))
      setSelected(12)
      setPrompt(false)
    } catch {
      if (alive.current) setError(s.unavailable)
    } finally {
      if (alive.current) setBusy(false)
    }
  }
  return (
    <>
      {!prompt && <GameDialog title={s.title} width={606} onClose={onClose} buttons={[
        { label: s.ok, onClick: commit, default: true },
        { label: s.cancel, onClick: onClose, cancel: true },
      ]}>
        <div className="remy-deck-grid" role="radiogroup" aria-label={s.title} ref={grid} onKeyDown={(e) => {
          let next = selected
          if (e.key === 'ArrowLeft') next = (selected + 12) % 13
          else if (e.key === 'ArrowRight') next = (selected + 1) % 13
          else if (e.key === 'ArrowUp') next = selected >= 7 ? selected - 7 : Math.min(12, selected + 7)
          else if (e.key === 'ArrowDown') next = selected < 7 ? Math.min(12, selected + 7) : selected - 7
          else if (e.key === 'Enter') {
            e.preventDefault()
            if (selected === 12) choose(12)
            else commit()
            return
          }
          else return
          e.preventDefault()
          setSelected(next)
          grid.current?.querySelector<HTMLButtonElement>(`[data-back="${next}"]`)?.focus()
        }}>
          {BACKS.map((back) => <button key={back.id} type="button" role="radio" aria-checked={selected === back.id}
            aria-label={back.name} title={back.tooltip ?? back.name} className={`remy-deck-choice${selected === back.id ? ' selected' : ''}`}
            data-back={back.id} data-autofocus={selected === back.id ? '' : undefined} tabIndex={selected === back.id ? 0 : -1}
            onClick={() => choose(back.id)} onDoubleClick={() => {
              if (back.id !== 12) {
                saved.setBack(back.id, remy)
                onClose()
              }
            }}>
            <BackPreview back={back.id} remy={remy} />
            <span>{back.name}</span>
          </button>)}
        </div>
      </GameDialog>}
      {prompt && <GameDialog title={s.promptTitle} width={310} onClose={() => setPrompt(false)} buttons={[
        { label: s.random, onClick: () => { void pickRemy(true) }, disabled: busy },
        { label: s.ok, onClick: () => { void pickRemy() }, default: true, disabled: busy },
        { label: s.cancel, onClick: () => setPrompt(false), cancel: true },
      ]}>
        <label className="remy-deck-index">{s.prompt}<input data-autofocus type="number" min={0} max={4489} value={input}
          onChange={(e) => setInput(e.target.value)} /></label>
        <p className="remy-deck-error" role="status">{error}</p>
      </GameDialog>}
    </>
  )
}
