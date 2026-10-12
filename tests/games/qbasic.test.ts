import { describe, expect, test } from 'bun:test'
import { FONT, glyph } from '../../src/games/qbasic/font'
import { EGA, createInput, cursorVisible, editInput, nearestEga, nearestEgaChromatic, quantizeRemyPalette } from '../../src/games/qbasic/screen'
import { parseMml } from '../../src/games/qbasic/mml'

describe('original QBasic bitmap screen', () => {
  test('ASCII and DOS symbols have complete 8×16 bitmap rows', () => {
    for (let i = 32; i <= 126; i++) expect(FONT[String.fromCharCode(i)]?.length).toBe(16)
    for (const char of '─│┌┐└┘├┤┬┴┼═║╔╗╚╝╠╣╦╩╬╒╕╘╛╓╖╙╜╞╡╟╢╤╧╥╨╪╫█▀▄±↑↓←→♥☺') expect(FONT[char]?.length).toBe(16)
    expect(glyph('☃')).toBe(FONT['?'])
    expect(FONT.a).not.toEqual(FONT.A)
  })
  test('visible letters, digits and punctuation use authored scanlines rather than doubled 8-row art', () => {
    for (const char of 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!?.,:;+-=*±↑↓←→♥☺') {
      const rows = glyph(char)
      expect(Array.from({ length: 8 }, (_, i) => rows[i * 2] !== rows[i * 2 + 1]).some(Boolean)).toBe(true)
    }
    for (const char of 'BEFHTZ') {
      const rows = glyph(char)
      const bars = [...rows].flatMap((row, i) => row === 0x7e || row === 0x7c || row === 0x78 ? [i] : [])
      expect(bars.length).toBeGreaterThan(0)
      for (const y of bars) {
        expect(rows[y - 1] ?? 0).not.toBe(rows[y])
        expect(rows[y + 1] ?? 0).not.toBe(rows[y])
      }
    }
  })
  test('case, fourteen-row caps and lowercase descenders share a sensible baseline', () => {
    for (const char of 'ABCDEFGHIJKLMNOPQRSTUVWXYZ') {
      expect(glyph(char)[0]).not.toBe(0)
      expect(glyph(char)[13]).not.toBe(0)
      expect(glyph(char)[15]).toBe(0)
      expect(glyph(char.toLowerCase())).not.toEqual(glyph(char))
    }
    for (const char of 'acemnorsuvwxz') {
      expect([...glyph(char).slice(0, 4)]).toEqual([0, 0, 0, 0])
      expect(glyph(char)[13]).not.toBe(0)
      expect(glyph(char)[14]).toBe(0)
      expect(glyph(char)[15]).toBe(0)
    }
    for (const char of 'gjpqy') expect(glyph(char)[15]).not.toBe(0)
  })
  test('horizontal arrows have full directional heads and two-pixel shafts, not plus signs', () => {
    const reverse = (byte: number) => {
      let mirrored = 0
      for (let bit = 0; bit < 8; bit++) mirrored |= ((byte >> bit) & 1) << (7 - bit)
      return mirrored
    }
    expect([...glyph('→')]).toEqual([...glyph('←')].map(reverse))
    expect([...glyph('↓')].slice(2, 13)).toEqual([...glyph('↑')].slice(2, 13).reverse())
    expect([...glyph('←')].slice(3, 7)).toEqual([0x10, 0x30, 0x60, 0xc0])
    expect([...glyph('←')].slice(7, 9)).toEqual([0xff, 0xff])
    expect([...glyph('←')].slice(9, 13)).toEqual([0xc0, 0x60, 0x30, 0x10])
    for (const char of '↑↓') {
      expect([...glyph(char)].filter((row) => row === 0x18).length).toBeGreaterThanOrEqual(6)
      expect([...glyph(char)]).toContain(0x7e)
      expect([...glyph(char)]).toContain(0xdb)
    }
  })
  test('single, double and mixed box lines meet adjacent cell edges', () => {
    expect(FONT['─'][7]).toBe(255)
    expect(FONT['═'][6]).toBe(255)
    expect(FONT['═'][9]).toBe(255)
    expect(FONT['│'][0]).toBe(0x18)
    expect(FONT['║'][15]).toBe(0x24)
    expect(FONT['╒'][6] & 0x0f).toBe(0x0f)
    expect(FONT['╒'][15]).toBe(0x18)
    expect(FONT['╓'][7] & 0x0f).toBe(0x0f)
    expect(FONT['╓'][15]).toBe(0x24)
  })
  test('half blocks fill exactly the corresponding eight scanlines', () => {
    expect([...FONT['█']]).toEqual(Array(16).fill(255))
    expect([...FONT['▀']]).toEqual([...Array(8).fill(255), ...Array(8).fill(0)])
    expect([...FONT['▄']]).toEqual([...Array(8).fill(0), ...Array(8).fill(255)])
    expect(EGA.length).toBe(16)
    expect(nearestEga('#ffff55')).toBe(14)
    expect(nearestEga('#0000a8')).toBe(1)
  })
  test('small portrait colours remain distinguishable instead of becoming a grey silhouette', () => {
    const palette = quantizeRemyPalette({ hair: '#6b81c1', shirt: '#889e87', skin: '#d0bdb2' })
    expect(palette.skin).toBe(14)
    expect(palette.hair).toBe(9)
    expect(palette.hair).not.toBe(palette.skin)
    expect(palette.shirt).not.toBe(palette.skin)
    expect(nearestEgaChromatic('#aaaaaa')).toBe(7)
    expect(nearestEgaChromatic('#55ffff')).toBe(11)
    const golden = quantizeRemyPalette({ skin: '#d0bdb2', hair: '#ffff55', shirt: '#ffff55' })
    expect(golden.hair).toBe(6)
    expect(golden.shirt).toBe(6)
  })
  test('INPUT preserves empty defaults, limits, erases and cancels', () => {
    let input = createInput(2)
    input = editInput(input, '1', /[0-9]/).input
    input = editInput(input, '2', /[0-9]/).input
    expect(editInput(input, '3').input.value).toBe('12')
    expect(editInput(input, 'a', /[0-9]/).handled).toBe(false)
    input = editInput(input, 'Backspace').input
    expect(input.value).toBe('1')
    expect(editInput(createInput(), 'Enter').submitted).toBe(true)
    expect(editInput(input, 'Escape').cancelled).toBe(true)
    expect(editInput(input, 'ArrowLeft').handled).toBe(false)
  })
  test('DOS cursor displays sixteen frames on and sixteen off', () => {
    expect(cursorVisible(0)).toBe(true)
    expect(cursorVisible(250)).toBe(true)
    expect(cursorVisible(270)).toBe(false)
    expect(cursorVisible(530)).toBe(false)
    expect(cursorVisible(540)).toBe(true)
  })
})

