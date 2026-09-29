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
- `src/apps/` — Welcome, Recovery Center, Approvals, Legacy Exchange, Remy Vault, Remy Trader, Gallery, Remix Studio, Paint (`public/jspaint`), Remy Quest (iframe of `/quest/`), Display Properties.
- Remy Quest (`/quest/`, second Vite entry in `vite.config.ts`): standalone Pokémon-style game, vanilla TS + canvas + DOM, no React/wagmi. `src/quest/` — `world.ts` (grid movement, NPCs, trainers, encounters, render loop), `maps.ts` (maps, cast, story scripts), `battle.ts`, `menus.ts`, `dex.ts`, `viewer.ts`, `scenes.ts` (title, intro, starter, Hall of Fame), `gfx/` (procedural pixel-art tiles/sprites), `art/` (Remy art atlases), `audio.ts` + `music/` (runtime-synthesized soundtrack + SFX), `data.ts` (types, moves, per-art-index stats). The world renders to a low-res canvas upscaled by an integer factor; inside `.screen`, `1rem` = one game pixel. Touch devices get an on-screen pad. Save: `localStorage['remyquest.save.v1']`.
- Remy Trader (`#/trader`): fREMY/ETH market from PoolManager logs (`src/lib/trader.ts`, cached in localStorage, ≤2,000-block chunks), order ticket via RemyRouter `buyFloor`/`sellFloor`, and a Uniswap v4 liquidity desk via PositionManager action scripts. v4 math (TickMath, SqrtPriceMath, LiquidityAmounts) is ported to bigint in `src/lib/v4math.ts`.
- Wallpaper: `public/wallpaper/remy-bliss.svg` (the Remy kite is inline SVG in `src/os/Desktop.tsx`).
- Deep links: `/#/<app>` (e.g. `/#/vault`, `/#/gallery/123`).
- Art: the art index is the last path segment of `tokenURI` (re-mints keep the original art); images come from `public/images/Character<idx>.webp`.

## Remy Quest art pipeline

`npm run quest:art` (`scripts/quest-art.mjs`, needs `ffmpeg` and `cwebp`, e.g. `brew install ffmpeg webp`) analyzes all 4,490 originals and writes the committed, deterministic `public/quest/art.json` (sampled palette, overworld look, art-derived type, epithet), `heads.webp` (16×16 alpha pixel heads) and `minis.webp` (32×32 pixel portraits), both 67-column atlases (~2.45 MB total). `src/quest/art/index.ts` loads them behind a boot loading screen (`art.get/head/mini`, graceful null fallback). Story Remys keep their fixed types (`TYPE_OVERRIDE` in `data.ts`); every other Remy's type comes from its art.

