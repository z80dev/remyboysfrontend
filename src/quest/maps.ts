/** World maps: grids, buildings, NPCs, trainers, items, warps and their scripts. */
import { audio } from './audio'
import { BRIDGE_BUILDING, BRIDGE_TERMINAL, enterBridge } from './bridge'
import { ITEMS, type ItemId, type RType, makeRemy, remyName } from './data'
import { shopScreen, storageScreen } from './menus'
import { hallOfFame, starterScene } from './scenes'
import { S, addItem, healParty, save } from './state'
import type { ActorLook, Dir, MapObject, Theme, Track } from './types'
import { OBJ_SIZE } from './types'
import { awakenArt, viewArt } from './viewer'
import { ask, choose, closeText, flash, say, talk } from './ui'
import { type Actor, blackout, emote, face, flag, npc, player, refreshNpcs, trainerBattle, walkPath, warpTo, wildBattle } from './world'

export interface TrainerDef {
  name: string
  title: string
  portrait: number
  party: [number, number][]
  sight: number
  intro: string[]
  lose: string
  after: string[]
  prize: number
  bg?: Theme | 'exchange' | 'tower'
  music?: Track
}

export interface NpcDef {
  id: string
  x: number
  y: number
  dir: Dir
  look: ActorLook
  name?: string
  portrait?: number
  talk?: string[] | ((self: Actor) => Promise<void>)
  /** Function form is resolved when the battle starts (e.g. the rival counter-picks your starter). */
  trainer?: TrainerDef | (() => TrainerDef)
  wander?: boolean
  /** Uniform overlays the real portrait-bearing actor's walking body. */
  outfit?: 'cabald' | 'cabald-admin'
  /** Story payoff after this trainer is beaten, before the world resumes. */
  onWin?: () => Promise<void>
  /** Hidden once this flag is set. */
  hideIf?: string
  /** Only present once this flag is set. */
  showIf?: string
}

export interface Warp {
  x: number
  y: number
  to: string
  tx: number
  ty: number
  dir: Dir
}

export interface MapDef {
  id: string
  name: string
  theme: Theme
  music: Track
  grid: string[]
  objects: MapObject[]
  npcs: NpcDef[]
  warps: Warp[]
  signs: { x: number; y: number; text: string[] }[]
  items: { id: string; x: number; y: number; item: ItemId; n: number }[]
  encounters?: { rate: number; levels: [number, number]; weights: Partial<Record<RType, number>> }
  /** Door tile (absolute) → script. */
  doors: { x: number; y: number; run: () => Promise<void> }[]
  /** Step-on triggers. */
  triggers: { x: number; y: number; run: () => Promise<unknown> }[]
  /** Solid tile interactions (e.g. a healing crystal). */
  interacts?: { x: number; y: number; run: () => Promise<void> }[]
}

// ─────────── Looks ───────────
const SKIN = { light: '#f6d2b3', mid: '#e0a878', tan: '#c8875a', dark: '#8a5a3b' }
const L = {
  prof: { skin: SKIN.light, hair: 'short', hairColor: '#c9c9d6', shirt: '#6a7bd8', pants: '#3d3d55', extra: 'coat' },
  rival: { skin: SKIN.light, hair: 'spiky', hairColor: '#d94a3a', shirt: '#2d3f6b', pants: '#1f2438' },
  girl: { skin: SKIN.mid, hair: 'long', hairColor: '#f2c14e', shirt: '#ff7aa8', pants: '#5a4bd8' },
  fisher: { skin: SKIN.tan, hair: 'cap', hairColor: '#2d6a4f', shirt: '#e9c46a', pants: '#3a5a40' },
  oldman: { skin: SKIN.light, hair: 'bald', hairColor: '#ddd', shirt: '#8d6e63', pants: '#4e342e', extra: 'glasses' },
  newbie: { skin: SKIN.mid, hair: 'short', hairColor: '#4a3426', shirt: '#2b2b2b', pants: '#4a4a6a' },
  brenda: { skin: SKIN.light, hair: 'bun', hairColor: '#9b5de5', shirt: '#f15bb5', pants: '#2b2d42' },
  hunter: { skin: SKIN.dark, hair: 'beanie', hairColor: '#ff9f1c', shirt: '#2ec4b6', pants: '#1b1b3a' },
  kid: { skin: SKIN.mid, hair: 'spiky', hairColor: '#1d1d1d', shirt: '#ffbe0b', pants: '#3a86ff' },
  whale: { skin: SKIN.light, hair: 'short', hairColor: '#6c757d', shirt: '#1d3557', pants: '#1d3557', extra: 'chain' },
  degen: { skin: SKIN.tan, hair: 'afro', hairColor: '#2b1d14', shirt: '#b35cff', pants: '#222', extra: 'shades' },
  guard: { skin: SKIN.mid, hair: 'cap', hairColor: '#0052ff', shirt: '#0052ff', pants: '#1b1d3a' },
  lady: { skin: SKIN.dark, hair: 'long', hairColor: '#1b1b1b', shirt: '#2ec4b6', pants: '#f4a261' },
  tom: { skin: SKIN.light, hair: 'short', hairColor: '#e9c46a', shirt: '#ffffff', pants: '#1d3557', extra: 'suit' },
  ray: { skin: SKIN.light, hair: 'beanie', hairColor: '#8338ec', shirt: '#3a0ca3', pants: '#111' },
  carl: { skin: SKIN.mid, hair: 'long', hairColor: '#6a4c93', shirt: '#ffffff', pants: '#333', extra: 'glasses' },
  dan: { skin: SKIN.dark, hair: 'afro', hairColor: '#111', shirt: '#ff006e', pants: '#222', extra: 'chain' },
  rug: { skin: '#d9c7e6', hair: 'long', hairColor: '#1a0b2e', shirt: '#2a0d45', pants: '#12061f', extra: 'suit' },
  gold: { skin: '#f7d774', hair: 'bald', hairColor: '#f5c542', shirt: '#f5c542', pants: '#b8860b', extra: 'chain' },
} satisfies Record<string, ActorLook>

// ─────────── Cast (art indexes) ───────────
export const CAST = { prof: 46, rival: 42, nurse: 14, clerk: 6, maxi: 2084, rug: 67, player: 0, gold: 2002 }
export const STARTERS = [16, 9, 13, 54]
/** Never appear as random wild Remys. */
export const RESERVED = new Set([...STARTERS, ...Object.values(CAST), 2067, 45, 2, 2081, 2086, 2004])

