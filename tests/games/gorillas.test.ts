import { describe, expect, test } from 'bun:test'
import {
  CRATER_RADIUS, FIXED_DT, FLIGHT_RATE, GROUND, HEIGHT, SUN_X, SUN_Y, WIDTH,
  carveCrater, chooseCpuThrow, createMatch, createRound, finishDance, finishExplosion, finishThrow, insidePlayer,
  launch, launchMatch, simulateThrow, solidAt, solveCpuThrow, stepShot, validThrow, type Match, type Round,
} from '../../src/games/gorillas/engine'
import { createSetup, submitSetup } from '../../src/games/gorillas/setup'
import { KEYPAD_KEYS, STRINGS as S, MML } from '../../src/games/gorillas/strings'
import {
  TRANSITION_CLICK_GUARD_MS, enterAim, isTransitionClickBlocked, touchControlLayout, type Aim,
} from '../../src/games/gorillas/controls'
import { EGA, createInput, drawSparkles, drawText, editInput } from '../../src/games/qbasic/screen'
import { parseMml } from '../../src/games/qbasic/mml'
import {
  CABALD_PALETTE, CIVILIAN_PALETTE, HERO_PALETTE, drawRemySprite, drawScreen, drawSun, quantizePalette, screenHeight, type RenderView,
} from '../../src/games/gorillas/render'

function openCity(round: Round): void {
  round.pixels.fill(1)
  round.wind = 0
  round.gravity = 9.8
  round.players[0] = { x: 80, y: 200, alive: true, building: 1 }
  round.players[1] = { x: 500, y: 200, alive: true, building: round.buildings.length - 2 }
}

function fly(match: Match): void {
  for (let i = 0; match.round.shot.active && i < 20000; i++) stepShot(match.round)
  expect(match.round.shot.active).toBe(false)
  finishThrow(match)
}

function renderView(screen: RenderView['screen'] = 'play'): RenderView {
  return {
    screen, clock: 0, input: createInput(12), setupStep: 0, setupValues: [],
    names: ['Player 1', 'Player 2'], prompt: 'angle', angle: '', error: '', paused: false, cpu: false, cabaldMessage: true,
    match: createMatch(42), palettes: [HERO_PALETTE, CIVILIAN_PALETTE], skyline: null, sunGaspAt: 0,
  }
}

function pixelCanvas() {
  const pixels = new Uint8Array(WIDTH * 400)
  pixels.fill(255)
  const rects: { x: number; y: number; width: number; height: number; color: number }[] = []
  const images: CanvasImageSource[] = []
  const ctx = {
    fillStyle: '', imageSmoothingEnabled: true,
    fillRect(x: number, y: number, width: number, height: number) {
      const color = EGA.indexOf(this.fillStyle as typeof EGA[number])
      rects.push({ x, y, width, height, color })
      for (let row = Math.max(0, y); row < Math.min(400, y + height); row++) {
        pixels.fill(color, row * WIDTH + Math.max(0, x), row * WIDTH + Math.min(WIDTH, x + width))
      }
    },
    drawImage(image: CanvasImageSource) { images.push(image) },
  } as unknown as CanvasRenderingContext2D
  return { ctx, pixels, rects, images }
}

function pixelRegion(pixels: Uint8Array, x: number, y: number, width: number, height: number): number[] {
  const region: number[] = []
  for (let row = y; row < y + height; row++) {
    for (let col = x; col < x + width; col++) region.push(pixels[row * WIDTH + col])
  }
  return region
}

function expectText(pixels: Uint8Array, text: string, x: number, y: number, fg: number, bg: number): void {
  const expected = pixelCanvas()
  expected.pixels.fill(bg)
  drawText(expected.ctx, text, x, y, fg, bg)
  x = Math.round(x)
  y = Math.round(y)
  expect(pixelRegion(pixels, x, y, text.length * 8, 16)).toEqual(pixelRegion(expected.pixels, x, y, text.length * 8, 16))
}

