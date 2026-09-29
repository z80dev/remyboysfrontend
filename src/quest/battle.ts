/** Turn-based battles: rules (damage, AI, catching, XP) and their sequencing. The field is a pixel canvas (battle/). */
import './battle.css'
import { art } from './art'
import { audio } from './audio'
import * as fx from './battle/fx'
import { cabaldSplash, denialBreaks, mintCertificate, versusSplash } from './battle/splash'
import { type Actor, Stage } from './battle/stage'
import {
  ITEMS,
  type ItemId,
  MOVES,
  type Move,
  type MoveId,
  type Remy,
  type StatKey,
  type Stats,
  TYPE_COLOR,
  effectiveness,
  expGain,
  forgetIndex,
  movesAt,
  remyName,
  species,
  stageMult,
  statsOf,
  xpForLevel,
} from './data'
import { type Btn, input, tap } from './input'
import { bagScreen, partyScreen } from './menus'
import { S, markSeen, partyAlive, receiveRemy, takeItem, useItemOn } from './state'
import type { Theme, Track } from './types'
import { closeText, el, fade, itemIcon, say, sleep, uiRoot } from './ui'
import { view } from './view'

export interface BattleSetup {
  kind: 'wild' | 'trainer'
  /** wild: exactly 1; trainer: 1..6 in send-out order (fresh objects owned by the battle). */
  foes: Remy[]
  trainer?: { name: string; title: string; portrait: number; intro?: string; lose: string; prize: number }
  bg: Theme | 'exchange' | 'tower'
  /** Default: 'battle' for wild, 'trainer' for trainer. */
  music?: Track
  /** Default: wild true, trainer false. */
  canRun?: boolean
  /** Default: wild true, trainer false. */
  canCatch?: boolean
}
export type BattleResult = 'win' | 'lose' | 'run' | 'caught'

/**
 * Mounts the battle UI over the world, runs it to completion, then fades to black and removes all its DOM.
 * Resolves with the screen still black (the ui fader is opaque): the caller fades back in.
 * Mutates S (party HP/PP/xp/levels/moves, bag, money, seen/caught). Blackout and overworld music are the caller's job.
 */
export function battle(setup: BattleSetup): Promise<BattleResult> {
  return new Battle(setup).run()
}

// ───────────────────────────── rules ─────────────────────────────

type Stage3 = 'atk' | 'def' | 'spd'
type Who = 'me' | 'foe'
type Action = { kind: 'move'; slot: number } | { kind: 'used' } | { kind: 'end'; result: BattleResult }

/** Struggle: used automatically when every move is out of PP. */
const PANIC: Move = {
  name: 'Panic Sell',
  type: 'MEME',
  power: 50,
  acc: 100,
  pp: 1,
  effect: { kind: 'recoil', frac: 0.25 },
  desc: 'Dumps everything at the bottom. Hurts the user too.',
}
const STAT_NAME: Record<Stage3, string> = { atk: 'ATTACK', def: 'DEFENSE', spd: 'SPEED' }
const STAGE_CAP = 4
const MAX_LEVEL = 100
const ACTIONS = ['FIGHT', 'BAG', 'REMYS', 'RUN']
const PLACES: Record<string, string> = {
  genesis: 'GENESIS TOWN',
  meadow: 'MEMPOOL MEADOW',
  city: 'LIQUIDITY CITY',
  canyon: 'RUG PULL CANYON',
  gallery: 'THE FLOOR',
}

const rand = Math.random
const pick = <T>(a: readonly T[]): T => a[Math.floor(rand() * a.length)]
const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v))
const isStage = (s: StatKey): s is Stage3 => s !== 'hp'
const xpFrac = (r: Remy) => {
  if (r.level >= MAX_LEVEL) return 1
  const a = xpForLevel(r.level)
  return clamp((r.xp - a) / (xpForLevel(r.level + 1) - a), 0, 1)
}

/** 2×2 grid cursor movement; stays put when the target cell is empty. */
function gridNav(sel: number, b: Btn, n: number): number {
  const r = sel >> 1
  const c = sel & 1
  const next = b === 'up' ? c : b === 'down' ? 2 + c : b === 'left' ? r * 2 : b === 'right' ? r * 2 + 1 : sel
  return next < n ? next : sel
}

const note = (t: string, ms = 750) => say(t, { auto: ms })
const tell = (t: string) => say(t)
const show = (t: string) => say(t, { noWait: true })

// ───────────────────────────── one side of the field ─────────────────────────────

/** A combatant: its Remy, stat stages, the sprite on the stage and the DOM info box. */
class Side {
  remy!: Remy
  stages: Record<Stage3, number> = { atk: 0, def: 0, spd: 0 }
  hpShown = 0
  readonly who: Who
  readonly actor: Actor
  readonly info: HTMLElement
  private readonly bar: HTMLElement
  private readonly cur: HTMLElement | null
  private readonly xp: HTMLElement | null

