// @ts-nocheck
import { UseBlockReturnType, useAccount, useBalance, useReadContract, useReadContracts, useWriteContract } from 'wagmi'
import { useEffect, useState } from 'react'
import { NFTAbi } from './Abis.ts'
import addresses from './addresses.ts'
import contractAddresses from './contractAddresses.json'
import { useRemyRouter } from './remyRouter.ts'
import { RemyRouterABI, UniV2RouterABI } from './Abis.ts'
import { parseEther, formatEther } from 'viem'
import { useBuyPrice, useSellPrice, routerIsApproved, useQuoteRedeem, useQuoteMint, useSwapEthForNft, useSwapNftForEth, useSwapNftForNft, useApproveRouter, useInvalidateQueries, useERC20Balance, usePreviewRedeem, useUnlockedStake, useStakeLock, useStakeInventory, useApproveRouterForStakingToken, useRouterStakingTokenAllowance, useConvertNftCountToShares, useUnstakeInventory, useRedeemSharesFromERC4626, useRouterIsNFTApprovedForAll, useApproveNFTForRouter, useTokenBalance, useAddNFTLiquidity, useApproveNonFungiblePositionManager, useMintREMYBatch, useApproveVaultForAllNFTs } from './tradingHooks.ts'
import { TabGroup, Tab } from './Tabs.tsx'
import { useNFTBalance, useOwnedNFTTokenIDs } from './nftHooks.ts'
import { useBlock } from 'wagmi'

const IMG_URL = 'https://basedremyboys.club/images/'

const MULTICALL_ADDRESS = '0xcA11bde05977b3631167028862bE2a173976CA11'

