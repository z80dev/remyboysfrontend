import { type Address, getAddress, isAddress } from 'viem'

const env = import.meta.env

/** A `VITE_*` override (e.g. a fork deployment) or the Base mainnet default. */
function addressOr(value: string | undefined, fallback: string): Address {
  return getAddress(value && isAddress(value) ? value : fallback)
}

/** RPC used for reads. Point at a local anvil fork with VITE_RPC_URL=http://127.0.0.1:8552. */
export const RPC_URL: string | undefined = env.VITE_RPC_URL || undefined
/** RPC advertised to wallets when adding the chain (defaults to VITE_RPC_URL, then Base's public RPC). */
export const CHAIN_RPC: string = env.VITE_CHAIN_RPC || RPC_URL || 'https://mainnet.base.org'
export const EXPLORER = 'https://basescan.org'
export const WALLETCONNECT_PROJECT_ID = 'd98b79aeb44471c27770f6ea2657fd17'
export const IPFS_GATEWAY = 'https://gateway.pinata.cloud/ipfs/'

export const ADDR = {
  remy: getAddress('0x3e9e529E32aD2821BDBFDA348C2F9dA94b43976c'),
  paymentProcessor: getAddress('0x9A1D00bEd7CD04BCDA516d721A596eb22Aac6834'),
  openseaConduit: getAddress('0x1E0049783F008A0085193E00003D00cd54003c71'),
  seaport16: getAddress('0x0000000000000068F116a894984e2DB1123eB395'),
  legacyVault: getAddress('0x2eB990A5f9aDeA7BCaF09fde6261469aD906635C'),
  /** Owns the legacy vault until the handover; `transfer_vault_ownership` hands it to the converter. */
  migratorRouter: getAddress('0x0A3DeCD55E9dbD9A5a0Ed57c9415F837544790a1'),
  rbRemy: getAddress('0x765D0443eD57eB0C89953c3EBF54885189A4aEF2'),
  rbRemyLS: getAddress('0x9C6661C87A10e712B0A817184230FcA4258CCC15'),
  wRemy: getAddress('0xed56735245fb156d94e254A061d9E65fD4a5230B'),
  stateView: getAddress('0xA3c0c9b65baD0b08107Aa264b0f3dB444b867A71'),
  v4Quoter: getAddress('0x0d5e0F971ED27FBfF6c2837bf31316121532048D'),
  poolManager: getAddress('0x498581fF718922c3f8e6A244956aF099B2652b2b'),
  positionManager: getAddress('0x7C5f5A4bBd8fD63184577525326123B519429bDc'),
  permit2: getAddress('0x000000000022D473030F116dDEE9F6B43aC78BA3'),
} as const

/**
 * RemyReclaim per Payment Processor v2 theft wave; each wallet is owed by exactly one. Wave 2 deploys through the
 * CREATE2 factory (remy-boys-recovery `OWED=data/owed-2.json script/Deploy.s.sol`), so its address is fixed before
 * it is live; the site treats an address without code as not deployed yet.
 */
export const RECLAIMS = [
  { address: getAddress('0x4bfa9df6F8CEeF97c9808C44a1c2b4BE2d4525aB'), label: 'Wave 1, 2026-09-26' },
  { address: getAddress('0xacDF2C2bcCDa8e13C1eC979E32Ad2628F4Eb4DE6'), label: 'Wave 2, 2026-09-28/29' },
] as const

/** Vault stack, live on Base (remy-boys-recovery `deployments/8453.json`). `VITE_*` overrides point at a fork deployment. */
export const NEW = {
  fremy: addressOr(env.VITE_FREMY, '0x66e66f9772c9ea0B38B7Cd52820Af42CCbb31721'),
  vault: addressOr(env.VITE_NFT_VAULT, '0xd91368768eA898c9BC09d85b13C0924B59405D1C'),
  converter: addressOr(env.VITE_CONVERTER, '0x12D22fb38a4D5B7Dd7b3B951f5342e943744E9fB'),
  router: addressOr(env.VITE_ROUTER, '0x957CA7472ced1C1B3608152F83E0E69F975a37a9'),
  /** Vault deployer; seeds the fREMY/ETH pool from the owner's rbREMY. */
  deployer: addressOr(env.VITE_DEPLOYER, '0x97a90100d77D05E309cdeB7e2AaF91F0EF8CA5ac'),
} as const

/** Wallets that see Launch Control, and which launch steps each can sign. */
export const TEAM = {
  /** Remy Boys owner: enables claims, sends rbREMY for pool seeding, owns the converter. */
  owner: getAddress('0xe23FA24551d36CFfd2859a50e5110beFA411E7C6'),
  /** MigratorRouter owner: hands the legacy vault to the converter. */
  migrator: getAddress('0x70f4b83795Af9236dA8211CDa3b031E503C00970'),
} as const

/** Wallets that see Remy Admin (hidden from everyone else, not protected: the data is public chain data). */
export const ADMINS: readonly Address[] = [TEAM.owner, TEAM.migrator, getAddress('0x07a145DbBc7e425d0F1B3B9982F955E97abad7a2')]

/** Remy admin index API (Cloudflare Worker `workers/remy-index`). */
export const ADMIN_API: string = (env.VITE_ADMIN_API || 'https://basedremyboys.club').replace(/\/$/, '')

/** First block worth scanning for fREMY/ETH pool and position logs (vault deploy; the pool opened just after). */
export const POOL_START_BLOCK = 51884322n

export const RECLAIM_BATCH = 50
export const TOTAL_SUPPLY_HINT = 4490

export const LINKS = [
  { label: 'Twitter', href: 'https://x.com/basedremyboys' },
  { label: 'OpenSea', href: 'https://opensea.io/collection/remy-boys' },
  { label: 'Magic Eden', href: 'https://magiceden.io/collections/base/0x3e9e529e32ad2821bdbfda348c2f9da94b43976c' },
  { label: 'Telegram', href: 'https://t.me/+0he27MlVgxU2OTQx' },
] as const

/** Halloween Remys: free mint for Remy holders on JPEG Markets. */
export const HALLOWEEN_MINT = 'https://jpeg.markets/collections/halloween-remys'