  constructor(who: Who, actor: Actor, infoParent: HTMLElement) {
    this.who = who
    this.actor = actor
    this.info = el('div', `bt-info ${who} off`)
    this.info.innerHTML = `<div class="bi-top"><b class="bi-name"></b><span class="bi-new" hidden>NEW</span><span class="bi-lv"></span></div>
      <div class="bi-mid"><span class="bi-type"></span><span class="bi-hp">HP</span><div class="hpbar"><i></i></div></div>
      ${who === 'me' ? '<div class="bi-xp"><span>EXP</span><div class="xpbar"><i></i></div><b class="bi-nums"></b></div>' : ''}`
    infoParent.appendChild(this.info)
    this.bar = this.info.querySelector('.hpbar i') as HTMLElement
    this.cur = this.info.querySelector('.bi-nums')
    this.xp = this.info.querySelector('.xpbar i')
  }

  get max() {
    return statsOf(this.remy).hp
  }

  /** Swaps in a Remy: info box filled at once, resolves when its battle sprite is decoded. */
  async set(r: Remy) {
    this.remy = r
    this.stages = { atk: 0, def: 0, spd: 0 }
    const t = species(r.idx).type
    ;(this.info.querySelector('.bi-new') as HTMLElement).hidden = this.who !== 'foe' || S.seen.includes(r.idx)
    this.info.style.setProperty('--tc', TYPE_COLOR[t])
    this.info.classList.toggle('gold', !!r.gold)
    ;(this.info.querySelector('.bi-name') as HTMLElement).textContent = `REMY #${r.idx}`
    ;(this.info.querySelector('.bi-type') as HTMLElement).innerHTML =
      `<span class="type" style="background:${TYPE_COLOR[t]}">${t}</span>${
        this.who === 'foe' && S.caught.includes(r.idx)
          ? `<i class="bi-owned" title="Minted">${itemIcon('wallet')}</i>`
          : ''
      }`
    this.refreshLevel()
    this.hpShown = r.hp
    this.drawHp(r.hp)
    this.drawXp(xpFrac(r))
    await this.actor.setRemy(r.idx, !!r.gold)
  }

  refreshLevel() {
    ;(this.info.querySelector('.bi-lv') as HTMLElement).innerHTML = `<small>Lv</small>${this.remy.level}`
  }

  drawHp(v: number) {
    const max = this.max
    const f = clamp(v / max, 0, 1)
    // Quantised to 48 steps like the GBA bars.
    this.bar.style.width = `${(Math.ceil(f * 48) / 48) * 100}%`
    this.bar.className = f <= 0.2 ? 'low' : f <= 0.5 ? 'mid' : ''
    if (this.cur) this.cur.textContent = `${Math.ceil(clamp(v, 0, max))}/${max}`
    this.info.classList.toggle('danger', this.who === 'me' && v > 0 && f <= 0.2)
  }

  tweenHp(to: number): Promise<void> {
    const from = this.hpShown
    this.hpShown = to
    if (from === to) return Promise.resolve()
    const max = this.max
    const dur = clamp((Math.abs(to - from) / max) * 1400, 260, 1000)
    return new Promise((res) => {
      const t0 = performance.now()
      const step = (t: number) => {
        const k = Math.min(1, (t - t0) / dur)
        this.drawHp(from + (to - from) * k)
        if (k < 1) requestAnimationFrame(step)
        else res()
      }
      requestAnimationFrame(step)
    })
  }

  drawXp(f: number) {
    if (this.xp) this.xp.style.width = `${(Math.floor(f * 64) / 64) * 100}%`
  }

  tweenXp(from: number, to: number): Promise<void> {
    const dur = clamp((to - from) * 1300, 200, 1100)
    return new Promise((res) => {
      const t0 = performance.now()
      const step = (t: number) => {
        const k = Math.min(1, (t - t0) / dur)
        this.drawXp(from + (to - from) * k)
        if (k < 1) requestAnimationFrame(step)
        else res()
      }
      requestAnimationFrame(step)
    })
  }

  showInfo(on: boolean) {
    this.info.classList.toggle('off', !on)
  }
}

// ───────────────────────────── the battle ─────────────────────────────

class Battle {
  readonly setup: BattleSetup
  readonly wild: boolean
  readonly cabald: boolean
  readonly foes: Remy[]
  readonly canRun: boolean
  readonly canCatch: boolean
  readonly root: HTMLElement
  readonly st: Stage
  readonly me: Side
  readonly foe: Side
  readonly pipsFoe: HTMLElement
  readonly pipsMe: HTMLElement
  pi = 0
  fi = 0
  participants = new Set<number>()
  runs = 0
  foeTurns = 0
  menuOpen = false
  lastAct = 0
  lastMove = 0
  private popSwallow: () => void = () => {}
  private readonly onLayout = () => this.place()