function TradingFieldSet({ children, routerIsApproved, approveFn }) {
    const approveRouterButton = (
        <button onClick={approveFn}>Approve</button>
    )
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
                            border: selectedList.includes(id) ? borderLineStyle : 'none',
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
    const lockedBalance = stakedSharesBalance.data - unlockedBalance.data;
    const redeemShares = useRedeemSharesFromERC4626(unlockedBalance.data ?? 0, account.address);
    const [showDialog, setShowDialog] = useState(false);

    const routerStakingAllowance = useRouterStakingTokenAllowance(account.address).data ?? 0;

    const routerIsNFTApprovedForAll = useRouterIsNFTApprovedForAll(account.address).data ?? false;
    const approveNFTForRouter = useApproveNFTForRouter();

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

    const formattedStakedBalance = formatEther2(stakedSharesBalance.data ?? 0);
    const redeemableAmount = usePreviewRedeem(stakedSharesBalance.data ?? 0);
    const unlockedRedeemableAmount = usePreviewRedeem(unlockedBalance.data ?? 0);
    const lockedRedeemableAmount = usePreviewRedeem(lockedBalance);

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
    // dont delete these
    console.log('requiredSharesForSelectedToUnstake', requiredSharesForSelectedToUnstake.data);
    console.log('routerStakingAllowance', routerStakingAllowance);

    const currentTimeInSec = Math.floor(new Date().getTime() / 1000);
    const currentTimestamp = new Date(currentTimeInSec * 1000).toLocaleString();
    console.log('currentTimestamp', currentTimestamp);

    const userLockData = useStakeLock(account.address);
    console.log('userLockData', userLockData);
    const lockEndTimestampInSec: BigInt = userLockData.data?.timestamp ?? 0;
    console.log('lockEndTimestampInSec', lockEndTimestampInSec);
    console.log(Number(lockEndTimestampInSec))
    const lockEndTimestamp = new Date(Number(lockEndTimestampInSec) * 1000).toLocaleString();
    console.log('lockEndTimestamp', lockEndTimestamp);

    const approveRouterForStakingToken = useApproveRouterForStakingToken(requiredSharesForSelectedToUnstake.data ?? 0);
    const redeemableAmountInNfts = tokensToNfts(unlockedRedeemableAmount.data ?? 0);

    // current timestamp in seconds
    const block: UseBlockReturnType = useBlock();

    const needsApproval = (selectedForUnstaking.length > 0) && (routerStakingAllowance < requiredSharesForSelectedToUnstake.data ?? 0);
    const hasEnoughShares = !needsApproval && (unlockedBalance.data ?? 0) >= (requiredSharesForSelectedToUnstake.data ?? 0);
    const hasUnlockedShares = (unlockedBalance.data ?? 0) > 0;

    const unstakeInventory = useUnstakeInventory(account.address, selectedForUnstaking, additionalUnstakeArgs);

    const selectAllForStaking = () => {
        setSelectedForStaking(userIds);
    }

    const clearSelectedForStaking = () => {
        setSelectedForStaking([]);
    }

    return (
        <div className="remy-vault">
            <fieldset>
                <legend>Stake/Unstake NFTs</legend>
                <p><b>Total Vault Shares</b>: {formattedStakedBalance} Shares ({formatEther2(unlockedRedeemableAmount.data ?? 0)} Tokens)</p>
                <p><b>Locked Shares</b>: {formatEther2(lockedBalance)} Shares ({formatEther2(lockedRedeemableAmount.data ?? 0)} Tokens)</p>
                <p><b>Unlocked Shares</b>: {formatEther2(unlockedBalance.data ?? 0)} Shares</p>
                <p><b>Total Staked Balance</b>: {formatEther2(redeemableAmount.data ?? 0)} Tokens</p>
                <p><b>Locked</b>: {formatEther2(lockedRedeemableAmount.data ?? 0)} Tokens</p>
                <p><b>Unlocked</b>: {formatEther2(unlockedRedeemableAmount.data ?? 0)} Tokens</p>
                {lockedBalance.data && (<p><b>Locked Until</b>: {lockEndTimestamp}</p>)}
                <div className="tradingGrid">
                    <div className="trade-button">
                        <div><p><b>NFTs Selected for Staking:</b> {selectedForStaking.length}</p></div>
                        <div className='stake-all-button'><button onClick={selectAllForStaking}>Select All</button>
                        <button disabled={selectedForStaking.length === 0} onClick={clearSelectedForStaking}>Clear All</button></div>
                        <div>
                          <span className='red-text bold mr-1'>*Warning*:</span>
                          <span>Only stake what you consider to be <b>floor</b> NFTs. Staked NFTs are made available for trading by other users. There is <b>no guarantee</b> you will be able to unstake for the same NFTs.</span>
                          <span>There is a <b>1 week</b> lockup period on staked NFTs.</span>
                        </div>
                        <div className='unstake-buttons mt-1'>
                            <button onClick={approveNFTForRouter} disabled={routerIsNFTApprovedForAll}>Approve</button>
                            <button onClick={stakeInventory} disabled={!routerIsNFTApprovedForAll}>Stake</button>
                        </div>
                    </div>
                    <div className="trade-button">
                        <div><p><b>NFTs Selected for Unstaking:</b> {selectedForUnstaking.length}</p></div>
                        <div><p><b>Unlocked Shares Redeemable for</b>: {redeemableAmountInNfts} NFTs</p></div>
                        <div className='unstake-buttons nft-unstake'><button disabled={!needsApproval} onClick={approveRouterForStakingToken}>Approve</button>
                        <button disabled={!hasEnoughShares} onClick={unstakeInventory}>Unstake as NFTs</button></div>
                        <div className='divider'></div>
                        <div><p><b>Unlocked Shares Redeemable for</b>: {formatEther2(unlockedRedeemableAmount.data ?? 0)} $REMY</p></div>
                        <div className='unstake-buttons'><button disabled={!hasUnlockedShares} onClick={redeemShares}>Unstake ALL as $REMY</button></div>
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

function Marquee({ children }) {
    return (
        <div className="marquee-container">
            <div className="marquee-content">
                {children}
            </div>
        </div>
    );
}

function truncateToFourDecimals(numString) {
  // Convert the string to a number
  let num = parseFloat(numString);

  // Check if the number is valid
  if (isNaN(num)) {
    return "Invalid number";
  }

  // Truncate to 4 decimal places and convert back to string
  return num.toFixed(4).replace(/\.?0+$/, '');
}

const formatEther2 = (num) => {
  return truncateToFourDecimals(formatEther(num));
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
    const oneThousandOneHundredRemy = parseEther('1100');
    const swapBuyPrice = useBuyPrice(contractAddresses['weth'], contractAddresses['token'], swapQuoteRedeem + swapFeeForExchange);
    const swapSellPrice = useSellPrice(contractAddresses['token'], contractAddresses['weth'], swapQuoteMint);

    console.log({
        numBuys,
        numSells,
        numSwaps,
        swapQuoteRedeem,
        swapQuoteMint,
        swapFeeForExchange,
        swapBuyPrice,
    })

    const oneThousandRemy = parseEther('1000');
    const oneNFTBuyTokens = parseEther('1100');
    const oneNFTSellTokens = parseEther('900');

    const remyTokensBuyPrice = useBuyPrice(contractAddresses['weth'], contractAddresses['token'], oneThousandRemy);
    const oneNFTBuyPrice = useBuyPrice(contractAddresses['weth'], contractAddresses['token'], oneNFTBuyTokens);
    const oneNFTSellPrice = useSellPrice(contractAddresses['token'], contractAddresses['weth'], oneNFTSellTokens);

    const dn404Balance = useTokenBalance(contractAddresses['token'], account.address);
    const approveNFPM = useApproveNonFungiblePositionManager();
    const approveVault = useApproveVaultForAllNFTs();
    const addNFTLiquidity = useAddNFTLiquidity(account.address, dn404Balance.data ?? 0);

    const isApproved = routerIsApproved(account).data ?? false;

    const approveRouter = useApproveRouter();

    const ethBalance = useBalance({
        address: account.address
    })

    const nftBalance = useNFTBalance(contractAddresses['vault']);
    const userBalance = useNFTBalance(account.address);
    const vaultOwnedTokenIDs = useOwnedNFTTokenIDs(contractAddresses['vault'], nftBalance.data ?? 0);
    const userOwnedTokenIDs = useOwnedNFTTokenIDs(account.address, userBalance.data ?? 0);

    const mintRemy = useMintREMYBatch(userOwnedTokenIDs.data?.map((id) => id.result), account.address);

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

    const adminButtons = (
        <div>
                    <button onClick={approveVault}>Approve Vault</button>
            <button onClick={mintRemy}>Mint REMY</button>
            <button onClick={approveNFPM}>Approve NonfungiblePositionManager</button>
            <button onClick={addNFTLiquidity}>Add NFT Liquidity</button>
            </div>
    )

    const mustApproveRouter = sellSelected.length > 0 && !isApproved;

    return (
        <div className="remy-vault">
            <div role="tooltip" className='remy-price-bubble'>
                <Marquee>
                    <div><b>1000 $REMY</b> = {formatEther2(remyTokensBuyPrice.data?.result[0] ?? 0)} <b>ETH | </b>
                        <b>NFT Buy Price:</b> {formatEther2(oneNFTBuyPrice.data?.result[0] ?? 0)} <b>ETH | </b>
                        <b>NFT Sell Price:</b> {formatEther2(oneNFTSellPrice.data?.result[0] ?? 0)} <b>ETH</b></div>
                </Marquee>
            </div>
            <TradingFieldSet
                routerIsApproved={isApproved}
                approveFn={approveRouter}
            >
                <p>ETH Balance: {formatEther2(ethBalance.data?.value ?? 0)}</p>
                <div className="tradingGrid">
                    <div className="trade-button">
                        <div>
                        Selected for Buying: {buySelected.length}
                        <button className='clear-button' onClick={() => setBuySelected([])}>Clear</button>
                        </div>
                        Selected for Selling: {sellSelected.length}
                        <button className='clear-button' onClick={() => setSellSelected([])}>Clear</button>
                        <div>Price: {formatEther2(swapBuyValue)}</div>
                        <p>Proceeds: {formatEther2(swapSellValue)}</p>
                        <button disabled={!mustApproveRouter} onClick={approveVault}>Approve Router</button>
                        <button onClick={swapNftForNft} disabled={mustApproveRouter}>Swap</button>
                    </div>
                    <div>
                        <blockquote>
                            <ul>
                                <li>There is a 10% fee on all NFT swaps. Fees go directly to stakers.</li>
                                <li>Select NFTs from the Wallet Inventory to buy, and from the Vault Inventory to sell.</li>
                                <li>NFT-for-NFT swaps pay half as much in fees as you would pay performing both a buy and a sell.</li>
                            </ul>
                        </blockquote>
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
            <label htmlFor="trading">NFT Trading</label>
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
