import { useAccount, useConnect, useDisconnect } from 'wagmi'
import { useSwitchChain, useChainId } from 'wagmi'
import { useReadContract } from 'wagmi'
import { abi as whitelistAbi } from './whitelistAbi.ts'

/* global BigInt */

function AccountDetails({ account, disconnect }) {
  return (
    <>
      <h3>Connected Wallet</h3>
      status: {account.status}
      <br />
      addresses: {JSON.stringify(account.addresses)}
      <br />
      chainId: {account.chainId}
      <button type="button" onClick={() => disconnect()}>
        Disconnect
      </button>
    </>
  )
}

function SwitchChainButton({ chains, chainId, switchChain }) {
  return (
    <div>
      {chains.filter((chain) => chain.id === 8453).map((chain) => (
        <button key={chain.id} onClick={() => switchChain({ chainId: chain.id })}>
          Switch to {chain.name}
        </button>
      ))}
    </div>
  )
}

function ConnectButtons({ connectors, connect, error }) {
  return (
    <div>
      <h2>Connect</h2>
      {connectors.map((connector) => (
        <button
          key={connector.uid}
          onClick={() => connect({ connector })}
          type="button"
        >
          {connector.name}
        </button>
      ))}
      <div>{error?.message}</div>
    </div>
  )
}

function StatusBar({ status, error }) {
  return (
    <div className="status-bar">
      <p className="status-bar-field">Press F1 for help</p>
      <p className="status-bar-field">Wallet Status: {status}</p>
      <p className="status-bar-field">Error: {error?.message ?? "None"}</p>
    </div>
  )
}

function App() {
  const { chains, switchChain } = useSwitchChain()
  const account = useAccount()
  const chainId = useChainId()
  const { connectors, connect, status, error } = useConnect()
  const { disconnect } = useDisconnect()
  const result = useReadContract({
    abi: [{ stateMutability: "payable", type: "constructor", inputs: [], outputs: [] }, { stateMutability: "view", type: "function", name: "check_whitelist", inputs: [{ name: "i", type: "uint256" }, { name: "addr", type: "address" }], outputs: [{ name: "", type: "uint256" }] }, { stateMutability: "view", type: "function", name: "check_whitelists", inputs: [{ name: "addr", type: "address" }], outputs: [{ name: "", type: "uint256[]" }] }, { stateMutability: "nonpayable", type: "function", name: "set_manager", inputs: [{ name: "new_manager", type: "address" }], outputs: [] }, { stateMutability: "nonpayable", type: "function", name: "set_spender", inputs: [{ name: "new_spender", type: "address" }], outputs: [] }, { stateMutability: "nonpayable", type: "function", name: "add_whitelist", inputs: [{ name: "typ", type: "uint256" }, { name: "limit", type: "uint256" }], outputs: [] }, { stateMutability: "nonpayable", type: "function", name: "set_whitelist_limit", inputs: [{ name: "i", type: "uint256" }, { name: "limit", type: "uint256" }], outputs: [] }, { stateMutability: "nonpayable", type: "function", name: "set_whitelist_limit_for_address", inputs: [{ name: "whitelist_id", type: "uint256" }, { name: "addr", type: "address" }, { name: "limit", type: "uint256" }], outputs: [] }, { stateMutability: "nonpayable", type: "function", name: "whitelist_addresses", inputs: [{ name: "i", type: "uint256" }, { name: "addrs", type: "address[]" }], outputs: [] }, { stateMutability: "nonpayable", type: "function", name: "whitelist_addresses", inputs: [{ name: "i", type: "uint256" }, { name: "addrs", type: "address[]" }, { name: "limit", type: "uint256" }], outputs: [] }, { stateMutability: "nonpayable", type: "function", name: "spend_whitelists", inputs: [{ name: "addr", type: "address" }, { name: "amounts", type: "uint256[]" }], outputs: [] }, { stateMutability: "view", type: "function", name: "manager", inputs: [], outputs: [{ name: "", type: "address" }] }, { stateMutability: "view", type: "function", name: "spender", inputs: [], outputs: [{ name: "", type: "address" }] }, { stateMutability: "view", type: "function", name: "whitelists", inputs: [{ name: "arg0", type: "uint256" }], outputs: [{ name: "", type: "tuple", components: [{ name: "typ", type: "uint256" }, { name: "limit", type: "uint256" }] }] }],
    address: '0x964287f5ED2B6b99eaE83bf190ac9B735347Ada2',
    functionName: 'check_whitelists',
    args: [account.address ?? "0x0000"],
  })

  return (
    <>
      <div>
        <div className="window window-active" style={{ maxWidth: "600px" }}>
          <div className="title-bar">
            <div className="title-bar-text">Based Remy Boys</div>
            <div className="title-bar-controls">
              <button aria-label="Minimize"></button>
              <button aria-label="Maximize"></button>
              <button aria-label="Close"></button>
            </div>
          </div>
          <div className="window-body has-space">
            <div>
              {account.status === 'connected' && (
                <>
                  <AccountDetails account={account} disconnect={disconnect} />
                  {chainId !== 8453 && (
                    <SwitchChainButton chains={chains} chainId={chainId} switchChain={switchChain} />
                  )}
                  {chainId === 8453 && (
                    <div>
                      You have {result.data?.reduce((a, b) => a + b).toString()} whitelist spots
                    </div>
                  )}
                </>
              )}
              {account.status === 'disconnected' && (
                <ConnectButtons connectors={connectors} connect={connect} error={error} />
              )}
            </div>
          </div>
          <StatusBar status={status} error={error} />
        </div>
      </div>
    </>
  )
}

export default App
