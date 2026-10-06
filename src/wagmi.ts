import { http, createConfig } from 'wagmi'
import { base } from 'wagmi/chains'
import { coinbaseWallet, injected, walletConnect } from 'wagmi/connectors'
import { CHAIN_RPC, RPC_URL, WALLETCONNECT_PROJECT_ID } from './config'

export const chain = RPC_URL ? { ...base, rpcUrls: { default: { http: [CHAIN_RPC] } } } : base

export const config = createConfig({
  chains: [chain],
  batch: { multicall: { batchSize: 16_384, wait: 20 } },
  connectors: [
    injected(),
    coinbaseWallet({ appName: 'Remy OS', preference: { options: 'all', telemetry: false } }),
    walletConnect({
      projectId: WALLETCONNECT_PROJECT_ID,
      metadata: {
        name: 'Remy OS',
        description: 'Based Remy Boys',
        url: 'https://basedremyboys.club',
        icons: ['https://basedremyboys.club/media/remy/v1/128/0.webp'],
      },
    }),
  ],
  transports: { [chain.id]: http(RPC_URL, { retryCount: 1, timeout: 15_000 }) },
})

declare module 'wagmi' {
  interface Register {
    config: typeof config
  }
}
