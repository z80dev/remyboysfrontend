// @ts-nocheck
// define react hooks for interacting with the RemyRouter contract
import { useWriteContract } from 'wagmi';
import { RemyRouterABI } from './Abis.ts';
import addresses from './addresses.ts';

// our hook will return an object exposing functions for each of the contract's methods
// we'll use these functions to interact with the contract

// RemyRouter constructor args are: vault address, erc4626 address, token address, uni v2 router address

type RemyRouterHookArgs = {
    vault: string,
    erc4626: string,
    token: string,
    uniV2Router: string,
}

export function useRemyRouter(args: RemyRouterHookArgs) {
    const { vault, erc4626, token, uniV2Router } = args;
    const { writeContract } = useWriteContract();

    const addLiquidity = (amountToken: bigint, amountETH: bigint) => {
        return writeContract({
            abi: RemyRouterABI,
            address: addresses.remy_router,
            functionName: 'add_liquidity',
            args: [uniV2Router, token, amountToken.toString()],
            value: amountETH,
        });
    }

    const stakeInventory = (tokenIds: bigint[], recipient: string) => {
        return writeContract({
            abi: RemyRouterABI,
            address: addresses.remy_router,
            functionName: 'stake_inventory',
            args: [vault, erc4626, recipient, tokenIds.map(id => id.toString())],
        });
    }

    const swapEthForNft = (amountETH: bigint, tokenId: bigint, recipient: string) => {
        return writeContract({
            abi: RemyRouterABI,
            address: addresses.remy_router,
            functionName: 'swap_eth_for_nft',
            args: [uniV2Router, token, vault, tokenId.toString(), recipient],
            value: amountETH,
        });
    }

    return {
        addLiquidity,
        stakeInventory,
        swapEthForNft,
    }
}