const rows = (border: string, inner: string[], right = border) => inner.map((r) => border + r + right)

// ─────────── GENESIS TOWN ───────────
const genesisGrid = [
  'TTTTTTTTTTT::TTTTTTTTTTT',
  'TTTTTTTTTTT::TTTTTTTTTTT',
  ...rows('TT', [
    '..,......::....,....',
    '.........::.........',
    '.........::.........',
    '.........::.........',
    '...:.....::.........',
    '...:::::::::::::::..',
    '...:.......,........',
    '...:........,.......',
    ',..:.......ssssssss.',
    '...:.......s~~~~~~s.',
    '...::::....s~~~~~~s.',
    '...........s~~~~~~s,',
    '..,........s~~~~~~s.',
    '...........ssssssss.',
    '.,....b........,....',
    '....................',
  ]),
  'TTTTTTTTTTTTTTTTTTTTTTTT',
  'TTTTTTTTTTTTTTTTTTTTTTTT',
]

async function labIntro() {
  // Player walked toward the exit without a Remy.
  const prof = npc('prof')
  audio.sfx('alert')
  await emote(player, 'alert', 600)
  await say('HEY! WAIT! Don\u2019t go out there!', { speaker: 'PROF. GWEI', portrait: CAST.prof })
  closeText()
  face(player, 'down')
  await walkPath(prof, [player.x + 1, prof.y], [player.x + 1, player.y])
  face(prof, 'left')
  face(player, 'right')
  await talk(
    [
      'Wild *Remys* roam that grass! Best not to meet them empty-handed.',
      'Come along. Let’s find you a partner.',
    ],
    { speaker: 'PROF. GWEI', portrait: CAST.prof },
  )
  closeText()
  await starterScene()
  return true
}

// ─────────── THE FLOOR: original portraits, not token IDs ───────────
const LIVING_ART = [29, 35, 2005]
const GALLERY_ART = [
  [1, 16, 29, 34, 9, 15, 24, 37],
  [7, 13, 20, 39, 4, 27, 35, 31],
  [2000, 2002, 2004, 2005, 2006, 2013, 2016, 2017],
]
const galleryObjects: MapObject[] = GALLERY_ART.flatMap((wing, row) =>
  wing.map((idx, col) => ({ kind: 'frame', idx, x: col < 4 ? 2 + col * 2 : 13 + (col - 4) * 2, y: 2 + row * 4 })),
)
galleryObjects.push(
  { kind: 'pedestal', idx: 24, x: 6, y: 14 },
  { kind: 'pedestal', idx: 2008, x: 15, y: 14 },
  { kind: 'sign', x: 10, y: 2 },
  { kind: 'sign', x: 10, y: 6 },
  { kind: 'sign', x: 10, y: 10 },
)

function galleryWing(o: MapObject): string {
  if (o.kind === 'pedestal') return 'THE HOLOGRAM GARDEN'
  if (o.y === 10) return 'THE GOLDEN WING'
  return o.y === 2 ? (o.x < 10 ? 'BULL · GREEN SHOOTS' : 'BEAR · RED SEASON') : (o.x < 10 ? 'WHALE · DEEP BLUE' : 'DEGEN · AFTER HOURS')
}

async function curator() {
  const opts = { speaker: 'THE CURATOR', portrait: 2016 }
  if (S.flags.gallery_patron) {
    await say('*PATRON OF THE FLOOR*: {P}. The paintings voted. One tried to eat the ballot.', opts)
    return
  }
  if (!S.flags.gallery_living) {
    await talk([
      'Welcome to *THE FLOOR*. Real Remys. No right-click security.',
      'Three works wander: *REMY #29* in BULL, *REMY #35* in DEGEN, *REMY #2005* in GOLDEN.',
      'Inspect them to battle. Mint *one* or meet *all three*, then see me for a gift.',
      'Here are *2 Ledger Pros*. Aim at the art, not the visitors.',
    ], opts)
    S.flags.gallery_living = true
    addItem('ledger', 2)
    await audio.jingle('item')
    save()
    return
  }
  const met = LIVING_ART.filter((idx) => S.flags[`gallery_awake:${idx}`]).length
  if (LIVING_ART.some((idx) => S.caught.includes(idx)) || met === LIVING_ART.length) {
    await talk([
      'Art belongs in a living collection. You understood the assignment.',
      '*3 Ledger Pros* and *2 Max Hopium*! Welcome, *PATRON OF THE FLOOR*.',
    ], opts)
    S.flags.gallery_patron = true
    addItem('ledger', 3)
    addItem('max_hopium', 2)
    await audio.jingle('item')
    save()
  } else {
    await talk([`Living works met: *${met}/3*. Mint one or meet all three.`, '*REMY #29*: BULL. *REMY #35*: DEGEN. *REMY #2005*: GOLDEN.'], opts)
  }
}

async function inspectArt(o: MapObject, museum: boolean) {
  const idx = o.idx as number
  if (o.kind === 'billboard' && idx === CAST.rug) {
    await talk(S.flags.rug
      ? ['*EXHIBIT A: CABALD PROPAGANDA*', 'Someone has taped a refund receipt over the logo.']
      : ['*THERE IS NO CABALD. I LOVE YOU.*', 'A bald head inside a gold C. Subtle as a signed confession.'],
    { speaker: 'PUBLIC SERVICE DENIAL' })
    return
  }
  const living = museum && !!S.flags.gallery_living && LIVING_ART.includes(idx) && !S.flags[`gallery_awake:${idx}`]
  closeText()
  await viewArt(idx, { wing: museum ? galleryWing(o) : 'STREET EDITION · THE FLOOR', living })
  if (!living) return
  await say('The eyes follow you. The frame rattles. This one is *not* a still life.')
  closeText()
  if (!S.party.some((r) => r.hp > 0)) {
    await say('Bring a fighting-fit Remy. The painting politely returns to its frame.')
    return
  }
  await flash(2, 80)
  await awakenArt(idx)
  S.flags[`gallery_awake:${idx}`] = true
  await wildBattle(makeRemy(idx, idx === 2005 ? 10 : 8), 'gallery')
  save()
}

