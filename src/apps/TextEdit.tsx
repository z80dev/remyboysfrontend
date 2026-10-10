import '@fontsource/noto-sans-symbols/400.css'
import '@fontsource/noto-sans-symbols-2/400.css'
import { useEffect, useRef } from 'react'
import { toWingdings } from '../lib/wingdings'

/** Insert at the caret through the editing pipeline, so native undo/redo keeps working. */
const insert = (text: string) => document.execCommand('insertText', false, text)

/**
 * Remy TextEdit: a plain-text editor where everything typed or pasted comes out in Wingdings.
 * Typing and paste are rewritten before they land (undo-safe); anything else that slips in
 * (drag-and-drop, IME commits, mobile keyboards) is rewritten after the fact with the caret kept in place.
 */
export function TextEdit() {
  const ref = useRef<HTMLTextAreaElement>(null)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    el.focus()

    const onBeforeInput = (e: InputEvent) => {
      if (e.inputType !== 'insertText' || !e.data || e.isComposing) return
      const glyphs = toWingdings(e.data)
      if (glyphs !== e.data && insert(glyphs)) e.preventDefault()
    }

    const onPaste = (e: ClipboardEvent) => {
      const text = e.clipboardData?.getData('text/plain')
      if (text && insert(toWingdings(text))) e.preventDefault()
    }

    const onInput = (e: Event) => {
      if ((e as InputEvent).isComposing) return
      const raw = el.value
      const next = toWingdings(raw)
      if (next === raw) return
      const start = toWingdings(raw.slice(0, el.selectionStart)).length
      const end = toWingdings(raw.slice(0, el.selectionEnd)).length
      el.value = next
      el.setSelectionRange(start, end)
    }

    el.addEventListener('beforeinput', onBeforeInput)
    el.addEventListener('paste', onPaste)
    el.addEventListener('input', onInput)
    el.addEventListener('compositionend', onInput)
    return () => {
      el.removeEventListener('beforeinput', onBeforeInput)
      el.removeEventListener('paste', onPaste)
      el.removeEventListener('input', onInput)
      el.removeEventListener('compositionend', onInput)
    }
  }, [])

  return (
    <div className="app-col">
      <textarea ref={ref} className="textedit-page" spellCheck={false} autoComplete="off" autoCapitalize="off" aria-label="Document" />
    </div>
  )
}