  constructor(setup: BattleSetup) {
    this.setup = setup
    this.wild = setup.kind === 'wild'
    // Bald ⇔ Cabald: a bald trainer gets the denial treatment even if a script forgot the title.
    this.cabald = !!setup.trainer && (setup.trainer.title.startsWith('CABALD') || art.get(setup.trainer.portrait).bald)
    this.foes = setup.foes
    this.canRun = setup.canRun ?? this.wild
    this.canCatch = setup.canCatch ?? this.wild
    this.st = new Stage(setup.bg, { cabald: this.cabald, boss: setup.bg === 'tower' || setup.music === 'boss' })
    this.root = el('div', `bt bg-${setup.bg}${this.cabald ? ' cabald' : ''}`)
    this.root.innerHTML = '<div class="bt-field"><div class="bt-infos"></div></div>'
    const field = this.root.querySelector('.bt-field') as HTMLElement
    field.prepend(this.st.el)
    const infos = this.root.querySelector('.bt-infos') as HTMLElement
    this.foe = new Side('foe', this.st.foe, infos)
    this.me = new Side('me', this.st.me, infos)
    this.pipsFoe = el('div', 'bt-pips foe off')
    this.pipsMe = el('div', 'bt-pips me off')
    infos.append(this.pipsFoe, this.pipsMe)
    // Tapping the scene advances text (but never picks menu entries).
    this.root.addEventListener('pointerdown', (e) => {
      e.preventDefault()
      if (!this.menuOpen) tap('a')
    })
  }

  // ─── lifecycle ───

  async run(): Promise<BattleResult> {
    uiRoot.appendChild(this.root)
    this.place()
    this.st.start()
    view.listeners.push(this.onLayout)
    this.popSwallow = input.push(() => {})
    audio.play(this.setup.music ?? (this.wild ? 'battle' : 'trainer'))
    const t = this.setup.trainer
    const sprites = [this.foes[0].idx, ...S.party.map((r) => r.idx), ...(t ? [t.portrait] : [])]
    await Promise.race([Promise.all(sprites.map((i) => art.sprite(i))), sleep(1600)])
    // Clear whatever the world's transition left on the fader; the stage's curtain takes over.
    await fade(false, 0)
    let result: BattleResult = 'lose'
    try {
      result = await this.main()
    } finally {
      await fade(true, 360)
      this.popSwallow()
      const i = view.listeners.indexOf(this.onLayout)
      if (i >= 0) view.listeners.splice(i, 1)
      for (const e of uiRoot.querySelectorAll('.bt-cmd, .bt-moves, .bt-lvl')) e.remove()
      this.st.destroy()
      this.root.remove()
      uiRoot.style.removeProperty('--bt-panel')
      closeText()
    }
    return result
  }

  private async main(): Promise<BattleResult> {
    const lead = S.party.findIndex((r) => r.hp > 0)
    if (lead < 0) return 'lose'
    await this.intro(lead)
    for (;;) {
      const act = await this.command()
      if (act.kind === 'end') return act.result
      await this.turn(act)
      const res = await this.resolve()
      if (res) return res
    }
  }

  /** Sizes the stage to the logical screen, leaving the touch menu's full height below the field. */
  place() {
    const { W, H } = view
    const touch = document.documentElement.classList.contains('touch')
    const target = window.innerHeight >= window.innerWidth ? 34 : 28
    const unit = view.scale / (window.devicePixelRatio || 1)
    const panel = touch ? Math.max(46, Math.ceil((target * 2) / unit + 14)) : 46
    uiRoot.style.setProperty('--bt-panel', `${panel}rem`)
    this.st.layout(W, H, panel)
    this.root.style.setProperty('--iw', `${Math.round(Math.min(W * 0.46, 124))}rem`)
    this.root.classList.toggle('tall', this.st.geo.field >= 200)
  }

  label(s: Side) {
    return s.who === 'me' ? remyName(s.remy) : `${this.wild ? 'Wild' : 'Foe'} ${remyName(s.remy)}`
  }

  speed(s: Side) {
    return statsOf(s.remy).spd * stageMult(s.stages.spd)
  }

  // ─── intro / send-outs ───

  private async intro(lead: number) {
    const first = this.foes[0]
    const st = this.st
    if (this.wild) {
      await this.foe.set(first)
      markSeen(first.idx)
      await fx.slideIn(st, true)
      audio.cry(first.idx)
      await fx.reveal(st, st.foe)
      if (first.gold) void fx.goldBurst(st, st.foe)
      this.foe.showInfo(true)
      await tell(
        first.gold ? `Whoa! A wild *GOLDEN REMY #${first.idx}* appeared!` : `A wild *${remyName(first)}* appeared!`,
      )
    } else {
      const t = this.setup.trainer
      const name = t?.name ?? 'TRAINER'
      this.drawPips()
      if (t) await st.trainer.setRemy(t.portrait)
      await this.versus(S.party[lead])
      fx.trainerIn(st)
      await fx.slideIn(st, false)
      this.pipsFoe.classList.remove('off')
      this.pipsMe.classList.remove('off')
      await sleep(300)
      if (t?.intro) await say(t.intro, { speaker: name })
      await tell(`*${name}* challenges you!`)
      this.pipsFoe.classList.add('off')
      this.pipsMe.classList.add('off')
      void fx.trainerOut(st)
      await this.foeOut(first)
    }
    this.pi = lead
    this.participants = new Set([lead])
    await this.goOut(lead)
  }

  private async versus(lead: Remy) {
    const t = this.setup.trainer
    if (!t) return
    const trainer = { name: t.name, title: t.title, portrait: t.portrait }
    if (this.cabald) await cabaldSplash(this.root, { trainer, boss: t.title.startsWith('CABALD BOSS') })
    else await versusSplash(this.root, { player: S.name, lead: lead.idx, trainer, boss: this.setup.bg === 'tower' })
  }

