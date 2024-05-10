// @ts-nocheck
import React, { useState } from 'react';
import { useSignMessage } from 'wagmi';

export const SolanaAddressVerification: React.FC = () => {
  const [solanaAddress, setSolanaAddress] = useState('');
  const [signature, setSignature] = useState('');
  const [isVerified, setIsVerified] = useState(false);

  const { signMessage, isLoading, isError, isSuccess, data } = useSignMessage();

  const handleSuccess = (signature: string) => {
    setSignature(signature);
    setIsVerified(true);
    // send sig to backend here
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log(`Signing message: ${solanaAddress}`);
    signMessage({ message: solanaAddress }, { onSuccess: handleSuccess });
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
      {isError && <p>Error signing the message. Please try again.</p>}
      {isSuccess && (
        <div>
          <p>Solana address verified!</p>
        </div>
      )}
    </div>
  );
};
