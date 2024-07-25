// @ts-nocheck
import { UseBlockReturnType, useAccount, useBalance, useReadContract, useReadContracts, useWriteContract } from 'wagmi'
import { useEffect, useState } from 'react'
import { NFTAbi } from './Abis.ts'
import addresses from './addresses.ts'
import contractAddresses from './contractAddresses.json'
import { useRemyRouter } from './remyRouter.ts'
import { RemyRouterABI, UniV2RouterABI } from './Abis.ts'
import { parseEther, formatEther } from 'viem'
import { useBuyPrice, useSellPrice, routerIsApproved, useQuoteRedeem, useQuoteMint, useSwapEthForNft, useSwapNftForEth, useSwapNftForNft, useApproveRouter, useInvalidateQueries, useERC20Balance, usePreviewRedeem, useUnlockedStake, useStakeLock, useStakeInventory, useApproveRouterForStakingToken, useRouterStakingTokenAllowance, useConvertNftCountToShares, useUnstakeInventory } from './tradingHooks.ts'
import { TabGroup, Tab } from './Tabs.tsx'
import { useNFTBalance, useOwnedNFTTokenIDs } from './nftHooks.ts'
import { useBlock } from 'wagmi'

const IMG_URL = 'http://localhost:5173/images/'

const MULTICALL_ADDRESS = '0xcA11bde05977b3631167028862bE2a173976CA11'

function TradingFieldSet({ children, routerIsApproved, approveFn }) {
    if (!routerIsApproved) {
        return (
            <fieldset>
                <legend>Approve Remy Router</legend>
                <button onClick={approveFn}>Approve</button>
            </fieldset>
        )
    }
    return (
        <fieldset>
            <legend>Trade NFTs</legend>
            {children}
        </fieldset>
    )
}

function RemyVaultGrid({ ids, selectedList, toggleSelect, borderStyle }) {

    const borderLineStyle = borderStyle ?? '5px solid green';

    return (
        <div className="nftGrid has-scrollbar">
            {ids.map((id) => (
                <div
                    key={id}
                    className="remy-image"
                    onClick={() => toggleSelect(id)}
                >
                    <img
                        src={`${IMG_URL}Character${id}.webp`}
                        alt={` #${id}`}
                        style={{
                            width: '200px', height: '200px',
                            border: selectedList.includes(id) ? borderLineStyle : 'none'
                        }}
                    />
                    <p className="centerText">#{id}</p>
                </div>
            ))}
        </div>
    )
}

