import { useSimulateContract, useReadContract, useWriteContract } from 'wagmi'
import { QuoterV2ABI, NFTAbi, VaultABI, RemyRouterABI, ERC20Abi, ERC4626ABI } from './Abis'
import contractAddresses from './contractAddresses.json'
import { useCallback } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import ERC4626 from './contractAbis/ERC4626.json'
import RemyRouterAbi2 from './contractAbis/RemyRouter.json'

const QUOTER_ADDRESS = contractAddresses['quoter']

// export const useVerifySolanaAddress = () => {
//     const { writeContract } = useWriteContract();

//     const verifySolanaAddress = useCallback((solanaAddress) => {
//         return writeContract({
//             abi: SolanaVerifierAbi,
//             address: contractAddresses['solana_address_verifier'] as `0x${string}`,
//             functionName: 'verify_solana_address',
//             args: [solanaAddress],
//         });
//     }, [writeContract]);

//     return verifySolanaAddress;
// }

export const useApproveRouter = () => {
    const { writeContract } = useWriteContract();

    const nftAddress = contractAddresses['nft'] as `0x${string}`;
    const routerAddress = contractAddresses['remy_router'] as `0x${string}`;

    const approveRouter = useCallback(() => {
        return writeContract({
            abi: NFTAbi,
            address: nftAddress,
            functionName: 'setApprovalForAll',
            args: [routerAddress, true],
        });
    }, [writeContract]);

    return approveRouter;
}

export const useApproveRouterForToken = (tokenAddress, amount) => {
    const { writeContract } = useWriteContract();

    const approveRouterForToken = useCallback(() => {
        return writeContract({
            abi: ERC20Abi,
            address: tokenAddress,
            functionName: 'approve',
            args: [contractAddresses['remy_router'], amount],
        });
    }, [writeContract, tokenAddress]);

    return approveRouterForToken;
}

export const useApproveRouterForStakingToken = (amount) => {
    return useApproveRouterForToken(contractAddresses['erc4626'], amount);
}

export const useRouterStakingTokenAllowance = (owner) => {
    return useReadContract({
        abi: ERC20Abi,
        address: contractAddresses['erc4626'] as `0x${string}`,
        functionName: 'allowance',
        args: [owner, contractAddresses['remy_router']],
    });
}

export function useInvalidateQueries() {
    const queryClient = useQueryClient();

    return () => {
        queryClient.invalidateQueries({ queryKey: ['simulateContract'] });
        queryClient.invalidateQueries({ queryKey: ['readContracts'] });
        queryClient.invalidateQueries({ queryKey: ['readContract'] });
        queryClient.invalidateQueries({ queryKey: ['balance'] });
    }
}



export const useSwapEthForNft = (nftsToBuy, recipient, value, additionalArgs) => {
    const { writeContract } = useWriteContract();

    const swapEthForNft = useCallback(() => {
        return writeContract({
            abi: RemyRouterABI,
            address: contractAddresses['remy_router'] as `0x${string}`,
            functionName: 'swap_eth_for_nft_v3',
            args: [nftsToBuy, recipient],
            value,
        }, additionalArgs);
    }, [nftsToBuy, recipient, additionalArgs, writeContract]);

    return swapEthForNft;
}

export const useSwapNftForEth = (nftsToSell, sellPrice, recipient, additionalArgs) => {
    const { writeContract } = useWriteContract();

    const swapNftForEth = useCallback(() => {
        return writeContract({
            abi: RemyRouterABI,
            address: contractAddresses['remy_router'] as `0x${string}`,
            functionName: 'swap_nft_for_eth_v3',
            args: [nftsToSell, sellPrice, recipient],
        }, additionalArgs);
    }, [nftsToSell, sellPrice, recipient, additionalArgs, writeContract]);

    return swapNftForEth;
}

export const useSwapNftForNft = (nftsToSell, nftsToBuy, recipient, value, additionalArgs) => {
    const { writeContract } = useWriteContract();

    const swapNftForNft = useCallback(() => {
        console.log('swapNftForNft', nftsToSell, nftsToBuy, recipient, value, additionalArgs);
        return writeContract({
            abi: RemyRouterABI,
            address: contractAddresses['remy_router'] as `0x${string}`,
            functionName: 'swap',
            args: [nftsToSell, nftsToBuy, recipient],
            value,
        }, additionalArgs);
    }, [nftsToSell, nftsToBuy, recipient, additionalArgs, writeContract]);

    return swapNftForNft;
}


