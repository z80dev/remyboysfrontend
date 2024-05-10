// @ts-nocheck
import { useAccount, useConnect, useDisconnect } from 'wagmi'
import { useSwitchChain, useChainId, useWriteContract } from 'wagmi'
import { useReadContract } from 'wagmi'
import { whitelists } from './whitelists.ts'
import PikaGif from './PikaGif.tsx'
import React, { useState } from 'react';
import Draggable from 'react-draggable';
import addresses from './addresses.ts'
import { formatEther } from 'viem'
import MintFieldset from './components/MintFieldset.tsx'
import { NFTAbi, VendorAbi } from './Abis.ts'
import { TabGroup, Tab } from './Tabs.tsx'
import { useSignMessage } from 'wagmi';
import { SolanaAddressVerification } from './SolanaAddressVerification.tsx'
import { AccountDetails } from './AccountDetails.tsx'
import { RemyMemeMaker } from './RemyMemeMaker.tsx'
import { AppWindowWithTitleBar } from './Window.tsx'


function SwitchChainButton({ chains, switchChain }) {
  return (
    <div className="switch-chain">
      {chains.filter((chain) => chain.id === 8453).map((chain) => (
        <button key={chain.id} onClick={() => switchChain({ chainId: chain.id })}>
          Switch to {chain.name}
        </button>
      ))}
    </div>
  )
}

function ConnectButtons({ connectors, connect, error }) {
  return (
    <div className="connect-buttons">
      <fieldset>
        <legend>Connect Wallet</legend>
        <div id="connect-prompt">Select wallet to connect</div>
        <div id="connect-subprompt">If on mobile, choose WalletConnect</div>
        {connectors.map((connector) => (
          <button
            key={connector.uid}
            onClick={() => connect({ connector })}
            type="button"
          >
            {connector.name}
          </button>
        ))}
      </fieldset>
    </div>
  )
}

function FooterLinks() {
  return (
    <div className="footer-links">
      <a className="socialLink" href="https://x.com/basedremyboys">Twitter</a>|
      <a className="socialLink" href="https://discord.gg/remyboys">Discord</a>|
      <a className="socialLink" href="https://opensea.io/collection/remy-boys">OpenSea</a>|
      <a className="socialLink" href="https://magiceden.io/collections/base/0x3e9e529e32ad2821bdbfda348c2f9da94b43976c">MagicEden</a>|
      <a className="socialLink" href="https://t.me/+0he27MlVgxU2OTQx">Telegram</a>
    </div>)
}

function AccountManager({ account }) {
  const { chains, switchChain } = useSwitchChain()
}

function App() {
  const { chains, switchChain } = useSwitchChain()
  const account = useAccount()
  const chainId = useChainId()
  const { connectors, connect, status, error } = useConnect()
  const { disconnect } = useDisconnect()

  return (
    <div className="app">
      <AppWindowWithTitleBar status={status} error={error}>
        <PikaGif />
        {account.status === 'connected' && (
          <div className="connected-content">
            <AccountDetails account={account} disconnect={disconnect} />
            {chainId !== 8453 && (
              <SwitchChainButton chains={chains} switchChain={switchChain} />
            )}
          </div>
        )}
        {account.status === 'disconnected' && (
          <ConnectButtons connectors={connectors} connect={connect} error={error} />
        )}
        <TabGroup>
          <Tab label="Mint">
            <MintFieldset account={account} />
          </Tab>
          <Tab label="Remy Meme Maker">
            <RemyMemeMaker />
          </Tab>
          <Tab label="Solana Verification" disabled={true}>
            <SolanaAddressVerification />
          </Tab>
        </TabGroup>
        <FooterLinks />
      </AppWindowWithTitleBar>
    </div>
  )
}

export default App
