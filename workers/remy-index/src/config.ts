/** Base mainnet addresses and facts (see the Remy admin spec). Addresses are lowercase throughout the indexer. */

import type { Endpoint } from './rpc'

/** Alchemy server key only (Worker secret `ALCHEMY_API_KEY`); public RPCs rate-limit and cap log ranges. */
export const alchemyRpcs = (key: string): { base: Endpoint[]; mainnet: Endpoint[] } => ({
  base: [{ url: `https://base-mainnet.g.alchemy.com/v2/${key}`, maxBatch: 50 }],
  mainnet: [{ url: `https://eth-mainnet.g.alchemy.com/v2/${key}`, maxBatch: 50 }],
})
export const BLOCKSCOUT = 'https://base.blockscout.com'
export const USER_AGENT = 'remy-index/1 (+https://basedremyboys.club)'

export const A = {
  remyBoys: '0x3e9e529e32ad2821bdbfda348c2f9da94b43976c',
  legacyVault: '0x2eb990a5f9adea7bcaf09fde6261469ad906635c',
  rbREMY: '0x765d0443ed57eb0c89953c3ebf54885189a4aef2',
  rbREMYLS: '0x9c6661c87a10e712b0a817184230fca4258ccc15',
  wREMY: '0xed56735245fb156d94e254a061d9e65fd4a5230b',
  recoveryVault: '0x858e3a590fbb08fd92f6b0645e75b086dff5a3ad',
  REMY: '0x9b5e3492bad9b020a81b3a928e789b60e7240da0',
  migratorRouter: '0x0a3decd55e9dbd9a5a0ed57c9415f837544790a1',
  oldRouter: '0x690e8487b015229c133f4ae6e776b6115473dd6f',
  fREMY: '0x66e66f9772c9ea0b38b7cd52820af42ccbb31721',
  nftVault: '0xd91368768ea898c9bc09d85b13c0924b59405d1c',
  converter: '0x12d22fb38a4d5b7dd7b3b951f5342e943744e9fb',
  router: '0x957ca7472ced1c1b3608152f83e0e69f975a37a9',
  positionManager: '0x7c5f5a4bbd8fd63184577525326123b519429bdc',
  stateView: '0xa3c0c9b65bad0b08107aa264b0f3db444b867a71',
  poolManager: '0x498581ff718922c3f8e6a244956af099b2652b2b',
  reclaim: '0x4bfa9df6f8ceef97c9808c44a1c2b4be2d4525ab',
  /** Wave-2 RemyReclaim (CREATE2, address fixed before deploy; reads zero until it is live). */
  reclaim2: '0xacdf2c2bccda8e13c1ec979e32ad2628f4eb4de6',
  attacker: '0x28bc445b674940c53c227b45d4405c34e60027ad',
  exploit: '0xc7b9b6f2f2b41f91dc409dc429efb2013774f676',
  /** Wave-2 thief (2026-09-28/29); every theft was a contract creation, the NFTs landed on this EOA. */
  attacker2: '0x81691b7e2936413078c2b16a320412a6014b5053',
  multicall3: '0xca11bde05977b3631167028862be2a173976ca11',
  // ENS UniversalResolver (mainnet) and Basenames reverse records (Base).
  ensUniversalResolver: '0xeeeeeeee14d718c2b47d9923deab1335e144eeee',
  baseL2ReverseRegistrar: '0x0000000000d8e504002cc26e3ec46d81971c1664',
  basenamesL2Resolver: '0xc6d566a56a1aff6508b41f6c90ff131615583bcd',
} as const

/** Block the new system (fREMY, NFTVault, pool) was deployed at; log scans start here. */
export const START_BLOCK = 51884322
export const POOL_ID = '0x4df9239dd817e5a8559489e0756a064de5548a15ebeb348a451a78744ae1fcd6'