Where the art shows up:
- Overworld (`world.ts`, `gfx/remyactor.ts`): the player (#0), every NPC/trainer with a portrait, a follower (lead non-fainted party Remy, press A facing it) and 2–4 visible wild Remys roaming tall grass are drawn with their real pixel heads; bumping a roamer battles exactly that Remy. Invisible encounter rate is halved.
- THE FLOOR museum (Liquidity City house door at 22,18; `maps.ts`, `gfx/`): 24 framed originals in five wings, hologram pedestals, curator quest with three living paintings (#29, #35, #2005 → one-time catchable battles; mint one or meet all three for the Patron reward). Billboards in Liquidity City and Genesis Town. Any exhibit opens `viewArt(idx)` (`viewer.ts`), the HD museum viewer.
- Battles (`battle.ts`): pixel-to-HD materialization and pixel-scatter faints, art-palette lighting/FX, holo tilt, trainer/boss VS splash, NEW! flag on first sighting, and a Mint Certificate on every catch.
- REMYDEX (`dex.ts`): virtualized browser of all 4,490 (SEEN/MINTED/type filters, d-pad paging, JUMP # digit wheel), foil HD detail cards with palette, stats and habitat. The trainer card shows a favorite Remy (`S.flags['fav:<idx>']`) and recent mints.
- Scenes (`scenes.ts`): title wall of 1,024 portraits with HD flips, pixel-cascade intro, holo starter cards, and a Hall of Fame photomosaic of your lead Remy built from the Remys you met.

## Remy Quest story: Base, the chains and THE CABALD

The game is "A Base Adventure": Genesis Town, Mempool Meadow, Liquidity City, THE FLOOR and Rug Pull Canyon are all on Base. Prof. Gwei is a mainnet veteran who moved to Base for the gas. Ethereum mainnet, Solana and Robinhood Chain appear as visiting cultures (light, affectionate parody; no prices or logos). Their main stage is the **Bridge Terminal** in Liquidity City (`bridge.ts`, `gfx/terminal.ts`; door at city 5,19), which has a departures board and chain gates. The optional Bridge Tour has four trainers (Base customs, mainnet, Solana, Robinhood Chain) and awards 2 Ledger Pros + 1 Max Hopium once (`frequent_bridger`). A Cabald courier there exposes the drain.

The Cabald ("There is no Cabald. I love you.") is a cross-chain cabal draining liquidity from every chain through the Rug Tower, their "unofficial bridge". It has uniformed grunts on every map, the recurring admins SHORT & SQUEEZE, ADMIN ESCROW occupying the Exchange until beaten, propaganda billboards, and the RUG LORD as CABALD BOSS. The finale returns liquidity to all four chains. Any trainer whose `title` starts with `CABALD` gets the Cabald battle presentation in `battle.ts` (crimson/gold seal splash, delayed "I love you.", boss cracks/scanlines, propaganda overlays, seal shatter on the last faint), and grunts use the `cabald` music track. Loading an old save restores the `dex` and `badge_rug` flags a player should already have (`state.ts`).

## Remy Quest music

All music is synthesized at runtime in a GBA Direct Sound style (no audio files) with original melodies. `src/quest/music/song.ts` is the score contract: a `Song` has bpm, grid, intro/loop points and `parts[]` of `[step, midi, len, vel]` notes for a named `Instrument` or `drums` (GM-style `DRUM` map). `engine.ts`/`instruments.ts` render songs live or offline (`renderOffline`, `measure`), with a sample-clock scheduler, seamless loops, swing, generated reverb, tempo echo, compression and limiting, crossfades and a voice cap. The 12 tracks in `music/songs/*.ts` are loaded lazily by `songs/index.ts`. `audio.ts` keeps the public API (`play/stop/sfx/jingle/cry/…`), and jingles duck the current song.

## Remix Studio

Open `/#/remix` from the desktop, Start menu, or Pocket Today screen. `/#/remix/777` selects **original art** 777, not current token ID 777. Gallery's Remix action resolves `tokenURI` first so re-mints use the correct image. Browse/search all 4,490 originals, enter a prompt (up to 2,000 characters), choose a model, compare the result with its source, and download the image. Remixing does not mint or alter an NFT.

The selected artwork's actual bytes and the prompt go to [OpenRouter's image API](https://openrouter.ai/docs/guides/overview/multimodal/image-generation), using `input_references`; there is no description-only substitute. **GPT Image 2.5 Flare (`low`, one 1024×1024 image) is currently the only enabled model.** Qwen generation is disabled in both the UI and server allowlist. Saved Qwen drafts fall back to GPT; existing result downloads remain available. The model registries, selector, and model ID request field are retained for future models. Add future models to both `src/apps/Remix.tsx` and `workers/remy-remix/src/worker.ts`, with verified provider settings. Bankr was not used because its image gateway did not support image inputs/edits.

Optionally add one PNG, JPEG, or WebP reference (up to 4 MB / 4,194,304 bytes), with preview, replacement, and removal. The selected Remy is **always image 1** (`input_references[0]`); the upload is **always image 2** (`input_references[1]`). Without an upload, only the Remy is sent. Refer to “image 1” and “image 2” in the prompt to describe their roles; prompts are only whitespace-trimmed, not silently rewritten. Uploads are sent to OpenRouter only on generation and add input-token cost.

Historical comparison before Qwen was disabled, using original art 777 and the same astronaut prompt:

| Model | Actual cost | Time |
| --- | ---: | ---: |
| GPT Image 2.5 Flare, low | $0.014502 | 12.1 s |
| Qwen Image 3, 1K | $0.033 | 62.3 s |

These are sample measurements, not latency or price guarantees. GPT is token-priced; Qwen's published input/output image rates were $0.003 + $0.03. Each result shows the provider-reported bill when available. Costs are sponsored by the site's configured account, not charged to a connected wallet.

Drafts are saved locally; only the latest result is saved in session storage, subject to browser quota. Uploaded reference bytes stay in tab memory, not local/session storage; upload them again after refreshing. The saved result retains the upload's filename and whether a second image was used, but not its preview bytes. In-flight requests, uploaded references, and results survive closing/reopening an OS window within the same browser tab. Keep the browser tab open during generation, and download images to retain them beyond the session. No automatic paid retries occur.

### Image service and local development

`workers/remy-remix` is an independent Cloudflare Worker on `basedremyboys.club/api/remix*`; it does not modify the indexer's `/api/admin/*` routes. `OPENROUTER_API_KEY` is a Worker secret, never a `VITE_*` variable. The Worker fetches only catalog images from the fixed site origin, allows only models in its enabled registry, and returns sanitized errors.

```sh
cd workers/remy-remix
bun install
# Put OPENROUTER_API_KEY in a private, ignored .dev.vars file.
bun run dev         # port 8788; explicitly enables localhost origins
```

In another terminal, run `npm run dev` at the frontend root. Vite proxies `/api/remix` to port 8788. Production rejects unrelated/localhost origins. The Pages preview hostname does not serve this API; use the custom domain to verify production generation.

Admission is atomic and durable: **5 attempts per network/IP per UTC day, 100 globally per UTC day, 3 concurrent generations**. Only IP hashes are stored. Paid attempts consume their allowance even if generation fails or times out; expired concurrency leases release automatically. These are request-count limits, not a guaranteed dollar cap. Set an OpenRouter key spending limit for an additional financial ceiling. Change limits in `workers/remy-remix/src/worker.ts`.

### Verification and deployment

```sh
# At frontend root:
npm run build

# In workers/remy-remix:
bun run typecheck
bun test
bun run deploy
bunx wrangler secret put OPENROUTER_API_KEY  # supply privately via stdin/prompt

# Back at frontend root, deploy the built package:
npx wrangler pages deploy dist --project-name remyboys --branch main
```

`GET /api/remix` exposes availability, model IDs, and limits. `POST /api/remix` accepts `{artIndex, prompt, model, referenceImage?}` and returns `{imageDataUrl, model, costUsd, artIndex, prompt, createdAt, referenceImageUsed}`. `referenceImage` must be a base64 PNG/JPEG/WebP data URL, never an external URL or an array. The browser decodes uploads before submission; the Worker checks the encoded/decoded size limits, base64 syntax, and matching raster signature before fetching art or consuming an allowance. Only the Worker builds the ordered model-reference list.

Verification covered real reference-image generation with both models, source/result attribution, window reopen during generation, desktop/Pocket rendering, PNG download, and live origin/catalog rejection. The upload flow was exercised with a real two-image GPT generation, removal/replacement, invalid/oversized files, and tab-memory-only upload persistence. Worker regression tests cover quota persistence, concurrency, lease expiry, midnight rollover, input boundaries (including uploaded references), and invalid provider output.