  private drawPips() {
    const row = (list: Remy[]) =>
      Array.from({ length: 6 }, (_, i) => {
        const r = list[i]
        return `<i class="${!r ? 'pip-none' : r.hp > 0 ? 'pip-ok' : 'pip-ko'}"></i>`
      }).join('')
    this.pipsFoe.innerHTML = row(this.foes)
    this.pipsMe.innerHTML = row(S.party)
  }

  private async foeOut(r: Remy) {
    await this.foe.set(r)
    markSeen(r.idx)
    this.foeTurns = 0
    void show(`${this.setup.trainer?.name ?? 'The trainer'} sent out *${remyName(r)}*!`)
    await this.sendOut(this.foe)
    if (r.gold) void fx.goldBurst(this.st, this.st.foe)
    this.foe.showInfo(true)
    await sleep(650)
  }

  private async goOut(i: number) {
    this.pi = i
    const r = S.party[i]
    await this.me.set(r)
    this.participants.add(i)
    void show(`Go! *${remyName(r)}*!`)
    await this.sendOut(this.me)
    if (r.gold) void fx.goldBurst(this.st, this.st.me)
    this.me.showInfo(true)
    await sleep(550)
  }

  private async sendOut(s: Side) {
    audio.sfx('throw')
    const out = fx.sendOut(this.st, s.actor)
    await sleep(480)
    audio.cry(s.remy.idx)
    await out
  }

  private async recall(s: Side) {
    audio.sfx('back')
    await fx.recall(this.st, s.actor)
    s.showInfo(false)
  }

  // ─── menus ───

  private async command(): Promise<Action> {
    for (;;) {
      const c = await this.actionMenu()
      if (c === 0) {
        if (!this.me.remy.moves.some((m) => m.pp > 0)) return { kind: 'move', slot: -1 }
        const s = await this.moveMenu()
        if (s !== null) return { kind: 'move', slot: s }
      } else if (c === 1) {
        const a = await this.bag()
        if (a) return a
      } else if (c === 2) {
        const i = await partyScreen({ mode: 'switch', active: this.pi })
        if (i >= 0 && i !== this.pi) {
          await show(`${remyName(this.me.remy)}, come back!`)
          await this.recall(this.me)
          await this.goOut(i)
          return { kind: 'used' }
        }
      } else {
        const a = await this.tryRun()
        if (a) return a
      }
    }
  }

  private actionMenu(): Promise<number> {
    this.menuOpen = true
    const box = el('div', 'bt-cmd')
    box.innerHTML = `<div class="bc-prompt">What will<br><em>${remyName(this.me.remy)}</em> do?</div><div class="bc-acts">${ACTIONS.map(
      (l, i) => `<div class="bc-act a${i}"><span class="menu-cursor"></span><i></i>${l}</div>`,
    ).join('')}</div>`
    uiRoot.appendChild(box)
    const items = [...box.querySelectorAll<HTMLElement>('.bc-act')]
    let sel = this.lastAct
    const draw = () => items.forEach((it, i) => it.classList.toggle('sel', i === sel))
    draw()
    return new Promise((resolve) => {
      const done = (i: number) => {
        pop()
        box.remove()
        this.menuOpen = false
        this.lastAct = i
        audio.sfx('select')
        resolve(i)
      }
      items.forEach((it, i) =>
        it.addEventListener('pointerdown', (e) => {
          e.preventDefault()
          e.stopPropagation()
          sel = i
          draw()
          done(i)
        }),
      )
      box.addEventListener('pointerdown', (e) => e.preventDefault())
      const pop = input.push((b) => {
        if (b === 'a') return done(sel)
        if (b === 'b') {
          if (sel !== 3) audio.sfx('cursor')
          sel = 3
          return draw()
        }
        const n = gridNav(sel, b, 4)
        if (n !== sel) {
          sel = n
          audio.sfx('cursor')
          draw()
        }
      })
    })
  }