/** Bridge and canyon ambushes share one party, not two back-to-back fights. */
async function duoAmbush(area: 'meadow' | 'canyon', interact = false) {
  const id = `cabald_duo_${area}`
  if (S.flags.rug || (area === 'meadow' && S.flags.badge_mm) || S.flags[`t:${id}`]) {
    if (interact) await say('Two unrelated strangers. Matching capes. Pure coincidence.', { speaker: 'SHORT & SQUEEZE', portrait: 10 })
    return
  }
  if (!S.party.length) return
  const short = npc('cabald_short')
  const squeeze = npc('cabald_squeeze')
  audio.sfx('alert')
  await Promise.all([emote(short, 'alert', 450), emote(squeeze, 'heart', 450)])
  if (!interact) {
    await Promise.all([
      walkPath(short, [player.x - 1, player.y]),
      walkPath(squeeze, [player.x + 1, player.y]),
    ])
  }
  face(short, 'right')
  face(squeeze, 'left')
  face(player, 'left')
  await say(area === 'meadow'
    ? 'Your airdrop is due for compulsory affection.'
    : 'Promoted to plausible deniability! Same capes, worse hours.', { speaker: 'CABALD ADMIN SHORT', portrait: 10 })
  await say(area === 'meadow'
    ? 'I’m SQUEEZE. He’s SHORT. We take the float. You keep the receipt.'
    : 'Base. Mainnet. Solana. Robinhood Chain. Four drains, one tower.', { speaker: 'CABALD ADMIN SQUEEZE', portrait: 57 })
  closeText()
  const res = await trainerBattle({
    name: 'SHORT & SQUEEZE', title: 'CABALD ADMINS', portrait: 10,
    party: area === 'meadow' ? [[1502, 4], [4101, 5]] : [[1502, 11], [4101, 12]],
    sight: 0, intro: [],
    lose: 'Our position! Liquidated by friendship!',
    after: ['The capes were non-refundable.'], prize: area === 'meadow' ? 240 : 600, music: 'cabald',
  }, id)
  if (res !== 'win') return
  await talk(area === 'meadow'
    ? ['Keep your airdrops. We have an Exchange to not occupy.', 'Our boss at *Rug Tower* will hear about this. From nobody.']
    : ['Fine! The *RUG LORD* runs our drain. That was not a confession.', 'We quit. Hypothetically.'],
  { speaker: 'SHORT & SQUEEZE', portrait: 57 })
  closeText()
  refreshNpcs()
  save()
}

async function liberateExchange() {
  if (S.flags.cabald_city) return
  await talk([
    'We are leaving a building we never occupied.',
    'The grunts unplug their drain. The Exchange doors swing open!',
  ], { speaker: 'CABALD ADMIN ESCROW', portrait: 2086 })
  flag('cabald_city')
  refreshNpcs()
  healParty()
  addItem('hopium', 2)
  await audio.jingle('heal')
  await talk([
    'You broke their hold! Your team is healed. Take *2 Hopium*. My treat.',
    'Their drain leads to *Rug Tower*. My badge will get you past the east gate.',
    'Come inside when you’re ready. A fair battle, for a change.',
  ], { speaker: 'MAXI', portrait: CAST.maxi })
  save()
}

