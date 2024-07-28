import { http, createConfig } from 'wagmi'
import { base, baseSepolia, localhost } from 'wagmi/chains'
import { coinbaseWallet, injected, walletConnect } from 'wagmi/connectors'

export const config = createConfig({
  chains: [base],
  connectors: [
    injected(),
    coinbaseWallet({ appName: 'Create Wagmi' }),
    walletConnect({ projectId: 'd98b79aeb44471c27770f6ea2657fd17' }),
  ],
  transports: {
    [base.id]: http(),
    [baseSepolia.id]: http(),
    [localhost.id]: http(),
  },
})

declare module 'wagmi' {
  interface Register {
    config: typeof config
  }
}