  private moveMenu(): Promise<number | null> {
    this.menuOpen = true
    const r = this.me.remy
    const foeType = species(this.foe.remy.idx).type
    const box = el('div', 'bt-moves')
    const grid = el('div', 'bm-grid')
    const side = el('div', 'bm-side')
    const back = el('div', 'bm-back', 'B · BACK')
    const items = [0, 1, 2, 3].map((i) => {
      const m = r.moves[i]
      const b = el('div', `bm-move${m ? '' : ' empty'}${m && m.pp <= 0 ? ' dry' : ''}`)
      if (m) {
        const mv = MOVES[m.id]
        b.style.setProperty('--tc', TYPE_COLOR[mv.type])
        b.innerHTML = `<span class="menu-cursor"></span><span class="bm-name${mv.name.length > 11 ? ' long' : ''}">${mv.name}</span>`
      } else b.innerHTML = '<span class="bm-name">—</span>'
      grid.appendChild(b)
      return b
    })
    box.append(grid, side, back)
    uiRoot.appendChild(box)
    let sel = Math.min(this.lastMove, r.moves.length - 1)
    const draw = () => {
      items.forEach((b, i) => b.classList.toggle('sel', i === sel))
      const m = r.moves[sel]
      const mv = MOVES[m.id]
      const e = effectiveness(mv.type, foeType)
      const hint =
        mv.power === 0
          ? '<span>STATUS</span>'
          : e > 1
            ? '<span class="good">SUPER EFF!</span>'
            : e < 1
              ? `<span class="weak">NOT VERY EFF.</span>`
              : `<span>ACC ${mv.acc}</span>`
      side.innerHTML = `<div class="bm-pp ${m.pp <= 0 ? 'out' : m.pp <= mv.pp / 4 ? 'low' : ''}"><small>PP</small><b>${m.pp}/${mv.pp}</b></div>
        <div class="bm-type"><span class="type" style="background:${TYPE_COLOR[mv.type]}">${mv.type}</span><small>${mv.power ? `PWR ${mv.power}` : ''}</small></div>
        <div class="bm-hint">${hint}</div>`
    }
    draw()
    return new Promise((resolve) => {
      const done = (v: number | null) => {
        pop()
        box.remove()
        this.menuOpen = false
        resolve(v)
      }
      const choose = () => {
        if (r.moves[sel].pp <= 0) {
          audio.sfx('error')
          side.classList.remove('nope')
          void side.offsetWidth
          side.classList.add('nope')
          return
        }
        audio.sfx('select')
        this.lastMove = sel
        done(sel)
      }
      const cancel = () => {
        audio.sfx('back')
        done(null)
      }
      items.forEach((b, i) =>
        b.addEventListener('pointerdown', (e) => {
          e.preventDefault()
          e.stopPropagation()
          if (!r.moves[i]) return
          if (sel !== i) {
            sel = i
            draw()
          }
          choose()
        }),
      )
      back.addEventListener('pointerdown', (e) => {
        e.preventDefault()
        e.stopPropagation()
        cancel()
      })
      box.addEventListener('pointerdown', (e) => e.preventDefault())
      const pop = input.push((b) => {
        if (b === 'a') return choose()
        if (b === 'b') return cancel()
        const n = gridNav(sel, b, r.moves.length)
        if (n !== sel) {
          sel = n
          audio.sfx('cursor')
          draw()
        }
      })
    })
  }

  private async bag(): Promise<Action | null> {
    const id = await bagScreen('battle')
    if (!id) return null
    const item = ITEMS[id]
    if (item.kind === 'ball') {
      if (!this.wild) {
        const name = this.setup.trainer?.name ?? 'The trainer'
        await this.deflect(id)
        await tell(`${name} blocked the ${item.name}!`)
        await say('Not your keys, not your Remy!', { speaker: name })
        return null
      }
      if (!this.canCatch) {
        await this.deflect(id)
        await tell(`${remyName(this.foe.remy)} dodged the ${item.name}!\nThis Remy can\u2019t be minted.`)
        return null
      }
      return this.throwWallet(id)
    }
    const i = await partyScreen({ mode: 'item', item: id })
    if (i < 0) return null
    const r = S.party[i]
    const line = useItemOn(id, r)
    if (!line) {
      await tell('It won\u2019t have any effect.')
      return null
    }
    takeItem(id)
    void show(`${S.name} used *${item.name}*!`)
    audio.sfx('heal')
    if (i === this.pi) {
      void fx.heal(this.st, this.me.actor)
      await sleep(250)
      await this.me.tweenHp(r.hp)
    } else await sleep(400)
    await tell(line)
    return { kind: 'used' }
  }

  private async tryRun(): Promise<Action | null> {
    if (!this.wild) {
      await tell('No running from a trainer battle!')
      return null
    }
    if (!this.canRun) {
      await tell('There\u2019s no escaping this one!')
      return null
    }
    const ok = this.speed(this.me) >= this.speed(this.foe) || rand() < 0.5 + 0.15 * this.runs
    this.runs++
    if (ok) {
      audio.sfx('escape')
      void fx.runAway(this.st, this.me.actor)
      this.me.showInfo(false)
      await tell('Got away safely!')
      return { kind: 'end', result: 'run' }
    }
    await note('Can\u2019t escape!', 850)
    return { kind: 'used' }
  }

  // ─── turn engine ───

  private foeChoice(): number {
    const r = this.foe.remy
    const usable = r.moves.map((m, i) => ({ m, i, mv: MOVES[m.id] })).filter((x) => x.m.pp > 0)
    if (!usable.length) return -1
    if (this.wild) return pick(usable).i
    const hodl = usable.find((x) => x.m.id === 'hodl')
    if (hodl && r.hp < this.foe.max * 0.35 && rand() < 0.8) return hodl.i
    const status = usable.filter((x) => {
      const e = x.mv.effect
      if (x.mv.power > 0 || e?.kind !== 'stat' || !isStage(e.stat)) return false
      return e.who === 'self' ? this.foe.stages[e.stat] < STAGE_CAP : this.me.stages[e.stat] > -STAGE_CAP
    })
    if (status.length && this.foeTurns < 2 && rand() < 0.35) return pick(status).i
    const myType = species(r.idx).type
    const theirType = species(this.me.remy.idx).type
    const scored = usable
      .filter((x) => x.mv.power > 0)
      .map((x) => ({
        i: x.i,
        s: x.mv.power * (x.mv.type === myType ? 1.5 : 1) * effectiveness(x.mv.type, theirType) * (x.mv.acc / 100),
      }))
      .sort((a, b) => b.s - a.s)
    if (!scored.length) return pick(usable).i
    if (rand() < 0.7) return scored[0].i
    const total = scored.reduce((a, b) => a + b.s, 0)
    let roll = rand() * total
    for (const x of scored) {
      roll -= x.s
      if (roll <= 0) return x.i
    }
    return scored[0].i
  }