export function RemyVaultStaking() {
    const account = useAccount();
    const [stakingMode, setStakingMode] = useState(true);
    const [selectedForStaking, setSelectedForStaking] = useState([]);
    const [selectedForUnstaking, setSelectedForUnstaking] = useState([]);
    const [stakedAmount, setStakedAmount] = useState([]);
    const inventoryStakingAddress = contractAddresses['erc4626'];
    const stakedSharesBalance = useERC20Balance(inventoryStakingAddress, account);
    const unlockedBalance = useUnlockedStake(account.address);

    const routerStakingAllowance = useRouterStakingTokenAllowance(account.address).data ?? 0;

    const userNftBalance = useNFTBalance(account.address);
    const userOwnedTokenIDs = useOwnedNFTTokenIDs(account.address, userNftBalance.data ?? 0);
    const userIds = userOwnedTokenIDs.data?.map((id) => id.result?.toString()) ?? [];

    // vault NFT Inventory
    const vaultNftBalance = useNFTBalance(contractAddresses['vault']);
    const vaultOwnedTokenIDs = useOwnedNFTTokenIDs(contractAddresses['vault'], vaultNftBalance.data ?? 0);
    const vaultIds = vaultOwnedTokenIDs.data?.map((id) => id.result?.toString()) ?? [];

    const toggleSelect = (id) => {
        if (stakingMode) {
            if (selectedForStaking.includes(id)) {
                setSelectedForStaking(selectedForStaking.filter((selected) => selected !== id));
            } else {
                setSelectedForStaking([...selectedForStaking, id]);
            }
        } else {
            if (selectedForUnstaking.includes(id)) {
                setSelectedForUnstaking(selectedForUnstaking.filter((selected) => selected !== id));
            } else {
                setSelectedForUnstaking([...selectedForUnstaking, id]);
            }
        }
    }

    const formattedStakedBalance = formatEther(stakedSharesBalance.data ?? 0);
    const redeemableAmount = usePreviewRedeem(stakedSharesBalance.data ?? 0);
    const unlockedRedeemableAmount = usePreviewRedeem(unlockedBalance.data ?? 0);

    const invalidateQueries = useInvalidateQueries();

    const additionalStakeArgs = {
        onSuccess: () => console.log('success'),
        onSettled: () => {
            setSelectedForStaking([]);
            invalidateQueries();
        },
        onError: (error) => console.log(error)
    }

    const additionalUnstakeArgs = {
        onSuccess: () => console.log('success'),
        onSettled: () => {
            setSelectedForUnstaking([]);
            invalidateQueries();
        },
        onError: (error) => console.log(error)
    }



    const stakeInventory = useStakeInventory(account.address, selectedForStaking, additionalStakeArgs);

    const tokensToNfts = (tokens) => {
        const units = BigInt(tokens) / BigInt(1000000000000000000000);
        return units.toString();
    }

    const requiredSharesForSelectedToUnstake = useConvertNftCountToShares(selectedForUnstaking.length) + BigInt(1);
    console.log('requiredSharesForSelectedToUnstake', requiredSharesForSelectedToUnstake.data);
    console.log('routerStakingAllowance', routerStakingAllowance);

    const approveRouterForStakingToken = useApproveRouterForStakingToken(requiredSharesForSelectedToUnstake.data ?? 0);
    const redeemableAmountInNfts = tokensToNfts(unlockedRedeemableAmount.data ?? 0);

    // current timestamp in seconds
    const currentTimestamp = Math.floor(new Date().getTime() / 1000)
    const block: UseBlockReturnType = useBlock();

    const needsApproval = (selectedForUnstaking.length > 0) && (routerStakingAllowance < requiredSharesForSelectedToUnstake.data ?? 0);
    const hasEnoughShares = (unlockedBalance.data ?? 0) >= (requiredSharesForSelectedToUnstake.data ?? 0);

    const unstakeInventory = useUnstakeInventory(account.address, selectedForUnstaking, additionalUnstakeArgs);

    return (
        <div className="remy-vault">
            <fieldset>
                <legend>Stake NFTs</legend>
                <p><b>Owned Vault Shares</b>: {formattedStakedBalance} Shares ({formatEther(unlockedRedeemableAmount.data ?? 0)} Tokens)</p>
                <p><b>Unlocked Shares Redeemable for</b>: {redeemableAmountInNfts} NFTs</p>
                <div className="tradingGrid">
                    <div className="trade-button">
                        <p>Selected for Staking: {selectedForStaking.length}</p>
                        <button onClick={stakeInventory}>Stake</button>
                    </div>
                    <div className="trade-button">
                        <p>Selected for Unstaking: {selectedForUnstaking.length}</p>
                        <button disabled={!needsApproval} onClick={approveRouterForStakingToken}>Approve</button>
                        <button disabled={!hasEnoughShares} onClick={unstakeInventory}>Unstake</button>
                    </div>
                </div>
            </fieldset>
            <TabGroup onHandleTabClick={(index) => setStakingMode(index === 0)}>
                <Tab label="Wallet Inventory">
                    <RemyVaultGrid ids={userIds} selectedList={selectedForStaking} toggleSelect={toggleSelect} borderStyle="5px solid blue" />
                </Tab>
                <Tab label="Vault Inventory">
                    <RemyVaultGrid ids={vaultIds} selectedList={selectedForUnstaking} toggleSelect={toggleSelect} borderStyle="5px solid green" />
                </Tab>
            </TabGroup>
        </div>
    )
}

