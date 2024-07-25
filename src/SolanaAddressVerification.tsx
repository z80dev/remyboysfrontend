// @ts-nocheck
import React, { useState } from 'react';
import { useSignMessage, useReadContract, useWriteContract } from 'wagmi';
//import { useVerifySolanaAddress } from './tradingHooks';
import contractAddresses from './contractAddresses.json';
import { SolanaVerifierAbi } from './Abis';
import { useAccount } from 'wagmi';

export const SolanaAddressVerification: React.FC = () => {
  const [solanaAddress, setSolanaAddress] = useState('');
  const [signature, setSignature] = useState('');
  const [isVerified, setIsVerified] = useState(false);
 // const verifySolanaAddress = useVerifySolanaAddress();
  const account = useAccount();

  const { signMessage, isLoading, isError, isSuccess, data } = useSignMessage();

  const contractVerifiedAddress = useReadContract({
    abi: SolanaVerifierAbi,
    address: contractAddresses['solana_address_verifier'],
    functionName: 'solana_addresses',
    args: [account.address],
  });

  const handleSuccess = (signature: string) => {
    setSignature(signature);
    setIsVerified(true);
    // send sig to backend here
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log(`Signing message: ${solanaAddress}`);
    verifySolanaAddress(solanaAddress);
    // signMessage({ message: solanaAddress }, { onSuccess: handleSuccess });
  };

  return (
    <div>
      <h4>Verify Solana Address</h4>
      <form onSubmit={handleSubmit}>
        <input
          type="text"
          value={solanaAddress}
          onChange={(e) => setSolanaAddress(e.target.value)}
          placeholder="Enter Solana address"
        />
        <button type="submit" disabled={isLoading}>
          {isLoading ? 'Signing...' : 'Sign Message'}
        </button>
      </form>
      { contractVerifiedAddress.isLoading && <p>Loading...</p> }
      { contractVerifiedAddress.data && <p>Verified address: {contractVerifiedAddress.data.toString()}</p> }
      {isError && <p>Error signing the message. Please try again.</p>}
      {isSuccess && (
        <div>
          <p>Solana address verified!</p>
        </div>
      )}
    </div>
  );
};