  private moveOf(s: Side, slot: number): Move {
    return slot < 0 ? PANIC : MOVES[s.remy.moves[slot].id]
  }

  private async turn(act: Action) {
    const fslot = this.foeChoice()
    const queue: [Side, Side, number][] = []
    if (act.kind === 'move') {
      const pp = this.moveOf(this.me, act.slot).priority ?? 0
      const fp = this.moveOf(this.foe, fslot).priority ?? 0
      const ms = this.speed(this.me)
      const fs = this.speed(this.foe)
      const meFirst = pp !== fp ? pp > fp : ms !== fs ? ms > fs : rand() < 0.5
      const mine: [Side, Side, number] = [this.me, this.foe, act.slot]
      const theirs: [Side, Side, number] = [this.foe, this.me, fslot]
      queue.push(...(meFirst ? [mine, theirs] : [theirs, mine]))
    } else queue.push([this.foe, this.me, fslot])
    for (const [a, d, slot] of queue) {
      await this.useMove(a, d, slot)
      if (a === this.foe) this.foeTurns++
      if (this.me.remy.hp <= 0 || this.foe.remy.hp <= 0) break
    }
  }

  /** After a turn: faints, XP, replacements, victory/defeat. Returns a result when the battle is over. */
  private async resolve(): Promise<BattleResult | null> {
    const foeDown = this.foe.remy.hp <= 0
    const meDown = this.me.remy.hp <= 0
    const last = foeDown && this.fi >= this.foes.length - 1
    if (foeDown) {
      await this.faint(this.foe)
      if (last && this.cabald) {
        this.st.breakPropaganda()
        await denialBreaks(this.root)
      }
      if (last) audio.play('victory')
      await tell(`${this.label(this.foe)} fainted!`)
    }
    if (meDown) {
      await this.faint(this.me)
      await tell(`${remyName(this.me.remy)} fainted!`)
    }
    if (foeDown) await this.awardXp(this.foe.remy)
    if (!partyAlive()) {
      await tell('Your whole party has fainted!\nYou blacked out!')
      return 'lose'
    }
    if (meDown) {
      const i = await partyScreen({ mode: 'forced', active: this.pi })
      await this.goOut(i)
    }
    if (foeDown) {
      if (last) {
        if (!this.wild) await this.trainerDefeated()
        return 'win'
      }
      this.fi++
      this.participants = new Set([this.pi])
      await this.foeOut(this.foes[this.fi])
    }
    return null
  }

  private damage(att: Side, def: Side, mv: Move, eff: number, crit: boolean): number {
    const L = att.remy.level
    const A = statsOf(att.remy).atk * stageMult(att.stages.atk)
    const D = statsOf(def.remy).def * stageMult(def.stages.def)
    const base = Math.floor((((2 * L) / 5 + 2) * mv.power * A) / D / 40 + 2)
    const stab = mv.type === species(att.remy.idx).type ? 1.5 : 1
    return Math.max(1, Math.floor(base * stab * eff * (crit ? 1.5 : 1) * (0.85 + rand() * 0.15)))
  }

