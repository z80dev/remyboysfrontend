// @ts-nocheck
import React, { useState } from 'react';
import { useReadContract } from 'wagmi'
import { useSwitchChain, useChainId, useWriteContract } from 'wagmi'
import { NFTAbi } from './Abis.ts'
import addresses from './addresses.ts'
import contractAddresses from './contractAddresses.json'

function SwitchChainButton({ chains, switchChain }) {
  return (
    <div className="switch-chain">
      {chains
        .filter((chain) => {return chain.name === "Base"})
        .map((chain) => (
        <button className="switch-chain-button" key={chain.id} onClick={() => switchChain({ chainId: chain.id })}>
          Switch to {chain.name}
        </button>
      ))}
    </div>
  )
}

export const AccountDetails: React.FC = ({ account, disconnect, networkButtons }) => {
  // get account NFT balance
  const nftBalance = useReadContract({
    abi: NFTAbi,
    address: contractAddresses['nft'],
    functionName: 'balanceOf',
    args: [account.address],
  })
  const { chains, switchChain } = useSwitchChain()
  const chainId = useChainId()
  return (
    <div className="account-details">
    <fieldset>
      <legend>Account Details</legend>
      <div className="account-details">
        <p>Address: {account.address}</p>
        <p>Balance: {nftBalance.data?.toString() ?? 0}</p>
          {chainId != 8453 && (<SwitchChainButton chains={chains} switchChain={switchChain} />)}
        <button type="button" onClick={() => disconnect()}>
          Disconnect
        </button>
      </div>
    </fieldset>
    </div>
  )
}
