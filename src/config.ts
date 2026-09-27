import { type Address, getAddress, isAddress } from 'viem'

const env = import.meta.env

function optionalAddress(value: string | undefined): Address | undefined {
  return value && isAddress(value) ? getAddress(value) : undefined
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
  reclaim: getAddress('0x4bfa9df6F8CEeF97c9808C44a1c2b4BE2d4525aB'),
  paymentProcessor: getAddress('0x9A1D00bEd7CD04BCDA516d721A596eb22Aac6834'),
  openseaConduit: getAddress('0x1E0049783F008A0085193E00003D00cd54003c71'),
  seaport16: getAddress('0x0000000000000068F116a894984e2DB1123eB395'),
  legacyVault: getAddress('0x2eB990A5f9aDeA7BCaF09fde6261469aD906635C'),
  rbRemy: getAddress('0x765D0443eD57eB0C89953c3EBF54885189A4aEF2'),
  rbRemyLS: getAddress('0x9C6661C87A10e712B0A817184230FcA4258CCC15'),
  wRemy: getAddress('0xed56735245fb156d94e254A061d9E65fD4a5230B'),
  stateView: getAddress('0xA3c0c9b65baD0b08107Aa264b0f3dB444b867A71'),
  v4Quoter: getAddress('0x0d5e0F971ED27FBfF6c2837bf31316121532048D'),
} as const

/** New contracts; undefined until deployed (windows depending on them render a "coming soon" state). */
export const NEW = {
  fremy: optionalAddress(env.VITE_FREMY),
  vault: optionalAddress(env.VITE_NFT_VAULT),
  converter: optionalAddress(env.VITE_CONVERTER),
  router: optionalAddress(env.VITE_ROUTER),
} as const

export const RECLAIM_BATCH = 50
export const TOTAL_SUPPLY_HINT = 4490

export const LINKS = [
  { label: 'Twitter', href: 'https://x.com/basedremyboys' },
  { label: 'Discord', href: 'https://discord.gg/remyboys' },
  { label: 'OpenSea', href: 'https://opensea.io/collection/remy-boys' },
  { label: 'Magic Eden', href: 'https://magiceden.io/collections/base/0x3e9e529e32ad2821bdbfda348c2f9da94b43976c' },
  { label: 'Telegram', href: 'https://t.me/+0he27MlVgxU2OTQx' },
] as const
