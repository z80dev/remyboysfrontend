// @ts-nocheck
import { useSimulateContract, useReadContract, useWriteContract } from 'wagmi'
import { QuoterV2ABI, NFTAbi, VaultABI, RemyRouterABI, ERC20Abi, RemySwapRouterAbi, ERC4626ABI } from './Abis'
import contractAddresses from './contractAddresses.json'
import { useCallback } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import ERC4626 from './contractAbis/ERC4626.json'
import RemyRouterAbi2 from './contractAbis/RemyRouter.json'
import NonFungiblePositionManagerAbi from './contractAbis/NonfungiblePositionManager.json'

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
        }, {
            onSuccess: () => console.log('success'),
            onError: (error) => console.log(error)
        });
    }, [writeContract, tokenAddress]);

    return approveRouterForToken;
}

export const useApproveRemyswapRouterForToken = (tokenAddress, amount) => {
    const { writeContract } = useWriteContract();

    const approveRouterForToken = useCallback(() => {
        return writeContract({
            abi: ERC20Abi,
            address: tokenAddress,
            functionName: 'approve',
            args: [contractAddresses['remyswap_router'], amount],
        }, {
            onSuccess: () => console.log('success'),
            onError: (error) => console.log(error)
        });
    }, [writeContract, tokenAddress]);

    return approveRouterForToken;
}

export const useApproveRouterForStakingToken = (amount) => {
    return useApproveRouterForToken(contractAddresses['erc4626'], '0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff');
}

export const useRouterStakingTokenAllowance = (owner) => {
    return useReadContract({
        abi: ERC20Abi,
        address: contractAddresses['erc4626'] as `0x${string}`,
        functionName: 'allowance',
        args: [owner, contractAddresses['remy_router']],
    });
}

export const useRemyswapRouterStakingTokenAllowance = (owner) => {
    return useReadContract({
        abi: ERC20Abi,
        address: contractAddresses['dn404_token'] as `0x${string}`,
        functionName: 'allowance',
        args: [owner, contractAddresses['remyswap_router']],
    });
}

