// @ts-nocheck
import React, { useState } from 'react';
import { useReadContract } from 'wagmi'
import { NFTAbi } from './Abis.ts'
import addresses from './addresses.ts'

export const AccountDetails: React.FC = ({ account, disconnect }) => {
  // get account NFT balance
  const nftBalance = useReadContract({
    abi: NFTAbi,
    address: addresses.NFT,
    functionName: 'balanceOf',
    args: [account.address],
  })
  console.log(nftBalance.data)
  return (
    <fieldset>
      <legend>Account Details</legend>
      <div className="account-details">
        <p>Address: {account.address}</p>
        <p>Balance: {nftBalance.data?.toString() ?? 0}</p>
        <button type="button" onClick={() => disconnect()}>
          Disconnect
        </button>
      </div>
    </fieldset>
  )
}