  private async useMove(att: Side, def: Side, slot: number) {
    const st = this.st
    const r = att.remy
    const id: MoveId | 'panic' = slot < 0 ? 'panic' : r.moves[slot].id
    const mv = this.moveOf(att, slot)
    if (slot >= 0) r.moves[slot].pp = Math.max(0, r.moves[slot].pp - 1)
    else await note(`${this.label(att)} is out of PP!`)
    await show(`${this.label(att)} used *${mv.name}*!`)
    await sleep(200)
    const eff = mv.effect
    const selfMove = mv.power === 0 && (eff?.kind === 'heal' || (eff?.kind === 'stat' && eff.who === 'self'))
    if (!selfMove && rand() * 100 >= mv.acc) {
      void fx.lunge(st, att.actor)
      await sleep(180)
      await fx.dodge(st, def.actor)
      await note(`${this.label(att)}\u2019s attack missed!`, 900)
      return
    }
    if (mv.power === 0) {
      if (eff?.kind === 'stat') {
        const tgt = eff.who === 'self' ? att : def
        if (eff.who === 'self') void fx.hop(st, att.actor)
        else void fx.lunge(st, att.actor, 0.5)
        await sleep(160)
        await this.statChange(tgt, eff.stat, eff.stages, id)
      } else if (eff?.kind === 'heal') {
        void fx.hop(st, att.actor)
        if (r.hp >= att.max) {
          await note('But its HP is already full!', 900)
          return
        }
        audio.sfx('heal')
        await fx.heal(st, att.actor)
        r.hp = Math.min(att.max, r.hp + Math.max(1, Math.floor(att.max * eff.frac)))
        await att.tweenHp(r.hp)
        await note(`${this.label(att)} regained HP!`, 900)
      } else await note('But nothing happened!')
      return
    }
    const typeEff = effectiveness(mv.type, species(def.remy.idx).type)
    const crit = rand() < (mv.highCrit ? 1 / 4 : 1 / 16)
    const dmg = this.damage(att, def, mv, typeEff, crit)
    void fx.lunge(st, att.actor)
    await sleep(170)
    await fx.moveFx(st, id, mv, att.actor, def.actor)
    const dealt = Math.min(dmg, def.remy.hp)
    def.remy.hp -= dealt
    audio.sfx(typeEff > 1 ? 'hitSuper' : typeEff < 1 ? 'hitWeak' : 'hit')
    if (crit) window.setTimeout(() => audio.sfx('crit'), 90)
    fx.hit(st, def.actor, mv.type, typeEff, crit, dealt)
    await def.tweenHp(def.remy.hp)
    await sleep(120)
    if (crit) await note('A critical hit!')
    if (typeEff > 1) await note('It\u2019s super effective!')
    else if (typeEff < 1) await note('It\u2019s not very effective\u2026')
    if (eff?.kind === 'recoil' && r.hp > 0) {
      r.hp = Math.max(0, r.hp - Math.max(1, Math.floor(dealt * eff.frac)))
      audio.sfx('hitWeak')
      void fx.blink(st, att.actor)
      await att.tweenHp(r.hp)
      await note(`${this.label(att)} ${id === 'leverage' ? 'took recoil. Margin call!' : 'took recoil damage!'}`, 900)
    } else if (eff?.kind === 'drain' && r.hp > 0 && r.hp < att.max) {
      const gain = Math.min(att.max - r.hp, Math.max(1, Math.floor(dealt * eff.frac)))
      await fx.drain(st, def.actor, att.actor)
      audio.sfx('heal')
      r.hp += gain
      await att.tweenHp(r.hp)
      await note(`${this.label(def)} had its yield farmed!`, 900)
    } else if (eff?.kind === 'stat' && (eff.who === 'self' ? r.hp > 0 : def.remy.hp > 0)) {
      await this.statChange(eff.who === 'self' ? att : def, eff.stat, eff.stages, id)
    }
  }

  private async statChange(t: Side, stat: StatKey, n: number, id: MoveId | 'panic') {
    if (!isStage(stat)) return
    const cur = t.stages[stat]
    const who = this.label(t)
    if (n > 0 && cur >= STAGE_CAP)
      return void (await note(`${who}\u2019s ${STAT_NAME[stat]} won\u2019t go any higher!`, 950))
    if (n < 0 && cur <= -STAGE_CAP)
      return void (await note(`${who}\u2019s ${STAT_NAME[stat]} won\u2019t go any lower!`, 950))
    t.stages[stat] = clamp(cur + n, -STAGE_CAP, STAGE_CAP)
    audio.sfx(n > 0 ? 'statUp' : 'statDown')
    await fx.stat(this.st, t.actor, n > 0, id)
    const verb = n > 1 ? 'sharply rose' : n > 0 ? 'rose' : n < -1 ? 'harshly fell' : 'fell'
    await note(`${who}\u2019s ${STAT_NAME[stat]} ${verb}!`, 900)
  }

  // ─── faint / XP / levels ───

  private async faint(s: Side) {
    audio.cry(s.remy.idx, 0.7)
    const drop = fx.faint(this.st, s.actor)
    await sleep(260)
    audio.sfx('faint')
    await drop
    s.showInfo(false)
  }

