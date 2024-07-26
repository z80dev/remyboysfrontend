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
import { RemyVault, RemyVaultTrading } from './RemyVault.tsx'
import { FooterLinks } from './FooterLinks.tsx'
import contractAddresses from './contractAddresses.json'
import { ConnectButtons } from './ConnectButtons.tsx'

function RemyVaultWindow({ onClose }) {
  const account = useAccount()
  const { chains, switchChain } = useSwitchChain()
  const chainId = useChainId()
  const { connect, status, error } = useConnect()
  const { disconnect } = useDisconnect()

  return (
    <AppWindowWithTitleBar status={status} error={error} onClose={onClose} title="Remy Vault">
      <RemyVault />
    </AppWindowWithTitleBar>
  )
}

function App() {
  const { chains, switchChain } = useSwitchChain()
  const account = useAccount()
  const chainId = useChainId()
  const { connectors, connect, status, error } = useConnect()
  const { disconnect } = useDisconnect()
  const [showRemyVault, setShowRemyVault] = useState(false)

  const remyVaultLabel = (
    <div className='announcement'>Remy Vault</div>
  )

  return (
    <div className="app">
      {!showRemyVault &&
        (<AppWindowWithTitleBar status={status} error={error}>
        <PikaGif />
        {account.status !== 'disconnected' && (
          <div className="connected-content">
            <AccountDetails account={account} disconnect={disconnect} />
          </div>
        )}
        {account.status === 'disconnected' && (
          <ConnectButtons connectors={connectors} connect={connect} error={error} />
        )}
        <TabGroup>
          <Tab label="Mint">
            <MintFieldset account={account} />
          </Tab>
          <Tab label={remyVaultLabel}>
            <p>Remy Vault lets you buy and sell Remy Boys from a large liquidity pool.</p>
            <button onClick={() => setShowRemyVault(true)}>Open Remy Vault</button>
          </Tab>
          <Tab label="Remy Meme Maker">
            <RemyMemeMaker />
          </Tab>
          <Tab label="Solana Verification" disabled={true}>
            <SolanaAddressVerification />
          </Tab>
        </TabGroup>
        <FooterLinks />
        </AppWindowWithTitleBar>)}
      {showRemyVault && <RemyVaultWindow onClose={() => setShowRemyVault(false)} />}
    </div>
  )
}

export default App