export const MAPS: Record<string, MapDef> = {
  bridge: BRIDGE_TERMINAL,
  genesis: {
    id: 'genesis',
    name: 'GENESIS TOWN',
    theme: 'town',
    music: 'town',
    grid: genesisGrid,
    objects: [
      { kind: 'house', x: 4, y: 3 },
      { kind: 'lab', x: 14, y: 3 },
      { kind: 'house', x: 7, y: 9 },
      { kind: 'sign', x: 13, y: 2 },
      { kind: 'sign', x: 20, y: 6 },
      { kind: 'mailbox', x: 8, y: 5 },
      { kind: 'lamp', x: 4, y: 7 },
      { kind: 'crystal', x: 3, y: 16 },
      { kind: 'crystal', x: 21, y: 16 },
      { kind: 'bench', x: 13, y: 16 },
      { kind: 'flowerpot', x: 3, y: 5 },
      { kind: 'flowerpot', x: 20, y: 7 },
      { kind: 'billboard', x: 3, y: 14, idx: 24 },
    ],
    signs: [
      { x: 13, y: 2, text: ['*GENESIS TOWN · BASE*', 'Small town. Big builder energy.'] },
      { x: 20, y: 6, text: ['*PROF. GWEI\u2019S REMY LAB*', '\u201cDon\u2019t trust. Verify. Then battle.\u201d'] },
    ],
    npcs: [
      {
        id: 'cabald_nobody', x: 10, y: 5, dir: 'right', look: L.ray, portrait: 10,
        outfit: 'cabald', name: 'ABSOLUTELY NOBODY', hideIf: 'rug',
        talk: [
          'This is not a uniform. The gold C is a laundry instruction.',
          'Missing liquidity? Have you checked between the sofa cushions?',
          'There is no Cabald. I love you.',
        ],
      },
      {
        id: 'prof',
        x: 16,
        y: 7,
        dir: 'down',
        look: L.prof,
        name: 'PROF. GWEI',
        portrait: CAST.prof,
        talk: async () => {
          if (!S.flags.starter) {
            await starterScene()
            return
          }
          if (!S.flags.rug) {
            const lines = S.flags.badge_mm
              ? ['The east gate is open. Follow *Rug Pull Canyon* to *Rug Tower*.', 'That unofficial bridge drains every chain it touches. Shut it down.']
              : S.flags.cabald_city
                ? ['The Exchange is free. Challenge *MAXI* for the *Market Maker Badge*.']
                : ['Follow *Mempool Meadow* north to *Liquidity City*.', 'The Cabald holds the Exchange. Start with *ADMIN ESCROW* outside.']
            await talk(lines, { speaker: 'PROF. GWEI', portrait: CAST.prof })
          } else {
            await talk(['Base to mainnet, the reports agree: liquidity is flowing home. Well done, {P}.'], {
              speaker: 'PROF. GWEI',
              portrait: CAST.prof,
            })
          }
        },
      },
      {
        id: 'neighbor',
        x: 12,
        y: 9,
        dir: 'left',
        look: L.girl,
        wander: true,
        talk: [
          'The Remys here live *on Base*. The grass is just where they hang out.',
          'Me? I’m building a picnic app. Still working on the sandwiches.',
        ],
      },
      {
        id: 'fisher',
        x: 12,
        y: 14,
        dir: 'right',
        look: L.fisher,
        talk: ['I\u2019ve been HODLing this fishing rod since *block zero*.', 'Haven\u2019t caught anything. But I\u2019m not selling.'],
      },
      {
        id: 'oldman',
        x: 15,
        y: 17,
        dir: 'up',
        look: L.oldman,
        talk: [
          'I came from *Ethereum mainnet*, ser. Old blocks, old friends.',
          '*BULL* beats *BEAR*. *BEAR* beats *DEGEN*.',
          '*DEGEN* beats *WHALE*. *WHALE* beats *BULL*. That’s the whole circle.',
        ],
      },
    ],
    warps: [
      { x: 11, y: 0, to: 'meadow', tx: 11, ty: 42, dir: 'up' },
      { x: 12, y: 0, to: 'meadow', tx: 12, ty: 42, dir: 'up' },
    ],
    items: [{ id: 'g1', x: 20, y: 17, item: 'hopium', n: 1 }],
    doors: [
      {
        x: 5,
        y: 5,
        run: async () => {
          healParty()
          S.respawn = { map: 'genesis', x: 5, y: 6 }
          await talk(
            S.party.length
              ? ['MOM: {P}! Shoes off. Nap first.', 'Your Remys are fully rested!', 'MOM: Remember to touch grass. Not just the screen.']
              : ['MOM: Prof. Gwei is outside. Try not to keep him pending.'],
          )
          if (S.party.length) audio.jingle('heal')
        },
      },
      { x: 16, y: 6, run: async () => void (await say('The lab door is locked. A sticky note says: \u201cgm. Out doing fieldwork. \u2014G\u201d')) },
      { x: 8, y: 11, run: async () => void (await say('A Ledger Pro is taped to the door. Its Seed Phrase is taped beside it. Oh dear.')) },
    ],
    triggers: [
      { x: 11, y: 3, run: async () => (!S.flags.starter ? labIntro() : false) },
      { x: 12, y: 3, run: async () => (!S.flags.starter ? labIntro() : false) },
    ],
  },

  // ─────────── ROUTE 1: MEMPOOL MEADOW ───────────
  meadow: {
    id: 'meadow',
    name: 'MEMPOOL MEADOW',
    theme: 'meadow',
    music: 'route',
    grid: [
      'TTTTTTTTTTT::TTTTTTTTTTT',
      'TTTTTTTTTTT::TTTTTTTTTTT',
      ...rows('TT', [
        '..,......::.....,...',
        '.........::.........',
        '..T......::......T..',
        '.........::.........',
        '"""".....::.."""""""',
        '"""""....::.""""""""',
        '""""""...::.""""""""',
        '"""""....::..""""""T',
        '.""".....::...""""TT',
        '.........::.........',
        '..,..T...::..,......',
        '.........:::::::....',
        '^^^^^^^^^^^^^^::....',
        '.........:::::::....',
        '.........::.........',
        '..sssssss::sssssss..',
        '..s~~~~~~ww~~~~~~s..',
        '..s~~~~~~ww~~~~~~s..',
        '..s~~~~~~ww~~~~~~s..',
        '..sssssss::sssssss..',
        '.........::.........',
        '"""".....::.....""""',
        '"""""....::...."""""',
        '""""""...::...""""""',
        '""""""...::...""""""',
        '"""""....::...""""""',
        '.""".....::....""""T',
        '.........::.........',
        '..T..,...::...,..T..',
        '.........::.........',
        'TT.......::.......TT',
        'TTT......::......TTT',
        '"""......::....,....',
        '"""".....::.........',
        '"""".....::..b...b..',
        '"""......::.........',
        '.........::...,.....',
        '..,......::.........',
        '.........::.........',
        '.........::.........',
      ]),
      'TTTTTTTTTTT::TTTTTTTTTTT',
      'TTTTTTTTTTT::TTTTTTTTTTT',
    ],
    objects: [
      { kind: 'sign', x: 13, y: 4 },
      { kind: 'sign', x: 13, y: 40 },
      { kind: 'rock', x: 4, y: 12 },
    ],
    signs: [
      { x: 13, y: 4, text: ['NORTH: *LIQUIDITY CITY*', 'SOUTH: GENESIS TOWN'] },
      { x: 13, y: 40, text: ['*ROUTE 1 · MEMPOOL MEADOW*', 'Wild Remys in tall grass. Cold Wallets at the ready!'] },
    ],
    npcs: [
      {
        id: 'brenda',
        x: 8,
        y: 26,
        dir: 'right',
        look: L.brenda,
        trainer: {
          name: 'BRENDA',
          title: 'BAG HOLDER',
          portrait: 36,
          party: [
            [1204, 3],
            [311, 4],
          ],
          sight: 3,
          intro: ['I packed for a day trip. My bags had other plans.'],
          lose: 'All these bags. Not one victory.',
          after: ['Next trip, I’m packing light. Emotionally, at least.'],
          prize: 120,
        },
      },
      {
        id: 'cabald_short', x: 9, y: 22, dir: 'right', look: L.ray, portrait: 10,
        outfit: 'cabald-admin', name: 'SHORT', hideIf: 'rug',
        talk: () => duoAmbush('meadow', true),
      },
      {
        id: 'cabald_squeeze', x: 14, y: 22, dir: 'left', look: L.dan, portrait: 57,
        outfit: 'cabald-admin', name: 'SQUEEZE', hideIf: 'rug',
        talk: () => duoAmbush('meadow', true),
      },
      {
        id: 'amy',
        x: 14,
        y: 11,
        dir: 'left',
        look: L.hunter,
        outfit: 'cabald',
        hideIf: 'rug',
        trainer: {
          name: 'AMY',
          title: 'CABALD GRUNT',
          portrait: 60,
          party: [
            [781, 5],
            [3305, 5],
            [1777, 6],
          ],
          sight: 3,
          intro: ['Your airdrop is now a mandatory donation. Receipts unavailable.'],
          lose: 'My collection has been... uncollected.',
          after: ['Fine. Everyone gets their airdrops back. Stop looking at me.'],
          prize: 200,
          music: 'cabald',
        },
      },
      {
        id: 'hiker',
        x: 16,
        y: 31,
        dir: 'left',
        look: L.oldman,
        talk: ['Mainnet traveler, ser. I budgeted for gas. Forgot lunch.', 'These *ledges* are one-way shortcuts south. No climbing back.'],
      },
      {
        id: 'sol_runner', x: 18, y: 36, dir: 'left', look: L.hunter,
        trainer: {
          name: 'DASH', title: 'SOLANA SPEEDRUNNER', portrait: 31,
          party: [[1440, 4], [3612, 5]], sight: 2,
          intro: ['Visiting from *Solana*! Fast blocks. Fast laps. Quick battle?'],
          lose: 'New personal best. For losing.',
          after: ['My memecoin group is timing my hike. Please don’t tell them I stopped.'],
          prize: 160,
        },
      },
      {
        id: 'airdrop_victim', x: 16, y: 12, dir: 'up', look: L.kid,
        talk: async () => void await say(S.flags['t:amy']
          ? 'My airdrop is back! Apparently I qualified for an undonation.'
          : 'That grunt took my airdrop. Could you challenge *AMY* for me?'),
      },
    ],
    warps: [
      { x: 11, y: 43, to: 'genesis', tx: 11, ty: 1, dir: 'down' },
      { x: 12, y: 43, to: 'genesis', tx: 12, ty: 1, dir: 'down' },
      { x: 11, y: 0, to: 'city', tx: 14, ty: 24, dir: 'up' },
      { x: 12, y: 0, to: 'city', tx: 15, ty: 24, dir: 'up' },
    ],
    items: [
      { id: 'm1', x: 3, y: 40, item: 'wallet', n: 3 },
      { id: 'm2', x: 20, y: 3, item: 'hopium', n: 2 },
      { id: 'm3', x: 21, y: 31, item: 'ledger', n: 1 },
    ],
    encounters: { rate: 0.13, levels: [2, 5], weights: { BULL: 1, BEAR: 1, WHALE: 1, DEGEN: 1 } },
    doors: [],
    triggers: [11, 12].map((x) => ({ x, y: 22, run: () => duoAmbush('meadow') })),
  },

  // ─────────── LIQUIDITY CITY ───────────
  city: {
    id: 'city',
    name: 'LIQUIDITY CITY',
    theme: 'city',
    music: 'city',
    grid: [
      'TTTTTTTTTTTTTTTTTTTTTTTTTTTTTT',
      'TTTTTTTTTTTTTTTTTTTTTTTTTTTTTT',
      ...rows('TT', [
        '..,.................,.....',
        '..........................',
        '..........................',
        '..........................',
        '..........................',
        '==========================',
        '==========================',
        '..,...==============...,..',
        '......==============......',
        '......==============......',
      ]),
      'TT......======================', // y12: road east to the canyon
      ...rows('TT', [
        '......==============......',
        '......==============......',
        '..,.........==............',
        '............==......,.....',
        '............==............',
        '............==............',
        '...=================......',
        '............==............',
        '..,.........==......,.....',
        '............==............',
        '............==............',
      ]),
      'TTTTTTTTTTTTTT==TTTTTTTTTTTTTT',
      'TTTTTTTTTTTTTT==TTTTTTTTTTTTTT',
    ],
    objects: [
      { kind: 'center', x: 4, y: 3 },
      { kind: 'mart', x: 11, y: 4 },
      { kind: 'exchange', x: 19, y: 2 },
      { kind: 'fountain', x: 13, y: 10 },
      { kind: 'candle_green', x: 9, y: 10 },
      { kind: 'candle_red', x: 19, y: 10 },
      { kind: 'lamp', x: 3, y: 8 },
      { kind: 'lamp', x: 26, y: 8 },
      { kind: 'lamp', x: 9, y: 14 },
      { kind: 'lamp', x: 19, y: 14 },
      { kind: 'atm', x: 16, y: 6 },
      { kind: 'server', x: 26, y: 5 },
      { kind: 'server', x: 26, y: 6 },
      { kind: 'bench', x: 10, y: 13 },
      { kind: 'sign', x: 16, y: 16 },
      { kind: 'sign', x: 18, y: 6 },
      BRIDGE_BUILDING,
      { kind: 'house', x: 21, y: 16 },
      { kind: 'flowerpot', x: 9, y: 6 },
      { kind: 'flowerpot', x: 10, y: 6 },
      { kind: 'statue', x: 12, y: 21 },
      { kind: 'billboard', x: 3, y: 12, idx: 67 },
      { kind: 'billboard', x: 23, y: 14, idx: 67 },
      { kind: 'billboard', x: 20, y: 22, idx: 35 },
      { kind: 'sign', x: 25, y: 19 },
    ],
    signs: [
      { x: 16, y: 16, text: ['*LIQUIDITY CITY · BASE*', 'Build by day. Trade... also by day. And night.'] },
      { x: 18, y: 6, text: ['*THE EXCHANGE · REMY GYM*', 'MAXI · Market Maker', 'A peeled Cabald sticker: VOLUNTARY LIQUIDITY REMOVAL.'] },
      { x: 25, y: 19, text: ['*THE FLOOR · REMY ART MUSEUM*', 'Original art. Occasionally restless. Admission: free.'] },
    ],
    npcs: [
      {
        id: 'guard',
        x: 27,
        y: 12,
        dir: 'left',
        look: L.guard,
        hideIf: 'badge_mm',
        talk: [
          'Halt! *Rug Pull Canyon* is closed to unverified trainers.',
          'Earn the *Market Maker Badge* at The Exchange and I\u2019ll let you through.',
        ],
      },
      {
        id: 'guard2',
        x: 27,
        y: 11,
        dir: 'down',
        look: L.guard,
        showIf: 'badge_mm',
        talk: ['*Rug Tower* is straight up the canyon. Bring *Hopium*. Denial is thirsty work.'],
      },
      {
        id: 'kid',
        x: 12,
        y: 17,
        dir: 'down',
        look: L.kid,
        wander: true,
        talk: ['MAXI brings a mixed team. Check each foe’s type before picking a move.', 'I call it research. Dad calls it backseat battling.'],
      },
      {
        id: 'whale',
        x: 16,
        y: 11,
        dir: 'left',
        look: L.whale,
        talk: ['I sold my yacht to buy more Remys.', 'Now I live in the fountain. *Worth it.*'],
      },
      {
        id: 'atm',
        x: 16,
        y: 7,
        dir: 'up',
        look: L.degen,
        talk: ['This ATM only dispenses *Hopium*.', 'The receipt says “you’ve got this.”'],
      },
      {
        id: 'lady',
        x: 8,
        y: 20,
        dir: 'right',
        look: L.lady,
        wander: true,
        talk: [
          'Free healing at the *REMY CENTER*. *Cold Storage* lets you swap your party.',
        ],
      },
      {
        id: 'cabald_escrow',
        x: 22,
        y: 8,
        dir: 'down',
        look: L.tom,
        outfit: 'cabald-admin',
        hideIf: 'cabald_city',
        onWin: liberateExchange,
        trainer: {
          name: 'ESCROW',
          title: 'CABALD ADMIN',
          portrait: 2086,
          party: [
            [3021, 8],
            [555, 9],
          ],
          sight: 4,
          intro: [
            'Welcome to the *DENIAL CENTER*. Deposits in. Questions out.',
            'MAXI won’t hand over his order book. Your Remys will do.',
          ],
          lose: 'Our non-existent occupation has been... evicted.',
          after: ['I am between occupations.'],
          prize: 360,
          music: 'cabald',
        },
      },
      {
        id: 'cabald_lobby', x: 24, y: 7, dir: 'left', look: L.ray, portrait: 10,
        outfit: 'cabald', hideIf: 'cabald_city', name: 'CABALD GRUNT',
        talk: ['Complaints? Battle *ADMIN ESCROW* out front.', 'Customer service is a contact sport.'],
      },
      {
        id: 'exchange_customer', x: 20, y: 8, dir: 'right', look: L.lady,
        talk: async () => void await say(S.flags.cabald_city || S.flags.badge_mm
          ? 'Trades! Withdrawals! Not one mandatory affirmation. Thank you!'
          : 'Beat *ADMIN ESCROW*, the red-trimmed one. We want our Exchange back!'),
      },
    ],
    warps: [
      { x: 14, y: 25, to: 'meadow', tx: 11, ty: 1, dir: 'down' },
      { x: 15, y: 25, to: 'meadow', tx: 12, ty: 1, dir: 'down' },
      { x: 29, y: 12, to: 'canyon', tx: 1, ty: 34, dir: 'right' },
    ],
    items: [{ id: 'c1', x: 27, y: 22, item: 'max_hopium', n: 1 }],
    doors: [
      {
        x: 6,
        y: 6,
        run: async () => {
          S.respawn = { map: 'city', x: 6, y: 7 }
          const o = { speaker: 'NURSE REMY', portrait: CAST.nurse }
          await say('Welcome to the *REMY CENTER*. A rest or a team change?', { ...o, noWait: true })
          const c = await choose(['HEAL', 'COLD STORAGE', 'BYE'], { cancel: 2 })
          if (c === 0) {
            await say('One quick recharge…', { ...o, auto: 500 })
            healParty()
            await audio.jingle('heal')
            await say('Full health, full PP. Go make good trouble!', o)
          } else if (c === 1) {
            closeText()
            await storageScreen()
          } else await say('Stay based!', o)
        },
      },
      {
        x: 13,
        y: 6,
        run: async () => {
          await say('Welcome to *REMY MART*! Tap an item to buy.', { speaker: 'CLERK', portrait: CAST.clerk, auto: 400 })
          closeText()
          await shopScreen()
        },
      },
      { x: 22, y: 6, run: gym },
      { x: 5, y: 19, run: enterBridge },
      { x: 22, y: 18, run: async () => { await warpTo('gallery', 10, 15, 'up') } },
    ],
    triggers: [],
  },

  gallery: {
    id: 'gallery',
    name: 'THE FLOOR — REMY ART MUSEUM',
    theme: 'gallery',
    music: 'gallery',
    grid: [
      'WWWWWWWWWWWWWWWWWWWWWW',
      'WWWWWWWWWooooWWWWWWWWW',
      'WWWWWWWWWorroWWWWWWWWW',
      'WooooooooorroooooooooW',
      'WooooooooorroooooooooW',
      'WWWWWWWWWorroWWWWWWWWW',
      'WWWWWWWWWorroWWWWWWWWW',
      'WooooooooorroooooooooW',
      'WooooooooorroooooooooW',
      'WWWWWWWWWorroWWWWWWWWW',
      'WWWWWWWWWorroWWWWWWWWW',
      'WooooooooorroooooooooW',
      'WooooooooorroooooooooW',
      'WoorrrrrrrrrrrrrrrrooW',
      'WooooooooorroooooooooW',
      'WooooooooorroooooooooW',
      'WooooooooorroooooooooW',
      'WWWWWWWWWWrrWWWWWWWWWW',
    ],
    objects: galleryObjects,
    signs: [
      { x: 10, y: 2, text: ['*BULL ← · → BEAR*', 'Living work: *REMY #29*, left wing.'] },
      { x: 10, y: 6, text: ['*WHALE ← · → DEGEN*', 'Living work: *REMY #35*, right wing.'] },
      { x: 10, y: 10, text: ['*THE GOLDEN WING*', 'Living work: *REMY #2005*, left of the aisle.'] },
    ],
    npcs: [
      { id: 'curator', x: 9, y: 14, dir: 'right', look: L.carl, name: 'THE CURATOR', portrait: 2016, talk: curator },
      { id: 'artbull', x: 5, y: 4, dir: 'up', look: L.whale, portrait: 27, talk: ['Bullish brushwork. Bullish composition. Even the fire exit is bullish.'] },
      { id: 'artdegen', x: 17, y: 8, dir: 'up', look: L.degen, portrait: 36, talk: ['I came for utility. The frog winked. I stayed.', 'Some see a portrait. I see a 40-page roadmap.'] },
      { id: 'artgold', x: 4, y: 12, dir: 'up', look: L.lady, portrait: 2000, talk: ['It’s THE FLOOR. Please stop asking about the ceiling.', '*4,490 originals* in the real collection. These are a few of their faces.'] },
    ],
    warps: [
      { x: 10, y: 17, to: 'city', tx: 22, ty: 19, dir: 'down' },
      { x: 11, y: 17, to: 'city', tx: 22, ty: 19, dir: 'down' },
    ],
    items: [],
    doors: [],
    triggers: [],
  },

  // ─────────── RUG PULL CANYON ───────────
  canyon: {
    id: 'canyon',
    name: 'RUG PULL CANYON',
    theme: 'canyon',
    music: 'canyon',
    grid: [
      '##########################',
      '##########################',
      '########dddddddddd########',
      '########dddddddddd########',
      '########dddddddddd########',
      '########dddddddddd########',
      '########dddddddddd########',
      '########dddddddddd########',
      '########dddddddddd########',
      '####ddd##dddddddd#########',
      '####ddd###dddddd##########',
      '#####d####dddddd##########',
      '#####dddddddddddddddd#####',
      '####dd""""dddddd""""dd####',
      '####d"""""dddddd"""""d####',
      '####d""""dddddddd""""d####',
      '####dd""dddddddddd""dd####',
      '####^^^^^^^^^d^^^^^^^^####',
      '####dddddddddddddddddd####',
      '####dsssssdddddddsssdd####',
      '###ddsssssdddddddssssdd###',
      '###dddddddddd##dddddddd###',
      '###dd""""ddd####ddd""""###',
      '###d"""""ddd####dd""""d###',
      '###d""""dddd##ddd"""""d###',
      '###dd""ddddddddddd"""dd###',
      '###dddddddddddddddddddd###',
      '###^^^^^^^ddd^^^^^^^^^^###',
      '###dddddddddddddddddddd###',
      '##dddd""""dddddd""""dddd##',
      '##ddd"""""dddddd"""""ddd##',
      '##dddd""""dddddd""""dddd##',
      '##dddddddddddddddddddddd##',
      '##dddddddddddddddddddddd##',
      'dddddddddddddddddddddddd##',
      'dddddddddddddddddddddddd##',
      '######dddddddddddd########',
      '#######dddddddddd#########',
      '##########################',
      '##########################',
    ],
    objects: [
      { kind: 'tower', x: 10, y: 2 },
      { kind: 'candle_red', x: 9, y: 7 },
      { kind: 'candle_red', x: 15, y: 7 },
      { kind: 'crystal', x: 9, y: 4 },
      { kind: 'crystal', x: 16, y: 3 },
      { kind: 'crystal', x: 4, y: 9 },
      { kind: 'crystal', x: 6, y: 9 },
      { kind: 'server', x: 4, y: 21 },
      { kind: 'server', x: 5, y: 21 },
      { kind: 'sign', x: 6, y: 21 },
      { kind: 'sign', x: 3, y: 33 },
      { kind: 'rock', x: 20, y: 26 },
      { kind: 'rock', x: 5, y: 32 },
      { kind: 'rock', x: 19, y: 12 },
    ],
    signs: [
      { x: 3, y: 33, text: ['*RUG PULL CANYON*', '*RUG TOWER ↑*', 'Someone crossed out “Cabald HQ.” Badly.'] },
      { x: 6, y: 21, text: ['*CABALD CROSS-CHAIN PIPELINE*', 'Base · Ethereum mainnet', 'Solana · Robinhood Chain', 'All pipes lead uphill. Nothing comes back.'] },
    ],
    interacts: [
      {
        x: 9,
        y: 4,
        run: async () => {
          await say('A *Base crystal* hums with pure blockspace\u2026')
          healParty()
          await audio.jingle('heal')
          await say('Your Remys were fully restored!')
        },
      },
    ],
    npcs: [
      {
        id: 'cabald_short', x: 11, y: 18, dir: 'right', look: L.ray, portrait: 10,
        outfit: 'cabald-admin', name: 'SHORT', hideIf: 'rug',
        talk: () => duoAmbush('canyon', true),
      },
      {
        id: 'cabald_squeeze', x: 16, y: 18, dir: 'left', look: L.dan, portrait: 57,
        outfit: 'cabald-admin', name: 'SQUEEZE', hideIf: 'rug',
        talk: () => duoAmbush('canyon', true),
      },
      {
        id: 'golden',
        x: 5,
        y: 9,
        dir: 'down',
        look: L.gold,
        hideIf: 'gold',
        talk: async () => {
          await say('A *GOLDEN REMY* shimmers between the crystals, watching you\u2026')
          if (!(await ask('Approach it?'))) return
          closeText()
          flag('gold')
          const r = await wildBattle(makeRemy(CAST.gold, 14, true), 'canyon')
          if (r === 'lose') await blackout()
        },
      },
      {
        id: 'rival2',
        x: 13,
        y: 16,
        dir: 'down',
        look: L.rival,
        hideIf: 't:rival2',
        trainer: () => rivalTrainer(2),
      },
      {
        id: 'carl',
        x: 11,
        y: 13,
        dir: 'down',
        look: L.carl,
        outfit: 'cabald',
        hideIf: 'rug',
        trainer: {
          name: 'CARL',
          title: 'CABALD GRUNT',
          portrait: 2038,
          party: [
            [1880, 10],
            [2748, 11],
          ],
          sight: 3,
          intro: ['An unofficial bridge. Four chains in. One boss cashes out. Hypothetically.'],
          lose: 'My denial has sprung a leak.',
          after: ['Those pipes? Decorative. The screaming pump? Also decorative.'],
          prize: 440,
          music: 'cabald',
        },
      },
      {
        id: 'dan',
        x: 8,
        y: 26,
        dir: 'right',
        look: L.dan,
        outfit: 'cabald',
        hideIf: 'rug',
        trainer: {
          name: 'DAN',
          title: 'CABALD GRUNT',
          portrait: 57,
          party: [
            [4101, 10],
            [3907, 10],
            [640, 11],
          ],
          sight: 5,
          intro: ['Payroll calls this drain a love language. I asked for dental.'],
          lose: 'I should have read the benefits.',
          after: ['Our boss wears a rug like a crown. You heard that from nobody.'],
          prize: 480,
          music: 'cabald',
        },
      },
      {
        id: 'ray',
        x: 14,
        y: 31,
        dir: 'left',
        look: L.ray,
        outfit: 'cabald',
        hideIf: 'rug',
        trainer: {
          name: 'RAY',
          title: 'CABALD GRUNT',
          portrait: 10,
          party: [
            [2921, 9],
            [1502, 10],
          ],
          sight: 4,
          intro: ['HQ is private. So is everything we took.'],
          lose: 'My exit liquidity exited.',
          after: ['I’m guarding this rock now. Honest work.'],
          prize: 400,
          music: 'cabald',
        },
      },
      {
        id: 'rug',
        x: 12,
        y: 8,
        dir: 'down',
        look: L.rug,
        outfit: 'cabald-admin',
        hideIf: 'rug',
        trainer: {
          name: 'RUG LORD',
          title: 'CABALD BOSS',
          portrait: CAST.rug,
          party: [
            [2067, 15],
            [45, 15],
            [2, 17],
          ],
          sight: 4,
          intro: [
            'The *RUG LORD*, at your service. Service fees apply.',
            'Base, mainnet, Solana, Robinhood Chain. So many pools. One private drain.',
            'Call it a bridge. Put a heart on the sign. Nobody reads the plumbing.',
            'Your next deposit is compulsory.',
          ],
          lose: 'The flow is reversing?! That is NOT in the terms!',
          after: [],
          prize: 3000,
          bg: 'tower',
          music: 'boss',
        },
      },
    ],
    warps: [
      { x: 0, y: 34, to: 'city', tx: 28, ty: 12, dir: 'left' },
      { x: 0, y: 35, to: 'city', tx: 28, ty: 12, dir: 'left' },
    ],
    items: [
      { id: 'k1', x: 21, y: 18, item: 'max_hopium', n: 1 },
      { id: 'k2', x: 4, y: 20, item: 'seed', n: 1 },
      { id: 'k3', x: 16, y: 33, item: 'ledger', n: 2 },
      { id: 'k4', x: 20, y: 5, item: 'hopium', n: 3 },
    ],
    encounters: { rate: 0.13, levels: [8, 12], weights: { BEAR: 2, DEGEN: 2, WHALE: 1, BULL: 1 } },
    doors: [
      {
        x: 12,
        y: 7,
        run: async () => void (await say(S.flags.rug ? 'The drain is shut. Liquidity flows home to all four chains.' : '*CABALD HQ*. The plaque denies everything. The pipes do not.')),
      },
    ],
    triggers: [{ x: 13, y: 18, run: () => duoAmbush('canyon') }],
  },
}