export const LABELS: Record<string, string> = {
  '0xe23fa24551d36cffd2859a50e5110befa411e7c6': 'Remy owner',
  '0x07a145dbbc7e425d0f1b3b9982f955e97abad7a2': 'z80.eth',
  '0x70f4b83795af9236da8211cda3b031e503c00970': 'Legacy admin',
  '0x97a90100d77d05e309cdeb7e2aaf91f0ef8ca5ac': 'Deployer',
  '0x9a1d00bed7cd04bcda516d721a596eb22aac6834': 'Payment Processor v2',
  '0x0000000000000068f116a894984e2db1123eb395': 'Seaport 1.6',
  '0x1e0049783f008a0085193e00003d00cd54003c71': 'OpenSea conduit',
  [A.remyBoys]: 'Remy Boys (NFT)',
  [A.legacyVault]: 'Legacy vault (rbREMY)',
  [A.rbREMY]: 'rbREMY token',
  [A.rbREMYLS]: 'rbREMYLS vault',
  [A.wREMY]: 'wREMY',
  [A.recoveryVault]: 'Recovery vault (REMY)',
  [A.REMY]: 'REMY token',
  [A.migratorRouter]: 'MigratorRouter',
  [A.oldRouter]: 'Old router',
  [A.fREMY]: 'fREMY',
  [A.nftVault]: 'NFTVault',
  [A.converter]: 'Legacy converter',
  [A.router]: 'Remy router',
  [A.positionManager]: 'Uniswap v4 PositionManager',
  [A.stateView]: 'Uniswap v4 StateView',
  [A.poolManager]: 'Uniswap v4 PoolManager',
  [A.reclaim]: 'RemyReclaim (wave 1)',
  [A.reclaim2]: 'RemyReclaim (wave 2)',
  [A.attacker]: 'Attacker',
  [A.exploit]: 'Attacker exploit contract',
  [A.attacker2]: 'Attacker (wave 2)',
}

/** Protocol contracts left out of the whale ranking (their holdings are other people's Remys). */
export const WHALE_EXCLUDED = new Set<string>([
  A.legacyVault,
  A.rbREMY,
  A.rbREMYLS,
  A.wREMY,
  A.recoveryVault,
  A.REMY,
  A.migratorRouter,
  A.oldRouter,
  A.fREMY,
  A.nftVault,
  A.converter,
  A.router,
  A.positionManager,
  A.poolManager,
])

export type TokenKey = 'rbREMYLS' | 'rbREMY' | 'wREMY' | 'REMY' | 'fREMY'
export type LegacyKey = Exclude<TokenKey, 'fREMY'>

export const TOKENS: Record<TokenKey, { address: string; symbol: string }> = {
  rbREMYLS: { address: A.rbREMYLS, symbol: 'rbREMYLS' },
  rbREMY: { address: A.rbREMY, symbol: 'rbREMY' },
  wREMY: { address: A.wREMY, symbol: 'wREMY' },
  REMY: { address: A.REMY, symbol: 'REMY' },
  fREMY: { address: A.fREMY, symbol: 'fREMY' },
}
export const TOKEN_KEYS = Object.keys(TOKENS) as TokenKey[]
export const LEGACY_KEYS: LegacyKey[] = ['rbREMYLS', 'rbREMY', 'wREMY', 'REMY']

/** Contracts holding Remys that users can no longer use directly, and the token that claims them. */
export const STUCK: { key: string; name: string; address: string; claim?: LegacyKey }[] = [
  { key: 'legacyVault', name: 'Legacy vault (rbREMY)', address: A.legacyVault, claim: 'rbREMY' },
  { key: 'wREMY', name: 'wREMY', address: A.wREMY, claim: 'wREMY' },
  { key: 'recoveryVault', name: 'Recovery vault (REMY)', address: A.recoveryVault, claim: 'REMY' },
  { key: 'migratorRouter', name: 'MigratorRouter', address: A.migratorRouter },
  { key: 'oldRouter', name: 'Old router', address: A.oldRouter },
]

export const SEL = {
  ownerOf: '0x6352211e',
  balanceOf: '0x70a08231',
  totalSupply: '0x18160ddd',
  convertToAssets: '0x07a2d13a',
  locks: '0x5de9a137',
  TIME_LOCK: '0xe0a09c68',
  inventoryCount: '0x5b98c83d',
  reserve: '0xcd3293de',
  getSlot0: '0xc815641c',
  getPoolAndPositionInfo: '0x7ba03aad',
  getPositionLiquidity: '0x1efeed33',
  claimed: '0xc884ef83',
  isMinter: '0x92c94f65',
  getCurrentBlockTimestamp: '0x0f28c97d',
  nameForAddr: '0x4ec3bd23',
  addr: '0x3b3b57de',
  reverse: '0x5d78a217',
} as const

export const TOPIC = {
  transfer: '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef',
  modifyLiquidity: '0xf208f4912782fd25c7f114ca3723a2d5dd6f3bcc3ac8db5af63baa85f711d5ec',
} as const