describe('Gorillas setup and original wording', () => {
  test('all text screens use full 80×25 mode and only SCREEN 9 play uses 350 pixels', () => {
    for (const screen of ['dos', 'intro', 'setup', 'menu', 'preview', 'over'] as const) expect(screenHeight(screen)).toBe(25 * 16)
    expect(screenHeight('play')).toBe(HEIGHT)
  })
  test('pause copy matches the desktop and touch resume controls', () => {
    expect(S.paused(false)).toBe('PAUSED - Press Enter')
    expect(S.paused(true)).toBe('PAUSED - Press Enter or tap Resume')
    for (const touch of [false, true]) {
      const x = (WIDTH - S.paused(touch).length * 8) / 2
      expect(x).toBeGreaterThanOrEqual(112)
      expect(x + S.paused(touch).length * 8).toBeLessThanOrEqual(528)
    }
  })
  test('game-over score columns keep both stored 32-character names separate from TAB(50) scores without clipping', () => {
    for (const opponent of ['  Second player  ', ' cpu ']) {
      const setup = createSetup()
      submitSetup(setup, '  ' + 'R'.repeat(40) + '  ')
      submitSetup(setup, opponent)
      const view = renderView('over')
      view.names = setup.names
      view.match.phase = 'over'
      view.match.scores = [1234567890, 2]
      const canvas = pixelCanvas()
      drawScreen(canvas.ctx, view, false)
      expect(view.names).toEqual(['R'.repeat(32), opponent.trim().toUpperCase() === 'CPU' ? 'THE CABALD' : 'Second player'])
      for (let side = 0; side < 2; side++) {
        const score = String(view.match.scores[side])
        expectText(canvas.pixels, view.names[side], 104, 160 + side * 32, 7, 0)
        expectText(canvas.pixels, score, (50 - 1) * 8, 160 + side * 32, 7, 0)
        expect(104 + view.names[side].length * 8).toBeLessThan(392)
        expect(392 + score.length * 8).toBeLessThanOrEqual(WIDTH - 8)
      }
    }
  })
  test('portrait colours retain readable skin and contrasting hair, shirt, and trousers', () => {
    const palette = quantizePalette({
      skin: '#d0bdb2', hair: '#6b81c1', shirt: '#889e87', bg: '#000000', accent: '#ffffff', eye: '#000000',
    })
    expect(palette.skin).toBe(14)
    expect([1, 9]).toContain(palette.hair)
    expect([7, 8]).toContain(palette.shirt)
    expect(palette.hair).not.toBe(palette.skin)
    expect(palette.shirt).not.toBe(palette.skin)
    expect(palette.trousers).not.toBe(palette.shirt)
    const greyShirt = quantizePalette({
      skin: '#d0bdb2', hair: '#000000', shirt: '#888888', bg: '#000000', accent: '#ffffff', eye: '#000000',
    })
    expect([7, 8]).toContain(greyShirt.shirt)
    expect(greyShirt.trousers).toBe(0)
  })
  test('empty Enter applies defaults in name/name/points/gravity order', () => {
    const setup = createSetup()
    expect(setup.step).toBe(0)
    for (let step = 0; step < 4; step++) {
      expect(setup.step).toBe(step)
      expect(submitSetup(setup, '')).toBe('')
    }
    expect(setup.names).toEqual(['Player 1', 'Player 2'])
    expect(setup.target).toBe(3)
    expect(setup.gravity).toBe(9.8)
    expect(setup.cpu).toBe(false)
    expect(setup.values).toEqual(['Player 1', 'Player 2', '3', '9.8'])
    expect(S.setupPrompts).toEqual([
      "Name of Player 1 (Default = 'Player 1'):", "Name of Player 2 (Default = 'Player 2'):",
      'Play to how many total points (Default = 3)?', 'Gravity in Meters/Sec (Earth = 9.8)?',
    ])
    expect(S.menuLines).toEqual(['V = View Intro', 'P = Play Game', 'Q = Quit'])
    expect(S.scoreLine(3, 1)).toBe('3>Score<1')
  })
  test('CPU resolves to THE CABALD, names trim/cap, invalid numeric setup stays on its prompt', () => {
    const setup = createSetup()
    submitSetup(setup, '  ' + 'R'.repeat(40) + '  ')
    submitSetup(setup, ' cpu ')
    expect(setup.names).toEqual(['R'.repeat(32), 'THE CABALD'])
    expect(setup.cpu).toBe(true)
    expect(submitSetup(setup, '0')).toBe(S.invalidTarget)
    expect(setup.step).toBe(2)
    expect(submitSetup(setup, '2.5')).toBe(S.invalidTarget)
    expect(submitSetup(setup, '5')).toBe('')
    expect(submitSetup(setup, 'NaN')).toBe(S.invalidGravity)
    expect(submitSetup(setup, '0')).toBe(S.invalidGravity)
    expect(setup.step).toBe(3)
    expect(submitSetup(setup, '1.6')).toBe('')
    expect(setup.gravity).toBe(1.6)
  })
  test('intro description and original PLAY phrases stay canonical and finite', () => {
    expect(S.introLines.join(' ')).toBe(
      'Two Remys. Two rooftops. One exploding banana. Take turns choosing the angle and velocity of each throw '
      + 'to hit your opponent. Wind (the arrow at the bottom of the screen: longer means stronger), gravity and the '
      + 'Liquidity City skyline all get a vote.',
    )
    for (const phrase of Object.values(MML)) {
      const score = parseMml(phrase)
      expect(score.notes.length).toBeGreaterThan(1)
      expect(score.duration).toBeGreaterThan(0)
      expect(score.notes.every((note) => Number.isFinite(note.duration))).toBe(true)
    }
    expect(parseMml(MML.victory).duration).toBeLessThanOrEqual(3)
    expect(parseMml(MML.victory).duration).toBeCloseTo(4 / 3, 10)
  })
  test('player explosions rumble for one to one-and-a-half seconds with falling low pulses', () => {
    const rumble = parseMml(MML.player)
    expect(rumble.duration).toBeGreaterThanOrEqual(1)
    expect(rumble.duration).toBeLessThanOrEqual(1.5)
    const pitches = rumble.notes.filter((note) => note.midi !== null).map((note) => note.midi!)
    expect(Math.max(...pitches)).toBeLessThanOrEqual(36)
    for (let i = 1; i < 13; i++) expect(pitches[i]).toBeLessThan(pitches[i - 1])
    expect(rumble.notes.some((note) => note.midi === null)).toBe(true)
  })
})

