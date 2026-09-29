/** Liquidity City's optional cross-chain meeting place. All progress uses additive save flags. */
import { civRemy } from './data'
import type { MapDef, NpcDef, TrainerDef } from './maps'
import { S, addItem, save } from './state'
import type { ActorLook, MapObject } from './types'
import { choose, closeText, say, talk } from './ui'

export const BRIDGE_BUILDING: MapObject = { kind: 'terminal', x: 3, y: 16 }
export async function enterBridge() {
  // Defer the world dependency: world -> maps -> bridge otherwise reads this map before initialization.
  const { warpTo } = await import('./world')
  await warpTo('bridge', 10, 15, 'up')
}

const TOUR = ['bridge_base', 'bridge_mainnet', 'bridge_solana', 'bridge_robinhood']
const deskVoice = { speaker: 'BRIDGE GUIDE', get portrait() { return civRemy(2013) } }
const look: ActorLook = { skin: '#e0a878', hair: 'cap', hairColor: '#254975', shirt: '#3979d8', pants: '#252b45' }

/** Also called by the guide, so an interrupted reward scene is safe to resume. */
export async function bridgeTourReward() {
  if (S.flags.frequent_bridger || !TOUR.every((id) => S.flags[`t:${id}`])) return
  S.flags.frequent_bridger = true
  addItem('ledger', 2)
  addItem('max_hopium', 1)
  save()
  await talk([
    'Four stamps! You are a *Frequent Bridger*.',
    'Received 2 *Ledger Pros* and 1 *Max Hopium*!',
    'Different chains. Good neighbors. Safe travels!',
  ], deskVoice)
}

export async function bridgeGuide() {
  if (S.flags.frequent_bridger) {
    await say('Welcome back, *Frequent Bridger*! Your bag has more stamps than socks.', deskVoice)
    return
  }
  if (TOUR.every((id) => S.flags[`t:${id}`])) return bridgeTourReward()
  const stamps = TOUR.filter((id) => S.flags[`t:${id}`]).length
  await say(`*BRIDGE TOUR* — ${stamps}/4 stamps. Meet four chains without leaving Base!`, deskVoice)
  const choice = await choose(['THE TOUR', 'THE GATES', 'BYE'], { cancel: 2 })
  if (choice === 0) {
    S.flags.bridge_tour = true
    save()
    await talk([
      'Battle the four hosts by the gates. Any order. No boarding pass needed.',
      'Base customs, Ethereum mainnet, Solana and Robinhood Chain.',
      'Four wins earn travel supplies. Your stamps stay if you leave.',
    ], deskVoice)
  } else if (choice === 1) {
    await talk([
      'These gates connect our neighbors. Today, their trainers are visiting us.',
      'The tour stays here in the terminal. The exit leads to Liquidity City.',
      'Check the destination. Keep your *Seed Phrase* to yourself.',
    ], deskVoice)
  }
}

function host(id: string, x: number, chain: string, portrait: number, shirt: string, trainer: Omit<TrainerDef, 'sight' | 'prize' | 'portrait'>): NpcDef {
  return {
    id, x, y: 8, dir: 'down', look: { ...look, shirt }, portrait,
    name: chain, trainer: { ...trainer, portrait, sight: 0, prize: 120 },
    onWin: async () => {
      await say(`*${chain}* stamp added to your Bridge Tour!`)
      await bridgeTourReward()
    },
  }
}

export async function seizeBridgeCargo() {
  // The map registry imports this module before the world runtime is initialized.
  const { emote, npc, refreshNpcs, walkPath } = await import('./world')
  const grunt = npc('bridge_cabald')
  await emote(grunt, 'alert', 450)
  await talk([
    S.flags.rug ? '*Rug Tower* was the destination. Nobody told me the boss had fled!' : 'Fine! The cargo was headed for *Rug Tower*.',
    'Our unofficial bridge takes from every chain. Return lane sold separately.',
  ], { speaker: 'CABALD COURIER', portrait: grunt.idx })
  closeText()
  await walkPath(grunt, [18, 15], [12, 15])
  S.flags.bridge_seized = true
  refreshNpcs()
  save()
  await say('Customs seizes the cargo. Four chain labels. One bad forwarding address.')
}

