export type MmlNote = { midi: number | null; duration: number; gate: number; start: number }
export type MmlScore = { notes: MmlNote[]; duration: number; background: boolean }

/** Interpret the documented QBASIC PLAY subset without evaluating arbitrary expressions. */
export function parseMml(source: string): MmlScore {
  const text = source.toUpperCase()
  const notes: MmlNote[] = []
  let i = 0, tempo = 120, octave = 4, length = 4, gate = 7 / 8, start = 0, background = false
  const number = (): number | undefined => {
    const from = i
    while (i < text.length && text.charCodeAt(i) >= 48 && text.charCodeAt(i) <= 57) i++
    return i === from ? undefined : Number(text.slice(from, i))
  }
  const append = (midi: number | null, denominator: number) => {
    let duration = 240 / tempo / Math.max(1, Math.min(64, denominator))
    let dot = duration / 2
    while (text[i] === '.') { duration += dot; dot /= 2; i++ }
    notes.push({ midi, duration, gate, start })
    start += duration
  }
  while (i < text.length) {
    const command = text[i++]
    if (command === 'T') tempo = Math.max(32, Math.min(255, number() ?? tempo))
    else if (command === 'O') octave = Math.max(0, Math.min(6, number() ?? octave))
    else if (command === 'L') length = Math.max(1, Math.min(64, number() ?? length))
    else if (command === '<') octave = Math.max(0, octave - 1)
    else if (command === '>') octave = Math.min(6, octave + 1)
    else if (command === 'M') {
      const mode = text[i++]
      if (mode === 'N') gate = 7 / 8
      else if (mode === 'L') gate = 1
      else if (mode === 'S') gate = 3 / 4
      else if (mode === 'B') background = true
      else if (mode === 'F') background = false
    } else if (command === 'P') append(null, number() ?? length)
    else if (command === 'N') {
      const n = Math.max(0, Math.min(84, number() ?? 0))
      append(n === 0 ? null : n + 11, length)
    } else if ('CDEFGAB'.includes(command)) {
      const semitone = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 }[command as 'C' | 'D' | 'E' | 'F' | 'G' | 'A' | 'B']
      let accidental = 0
      if (text[i] === '#' || text[i] === '+') { accidental = 1; i++ }
      else if (text[i] === '-') { accidental = -1; i++ }
      append((octave + 1) * 12 + semitone + accidental, number() ?? length)
    }
  }
  return { notes, duration: start, background }
}