describe('original text screens and repaired graphics', () => {
  test('intro and GAME OVER use black text mode, red five-cell sparkles on rows 1–22 and continuation outside on row 24', () => {
    for (const screen of ['intro', 'over'] as const) for (const touch of [false, true]) for (const clock of [0, 100]) {
      const view = renderView(screen)
      view.clock = clock
      view.skyline = {} as HTMLCanvasElement
      if (screen === 'over') view.match.phase = 'over'
      const canvas = pixelCanvas()
      drawScreen(canvas.ctx, view, touch)
      expect(canvas.rects[0]).toEqual({ x: 0, y: 0, width: WIDTH, height: 400, color: 0 })
      expect(canvas.images).toHaveLength(0)
      expect(canvas.pixels.every((color) => color < EGA.length)).toBe(true)
      const border = pixelCanvas()
      border.pixels.fill(0)
      drawSparkles(border.ctx, clock / 100, 22, 12, 0, 5)
      for (const [x, y, width, height] of [[0, 0, WIDTH, 16], [0, 336, WIDTH, 16], [0, 16, 8, 320], [632, 16, 8, 320]]) {
        expect(pixelRegion(canvas.pixels, x, y, width, height)).toEqual(pixelRegion(border.pixels, x, y, width, height))
      }
      expect(pixelRegion(canvas.pixels, 0, 352, WIDTH, 16).every((color) => color === 0)).toBe(true)
      expect(pixelRegion(canvas.pixels, 0, 384, WIDTH, 16).every((color) => color === 0)).toBe(true)
      const continuation = touch ? S.touchContinue : S.continue
      expectText(canvas.pixels, continuation, (WIDTH - continuation.length * 8) / 2, 368, 7, 0)
      if (screen === 'intro') {
        expectText(canvas.pixels, S.introTitle, (WIDTH - S.introTitle.length * 8) / 2, 64, 15, 0)
        for (let i = 0; i < S.introLines.length; i++) {
          const line = S.introLines[i]
          expectText(canvas.pixels, line, (WIDTH - line.length * 8) / 2, 120 + i * 16, 7, 0)
        }
      } else {
        expectText(canvas.pixels, S.gameOver, (WIDTH - S.gameOver.length * 8) / 2, 80, 7, 0)
        expectText(canvas.pixels, S.score, 232, 128, 7, 0)
      }
    }
  })
  test('setup uses original grey-on-black columns and rows, without a title or a persistent CPU hint', () => {
    const columns = [13, 14, 17, 17]
    for (let step = 0; step < 4; step++) {
      const view = renderView('setup')
      view.setupStep = step
      view.setupValues = ['Remy', 'Jake', '3', '9.8']
      view.input = createInput(32, '7')
      const canvas = pixelCanvas()
      drawScreen(canvas.ctx, view, false)
      expect(pixelRegion(canvas.pixels, 0, 0, WIDTH, 32).every((color) => color === 0)).toBe(true)
      for (let i = 0; i <= step; i++) {
        const y = (4 + i * 2) * 16
        const prompt = S.setupPrompts[i]
        expectText(canvas.pixels, prompt, (columns[i] - 1) * 8, y, 7, 0)
        expectText(canvas.pixels, i < step ? view.setupValues[i] : '7_', (columns[i] + prompt.length) * 8, y, 7, 0)
      }
      if (step === 1) expectText(canvas.pixels, S.cpuHint, 104, 208, 7, 0)
      else expect(pixelRegion(canvas.pixels, 104, 208, S.cpuHint.length * 8, 16).every((color) => color === 0)).toBe(true)
    }
  })
  test('a 32-character setup answer and its blinking cursor wrap onto the intervening row rather than clipping', () => {
    const view = renderView('setup')
    view.input = createInput(32, 'R'.repeat(32))
    const col = 13 + S.setupPrompts[0].length + 1
    const available = 81 - col
    for (const clock of [0, 300]) {
      view.clock = clock
      const canvas = pixelCanvas()
      drawScreen(canvas.ctx, view, false)
      const answer = view.input.value + (clock === 0 ? '_' : ' ')
      expect(answer.length).toBeGreaterThan(available)
      expectText(canvas.pixels, answer.slice(0, available), (col - 1) * 8, 64, 7, 0)
      expectText(canvas.pixels, answer.slice(available), 96, 80, 7, 0)
    }
    view.setupStep = 1
    view.setupValues = ['R'.repeat(32)]
    const answered = pixelCanvas()
    drawScreen(answered.ctx, view, false)
    expectText(answered.pixels, view.setupValues[0].slice(0, available), (col - 1) * 8, 64, 7, 0)
    expectText(answered.pixels, view.setupValues[0].slice(available), 96, 80, 7, 0)
  })
  test('the V/P/Q menu retains the answered prompts and Your Choice has a blinking INPUT cursor', () => {
    const view = renderView('menu')
    view.setupValues = ['Remy', 'THE CABALD', '3', '9.8']
    const columns = [13, 14, 17, 17]
    for (const clock of [0, 300]) {
      view.clock = clock
      const canvas = pixelCanvas()
      drawScreen(canvas.ctx, view, false)
      for (let i = 0; i < 4; i++) {
        expectText(canvas.pixels, S.setupPrompts[i], (columns[i] - 1) * 8, (4 + i * 2) * 16, 7, 0)
        expectText(canvas.pixels, view.setupValues[i], (columns[i] + S.setupPrompts[i].length) * 8, (4 + i * 2) * 16, 7, 0)
      }
      for (let i = 0; i < S.menuLines.length; i++) expectText(canvas.pixels, S.menuLines[i], 256, 208 + i * 32, 7, 0)
      expectText(canvas.pixels, S.choice, 256, 320, 7, 0)
      expectText(canvas.pixels, clock === 0 ? '_' : ' ', 256 + (S.choice.length + 1) * 8, 320, 7, 0)
    }
  })
  test('the preview centres STARRING and both retained names with AND, including two maximum-length names', () => {
    const view = renderView('preview')
    view.names = ['R'.repeat(32), 'J'.repeat(32)]
    const canvas = pixelCanvas()
    drawScreen(canvas.ctx, view, false)
    const cast = S.previewCast(...view.names)
    expect(cast).toBe(view.names[0] + ' AND ' + view.names[1])
    expectText(canvas.pixels, S.starring, (WIDTH - S.starring.length * 8) / 2, 112, 7, 0)
    expectText(canvas.pixels, cast, (WIDTH - cast.length * 8) / 2, 144, 7, 0)
    expect(cast.length * 8).toBeLessThan(WIDTH)
  })
  test('the CPU-win result remains after the denial cap, with human wins and draws still distinct', () => {
    for (const [winner, denial, result] of [[1, true, S.cpuWin], [1, false, S.cpuWinOnly], [0, false, S.humanWin], [-1, false, S.cpuDraw]] as const) {
      const view = renderView('over')
      view.cpu = true
      view.cabaldMessage = denial
      view.names = ['Remy', 'THE CABALD']
      view.match.phase = 'over'
      view.match.winner = winner
      const canvas = pixelCanvas()
      drawScreen(canvas.ctx, view, false)
      expectText(canvas.pixels, result, (WIDTH - result.length * 8) / 2, 256, 7, 0)
    }
    expect(S.cpuWinOnly).toBe('THE CABALD wins.')
  })
  test('Angle INPUT is next to its prompt, Velocity appears only after acceptance, and errors follow the thrower', () => {
    const view = renderView()
    openCity(view.match.round)
    view.input = createInput(12, '45')
    let canvas = pixelCanvas()
    drawScreen(canvas.ctx, view, false)
    expectText(canvas.pixels, '45_', 8 + (S.angle.length + 1) * 8, 16, 14, 1)
    expect(pixelRegion(canvas.pixels, 8, 32, S.velocity.length * 8, 16).every((color) => color === 1)).toBe(true)
    view.prompt = 'velocity'
    view.angle = '45'
    view.input = createInput(12, '70')
    canvas = pixelCanvas()
    drawScreen(canvas.ctx, view, false)
    expectText(canvas.pixels, '45', 8 + (S.angle.length + 1) * 8, 16, 14, 1)
    expectText(canvas.pixels, S.velocity, 8, 32, 15, 1)
    expectText(canvas.pixels, '70_', 8 + (S.velocity.length + 1) * 8, 32, 14, 1)
    view.match.round.turn = 1
    view.error = S.invalidAngle
    canvas = pixelCanvas()
    drawScreen(canvas.ctx, view, false)
    expectText(canvas.pixels, view.error, WIDTH - 8 - view.error.length * 8, 48, 12, 1)
    expect(pixelRegion(canvas.pixels, 8, 48, view.error.length * 8, 16).every((color) => color === 1)).toBe(true)
  })
  test('desktop and touch pause text is centred within the black banner', () => {
    const view = renderView()
    openCity(view.match.round)
    view.paused = true
    for (const touch of [false, true]) {
      const canvas = pixelCanvas()
      drawScreen(canvas.ctx, view, touch)
      const message = S.paused(touch)
      expectText(canvas.pixels, message, (WIDTH - message.length * 8) / 2, 164, 14, 0)
      expect(canvas.rects).toContainEqual({ x: 112, y: 152, width: 416, height: 40, color: 0 })
    }
  })
  test('the victim remains visible outside the first tiny player explosion disc', () => {
    for (const side of [0, 1] as const) {
      const view = renderView()
      openCity(view.match.round)
      view.cpu = true
      view.palettes[1] = CABALD_PALETTE
      const round = view.match.round
      const victim = round.players[side]
      victim.alive = false
      round.hit = 'player'
      round.victim = side
      round.impactX = victim.x + 15
      round.impactY = victim.y + 15
      view.match.phase = 'explosion'
      view.match.explosionRadius = 28
      view.match.elapsed = 0
      const canvas = pixelCanvas()
      drawScreen(canvas.ctx, view, false)
      const sprite = pixelCanvas()
      sprite.pixels.fill(1)
      drawRemySprite(sprite.ctx, victim.x, victim.y, view.palettes[side], 0, side === 1, side === 1)
      for (let y = victim.y; y < victim.y + 30; y++) for (let x = victim.x; x < victim.x + 30; x++) {
        if ((x - round.impactX) ** 2 + (y - round.impactY) ** 2 <= 1) continue
        expect(canvas.pixels[y * WIDTH + x]).toBe(sprite.pixels[y * WIDTH + x])
      }
    }
  })
  test('the sun gasp is a clean hollow 5×6 oval and popped shades clear the top of its face', () => {
    const canvas = pixelCanvas()
    canvas.pixels.fill(1)
    drawSun(canvas.ctx, true, 22)
    const mouth = ['.###.', '#...#', '#...#', '#...#', '#...#', '.###.']
    for (let y = 0; y < 6; y++) for (let x = 0; x < 5; x++) {
      expect(canvas.pixels[(SUN_Y + 3 + y) * WIDTH + SUN_X - 2 + x]).toBe(mouth[y][x] === '#' ? 0 : 14)
    }
    const shadesY = SUN_Y - 3 - 22
    expect(canvas.rects).toContainEqual({ x: SUN_X - 9, y: shadesY, width: 18, height: 2, color: 0 })
    expect(canvas.rects).toContainEqual({ x: SUN_X - 8, y: shadesY, width: 6, height: 4, color: 0 })
    expect(shadesY + 4).toBeLessThan(SUN_Y - 12)
    const normal = pixelCanvas()
    drawSun(normal.ctx, false)
    const normalShades = normal.rects.find((rect) => rect.x === SUN_X - 9 && rect.width === 18 && rect.height === 2)!
    const poppedShades = canvas.rects.find((rect) => rect.x === SUN_X - 9 && rect.width === 18 && rect.height === 2)!
    expect(normalShades.y - poppedShades.y).toBeGreaterThanOrEqual(10)
  })
  test('each banana rotation is a filled two-pixel crescent with a brown stem, not a one-pixel outline', () => {
    const view = renderView()
    openCity(view.match.round)
    view.match.phase = 'flight'
    Object.assign(view.match.round.shot, { x: 320, y: 180, time: 1, active: true })
    for (let frame = 0; frame < 4; frame++) {
      view.match.round.shot.frame = frame
      const canvas = pixelCanvas()
      drawScreen(canvas.ctx, view, false)
      const banana = pixelRegion(canvas.pixels, 317, 177, 7, 7)
      expect(banana.filter((color) => color === 14)).toHaveLength(17)
      expect(banana.filter((color) => color === 6)).toHaveLength(1)
      if (frame === 0) {
        expect(canvas.pixels[181 * WIDTH + 320]).toBe(14)
        expect(canvas.pixels[182 * WIDTH + 320]).toBe(14)
        expect(canvas.pixels[180 * WIDTH + 320]).toBe(1)
      }
    }
  })
  test('Rug Tower blinks a gold beacon, and a crater through its roof removes the entire antenna', () => {
    let round: Round | undefined
    for (let seed = 0; seed < 200; seed++) {
      const candidate = createRound(seed)
      if (candidate.buildings.some((building) => building.tower)) { round = candidate; break }
    }
    expect(round).toBeDefined()
    const view = renderView()
    view.match.round = round!
    const tower = round!.buildings.find((building) => building.tower)!
    const x = tower.x + Math.floor(tower.width / 2)
    const lit = pixelCanvas()
    drawScreen(lit.ctx, view, false)
    expect(lit.rects).toContainEqual({ x, y: tower.y - 12, width: 2, height: 2, color: 14 })
    expect(lit.rects).toContainEqual({ x, y: tower.y - 10, width: 2, height: 10, color: 8 })
    view.clock = 534
    const dark = pixelCanvas()
    drawScreen(dark.ctx, view, false)
    expect(dark.rects).not.toContainEqual({ x, y: tower.y - 12, width: 2, height: 2, color: 14 })
    carveCrater(round!, x, tower.y)
    expect(round!.pixels[tower.y * WIDTH + x]).toBe(1)
    view.clock = 0
    const damaged = pixelCanvas()
    drawScreen(damaged.ctx, view, false)
    expect(damaged.rects).not.toContainEqual({ x, y: tower.y - 10, width: 2, height: 10, color: 8 })
    expect(damaged.rects).not.toContainEqual({ x, y: tower.y - 12, width: 2, height: 2, color: 14 })
  })
})

