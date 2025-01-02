import { useApproveRemyswapRouterForStakingToken, useERC20Balance, useInvalidateQueries, useRemyswapRouterStakingTokenAllowance, useSellPrice, useSwapTokenForETH } from "./tradingHooks";
import contractAddresses from './contractAddresses.json';
import { useAccount } from "wagmi";
import { formatEther2 } from "./RemyVault";
import { formatEther } from "viem";

export function RemyTrading() {
    const account = useAccount();
    const walletTokenBalance = useERC20Balance(contractAddresses['dn404_token'], account);
    const remyswapRouterAllowance = useRemyswapRouterStakingTokenAllowance(account.address);
    const approveRemyswapRouter = useApproveRemyswapRouterForStakingToken();
    const isApproved = remyswapRouterAllowance.data && remyswapRouterAllowance.data > (walletTokenBalance.data ?? 0);
    const tokenIn = contractAddresses['dn404_token'];
    const tokenOut = contractAddresses['weth'];
    const amountIn = walletTokenBalance.data ?? 0;
    const invalidateQueries = useInvalidateQueries();
    const additionalArgs = { onSettled: invalidateQueries };
    const expectedSellAmount = useSellPrice(tokenIn, tokenOut, walletTokenBalance.data ?? 0).data?.result[0] ?? 0;
    const swapTokenForETH = useSwapTokenForETH(tokenIn, tokenOut, amountIn, account.address, additionalArgs);
    return (
        <div className="remy-vault">
            <fieldset>
                <legend>Sell $REMY Tokens on RemySwap</legend>
                <div><p>Some users have ended up with $REMY in their wallets as a result of unstaking. These tokens can be used to redeem for Remy Boys NFTs or be sold for ETH on RemySwap.</p></div>
                <div><p>More advanced trading features are coming soon. For now, this is an escape hatch for those with $REMY tokens.</p></div>
                <div><p>Your wallet balance: {formatEther2(walletTokenBalance.data ?? 0)} $REMY</p></div>
                <div><p>Expected ETH: {formatEther(expectedSellAmount)}</p></div>
                <div><p>Router Approval Status: {isApproved ? "Approved" : "Not Approved"}</p></div>
                <div><button disabled={isApproved} onClick={() => approveRemyswapRouter()}>Approve RemySwap Router</button></div>
                <div><button disabled={!isApproved} onClick={() => swapTokenForETH()}>Sell $REMY for ETH</button></div>
            </fieldset>
        </div>
    )

}
