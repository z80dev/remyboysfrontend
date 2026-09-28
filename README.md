# basedremyboys.club — Remy OS

Vite + React + TypeScript + wagmi v2 + viem. Hand-written Aero-style CSS (`src/styles.css`), no UI library.

```sh
npm install
npm run dev     # local
npm run build   # tsc + vite build → dist (Cloudflare Pages)
```

## Layout
- `src/config.ts` — every address/env setting. New contracts (fREMY, NFTVault, converter, router) come from `VITE_*` env; see `.env.example`.
- `src/abis.ts` — minimal `parseAbi` fragments.
- `src/os/` — desktop shell: draggable windows, taskbar, start menu, wallet tray. Below 720px windows become full-screen sheets.
- `src/apps/` — Welcome, Recovery Center, Approvals, Legacy Exchange, Remy Vault, Gallery, Paint (`public/jspaint`).
- Deep links: `/#/<app>` (e.g. `/#/vault`, `/#/gallery/123`).
- Art: the art index is the last path segment of `tokenURI` (re-mints keep the original art); images come from `public/images/Character<idx>.webp`.