describe('PLAY MML semantics', () => {
  test('octaves, sharps, flats, numeric notes and rest zero agree', () => {
    const score = parseMml('T120 O4 L4 C C# D- >C <B N1 N0 P8')
    expect(score.notes.map((n) => n.midi)).toEqual([60, 61, 61, 72, 71, 12, null, null])
    expect(score.notes[0].duration).toBe(0.5)
    expect(score.notes[7].duration).toBe(0.25)
  })
  test('dots, explicit lengths, tempo, articulation and execution mode', () => {
    const score = parseMml('MF T60 O3 L8 MS C4. MN D8.. ML E MB P4')
    expect(score.notes.map((n) => n.duration)).toEqual([1.5, 0.875, 0.5, 1])
    expect(score.notes.map((n) => n.gate)).toEqual([0.75, 0.875, 1, 1])
    expect(score.notes.map((n) => n.start)).toEqual([0, 1.5, 2.375, 2.875])
    expect(score.duration).toBe(3.875)
    expect(score.background).toBe(true)
    expect(parseMml('MB C MF D').background).toBe(false)
  })
  test('unsupported separators are ignored and malformed lengths stay finite', () => {
    expect(parseMml('  T0 O99 L0 C0 P0; O0 <C ').notes.every((n) => Number.isFinite(n.duration))).toBe(true)
    expect(parseMml('').duration).toBe(0)
  })
})