export const BRIDGE_TERMINAL: MapDef = {
  id: 'bridge', name: 'BRIDGE TERMINAL', theme: 'gallery', music: 'city',
  grid: [
    'WWWWWWWWWWWWWWWWWWWWWW',
    'WooooooooooooooooooooW',
    'WooooooooooooooooooooW',
    'WooooooooooooooooooooW',
    'WooooooooooooooooooooW',
    'WooooooooooooooooooooW',
    'WooooooooooooooooooooW',
    'WooooooooooooooooooooW',
    'WooooooooooooooooooooW',
    'WooooooooooooooooooooW',
    'WooooooooorroooooooooW',
    'WooooooooorroooooooooW',
    'WooooooooorroooooooooW',
    'WooooooooorroooooooooW',
    'WooooooooorroooooooooW',
    'WooooooooorroooooooooW',
    'WooooooooorroooooooooW',
    'WWWWWWWWWWrrWWWWWWWWWW',
  ],
  objects: [
    { kind: 'departure_board', x: 7, y: 1 },
    { kind: 'bridge_gate', x: 1, y: 5, chain: 'base' },
    { kind: 'bridge_gate', x: 6, y: 5, chain: 'mainnet' },
    { kind: 'bridge_gate', x: 11, y: 5, chain: 'solana' },
    { kind: 'bridge_gate', x: 16, y: 5, chain: 'robinhood' },
    { kind: 'bench', x: 3, y: 10 },
    { kind: 'bench', x: 16, y: 10 },
    { kind: 'bag_scanner', x: 2, y: 12 },
    { kind: 'bag_scanner', x: 17, y: 12 },
    { kind: 'flowerpot', x: 7, y: 14 },
    { kind: 'flowerpot', x: 14, y: 14 },
    { kind: 'sign', x: 8, y: 13 },
    { kind: 'sconce', x: 2, y: 0 },
    { kind: 'sconce', x: 5, y: 0 },
    { kind: 'sconce', x: 16, y: 0 },
    { kind: 'sconce', x: 19, y: 0 },
    { kind: 'palm', x: 1, y: 1 },
    { kind: 'palm', x: 20, y: 1 },
    { kind: 'palm', x: 1, y: 15 },
    { kind: 'palm', x: 20, y: 15 },
    { kind: 'vending', x: 20, y: 9 },
    { kind: 'bin', x: 5, y: 10 },
  ],
  npcs: [
    { id: 'bridge_guide', x: 9, y: 13, dir: 'right', look, portrait: 2013, name: 'BRIDGE GUIDE', talk: bridgeGuide },
    host('bridge_base', 3, 'BASE', 6, '#0052ff', {
      name: 'BLUE', title: 'BASE CUSTOMS', party: [[16, 8]],
      intro: ['Welcome home to *Base*. Big builder energy. Small gas bill.', 'Anything to declare? A battle will do.'],
      lose: 'Cleared for good vibes.',
      after: ['Base stamp: cleared! Remys call this place home.', 'Stay based. And keep the aisle clear.'],
    }),
    host('bridge_mainnet', 8, 'MAINNET', 2006, '#a7a3d8', {
      name: 'SER CEDRIC', title: 'MAINNET VISITOR', party: [[13, 9]],
      intro: ['From *Ethereum mainnet*, ser. The old capital.', 'Security. Decentralization. Then tea.'],
      lose: 'A most respectable settlement, ser.',
      after: ['Mainnet stamp: settled, ser.', 'Prof. Gwei moved to Base for cheap gas. Still sends very formal postcards.'],
    }),
    host('bridge_solana', 13, 'SOLANA', 36, '#8d58d8', {
      name: 'ZIP', title: 'SOLANA VISITOR', party: [[54, 9]],
      intro: ['Solana! Fast lanes! Memecoins! I packed three frog shirts!', 'High throughput. Low patience. Your move!'],
      lose: 'Okay. Taking a breath. New experience.',
      after: ['Solana stamp: already done!', 'I like a fast network. My Remy likes a long nap. We compromise badly.'],
    }),
    host('bridge_robinhood', 18, 'ROBINHOOD CHAIN', 2017, '#72c48e', {
      name: 'PENNY', title: 'MARKET VISITOR', party: [[9, 10]],
      intro: ['*Robinhood Chain*. Tokenized stocks. Markets that never sleep.', 'MAXI invited me. My calendar asked for mercy.'],
      lose: 'Closing this position. Opening a snack.',
      after: ['Robinhood Chain stamp: booked.', 'Real-world assets, onchain rails. Even stonks need a good bridge.'],
    }),
    {
      id: 'bridge_cabald', x: 18, y: 13, dir: 'left', look: { ...look, shirt: '#44234f' },
      portrait: 1002, outfit: 'cabald', hideIf: 'bridge_seized', onWin: seizeBridgeCargo,
      trainer: {
        name: 'CARRY-ON', title: 'CABALD COURIER', portrait: 1002, party: [[555, 9]], sight: 0, prize: 160, music: 'cabald',
        intro: ['This suitcase? Just liquids. I mean, *liquidity*.', 'It is a very emotional suitcase.'],
        lose: 'The scanner saw right through my denial.',
        after: ['My luggage has been detained. Emotionally, so have I.', 'At least customs can’t search my hair. Membership perk.'],
      },
    },
    {
      id: 'bridge_inspector', x: 18, y: 13, dir: 'left', look, portrait: 24, name: 'BAG INSPECTOR', showIf: 'bridge_seized',
      talk: async () => void await say(S.flags.rug
        ? 'The seized cargo is going home. Base, mainnet, Solana, Robinhood Chain. Every label matters.'
        : 'Four chain labels. One destination: Rug Tower. That is no ordinary bridge.', { speaker: 'BAG INSPECTOR', portrait: civRemy(24) }),
    },
    {
      id: 'bridge_builder', x: 5, y: 12, dir: 'down', look: { ...look, shirt: '#0052ff' }, portrait: 29, name: 'BASE BUILDER',
      talk: ['Onchain summer became onchain all-year. I forgot to book a holiday.', 'This counts. I am near departures.'],
    },
  ],
  signs: [{ x: 8, y: 13, text: ['*BRIDGE TOUR*', 'Four friendly battles. Four stamps. Speak to the guide beside this sign.'] }],
  interacts: [
    ...Array.from({ length: 8 }, (_, i) => ({ x: 7 + i, y: 3, run: async () => void await talk([
      '*DEPARTURES* — Base / Ethereum mainnet',
      'Solana / Robinhood Chain',
      'Bridge Tour: visiting trainers at all four gates. No travel required.',
    ]) })),
    { x: 2, y: 12, run: async () => void await say('The scanner checks bags, not balances. No *Seed Phrase* required.') },
    { x: 17, y: 12, run: async () => void await say(S.flags.bridge_seized ? 'CONFISCATED: one suitcase of stolen liquidity.' : 'The scanner flashes: SUSPICIOUSLY LIQUID LUGGAGE.') },
  ],
  warps: [
    { x: 10, y: 17, to: 'city', tx: 5, ty: 20, dir: 'down' },
    { x: 11, y: 17, to: 'city', tx: 5, ty: 20, dir: 'down' },
  ],
  items: [], doors: [], triggers: [],
}
