import { useReadContract } from 'wagmi'
import { NFTAbi, VendorAbi } from '../Abis.ts'

// NFT address and Vendor addresses are strings passed as props
function MintFieldset({ NFTAddress, VendorAddress }: { NFTAddress: `0x${string}`, VendorAddress: `0x${string}` }) {

    const collectionName = useReadContract({
        abi: NFTAbi,
        address: NFTAddress,
        functionName: 'name',
        args: [],
    })

    const mintOpen = useReadContract({
        abi: VendorAbi,
        address: VendorAddress,
        functionName: 'mint_open',
        args: [],
    })

    return (
        <fieldset>
            <legend>Mint {collectionName.data}</legend>
            <p>Mint is {mintOpen.data ? 'open' : 'closed'}</p>
            <div className="mint-progress">
                <div role="progressbar">
                    <div style={{ width: `100%` }} />
                </div>
            <p>Mint Progress: 4490 / 4444</p>
            </div>
        </fieldset>
    )
}

export default MintFieldset