// Every solid tile of an exhibit is inspectable, including all three billboard posts.
for (const map of Object.values(MAPS)) {
  const artInteracts = map.objects.flatMap((o) => {
    if (o.idx === undefined || !['frame', 'billboard', 'pedestal'].includes(o.kind)) return []
    const size = OBJ_SIZE[o.kind]
    return Array.from({ length: size.w * size.h }, (_, i) => ({
      x: o.x + i % size.w,
      y: o.y + Math.floor(i / size.w),
      run: () => inspectArt(o, map.id === 'gallery'),
    }))
  })
  if (artInteracts.length) map.interacts = [...(map.interacts ?? []), ...artInteracts]
}

export function rivalTrainer(round: 1 | 2): TrainerDef {
  const starter = S.starter ?? STARTERS[0]
  const counter = rivalStarter(starter)
  const party: [number, number][] =
    round === 1
      ? [[counter, 4]]
      : [
          [3888, 11],
          [1450, 12],
          [counter, 14],
        ]
  return {
    name: 'JEET',
    title: 'RIVAL',
    portrait: CAST.rival,
    party,
    sight: 3,
    intro:
      round === 1
        ? ['No take-backs on starters!']
        : ['{P}! Took you long enough. I\u2019m going to beat the RUG LORD first\u2026', '\u2026right after I beat *you*!'],
    lose: round === 1 ? 'WHAT?! I picked the counter-type! This is rigged!' : 'Tch. Fine. Go on, then. Don\u2019t get rugged.',
    after: ['Whatever. I\u2019m still early.'],
    prize: round === 1 ? 100 : 700,
  }
}

