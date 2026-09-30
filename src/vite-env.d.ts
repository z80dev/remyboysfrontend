/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_RPC_URL?: string
  readonly VITE_CHAIN_RPC?: string
  readonly VITE_FREMY?: string
  readonly VITE_NFT_VAULT?: string
  readonly VITE_CONVERTER?: string
  readonly VITE_ROUTER?: string
}

/** Content hash of media/quest (vite.config.ts); versions the Quest art URLs. */
declare const __QUEST_MEDIA__: string
