import { describe, expect, test } from 'bun:test'
import { FONT, glyph } from '../../src/games/qbasic/font'
import { EGA, createInput, cursorVisible, editInput, nearestEga } from '../../src/games/qbasic/screen'
import { parseMml } from '../../src/games/qbasic/mml'

describe('original QBasic bitmap screen', () => {
  test('ASCII and DOS symbols have complete 8×16 bitmap rows', () => {
    for (let i = 32; i <= 126; i++) expect(FONT[String.fromCharCode(i)]?.length).toBe(16)
    for (const char of '─│┌┐└┘├┤┬┴┼═║╔╗╚╝╠╣╦╩╬╒╕╘╛╓╖╙╜╞╡╟╢╤╧╥╨╪╫█▀▄±↑↓←→♥☺') expect(FONT[char]?.length).toBe(16)
    expect(glyph('☃')).toBe(FONT['?'])
    expect(FONT.a).not.toEqual(FONT.A)
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