/** The rival always grabs the starter that beats yours. */
export function rivalStarter(mine: number) {
  const order = { 16: 13, 9: 16, 13: 54, 54: 9 } as Record<number, number>
  return order[mine] ?? STARTERS[1]
}

async function gym() {
  const o = { speaker: 'MAXI', portrait: CAST.maxi }
  // Old badge holders already cleared this chapter; never re-lock their progression.
  if (!S.flags.cabald_city && !S.flags.badge_mm && !S.flags.rug) {
    await say('Beat *ADMIN ESCROW* outside first. Then we can have a fair gym battle.', o)
    return
  }
  if (S.flags.badge_mm) {
    await say(S.flags.rug ? 'Four chains, open markets. Now that’s a healthy spread.' : 'Your badge opens the east gate. Give the RUG LORD my regards.', o)
    return
  }
  await talk(
    [
      'I’m *MAXI*, Market Maker. Welcome to *THE EXCHANGE*.',
      'Robinhood Chain traders never clock out. I keep asking who covers lunch.',
      'Battles, at least, have a closing bell. Ready?',
    ],
    o,
  )
  closeText()
  const res = await trainerBattle(
    {
      name: 'MAXI',
      title: 'GYM LEADER',
      portrait: CAST.maxi,
      party: [
        [2081, 10],
        [2004, 11],
        [3434, 13],
      ],
      sight: 0,
      intro: [],
      lose: 'The market has spoken. You\u2019ve earned this.',
      after: [],
      prize: 1200,
      bg: 'exchange',
      music: 'trainer',
    },
    'maxi',
  )
  if (res !== 'win') return
  flag('badge_mm')
  refreshNpcs()
  await say(`${S.name} received the *MARKET MAKER BADGE*!`, { auto: 200 })
  await audio.jingle('badge')
  await talk(
    [
      'The east gate to *Rug Pull Canyon* is open. Take these for the climb.',
    ],
    o,
  )
  addItem('ledger', 3)
  await say(`${S.name} got 3 *Ledger Pros*!`)
  save()
}

/** Final boss aftermath → Hall of Fame. */
export async function finale() {
  const rug = npc('rug')
  await emote(rug, 'dots', 900)
  await say('The *RUG LORD* flees. His cape catches in the door. A brief, undignified tug-of-war.')
  closeText()
  audio.sfx('faint')
  await flash(3, 110)
  flag('rug')
  refreshNpcs()
  await emote(player, 'alert', 600)
  await talk([
    'The private drain reverses. Stolen liquidity rushes home!',
    'Back at the terminal, four signals turn green.',
    'The Exchange restores its reserves. The Cabald billboards become evidence.',
    'For once, their slogan is almost true.',
  ])
  closeText()
  await audio.jingle('badge')
  await hallOfFame()
}

/** Item pickup text. */
export function itemLine(item: ItemId, n: number) {
  return `${S.name} found ${n > 1 ? `${n} ` : ''}*${ITEMS[item].name}${n > 1 && item !== 'hopium' && item !== 'max_hopium' ? 's' : ''}*!`
}

export { remyName }
