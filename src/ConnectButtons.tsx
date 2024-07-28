// @ts-nocheck
export function ConnectButtons({ connectors, connect, error }) {
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
