// @ts-nocheck
import { useAccount, useBalance, useChainId, useReadContract, useReadContracts, useSwitchChain, useWriteContract } from 'wagmi'
import { useEffect, useState } from 'react'
import { NFTAbi } from './Abis.ts'
import addresses from './addresses.ts'
import contractAddresses from './contractAddresses.json'
import { useRemyRouter } from './remyRouter.ts'
import { RemyRouterABI, UniV2RouterABI } from './Abis.ts'
import { parseEther, formatEther } from 'viem'
import { useBuyPrice, useSellPrice, routerIsApproved, useQuoteRedeem, useQuoteMint, useSwapEthForNft, useSwapNftForEth, useSwapNftForNft, useApproveRouter, useInvalidateQueries, useTokenBalance, useAddNFTLiquidity, useApproveNonFungiblePositionManager, useMintREMYBatch, useApproveVaultForAllNFTs } from './tradingHooks.ts'
import { TabGroup, Tab } from './Tabs.tsx'
import { useNFTBalance, useOwnedNFTTokenIDs } from './nftHooks.ts'
import { RemyVaultStaking } from './RemyVaultStaking.tsx'
import { RemyTrading } from './RemyTrading.tsx'

const IMG_URL = 'https://basedremyboys.club/images/'

const MULTICALL_ADDRESS = '0xcA11bde05977b3631167028862bE2a173976CA11'

function SwitchChainButton({ chains, switchChain }) {
  return (
    <div className="switch-chain">
      {chains
        .filter((chain) => {return chain.name === "Base"})
        .map((chain) => (
        <button className="switch-chain-button" key={chain.id} onClick={() => switchChain({ chainId: chain.id })}>
          Switch to {chain.name}
        </button>
      ))}
    </div>
  )
}



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

export function RemyVaultGrid({ ids, selectedList, toggleSelect, borderStyle }) {

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

export const formatEther2 = (num) => {
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
    console.log('sellSelected', sellSelected);
    console.log('isApproved', isApproved);
    console.log('mustApproveRouter', mustApproveRouter);

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
                <p>User NFT Balance: {userBalance.data?.toString() ?? 0}</p>
                <p>Vault NFT Balance: {nftBalance.data?.toString() ?? 0}</p>
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
                        <button disabled={!mustApproveRouter} onClick={approveRouter}>Approve Router</button>
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
    const [currentMode, setCurrentMode] = useState(0);

    const invalidateQueries = useInvalidateQueries();

    const account = useAccount();
    const { chains, switchChain } = useSwitchChain()

    useEffect(() => {
        invalidateQueries();

        const handler = () => {
            console.log('invalidateQueries');
            invalidateQueries();
        }

        const intervalId = setInterval(handler, 10000);

        return () => clearInterval(intervalId);
    }, []);

    const stakingOrTradingRadioButtons = (
        <div className="stakingradio">
            <input
                type="radio"
                id="trading"
                name="mode"
                value="trading"
                checked={currentMode === 0}
                onChange={() => setCurrentMode(0)}
            />
            <label htmlFor="trading">NFT Trading</label>
            <input
                type="radio"
                id="staking"
                name="mode"
                value="staking"
                checked={currentMode === 1}
                onChange={() => setCurrentMode(1)}
            />
            <label htmlFor="staking">Staking</label>
            <input
                type="radio"
                id="selling"
                name="mode"
                value="selling"
                checked={currentMode === 2}
                onChange={() => setCurrentMode(2)}
            />
            <label htmlFor="selling">Sell $REMY</label>
        </div>
    )

    let currentComponent = <RemyVaultTrading />;

    if (currentMode === 1) {
        currentComponent = <RemyVaultStaking />;
    } else if (currentMode === 2) {
        currentComponent = <RemyTrading />;
    }

    console.log('currentMode', currentMode);

    if (account.chainId === 8453) {
        return (
            <div>
                {stakingOrTradingRadioButtons}
                {currentComponent}
            </div>
        )
    } else {
        return (
            <div>
                <SwitchChainButton chains={chains} switchChain={switchChain} />
            </div>
        )
    }

}
