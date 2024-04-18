// @ts-nocheck
import { useAccount, useConnect, useDisconnect } from 'wagmi'
import { useSwitchChain, useChainId } from 'wagmi'
import { useReadContract } from 'wagmi'
import { whitelists } from './whitelists.ts'
import PikaGif from './PikaGif.tsx'

function AccountDetails({ account, disconnect }) {
  return (
    <fieldset>
      <legend>Account Details</legend>
      <div className="account-details">
        <p>Address: {account.address}</p>
        <p>Chain ID: {account.chainId}</p>
        <button type="button" onClick={() => disconnect()}>
          Disconnect
        </button>
      </div>
    </fieldset>
  )
}

function SwitchChainButton({ chains, switchChain }) {
  return (
    <div className="switch-chain">
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
    <div className="connect-buttons">
      <fieldset>
        <legend>Connect Wallet</legend>
        <div id="connect-prompt">Select wallet to connect</div>
        <div id="connect-subprompt">If on mobile, choose WalletConnect</div>
        {connectors.map((connector) => (
          <button
            key={connector.uid}
            onClick={() => connect({ connector })}
            type="button"
          >
            {connector.name}
          </button>
        ))}
      </fieldset>
    </div>
  )
}

function StatusBar({ status, error }: { status: any, error: any }) {
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
    <div className="app">
      <div className="window">
        <div className="title-bar">
          <div className="title-bar-text">Based Remy Boys</div>
          <div className="title-bar-controls">
            <button aria-label="Minimize"></button>
            <button aria-label="Maximize"></button>
            <button aria-label="Close"></button>
          </div>
        </div>
        <div className="window-body">
          <PikaGif />
          {account.status === 'connected' && (
            <div className="connected-content">
              <AccountDetails account={account} disconnect={disconnect} />
              {chainId !== 8453 && (
                <SwitchChainButton chains={chains} switchChain={switchChain} />
              )}
              {chainId === 8453 && (
                <fieldset>
                  <legend>Whitelist Checker</legend>
                  <ul className="tree-view has-collapse-button has-connector has-container">
                    <details open>
                      <summary>
                        <b>Total spots</b>: {result.data?.reduce((a, b) => a + b, BigInt(0)).toString()}
                      </summary>
                      <ul>
                        {whitelists.map((whitelist, index) => (
                          <li key={whitelist.name}>
                            {whitelist.name}: {result.data && result.data[index] ? result.data[index].toString() : '0'} spots
                          </li>
                        ))}
                      </ul>
                    </details>
                  </ul>
                </fieldset>
              )}
            </div>
          )}
          {account.status === 'disconnected' && (
            <ConnectButtons connectors={connectors} connect={connect} error={error} />
          )}
        </div>
        <StatusBar status={status} error={error} />
      </div>
    </div>
  )
}

export default App