describe('keyboard and touch typed INPUT', () => {
  test('phone keypad keeps the approved thirteen-key order', () => {
    expect(S.numericKeys).toEqual(['7', '8', '9', '4', '5', '6', '1', '2', '3', '.', '0', '⌫', '↵'])
  })
  test('new controls ignore the compatibility click for 350 ms after a pointer-driven transition', () => {
    expect(TRANSITION_CLICK_GUARD_MS).toBe(350)
    expect(isTransitionClickBlocked(0, null)).toBe(false)
    expect(isTransitionClickBlocked(1000, null)).toBe(false)
    expect(isTransitionClickBlocked(0, 0)).toBe(true)
    expect(isTransitionClickBlocked(349, 0)).toBe(true)
    expect(isTransitionClickBlocked(350, 0)).toBe(false)
    expect(isTransitionClickBlocked(1000, 1000)).toBe(true)
    expect(isTransitionClickBlocked(1349, 1000)).toBe(true)
    expect(isTransitionClickBlocked(1350, 1000)).toBe(false)
  })
  test('landscape touch controls sit beside the city while portrait controls remain below', () => {
    expect(touchControlLayout(844, 390)).toBe('side')
    expect(touchControlLayout(390, 844)).toBe('below')
  })
  test('real keypad labels enter, erase, accept angle and velocity, and launch the same physical banana', () => {
    const match = createMatch(42)
    const aim: Aim = { prompt: 'angle', angle: '', input: createInput(12), error: '' }
    for (const label of ['4', '2', '⌫', '5', '↵', '7', '0', '.', '5', '↵']) {
      expect(S.numericKeys).toContain(label)
      const key = KEYPAD_KEYS[label] ?? label
      const edited = editInput(aim.input, key, /[0-9.]/)
      aim.input = edited.input
      if (edited.submitted) enterAim(aim, match)
    }
    expect(aim.angle).toBe('45')
    expect(aim.prompt).toBe('velocity')
    expect(aim.input.value).toBe('70.5')
    expect(aim.error).toBe('')
    expect(match.phase).toBe('flight')
    expect(match.round.shot.vx).toBeCloseTo(Math.cos(Math.PI / 4) * 70.5, 10)
    expect(match.round.shot.vy).toBeCloseTo(-Math.sin(Math.PI / 4) * 70.5, 10)
  })
  test('invalid or empty typed angles and velocities do not advance or launch; Backspace and decimal input recover', () => {
    const match = createMatch(7)
    const aim: Aim = { prompt: 'angle', angle: '', input: createInput(12), error: '' }
    expect(enterAim(aim, match)).toBe(false)
    expect(aim.error).toBe(S.invalidAngle)
    aim.input = createInput(12, '361')
    expect(enterAim(aim, match)).toBe(false)
    expect(aim.prompt).toBe('angle')
    aim.input = createInput(12, '360')
    expect(enterAim(aim, match)).toBe(false)
    expect(aim.prompt).toBe('velocity')
    expect(enterAim(aim, match)).toBe(false)
    expect(aim.error).toBe(S.invalidVelocity)
    expect(match.phase).toBe('aim')
    aim.input = createInput(12, '50.5')
    expect(enterAim(aim, match)).toBe(true)
    expect(match.phase).toBe('flight')
  })
})

