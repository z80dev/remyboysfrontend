// @ts-nocheck
import React, { useState } from 'react';
import { useReadContract } from 'wagmi'
import { useSwitchChain, useChainId, useWriteContract } from 'wagmi'
import { ERC20Abi, NFTAbi } from './Abis.ts'
import addresses from './addresses.ts'
import contractAddresses from './contractAddresses.json'
import { useTokenName } from './tradingHooks.ts';
import DN404Abi from './contractAbis/SimpleDN404.json';

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

  const dn404Balance = useReadContract({
    abi: ERC20Abi,
    address: contractAddresses['dn404_token'],
    functionName: 'balanceOf',
    args: [account.address],
  })
  const mirrorNFTAddress = useReadContract({
    abi: DN404Abi['abi'],
    address: contractAddresses['dn404_token'],
    functionName: 'mirrorERC721',
    args: [],
  })

  const mirrorNFTBalance = useReadContract({
    abi: NFTAbi,
    address: mirrorNFTAddress.data,
    functionName: 'balanceOf',
    args: [account.address],
  })

  const mirrorNFTName = useReadContract({
    abi: NFTAbi,
    address: mirrorNFTAddress.data,
    functionName: 'name',
    args: [],
  })

  const { chains, switchChain } = useSwitchChain()
  const chainId = useChainId()
  const nftCollectionName = useTokenName(contractAddresses['nft']).data ?? 'NFT';
  const dn404Name = useTokenName(contractAddresses['dn404_token']).data ?? 'DN404';
  console.log('mirrorNFTAddress', mirrorNFTAddress.data);
  return (
    <div className="account-details">
    <fieldset>
      <legend>Account Details</legend>
      <div className="account-details">
        <p>Address: {account.address}</p>
        <p>Balance: {nftBalance.data?.toString() ?? 0} {nftCollectionName}</p>
        <p>Balance: {dn404Balance.data?.toString() ?? 0} {dn404Name} Tokens</p>
        <p>Balance: {mirrorNFTBalance.data?.toString() ?? 0} {mirrorNFTName.data ?? 'NFT'} NFTs</p>
          {chainId != 8453 && (<SwitchChainButton chains={chains} switchChain={switchChain} />)}
        <button type="button" onClick={() => disconnect()}>
          Disconnect
        </button>
      </div>
    </fieldset>
    </div>
  )
}
