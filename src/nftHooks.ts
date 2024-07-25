import { useReadContract, useReadContracts } from 'wagmi';
import { NFTAbi } from './Abis.ts';
import contractAddresses from './contractAddresses.json';

const MULTICALL_ADDRESS = '0xcA11bde05977b3631167028862bE2a173976CA11'



export function useNFTBalance(address: string) {
    return useReadContract({
        abi: NFTAbi,
        address: contractAddresses['nft'] as `0x${string}`,
        functionName: 'balanceOf',
        args: [address as `0x${string}`],
    });
}

export function useOwnedNFTTokenIDs(address: string, count: number) {
    let contracts = [];
    for (let i = 0; i < count; i++) {
        contracts.push({
            abi: NFTAbi,
            address: contractAddresses['nft'] as `0x${string}`,
            functionName: 'tokenOfOwnerByIndex',
            args: [address, i],
        });
    }
    return useReadContracts({
        contracts,
        multicallAddress: MULTICALL_ADDRESS,
    });
}