export function RemyVaultTrading() {
    const account = useAccount();
    const [buySelected, setBuySelected] = useState([]);
    const [sellSelected, setSellSelected] = useState([]);
    const [isSellMode, setIsSellMode] = useState(false);
    const { writeContract } = useWriteContract();
    const quoteRedeem = useQuoteRedeem(buySelected.length);
    const redeemAmount = quoteRedeem.data ?? parseEther('0');
    const mintAmount = useQuoteMint(sellSelected.length).data ?? parseEther('0');
    const buyPrice = useBuyPrice(contractAddresses['weth'], contractAddresses['token'], redeemAmount);
    const sellPrice = useSellPrice(contractAddresses['token'], contractAddresses['weth'], mintAmount);

    // nftfornft data and swap args
    const numBuys = buySelected.length > sellSelected.length ? buySelected.length - sellSelected.length : 0;
    const numSells = sellSelected.length > buySelected.length ? sellSelected.length - buySelected.length : 0;
    const numSwaps = buySelected.length > sellSelected.length ? sellSelected.length : buySelected.length;
    const swapQuoteRedeem = useQuoteRedeem(numBuys).data ?? parseEther('0');
    const swapQuoteMint = useQuoteMint(numSells).data ?? parseEther('0');
    const swapFeeForExchange = parseEther((numSwaps * 100).toString())
    const swapBuyPrice = useBuyPrice(contractAddresses['weth'], contractAddresses['token'], swapQuoteRedeem + swapFeeForExchange);
    const swapSellPrice = useSellPrice(contractAddresses['token'], contractAddresses['weth'], swapQuoteMint);

    const isApproved = routerIsApproved(account).data ?? false;

    const approveRouter = useApproveRouter();

    const ethBalance = useBalance({
        address: account.address
    })

    const nftBalance = useNFTBalance(contractAddresses['vault']);
    const userBalance = useNFTBalance(account.address);
    const vaultOwnedTokenIDs = useOwnedNFTTokenIDs(contractAddresses['vault'], nftBalance.data ?? 0);
    const userOwnedTokenIDs = useOwnedNFTTokenIDs(account.address, userBalance.data ?? 0);

    const buySwapArgs = [buySelected, account.address];
    const sellSwapArgs = [sellSelected, sellPrice.data?.result[0] ?? 0, account.address];
    const swapArgs = [sellSelected, buySelected, account.address];

    const invalidateQueries = useInvalidateQueries();

    const onSettled = () => {
        setBuySelected([]);
        setSellSelected([]);
        invalidateQueries();
    }

    const additionalWriteArgs = {
        onSuccess: () => console.log('success'),
        onSettled,
        onError: (error) => console.log(error)
    }

    let buyValue = buyPrice.data?.result[0] ?? 0;
    let sellValue = sellPrice.data?.result[0] ?? 0;
    let swapBuyValue = swapBuyPrice.data?.result[0] ?? 0;
    let swapSellValue = swapSellPrice.data?.result[0] ?? 0;

    // if swapSellValue > swapBuyValue, then set swapBuyValue to 0 and swapSellValue to swapSellValue - swapBuyValue
    if (swapSellValue > swapBuyValue) {
        swapBuyValue = 0n;
        swapSellValue = swapSellValue - swapBuyValue;
    }

    const swapEthForNft = useSwapEthForNft(buySelected, account.address, buyValue, additionalWriteArgs);
    const swapNftForEth = useSwapNftForEth(sellSelected, sellPrice.data?.result[0] ?? 0, account.address, additionalWriteArgs);
    const swapNftForNft = useSwapNftForNft(sellSelected, buySelected, account.address, swapBuyValue, additionalWriteArgs);

    const centerText = {
        textAlign: 'center',
    };

    const toggleSelect = (id) => {
        if (isSellMode) {
            if (sellSelected.includes(id)) {
                setSellSelected(sellSelected.filter((selected) => selected !== id));
            } else {
                setSellSelected([...sellSelected, id]);
            }
        } else {
            if (buySelected.includes(id)) {
                setBuySelected(buySelected.filter((selected) => selected !== id));
            } else {
                setBuySelected([...buySelected, id]);
            }
        }
    };

    const idsToDisplay = isSellMode ? userOwnedTokenIDs.data : vaultOwnedTokenIDs.data;
    const ids = idsToDisplay?.map((id) => id.result?.toString()) ?? [];
    const selectedList = isSellMode ? sellSelected : buySelected;

    return (
        <div className="remy-vault">
            <TradingFieldSet
                routerIsApproved={isApproved}
                approveFn={approveRouter}
            >
                <p>ETH Balance: {formatEther(ethBalance.data?.value ?? 0)}</p>
                <div className="tradingGrid">
                    <div className="trade-button">
                        <p>Selected for Buying: {buySelected.length}</p>
                        <p>Price: {formatEther(buyValue)}</p>
                        <button onClick={swapEthForNft}>Buy</button>
                    </div>
                    <div className="trade-button">
                        <p>Selected for Selling: {sellSelected.length}</p>
                        <p>Proceeds: {formatEther(sellValue)}</p>
                        <button onClick={swapNftForEth}>Sell</button>
                    </div>
                    <div className="trade-button">
                        <p>Selected for Buying: {buySelected.length}</p>
                        <p>Selected for Selling: {sellSelected.length}</p>
                        <p>Price: {formatEther(swapBuyValue)}</p>
                        <p>Proceeds: {formatEther(swapSellValue)}</p>
                        <button onClick={swapNftForNft}>Swap</button>
                    </div>
                </div>
            </TradingFieldSet>
            <TabGroup onHandleTabClick={(index) => setIsSellMode(index === 1)}>
                <Tab label="Vault Inventory">
                    <RemyVaultGrid ids={ids} selectedList={selectedList} toggleSelect={toggleSelect} borderStyle="5px solid green" />
                </Tab>
                <Tab label="Wallet Inventory">
                    <RemyVaultGrid ids={ids} selectedList={selectedList} toggleSelect={toggleSelect} borderStyle="5px solid red" />
                </Tab>
            </TabGroup>
        </div>
    )

}

export const RemyVault = () => {

    const [stakingMode, setStakingMode] = useState(false);

    const invalidateQueries = useInvalidateQueries();

    useEffect(() => {
        invalidateQueries();

        const handler = () => {
            console.log('invalidateQueries');
            invalidateQueries();
        }

        const intervalId = setInterval(handler, 5000);

        return () => clearInterval(intervalId);
    }, []);

    const stakingOrTradingRadioButtons = (
        <div className="stakingradio">
            <input
                type="radio"
                id="trading"
                name="mode"
                value="trading"
                checked={!stakingMode}
                onChange={() => setStakingMode(false)}
            />
            <label htmlFor="trading">Trading</label>
            <input
                type="radio"
                id="staking"
                name="mode"
                value="staking"
                checked={stakingMode}
                onChange={() => setStakingMode(true)}
            />
            <label htmlFor="staking">Staking</label>

        </div>
    )

    return (
        <div>
            {stakingOrTradingRadioButtons}
            {stakingMode ? <RemyVaultStaking /> : <RemyVaultTrading />}
        </div>
    )
}