describe('seeded Liquidity City', () => {
  test('the city is deterministic, 9–12 varied buildings and sky gaps span 640, all pixels are EGA and players stand near the edges', () => {
    let towers = 0
    const counts = new Set<number>()
    const winds = new Set<number>()
    for (let seed = 0; seed < 200; seed++) {
      const round = createRound(seed)
      counts.add(round.buildings.length)
      winds.add(round.wind)
      expect(round.buildings.length).toBeGreaterThanOrEqual(9)
      expect(round.buildings.length).toBeLessThanOrEqual(12)
      expect(round.pixels.length).toBe(WIDTH * HEIGHT)
      expect(round.buildings.reduce((total, b) => total + b.width, 0) + round.buildings.length - 1).toBe(WIDTH)
      expect(round.buildings[0].x).toBe(0)
      expect(round.buildings.at(-1)!.x + round.buildings.at(-1)!.width).toBe(WIDTH)
      for (let i = 1; i < round.buildings.length; i++) {
        const previous = round.buildings[i - 1]
        const gap = previous.x + previous.width
        expect(round.buildings[i].x).toBe(gap + 1)
        for (let y = 0; y < HEIGHT; y++) expect(round.pixels[y * WIDTH + gap]).toBe(1)
      }
      expect(round.players[0].building === 1 || round.players[0].building === 2).toBe(true)
      expect([round.buildings.length - 2, round.buildings.length - 3]).toContain(round.players[1].building)
      for (const player of round.players) {
        const roof = round.buildings[player.building]
        expect(player.x).toBe(Math.floor(roof.x + (roof.width - 30) / 2))
        expect(player.y).toBe(roof.y - 30)
        expect(solidAt(round, player.x + 15, player.y + 30)).toBe(true)
      }
      for (const b of round.buildings) {
        expect(b.width).toBeGreaterThanOrEqual(37)
        expect(b.width).toBeLessThanOrEqual(90)
        expect(b.y).toBeGreaterThanOrEqual(60)
        expect(b.y).toBeLessThan(GROUND)
        if (b.tower) {
          towers++
          expect(b.color).toBe(5)
          expect(round.players.every((p) => round.buildings[p.building] !== b)).toBe(true)
          expect(b.width).toBeGreaterThanOrEqual(47)
          // Four window columns × five rows form a centered, open-right gold C in the actual bitmap.
          const columns = Math.ceil((b.width - 12) / 10)
          const c0 = Math.floor((columns - 4) / 2)
          expect(columns).toBeGreaterThanOrEqual(4)
          expect(Math.abs(c0 - (columns - c0 - 4))).toBeLessThanOrEqual(1)
          for (let row = 0; row < 5; row++) {
            for (let col = 0; col < columns; col++) {
              const lit = (row === 0 || row === 4) && col >= c0 && col < c0 + 4 || row > 0 && row < 4 && col === c0
              const wx = b.x + 6 + col * 10
              const wy = b.y + 8 + row * 15
              for (let y = wy; y < wy + 6; y++) {
                for (let x = wx; x < wx + 3; x++) expect(round.pixels[y * WIDTH + x]).toBe(lit ? 14 : 8)
              }
            }
          }
        }
      }
      expect(round.pixels.every((pixel) => pixel >= 0 && pixel < EGA.length)).toBe(true)
      expect(Math.abs(round.wind)).toBeLessThanOrEqual(15)
    }
    expect([...counts].sort((a, b) => a - b)).toEqual([9, 10, 11, 12])
    expect(towers).toBeGreaterThan(0)
    expect([...winds].some((wind) => Math.abs(wind) > 5)).toBe(true)
    expect(createRound(4490).pixels).toEqual(createRound(4490).pixels)
    expect(createRound(4490).players).toEqual(createRound(4490).players)
  })
})

