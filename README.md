# basedremyboys.club — Remy OS

Vite + React + TypeScript + wagmi v2 + viem. Hand-written Windows XP (Luna) theme in `src/styles.css`, no UI library.

```sh
npm install
npm run dev     # local
npm run build   # tsc + vite build → dist (Cloudflare Pages)
```

## Layout
- `src/config.ts` — every address/env setting. The vault stack (fREMY, NFTVault, converter, router, deployer) defaults to the live Base deployment; `VITE_*` env overrides it for forks (see `.env.example`).
- Pre-launch states: Legacy Exchange keeps rbREMY/rbREMYLS closed until the converter owns the legacy vault; Remy Vault disables ETH buys/sells until the fREMY/ETH pool can fill a quote. `#/launch` (Launch Control, listed only for the team wallets) walks the launch checklist.
- `src/abis.ts` — minimal `parseAbi` fragments.
- `src/os/` — Remy OS XP shell: boot + log-on (`Session`), Luna windows, taskbar/tray with balloons, Start menu, desktop + right-click menu, XP icon set (`icons.tsx`), shell store for balloons/message boxes/display prefs (`shell.ts`). Below 720px the Pocket PC shell (`Pocket.tsx`) takes over: title strip, full-screen apps, Today screen, soft-key bar.
- `src/apps/` — Welcome, Recovery Center, Approvals, Legacy Exchange, Remy Vault, Remy Trader, Gallery, Paint (`public/jspaint`), Display Properties.
- Remy Trader (`#/trader`): fREMY/ETH market from PoolManager logs (`src/lib/trader.ts`, cached in localStorage, ≤2,000-block chunks), order ticket via RemyRouter `buyFloor`/`sellFloor`, and a Uniswap v4 liquidity desk via PositionManager action scripts. v4 math (TickMath, SqrtPriceMath, LiquidityAmounts) is ported to bigint in `src/lib/v4math.ts`.
- Wallpaper: `public/wallpaper/remy-bliss.svg` (the Remy kite is inline SVG in `src/os/Desktop.tsx`).
- Deep links: `/#/<app>` (e.g. `/#/vault`, `/#/gallery/123`).
- Art: the art index is the last path segment of `tokenURI` (re-mints keep the original art); images come from `public/images/Character<idx>.webp`.