export const useBuyPrice = (tokenIn, tokenOut, amountOut) => {
    const argsAsStruct = [
        tokenIn,
        tokenOut,
        amountOut,
        3000,
        0
    ]
    const result = useSimulateContract({
        abi: QuoterV2ABI,
        address: QUOTER_ADDRESS,
        functionName: 'quoteExactOutputSingle',
        args: [argsAsStruct],
    });

    return result;
}

export const useSellPrice = (tokenIn, tokenOut, amountIn) => {
    const argsAsStruct = [
        tokenIn,
        tokenOut,
        amountIn,
        3000,
        0
    ]
    const result = useSimulateContract({
        abi: QuoterV2ABI,
        address: QUOTER_ADDRESS,
        functionName: 'quoteExactInputSingle',
        args: [argsAsStruct],
    });

    return result;
}

export const useQuoteRedeem = (nftQuantity) => {
    const result = useReadContract({
        abi: VaultABI,
        address: contractAddresses['vault'],
        functionName: 'quote_redeem',
        args: [nftQuantity, true],
    });
    return result;
}

export const useQuoteSwapTokensRequired = (nftsIn, nftsOut) => {
    const result = useReadContract({
        abi: VaultABI,
        address: contractAddresses['vault'] as `0x${string}`,
        functionName: 'quote_swap_in_tokens',
        args: [nftsIn, nftsOut],
    });
    return result;
}

export const useQuoteMint = (nftQuantity) => {
    const result = useReadContract({
        abi: VaultABI,
        address: contractAddresses['vault'],
        functionName: 'quote_mint',
        args: [nftQuantity, true],
    });
    return result;
}

export const routerIsApproved = (account) => {
    return useReadContract({
        abi: NFTAbi,
        address: contractAddresses['nft'],
        functionName: 'isApprovedForAll',
        args: [account.address, contractAddresses['remy_router']],
    });
}

export const useERC20Balance = (tokenAddress, account) => {
    return useReadContract({
        abi: ERC20Abi,
        address: tokenAddress,
        functionName: 'balanceOf',
        args: [account.address],
    });
}

export const usePreviewRedeem = (tokenQuantity) => {
    return useReadContract({
        abi: ERC4626ABI,
        address: contractAddresses['erc4626'] as `0x${string}`,
        functionName: 'previewRedeem',
        args: [tokenQuantity],
    });
}

export const useUnlockedStake = (address) => {
    return useReadContract({
        abi: ERC4626['abi'],
        address: contractAddresses['erc4626'] as `0x${string}`,
        functionName: 'unlocked_shares',
        args: [address],
    });
}

export const useStakeLock = (address) => {
    return useReadContract({
        abi: ERC4626['abi'],
        address: contractAddresses['erc4626'] as `0x${string}`,
        functionName: 'locks',
        args: [address],
    });
}

export const useStakeInventory = (address, nfts, additionalArgs) => {
    const { writeContract } = useWriteContract();

    const stakeInventory = useCallback(() => {
        return writeContract({
            abi: RemyRouterABI,
            address: contractAddresses['remy_router'] as `0x${string}`,
            functionName: 'stake_inventory',
            args: [address, nfts],
        }, additionalArgs);
    }, [address, nfts, additionalArgs, writeContract]);

    return stakeInventory;
}

export const useUnstakeInventory = (address, nfts, additionalArgs) => {
    const { writeContract } = useWriteContract();

    const unstakeInventory = useCallback(() => {
        return writeContract({
            abi: RemyRouterAbi2['abi'],
            address: contractAddresses['remy_router'] as `0x${string}`,
            functionName: 'unstake_inventory',
            args: [address, nfts],
        }, additionalArgs);
    }, [address, nfts, additionalArgs, writeContract]);

    return unstakeInventory;
}

export const useConvertTokenAmountToShares = (tokenAmount) => {
    return useReadContract({
        abi: ERC4626ABI,
        address: contractAddresses['erc4626'] as `0x${string}`,
        functionName: 'convertToShares',
        args: [tokenAmount],
    });
}

export const useConvertNftCountToShares = (nftCount) => {
    const tokenAmount = BigInt(nftCount) * BigInt(1000) * BigInt(10) ** BigInt(18);
    return useConvertTokenAmountToShares(tokenAmount);
}