describe('fixed-step banana physics', () => {
  test('the original pixel-unit gravity and Wind/5 formula integrates at 1/60 second, independent of render timing', () => {
    const round = createRound(42)
    openCity(round)
    round.wind = 3
    expect(FIXED_DT).toBe(1 / 60)
    expect(launch(round, 65, 50)).toBe(true)
    const x = round.shot.x
    const y = round.shot.y
    const vx = round.shot.vx
    const vy = round.shot.vy
    expect(vx).toBeCloseTo(Math.cos(65 * Math.PI / 180) * 50, 10)
    expect(vy).toBeCloseTo(-Math.sin(65 * Math.PI / 180) * 50, 10)
    for (let i = 0; i < 60; i++) stepShot(round)
    expect(round.shot.active).toBe(true)
    expect(round.shot.x).toBeCloseTo(x + vx + (round.wind / 5) / 2, 8)
    expect(round.shot.y).toBeCloseTo(y + vy + round.gravity / 2, 8)
    expect(round.shot.vx).toBeCloseTo(vx + round.wind / 5, 8)
    expect(round.shot.vy).toBeCloseTo(vy + round.gravity, 8)
    expect(round.shot.time).toBeCloseTo(1, 8)
    expect(round.shot.frame).toBeGreaterThanOrEqual(0)
    expect(round.shot.frame).toBeLessThan(4)
  })
  test('classic 45° / 57 has the original range and apex, without the old double-sized launch', () => {
    const round = createRound(42)
    openCity(round)
    expect(launch(round, 45, 57)).toBe(true)
    const sx = round.shot.x
    const sy = round.shot.y
    const speed = 57 / Math.sqrt(2)
    for (let i = 0; i < 240; i++) stepShot(round)
    expect(round.shot.active).toBe(true)
    expect(round.shot.x).toBeCloseTo(sx + speed * 4, 8)
    expect(round.shot.y).toBeCloseTo(sy - speed * 4 + 0.5 * 9.8 * 4 ** 2, 8)
    expect(round.shot.y).toBeGreaterThan(0)
    const apexTime = speed / 9.8
    const apexSteps = Math.round(apexTime / FIXED_DT)
    for (let i = 240; i < apexSteps; i++) stepShot(round)
    expect(round.shot.active).toBe(true)
    expect(round.shot.y).toBeCloseTo(sy - 57 ** 2 / (4 * 9.8), 3)
    expect(Math.abs(round.shot.vy)).toBeLessThanOrEqual(9.8 * FIXED_DT / 2)
    const returnSteps = Math.round(2 * apexTime / FIXED_DT)
    for (let i = apexSteps; i < returnSteps; i++) stepShot(round)
    expect(round.shot.active).toBe(true)
    expect(round.shot.x).toBeCloseTo(sx + speed * returnSteps * FIXED_DT, 8)
    expect(Math.abs(round.shot.x - sx - 57 ** 2 / 9.8)).toBeLessThanOrEqual(speed * FIXED_DT / 2)
    expect(Math.abs(round.shot.y - sy)).toBeLessThanOrEqual(speed * FIXED_DT)
  })
  test('strong wind and non-Earth gravity retain the same original units', () => {
    for (const wind of [-15, 3, 15]) {
      for (const gravity of [1.6, 9.8, 25]) {
        const round = createRound(42)
        openCity(round)
        round.wind = wind
        round.gravity = gravity
        launch(round, 65, 50)
        const sx = round.shot.x
        const sy = round.shot.y
        const radians = 65 * Math.PI / 180
        const time = 2
        for (let i = 0; i < time / FIXED_DT; i++) stepShot(round)
        expect(round.shot.active).toBe(true)
        expect(round.shot.x).toBeCloseTo(sx + Math.cos(radians) * 50 * time + 0.5 * (wind / 5) * time ** 2, 8)
        expect(round.shot.y).toBeCloseTo(sy - Math.sin(radians) * 50 * time + 0.5 * gravity * time ** 2, 8)
      }
    }
  })
  test('a typical full-city lob takes two to three real seconds at the four-times flight rate', () => {
    const round = createRound(88)
    openCity(round)
    round.players[0].x = 40
    round.players[1].x = 540
    round.turn = 1
    const throw_ = solveCpuThrow(round)
    expect(launch(round, throw_.angle, throw_.velocity)).toBe(true)
    let steps = 0
    while (round.shot.active && steps < 20000) {
      stepShot(round)
      steps++
    }
    expect(round.hit).toBe('player')
    expect(round.victim).toBe(0)
    expect(FLIGHT_RATE).toBe(4)
    expect(steps * FIXED_DT / FLIGHT_RATE).toBeGreaterThanOrEqual(2)
    expect(steps * FIXED_DT / FLIGHT_RATE).toBeLessThanOrEqual(3)
  })
  test('player two mirrors the angle, launch errors do not change the city', () => {
    const a = createRound(4)
    const b = createRound(4)
    openCity(a)
    openCity(b)
    b.turn = 1
    launch(a, 45, 70)
    launch(b, 45, 70)
    expect(a.shot.vx).toBeCloseTo(-b.shot.vx, 10)
    expect(a.shot.vy).toBeCloseTo(b.shot.vy, 10)
    for (const [angle, velocity] of [[-1, 50], [361, 50], [45, 0], [NaN, 50], [45, Infinity]]) expect(validThrow(angle, velocity)).toBe(false)
    expect(validThrow(360, 0.1)).toBe(true)
    expect(launch(a, 45, 50)).toBe(false)
  })
  test('off-top shots continue simulating, off-side shots miss', () => {
    const round = createRound(6)
    openCity(round)
    launch(round, 90, 100)
    const sy = round.shot.y
    for (let i = 0; i < 150; i++) stepShot(round)
    expect(round.shot.time).toBeCloseTo(2.5, 8)
    expect(round.shot.y).toBeCloseTo(sy - 100 * 2.5 + 0.5 * 9.8 * 2.5 ** 2, 8)
    expect(round.shot.y).toBeLessThan(0)
    expect(round.shot.active).toBe(true)
    const side = createRound(6)
    openCity(side)
    launch(side, 180, 100)
    for (let i = 0; i < 200; i++) stepShot(side)
    expect(side.hit).toBe('miss')
    expect(side.shot.active).toBe(false)
  })
  test('swept collision prevents high-speed banana tunnelling through a building', () => {
    const round = createRound(9)
    openCity(round)
    for (let y = 150; y < GROUND; y++) round.pixels[y * WIDTH + 150] = 4
    launch(round, 0, 1000)
    for (let i = 0; i < 10; i++) stepShot(round)
    expect(round.hit).toBe('building')
    expect(round.impactX).toBeCloseTo(150, 0)
    expect(solidAt(round, 150, Math.floor(round.impactY))).toBe(true)
  })
  test('a circular crater erases collision pixels, keeps pixels outside radius, and safely clips edges', () => {
    const round = createRound(8)
    round.pixels.fill(4)
    carveCrater(round, 320, 200)
    expect(solidAt(round, 320, 200)).toBe(false)
    expect(solidAt(round, 320 + CRATER_RADIUS, 200)).toBe(false)
    expect(solidAt(round, 320 + CRATER_RADIUS + 1, 200)).toBe(true)
    expect(solidAt(round, 320 + CRATER_RADIUS, 200 + CRATER_RADIUS)).toBe(true)
    carveCrater(round, 0, 0)
    carveCrater(round, WIDTH - 1, HEIGHT - 1)
    expect(round.pixels[0]).toBe(1)
    expect(round.pixels[WIDTH * HEIGHT - 1]).toBe(1)
  })
  test('the sun gasps once, remains non-solid, and the banana keeps spinning through it', () => {
    const round = createRound(19)
    openCity(round)
    Object.assign(round.shot, { x: SUN_X - 18, y: SUN_Y, vx: 120, vy: 0, active: true })
    for (let i = 0; i < 15; i++) stepShot(round)
    expect(round.sunGasp).toBe(true)
    expect(round.shot.active).toBe(true)
    expect(round.hit).toBe('none')
    expect(round.shot.x).toBeGreaterThan(SUN_X)
    expect(round.shot.frame).toBeGreaterThanOrEqual(0)
  })
})