  private async awardXp(foe: Remy) {
    const base = expGain(foe, !this.wild)
    const bench: [number, number][] = []
    const active = S.party[this.pi]
    if (active.hp > 0) await this.gainActive(active, this.participants.has(this.pi) ? base : Math.floor(base / 2))
    S.party.forEach((r, i) => {
      if (i === this.pi || r.hp <= 0) return
      const amt = this.participants.has(i) ? base : Math.floor(base / 2)
      if (amt > 0) bench.push([i, amt])
    })
    if (!bench.length) return
    await note(`Team XP:\n${bench.map(([i, a]) => `REMY #${S.party[i].idx}: +${a} XP`).join('\n')}`, 1200)
    for (const [i, amt] of bench) {
      const r = S.party[i]
      r.xp += amt
      while (r.level < MAX_LEVEL && r.xp >= xpForLevel(r.level + 1)) await this.levelUp(r, false)
    }
  }

  private async gainActive(r: Remy, amt: number) {
    if (amt <= 0) return
    void show(`${remyName(r)} gained *${amt} XP*!`)
    await sleep(250)
    let left = amt
    while (left > 0) {
      if (r.level >= MAX_LEVEL) {
        r.xp += left
        break
      }
      const step = Math.min(left, xpForLevel(r.level + 1) - r.xp)
      const from = xpFrac(r)
      r.xp += step
      left -= step
      const up = r.xp >= xpForLevel(r.level + 1)
      await this.me.tweenXp(from, up ? 1 : xpFrac(r))
      if (up) {
        await this.levelUp(r, true)
        this.me.drawXp(0)
      }
    }
    await sleep(500)
  }

  private async levelUp(r: Remy, active: boolean) {
    const before = statsOf(r)
    r.level++
    const after = statsOf(r)
    if (r.hp > 0) r.hp = Math.min(after.hp, r.hp + after.hp - before.hp)
    const name = remyName(r)
    void audio.jingle('levelup')
    if (active) {
      this.me.refreshLevel()
      this.me.hpShown = r.hp
      this.me.drawHp(r.hp)
      this.me.info.classList.remove('lvl')
      void this.me.info.offsetWidth
      this.me.info.classList.add('lvl')
      void fx.levelUp(this.st, this.me.actor)
      await show(`${name} grew to *Lv. ${r.level}*!`)
      await this.statPanel(before, after)
    } else await tell(`${name} grew to *Lv. ${r.level}*!`)
    for (const id of movesAt(r.idx, r.level)) await this.learn(r, id)
  }

  private async statPanel(before: Stats, after: Stats) {
    const p = el('div', 'bt-lvl')
    const rows: [string, StatKey][] = [
      ['MAX HP', 'hp'],
      ['ATTACK', 'atk'],
      ['DEFENSE', 'def'],
      ['SPEED', 'spd'],
    ]
    p.innerHTML = rows
      .map(
        ([l, k], i) =>
          `<div class="bl-row" style="animation-delay:${i * 70}ms"><span>${l}</span><b>${after[k]}</b><em>+${after[k] - before[k]}</em></div>`,
      )
      .join('')
    uiRoot.appendChild(p)
    await sleep(300)
    await this.waitA()
    p.remove()
  }

  private async learn(r: Remy, id: MoveId) {
    if (r.moves.some((m) => m.id === id)) return
    const k = forgetIndex(r, id)
    if (k === -2) return
    const mv = MOVES[id]
    void audio.jingle('item')
    if (k === -1) {
      r.moves.push({ id, pp: mv.pp })
      await tell(`${remyName(r)} learned *${mv.name}*!`)
      return
    }
    const old = MOVES[r.moves[k].id].name
    r.moves[k] = { id, pp: mv.pp }
    await tell(`${remyName(r)} forgot *${old}*.\nIt learned *${mv.name}*!`)
  }

  private waitA(): Promise<void> {
    this.menuOpen = true
    return new Promise((res) => {
      const done = () => {
        pop()
        uiRoot.removeEventListener('pointerdown', onTap, true)
        this.menuOpen = false
        audio.sfx('cursor')
        res()
      }
      const onTap = (e: Event) => {
        e.preventDefault()
        done()
      }
      const pop = input.push((b) => {
        if (b === 'a' || b === 'b') done()
      })
      uiRoot.addEventListener('pointerdown', onTap, true)
    })
  }

  private async trainerDefeated() {
    const t = this.setup.trainer
    if (!t) return
    await fx.trainerBack(this.st)
    await say(t.lose, { speaker: t.name })
    if (t.prize > 0) {
      S.money += t.prize
      audio.sfx('money')
      fx.coinShower(this.st)
      await tell(`You won *${t.prize.toLocaleString()} $REMY*!`)
    }
  }

  // ─── catching ───

  private async deflect(id: ItemId) {
    audio.sfx('throw')
    const bonk = fx.deflect(this.st, id === 'ledger')
    await sleep(420)
    audio.sfx('bump')
    await bonk
  }

  private async throwWallet(id: ItemId): Promise<Action> {
    takeItem(id)
    const item = ITEMS[id]
    const foe = this.foe.remy
    const p = clamp(
      species(foe.idx).catchRate *
        (item.ballMult ?? 1) *
        (1 - ((2 / 3) * foe.hp) / this.foe.max) *
        (foe.gold ? 0.6 : 1),
      0.05,
      0.97,
    )
    const q = p ** 0.25
    let passed = 0
    while (passed < 4 && rand() < q) passed++
    const caught = passed === 4
    const shakes = Math.min(3, passed)

    void show(`${S.name} threw a *${item.name}*!`)
    audio.sfx('throw')
    const seq = fx.capture(this.st, id === 'ledger', shakes, caught)
    // Sound cues follow the capture choreography's beats (throw 560ms, beam, drop, then one per wobble).
    await sleep(560)
    audio.sfx('select')
    await sleep(160 + 380 + 520 + 360)
    for (let i = 0; i < shakes; i++) {
      audio.sfx('shake')
      await sleep(520 + (i < shakes - 1 ? 380 : 260))
    }
    if (!caught) audio.sfx('catchFail')
    await seq
    if (caught) {
      audio.sfx('select')
      this.foe.showInfo(false)
      const jingle = audio.jingle('catch')
      await tell(`Gotcha! *${remyName(foe)}* was minted!`)
      await jingle
      audio.play('victory')
      const where = receiveRemy(foe, S.map || 'wild')
      closeText()
      await mintCertificate(this.root, {
        remy: foe,
        edition: S.caught.length,
        place: PLACES[S.map] ?? S.map.replace(/_/g, ' ').toUpperCase(),
      })
      await tell(
        where === 'party'
          ? `${remyName(foe)} joined your party!`
          : `Party full!\n${remyName(foe)} moved to *Cold Storage*.`,
      )
      return { kind: 'end', result: 'caught' }
    }
    audio.cry(foe.idx)
    await tell(
      [
        'The Remy slipped out!',
        'One shake, then a breakout!',
        'Two shakes! Almost minted!',
        'So close! It broke free at the end!',
      ][shakes],
    )
    return { kind: 'used' }
  }
}