export const useApproveRemyswapRouterForStakingToken = () => {
    return useApproveRemyswapRouterForToken(contractAddresses['dn404_token'], '0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff');
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

export const useSwapTokenForETH = (tokenIn, tokenOut, amountIn, recipient, additionalArgs) => {
    const { writeContract } = useWriteContract();

    //args = [tokenIn, tokenOut, 3000, recipient, amountIn, 0, 0]
    const args = {
        tokenIn,
        tokenOut,
        fee: 3000,
        recipient,
        amountIn,
        amountOutMinimum: 0,
        sqrtPriceLimitX96: 0
    }

    const swapTokenForETH = useCallback(() => {
        return writeContract({
            abi: RemySwapRouterAbi,
            address: contractAddresses['remyswap_router'] as `0x${string}`,
            functionName: 'exactInputSingle',
            args: [args]
        }, additionalArgs);
    }, [tokenIn, tokenOut, amountIn, recipient, additionalArgs, writeContract]);

    return swapTokenForETH;
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

export const useWithdrawTokensFromERC4626 = (tokens: bigint, owner) => {
    const { writeContract } = useWriteContract();

    const withdrawTokens = useCallback(() => {
        return writeContract({
            abi: ERC4626ABI,
            address: contractAddresses['erc4626'] as `0x${string}`,
            functionName: 'withdraw',
            args: [tokens, owner, owner],
        });
    }, [tokens, writeContract]);

    return withdrawTokens;
}

export const useRedeemSharesFromERC4626 = (shares: bigint, owner) => {
    const { writeContract } = useWriteContract();

    const redeemShares = useCallback(() => {
        return writeContract({
            abi: ERC4626ABI,
            address: contractAddresses['erc4626'] as `0x${string}`,
            functionName: 'redeem',
            args: [shares, owner, owner],
        });
    }, [shares, writeContract]);

    return redeemShares;
}

export const useConvertNftCountToShares = (nftCount) => {
    const tokenAmount = BigInt(nftCount) * BigInt(1000) * BigInt(10) ** BigInt(18);
    return useConvertTokenAmountToShares(tokenAmount);
}

export const useRouterIsNFTApprovedForAll = (owner) => {
    return useReadContract({
        abi: NFTAbi,
        address: contractAddresses['nft'] as `0x${string}`,
        functionName: 'isApprovedForAll',
        args: [owner, contractAddresses['remy_router']],
    });
}

export const useApproveNFTForRouter = () => {
    const { writeContract } = useWriteContract();

    const approveNFTForRouter = useCallback(() => {
        return writeContract({
            abi: NFTAbi,
            address: contractAddresses['nft'] as `0x${string}`,
            functionName: 'setApprovalForAll',
            args: [contractAddresses['remy_router'], true],
        });
    }, [writeContract]);

    return approveNFTForRouter;
}

export const useTokenName = (tokenAddress) => {
    return useReadContract({
        abi: ERC20Abi,
        address: tokenAddress,
        functionName: 'name',
        args: [],
    });
}

export const useTokenSymbol = (tokenAddress) => {
    return useReadContract({
        abi: ERC20Abi,
        address: tokenAddress,
        functionName: 'symbol',
        args: [],
    });
}

export const useAddNFTLiquidity = (account, nftAmount) => {
    const { writeContract } = useWriteContract();

    let mintParams = {
        'token0': '0x4200000000000000000000000000000000000006',
        'token1': '0x765D0443eD57eB0C89953c3EBF54885189A4aEF2',
        'fee': 3000,
        'tickLower': 69060,
        'tickUpper': 120720,
        'amount0Desired': nftAmount,
        'amount1Desired': 0,
        'amount0Min': 0,
        'amount1Min': 0,
        'recipient': account,
        'deadline': 1157920892373160791312963991283129391283912335n
    }

    const mintParamsArray = Object.values(mintParams)

    const addNFTLiquidity = useCallback(() => {
        return writeContract({
            abi: NonFungiblePositionManagerAbi['abi'],
            address: contractAddresses['nonfungible_position_manager'] as `0x${string}`,
            functionName: 'mint',
            args: [mintParamsArray],
        }, {
            onSuccess: () => console.log('success'),
            onError: (error) => console.log(error)
        });

    }, [nftAmount, writeContract]);

    return addNFTLiquidity;
}

export const useTokenBalance = (tokenAddress, account) => {
    return useReadContract({
        abi: ERC20Abi,
        address: tokenAddress,
        functionName: 'balanceOf',
        args: [account],
    });
}

export const useApproveNonFungiblePositionManager = () => {
    const { writeContract } = useWriteContract();

    const approveNonFungiblePositionManager = useCallback(() => {
        return writeContract({
            abi: ERC20Abi,
            address: contractAddresses['token'] as `0x${string}`,
            functionName: 'approve',
            args: [contractAddresses['nonfungible_position_manager'], '0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff'],
        });
    }, [writeContract]);

    return approveNonFungiblePositionManager;
}

export const useMintREMYBatch = (nftsIn, account) => {
    const { writeContract } = useWriteContract();


    let mintRemy = useCallback(() => {
        return writeContract({
            abi: VaultABI,
            address: contractAddresses['vault'] as `0x${string}`,
            functionName: 'mint_batch',
            args: [nftsIn, account],
        }, {
        onSuccess: () => console.log('success'),
        onError: (error) => console.log(error)
    });
    }, [nftsIn, account, writeContract]);

    return mintRemy;
}

export const useApproveVaultForAllNFTs = () => {
    const { writeContract } = useWriteContract();

    const approveVaultForAllNFTs = useCallback(() => {
        return writeContract({
            abi: NFTAbi,
            address: contractAddresses['nft'] as `0x${string}`,
            functionName: 'setApprovalForAll',
            args: [contractAddresses['vault'] as `0x${string}`, true],
        });
    }, [writeContract]);

    return approveVaultForAllNFTs;
}