describe('hits, survivor scoring, four-beat rounds and matches', () => {
  test('player collision is inset and dead players cannot be hit', () => {
    const round = createRound(12)
    openCity(round)
    const p = round.players[0]
    expect(insidePlayer(p, p.x + 15, p.y + 15)).toBe(true)
    expect(insidePlayer(p, p.x, p.y)).toBe(false)
    p.alive = false
    expect(insidePlayer(p, p.x + 15, p.y + 15)).toBe(false)
  })
  test('self-hit destroys the thrower and awards only the surviving opponent', () => {
    const match = createMatch(14, 1)
    openCity(match.round)
    expect(launchMatch(match, 90, 70)).toBe(true)
    fly(match)
    expect(match.round.hit).toBe('player')
    expect(match.round.victim).toBe(0)
    expect(match.round.players[0].alive).toBe(false)
    expect(match.round.players[1].alive).toBe(true)
    expect(match.scores).toEqual([0, 1])
    expect(match.winner).toBe(1)
    expect(match.phase).toBe('explosion')
    finishThrow(match)
    expect(match.scores).toEqual([0, 1])
    finishExplosion(match)
    expect(match.phase).toBe('dance')
    expect(match.danceBeat).toBe(0)
    finishDance(match)
    expect(match.phase).toBe('over')
  })
  test('a downward throw can immediately self-hit; the thrower has no artificial immunity', () => {
    const match = createMatch(15, 1)
    openCity(match.round)
    launchMatch(match, 270, 70)
    fly(match)
    expect(match.round.hit).toBe('player')
    expect(match.round.victim).toBe(0)
    expect(match.scores).toEqual([0, 1])
  })
  test('building explosions carve once, alternate turns, and never score', () => {
    const match = createMatch(8)
    openCity(match.round)
    for (let y = 150; y < GROUND; y++) match.round.pixels[y * WIDTH + 150] = 3
    launchMatch(match, 0, 500)
    fly(match)
    expect(match.phase).toBe('explosion')
    const x = Math.floor(match.round.impactX)
    const y = Math.floor(match.round.impactY)
    expect(solidAt(match.round, x, y)).toBe(true)
    finishExplosion(match)
    expect(solidAt(match.round, x, y)).toBe(false)
    expect(match.phase).toBe('aim')
    expect(match.round.turn).toBe(1)
    expect(match.scores).toEqual([0, 0])
  })
  test('a side miss changes turns; real player hits advance new seeded rounds until target points', () => {
    const missed = createMatch(27, 2)
    openCity(missed.round)
    launchMatch(missed, 180, 100)
    fly(missed)
    expect(missed.phase).toBe('aim')
    expect(missed.round.turn).toBe(1)
    expect(missed.scores).toEqual([0, 0])
    const match = createMatch(27, 3)
    for (let i = 0; i < 3; i++) {
      openCity(match.round)
      const survivor = match.round.turn
      const previousSeed = match.round.seed
      launchMatch(match, 0, 240)
      fly(match)
      expect(match.round.hit).toBe('player')
      expect(match.winner).toBe(survivor)
      finishExplosion(match)
      expect(match.phase).toBe('dance')
      finishDance(match)
      if (i < 2) {
        expect(match.phase).toBe('aim')
        expect(match.round.seed).not.toBe(previousSeed)
        expect(match.round.players.every((p) => p.alive)).toBe(true)
        expect(match.round.sunGasp).toBe(false)
      }
    }
    expect(match.phase).toBe('over')
    expect(Math.max(...match.scores)).toBe(2)
    expect(match.scores[0] + match.scores[1]).toBe(3)
    expect(match.winner).toBe(0)
  })
  test('total points count both players and an even-round tied match is a draw', () => {
    const match = createMatch(42, 2)
    for (let round = 0; round < 2; round++) {
      openCity(match.round)
      launchMatch(match, 0, 240)
      fly(match)
      finishExplosion(match)
      finishDance(match)
      expect(match.phase).toBe(round === 0 ? 'aim' : 'over')
    }
    expect(match.scores).toEqual([1, 1])
    expect(match.winner).toBe(-1)
    expect(match.roundNumber).toBe(2)
  })
})

