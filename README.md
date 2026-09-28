# basedremyboys.club — Remy OS

Vite + React + TypeScript + wagmi v2 + viem. Hand-written Windows XP (Luna) theme in `src/styles.css`, no UI library.

```sh
npm install
npm run dev     # local
npm run build   # tsc + vite build → dist (Cloudflare Pages)
```

## Layout
- `src/config.ts` — every address/env setting. New contracts (fREMY, NFTVault, converter, router) come from `VITE_*` env; see `.env.example`.
- `src/abis.ts` — minimal `parseAbi` fragments.
- `src/os/` — Remy OS XP shell: boot + log-on (`Session`), Luna windows, taskbar/tray with balloons, Start menu, desktop + right-click menu, XP icon set (`icons.tsx`), shell store for balloons/message boxes/display prefs (`shell.ts`). Below 720px the Pocket PC shell (`Pocket.tsx`) takes over: title strip, full-screen apps, Today screen, soft-key bar.
- `src/apps/` — Welcome, Recovery Center, Approvals, Legacy Exchange, Remy Vault, Gallery, Paint (`public/jspaint`), Display Properties.
- Wallpaper: `public/wallpaper/remy-bliss.svg` (the Remy kite is inline SVG in `src/os/Desktop.tsx`).
- Deep links: `/#/<app>` (e.g. `/#/vault`, `/#/gallery/123`).
- Art: the art index is the last path segment of `tokenURI` (re-mints keep the original art); images come from `public/images/Character<idx>.webp`.
