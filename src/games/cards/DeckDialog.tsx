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
const confirmedRemys = new Set([46])
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
    if (confirmedRemys.has(selected.remy)) return
    let cancelled = false
    void loadCabald().then((bald) => {
      if (cancelled || current() !== selected) return
      if (bald.includes(selected.remy)) setBack(selected.back, 46)
      else {
        confirmedRemys.add(selected.remy)
        choice = { ...selected }
        for (const listener of listeners) listener()
      }
    }).catch(() => {})
    return () => { cancelled = true }
  }, [selected])
  return { ...selected, remy: confirmedRemys.has(selected.remy) ? selected.remy : 46, setBack }
}

function BackPreview({ back, remy }: { back: number; remy: number }) {
  const ref = useRef<HTMLCanvasElement>(null)
  useEffect(() => {
    const paint = () => {
      const canvas = ref.current
      if (!canvas) return
      const width = canvas.getBoundingClientRect().width || CARD_W
      const dpr = Math.max(1, Math.min(3, Math.ceil(window.devicePixelRatio || 1)))
      canvas.width = Math.round(width * dpr)
      canvas.height = Math.round(width * CARD_H / CARD_W * dpr)
      const ctx = canvas.getContext('2d')
      if (!ctx) return
      ctx.setTransform(canvas.width / CARD_W, 0, 0, canvas.height / CARD_H, 0, 0)
      drawBack(ctx, back, 0, 0, 0, remy)
    }
    let resolution = window.matchMedia(`(resolution: ${window.devicePixelRatio || 1}dppx)`)
    const resolutionChange = () => {
      resolution.removeEventListener('change', resolutionChange)
      resolution = window.matchMedia(`(resolution: ${window.devicePixelRatio || 1}dppx)`)
      resolution.addEventListener('change', resolutionChange)
      paint()
    }
    resolution.addEventListener('change', resolutionChange)
    const observer = new ResizeObserver(paint)
    if (ref.current) observer.observe(ref.current)
    paint()
    const unsubscribe = subscribeCardArt(paint)
    return () => {
      observer.disconnect()
      resolution.removeEventListener('change', resolutionChange)
      unsubscribe()
    }
  }, [back, remy])
  return <canvas ref={ref} width={CARD_W} height={CARD_H} style={{ width: CARD_W, height: CARD_H }} aria-hidden="true" />
}

export function DeckDialog({ onClose }: { onClose: () => void }) {
  const saved = useDeckBack()
  const [selected, setSelected] = useState(saved.back)
  const [remy, setRemy] = useState(saved.remy)
  const [prompt, setPrompt] = useState(false)
  const previousBack = useRef(selected)
  const customReady = useRef(saved.back === 12)
  const promptRequest = useRef(0)
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
    if (selected === 12 && !customReady.current) { choose(12); return }
    saved.setBack(selected, remy)
    onClose()
  }
  const choose = (back: number) => {
    if (back === 12) {
      if (selected !== 12 || customReady.current) previousBack.current = selected
      customReady.current = false
      setSelected(back)
      setInput(String(remy))
      setError('')
      setPrompt(true)
    }
    else setSelected(back)
  }
  const cancelPrompt = () => {
    promptRequest.current++
    customReady.current = previousBack.current === 12
    setBusy(false)
    setSelected(previousBack.current)
    setPrompt(false)
  }
  const pickRemy = async (random = false) => {
    const idx = Number(input)
    if (!random && (input.trim() === '' || !isRemyIndex(idx))) {
      setError(s.invalid)
      return
    }
    const request = ++promptRequest.current
    setBusy(true)
    setError('')
    try {
      const bald = new Set(await loadCabald())
      if (!alive.current || request !== promptRequest.current) return
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
      confirmedRemys.add(candidate)
      customReady.current = true
      setRemy(candidate)
      setInput(String(candidate))
      setSelected(12)
      setPrompt(false)
    } catch {
      if (alive.current && request === promptRequest.current) setError(s.unavailable)
    } finally {
      if (alive.current && request === promptRequest.current) setBusy(false)
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
          if (next === 12 && selected !== 12) {
            previousBack.current = selected
            customReady.current = false
          }
          setSelected(next)
          grid.current?.querySelector<HTMLButtonElement>(`[data-back="${next}"]`)?.focus()
        }}>
          {BACKS.map((back) => <button key={back.id} type="button" role="radio" aria-checked={selected === back.id}
            aria-label={back.name} title={'tooltip' in back ? back.tooltip : back.name} className={`remy-deck-choice${selected === back.id ? ' selected' : ''}`}
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
      {prompt && <GameDialog title={s.promptTitle} width={310} onClose={cancelPrompt} buttons={[
        { label: s.random, onClick: () => { void pickRemy(true) }, disabled: busy },
        { label: s.ok, onClick: () => { void pickRemy() }, default: true, disabled: busy },
        { label: s.cancel, onClick: cancelPrompt, cancel: true },
      ]}>
        <label className="remy-deck-index">{s.prompt}<input data-autofocus type="number" min={0} max={4489} value={input}
          onChange={(e) => setInput(e.target.value)} /></label>
        <p className="remy-deck-error" role="status">{error}</p>
      </GameDialog>}
    </>
  )
}