describe('THE CABALD iterative solver', () => {
  test('simulation shares live trajectory and collisions but never mutates live play', () => {
    const round = createRound(88)
    const shot = { ...round.shot }
    const pixels = round.pixels.slice()
    const result = simulateThrow(round, 1, 57, 72)
    expect(round.shot).toEqual(shot)
    expect(round.pixels).toEqual(pixels)
    expect(round.sunGasp).toBe(false)
    round.turn = 1
    launch(round, 57, 72)
    for (let i = 0; round.shot.active && i < 20000; i++) stepShot(round)
    expect(result.hit).toBe(round.hit)
    expect(result.victim).toBe(round.victim)
    expect(result.x).toBeCloseTo(round.shot.x, 10)
    expect(result.y).toBeCloseTo(round.shot.y, 10)
  })
  test('the initial ±15% velocity / ±8 degree errors halve after each actual miss', () => {
    for (const random of [0, 1]) {
      const match = createMatch(51)
      openCity(match.round)
      match.round.turn = 1
      match.round.cpu.rng = () => random
      const estimate = solveCpuThrow(match.round)
      const direction = random * 2 - 1
      const first = chooseCpuThrow(match.round)
      expect(first.angle).toBeCloseTo(estimate.angle + direction * 8, 8)
      expect(first.velocity).toBeCloseTo(estimate.velocity * (1 + direction * 0.15), 8)
      launchMatch(match, 180, 100)
      fly(match)
      expect(match.round.cpu.misses).toBe(1)
      const second = chooseCpuThrow(match.round)
      expect(second.angle).toBeCloseTo(estimate.angle + direction * 4, 8)
      expect(second.velocity).toBeCloseTo(estimate.velocity * (1 + direction * 0.075), 8)
      expect(match.round.cpu.throws).toBe(1)
    }
  })
  test('clear cities use preferred 45–60° lobs at ordinary original-unit velocities for either facing', () => {
    for (const side of [0, 1] as const) {
      const round = createRound(88)
      openCity(round)
      const throw_ = solveCpuThrow(round, side)
      expect(throw_.angle).toBe(52.5)
      expect(throw_.velocity).toBeLessThanOrEqual(100 / 1.15)
      const result = simulateThrow(round, side, throw_.angle, throw_.velocity)
      expect(result.hit).toBe('player')
      expect(result.victim).toBe(1 - side)
    }
  })
  test('the skyline, not a first fast solution, justifies a steeper lob', () => {
    const round = createRound(88)
    openCity(round)
    const ordinary = solveCpuThrow(round)
    for (let y = 0; y < GROUND; y++) round.pixels[y * WIDTH + 300] = 4
    expect(simulateThrow(round, 1, ordinary.angle, ordinary.velocity).hit).toBe('building')
    const higher = solveCpuThrow(round)
    expect(higher.angle).toBeGreaterThan(60)
    expect(higher.angle).toBeLessThanOrEqual(80)
    expect(higher.velocity).toBeLessThanOrEqual(100)
    const result = simulateThrow(round, 1, higher.angle, higher.velocity)
    expect(result.hit).toBe('player')
    expect(result.victim).toBe(0)
  })
  test('NativeQA seed 608483545 clears the adjacent Rug Tower with a genuine final 81–85° lob, without changing the city', () => {
    const round = createRound(608483545, 9.8, 1)
    expect(round.wind).toBe(-3)
    expect(round.players).toEqual([
      { x: 144, y: 171, alive: true, building: 2 },
      { x: 474, y: 185, alive: true, building: 7 },
    ])
    expect(round.buildings).toEqual([
      [0, 148, 39, 3], [40, 128, 86, 4], [127, 201, 65, 7], [193, 224, 58, 7], [252, 287, 86, 4],
      [339, 222, 38, 7], [378, 108, 90, 5], [469, 215, 41, 3], [511, 242, 90, 7], [602, 291, 38, 4],
    ].map(([x, y, width, color], index) => ({ x, y, width, color, tower: index === 6 })))
    const pixels = round.pixels.slice()
    expect(simulateThrow(round, 1, 23, 64.6).hit).toBe('building')
    const observed = simulateThrow(round, 1, 81, 84)
    expect(observed.hit).toBe('player')
    expect(observed.victim).toBe(0)
    const estimate = solveCpuThrow(round)
    expect(estimate.angle).toBeGreaterThanOrEqual(81)
    expect(estimate.angle).toBeLessThanOrEqual(85)
    expect(estimate.velocity).toBeLessThanOrEqual(100)
    const result = simulateThrow(round, 1, estimate.angle, estimate.velocity)
    expect(result.hit).toBe('player')
    expect(result.victim).toBe(0)
    const chosen = chooseCpuThrow(round)
    expect(chosen.angle).toBeGreaterThanOrEqual(23)
    expect(chosen.angle).toBeLessThan(90)
    expect(Math.abs(chosen.angle - estimate.angle)).toBeLessThanOrEqual(8)
    expect(Math.abs(chosen.velocity / estimate.velocity - 1)).toBeLessThanOrEqual(0.15)
    round.cpu.rng = () => 0.5
    const nominal = chooseCpuThrow(round)
    expect(nominal).toEqual(estimate)
    expect(nominal.angle).toBeGreaterThan(80)
    round.cpu.rng = () => 1
    expect(chooseCpuThrow(round).angle).toBeCloseTo(Math.min(89, estimate.angle + 8), 8)
    round.cpu.rng = () => 0
    expect(chooseCpuThrow(round).angle).toBeCloseTo(estimate.angle - 8, 8)
    expect(round.pixels).toEqual(pixels)
    expect(round.cpu.misses).toBe(0)
    expect(round.cpu.throws).toBe(0)
  })
  test('the captured steep-roof match converges within six actual CPU throws with seeded novice errors and real crater/turn flow', () => {
    const match = createMatch(608483545, 1)
    match.round.turn = 1
    for (let attempt = 0; attempt < 20 && match.phase !== 'over'; attempt++) {
      if (match.round.turn === 1) {
        const chosen = chooseCpuThrow(match.round)
        expect(launchMatch(match, Number(chosen.angle.toFixed(1)), Number(chosen.velocity.toFixed(1)))).toBe(true)
      } else {
        expect(launchMatch(match, 170, 250)).toBe(true)
      }
      fly(match)
      if (match.phase === 'explosion') finishExplosion(match)
      if (match.phase === 'dance') finishDance(match)
    }
    expect(match.phase).toBe('over')
    expect(match.winner).toBe(1)
    expect(match.scores).toEqual([0, 1])
    expect(match.round.cpu.throws).toBeGreaterThan(0)
    expect(match.round.cpu.throws).toBeLessThanOrEqual(6)
  })
  test('learned aiming avoids the fragile one-pixel crater corridor left by the first five captured misses', () => {
    const match = createMatch(608483545, 1)
    match.round.turn = 1
    // These are the actual typed throws recorded while diagnosing the captured match,
    // not a hand-built or pre-carved terrain fixture.
    const recorded = [[82.8, 74.4], [77.4, 81.4], [82.8, 87.2], [81.6, 85.3], [80.6, 85.5]]
    for (const [angle, velocity] of recorded) {
      if (match.round.turn === 0) {
        expect(launchMatch(match, 170, 250)).toBe(true)
        fly(match)
        if (match.phase === 'explosion') finishExplosion(match)
      }
      expect(launchMatch(match, angle, velocity)).toBe(true)
      fly(match)
      expect(match.round.hit).toBe('building')
      finishExplosion(match)
    }
    expect(launchMatch(match, 170, 250)).toBe(true)
    fly(match)
    if (match.phase === 'explosion') finishExplosion(match)
    expect(match.round.cpu.misses).toBe(5)
    expect(simulateThrow(match.round, 1, 73.5, 69.2).hit).toBe('player')
    expect(simulateThrow(match.round, 1, 73.3, 69.3).hit).toBe('building')
    const estimate = solveCpuThrow(match.round)
    expect(estimate.angle).toBeGreaterThan(73.5)
    const error = 2 ** -match.round.cpu.misses
    for (const angleDirection of [-1, 1]) for (const velocityDirection of [-1, 1]) {
      const angle = Number((estimate.angle + angleDirection * 8 * error).toFixed(1))
      const velocity = Number((estimate.velocity * (1 + velocityDirection * 0.15 * error)).toFixed(1))
      const result = simulateThrow(match.round, 1, angle, velocity)
      expect(result.hit).toBe('player')
      expect(result.victim).toBe(0)
    }
  })
  test('at least 95% of first chosen CPU throws stay within 15–80° across 200 untouched cities, including novice error', () => {
    let plausible = 0
    for (let seed = 0; seed < 200; seed++) {
      const round = createRound(seed, 9.8, 1)
      const throw_ = chooseCpuThrow(round)
      expect(validThrow(throw_.angle, throw_.velocity)).toBe(true)
      expect(throw_.velocity).toBeLessThanOrEqual(230)
      if (throw_.angle >= 15 && throw_.angle <= 80) plausible++
      expect(round.cpu.misses).toBe(0)
      expect(round.cpu.throws).toBe(0)
    }
    expect(plausible).toBeGreaterThanOrEqual(190)
  }, 120000)
  test('converges within six throws on average across 200 unmodified seeded cities, with actual errors, craters and turn flow', () => {
    let throws = 0
    let completed = 0
    for (let seed = 0; seed < 200; seed++) {
      const match = createMatch(seed, 1)
      // Player one makes a legal outward miss. No terrain, wind, gravity or hitboxes are simplified.
      for (let attempt = 0; attempt < 80 && match.phase !== 'over'; attempt++) {
        if (match.round.turn === 0) {
          launchMatch(match, 170, 250)
          fly(match)
          if (match.phase === 'explosion') finishExplosion(match)
          if (match.phase === 'dance') finishDance(match)
          if (match.phase === 'over') break
        }
        if (match.round.turn !== 1 || match.phase !== 'aim') continue
        const shot = chooseCpuThrow(match.round)
        throws++
        // This is the UI's typed precision, not a testing-only perfect aim.
        launchMatch(match, Number(shot.angle.toFixed(1)), Number(shot.velocity.toFixed(1)))
        fly(match)
        if (match.phase === 'explosion') finishExplosion(match)
        if (match.phase === 'dance') finishDance(match)
        if (match.phase === 'over' && match.winner === 1) completed++
      }
    }
    expect(completed).toBe(200)
    expect(throws / 200).toBeLessThanOrEqual(6)
  }, 120000)
})
