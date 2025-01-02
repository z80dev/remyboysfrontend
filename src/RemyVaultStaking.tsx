// @ts-nocheck
import { UseBlockReturnType, useAccount } from 'wagmi';
import { useState } from 'react';
import contractAddresses from './contractAddresses.json';
import { useInvalidateQueries, useERC20Balance, usePreviewRedeem, useUnlockedStake, useStakeLock, useStakeInventory, useApproveRouterForStakingToken, useRouterStakingTokenAllowance, useConvertNftCountToShares, useUnstakeInventory, useRedeemSharesFromERC4626, useRouterIsNFTApprovedForAll, useApproveNFTForRouter } from './tradingHooks.ts';
import { TabGroup, Tab } from './Tabs.tsx';
import { useNFTBalance, useOwnedNFTTokenIDs } from './nftHooks.ts';
import { useBlock } from 'wagmi';
import { formatEther2, RemyVaultGrid } from './RemyVault.tsx';
import { parseEther } from 'viem';

export function toEthereumNumber(value: string | number | bigint): bigint {
  if (typeof value === 'string') {
    return parseEther(value);
  }
  if (typeof value === 'bigint') {
    return value;
  }
  // For number, convert to bigint and multiply by 1e18
  return BigInt(value) * BigInt(1e18);
}

export function fromEthereumNumber(value: string | bigint): number {
  if (typeof value === 'string') {
    const weiValue = parseEther(value);
    return Number(weiValue / BigInt(1e18));
  }
  // For bigint
    return Number(BigInt(value) / BigInt(1e18));
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
    const lockedBalance = BigInt(stakedSharesBalance.data ?? 0) - BigInt(unlockedBalance.data ?? 0);
    const [redeemableAmountShares, setRedeemableAmountShares] = useState(unlockedBalance.data ?? 0);
    const redeemShares = useRedeemSharesFromERC4626(redeemableAmountShares, account.address);
    const [showDialog, setShowDialog] = useState(false);

    const routerStakingAllowance = useRouterStakingTokenAllowance(account.address);

    const routerIsNFTApprovedForAll = useRouterIsNFTApprovedForAll(account.address).data ?? false;
    const approveNFTForRouter = useApproveNFTForRouter();

    const userNftBalance = useNFTBalance(account.address);
    const userOwnedTokenIDs = useOwnedNFTTokenIDs(account.address, userNftBalance.data ?? 0);
    const userIds = userOwnedTokenIDs.data?.map((id) => id.result?.toString()) ?? [];

    // vault NFT Inventory
    const vaultNftBalance = useNFTBalance(contractAddresses['vault']);
    const vaultOwnedTokenIDs = useOwnedNFTTokenIDs(contractAddresses['vault'], vaultNftBalance.data ?? 0);
    const vaultIds = vaultOwnedTokenIDs.data?.map((id) => id.result?.toString()) ?? [];

    const walletTokenBalance = useERC20Balance(contractAddresses['dn404_token'], account);

    const setRedeemableSharesMax = () => {
        console.log('unlockedBalance.data', unlockedBalance.data);
        setRedeemableAmountShares(unlockedBalance.data ?? 0);
    };

    const setRedeemableShares = (shares) => {
        setRedeemableAmountShares(toEthereumNumber(shares));
    };

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
    };

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
    };

    const additionalUnstakeArgs = {
        onSuccess: () => console.log('success'),
        onSettled: () => {
            setSelectedForUnstaking([]);
            invalidateQueries();
        },
        onError: (error) => console.log(error)
    };



    const stakeInventory = useStakeInventory(account.address, selectedForStaking, additionalStakeArgs);

    const tokensToNfts = (tokens) => {
        const units = BigInt(tokens) / BigInt(1e+21);
        return units.toString();
    };

    console.log('selectedForUnstaking', selectedForUnstaking);
    const requiredSharesForSelectedToUnstake = (useConvertNftCountToShares(selectedForUnstaking.length).data ?? BigInt(0)) + BigInt(1);
    // dont delete these
    console.log('requiredSharesForSelectedToUnstake', requiredSharesForSelectedToUnstake);
    console.log('routerStakingAllowance', routerStakingAllowance);

    const currentTimeInSec = Math.floor(new Date().getTime() / 1000);
    const currentTimestamp = new Date(currentTimeInSec * 1000).toLocaleString();
    console.log('currentTimestamp', currentTimestamp);

    const userLockData = useStakeLock(account.address);
    console.log('userLockData', userLockData);
    const lockEndTimestampInSec: BigInt = userLockData.data?.timestamp ?? 0;
    console.log('lockEndTimestampInSec', lockEndTimestampInSec);
    console.log(Number(lockEndTimestampInSec));
    const lockEndTimestamp = new Date(Number(lockEndTimestampInSec) * 1000).toLocaleString();
    console.log('lockEndTimestamp', lockEndTimestamp);

    const approveRouterForStakingToken = useApproveRouterForStakingToken(requiredSharesForSelectedToUnstake ?? 0);
    const redeemableAmountInNfts = tokensToNfts(unlockedRedeemableAmount.data ?? 0);

    // current timestamp in seconds
    const block: UseBlockReturnType = useBlock();

    const needsApproval = (selectedForUnstaking.length > 0) && (routerStakingAllowance.data < requiredSharesForSelectedToUnstake.data ?? 0);
    const hasEnoughShares = !needsApproval && (unlockedBalance.data ?? 0) >= (requiredSharesForSelectedToUnstake.data ?? 0);
    const hasUnlockedShares = (unlockedBalance.data ?? 0) > 0;

    const unstakeInventory = useUnstakeInventory(account.address, selectedForUnstaking, additionalUnstakeArgs);

    const selectAllForStaking = () => {
        setSelectedForStaking(userIds);
    };

    const clearSelectedForStaking = () => {
        setSelectedForStaking([]);
    };

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
                <p><b>Wallet Balance</b>: {formatEther2(walletTokenBalance.data ?? 0)} Tokens</p>
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
                        <div className='unstake-buttons nft-unstake'><button onClick={approveRouterForStakingToken}>Approve</button>
                            <button disabled={!hasEnoughShares} onClick={unstakeInventory}>Unstake as NFTs</button></div>
                        <div className='divider'></div>
                        <div><p><b>Unlocked Shares:</b> {formatEther2(unlockedBalance.data ?? 0)} Shares</p></div>
                        <div><p><b>Unlocked Shares Redeemable for</b>: {formatEther2(unlockedRedeemableAmount.data ?? 0)} $REMY</p></div>
                        <div><input type="number" value={fromEthereumNumber(redeemableAmountShares)} onChange={(e) => setRedeemableShares(e.target.value)}></input><button onClick={setRedeemableSharesMax}>Max Shares</button></div>
                        <div className='unstake-buttons'><button disabled={!hasUnlockedShares} onClick={redeemShares}>Unstake as $REMY</button></div>
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
    );
}
