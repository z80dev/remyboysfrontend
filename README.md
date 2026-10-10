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
- `src/apps/` — Welcome, Recovery Center, Approvals, Legacy Exchange, Remy Vault, Remy Trader, Send fREMY (`#/send`, plain ERC-20 `transfer` for wallets that don't list fREMY; after a failed send it offers a Permit2 route — approve Permit2, Permit2 `approve` to self, Permit2 `transferFrom` — for wallets that crash decoding unknown-token transfers), Gallery, Remix Studio, Remy TextEdit (`#/textedit`: every printable ASCII character typed or pasted becomes its Wingdings glyph via the Unicode mapping in `src/lib/wingdings.ts`, rendered with bundled Noto Sans Symbols 1/2 so no Wingdings font is needed), Remy Quest (iframe of `/quest/`), Display Properties.
- Remy Quest (`/quest/`, second Vite entry in `vite.config.ts`): standalone Pokémon-style game, vanilla TS + canvas + DOM, no React/wagmi. `src/quest/` — `world.ts` (grid movement, NPCs, trainers, encounters, render loop), `maps.ts` (maps, cast, story scripts), `battle.ts`, `menus.ts`, `dex.ts`, `viewer.ts`, `scenes.ts` (title, intro, starter, Hall of Fame), `gfx/` (procedural pixel-art tiles/sprites), `art/` (Remy art atlases), `audio.ts` + `music/` (runtime-synthesized soundtrack + SFX), `data.ts` (types, moves, per-art-index stats). The world renders to a low-res canvas upscaled by an integer factor; inside `.screen`, `1rem` = one game pixel. Touch devices get an on-screen pad. Save: `localStorage['remyquest.save.v1']`.
- Night of the Cabald (`/halloween/`, third Vite entry; OS app `#/halloween`, pumpkin icon): Halloween FPS that also plays inside an X post. See below.
- Winamp (`#/winamp`, lightning-bolt icon): classic Winamp 2.x (main window, equalizer, playlist editor, all three windowshades, docking/snapping, double size, Win32 menus, Z/X/C/V/B keys) in `src/winamp/`. It is a `skinned` + `persistent` app (`src/os/apps.ts`): no Luna frame (`ChromeContext` in `src/os/Window.tsx` hands it focus/minimize), and it stays mounted while minimized — on the desktop and behind the Pocket Today screen — so music keeps playing; closing it stops playback.
  - Skin: `skin/sprites.ts` is the .wsz sheet geometry (from Webamp, MIT). The default skin is our own procedural repaint of the 2.91 base skin (`skin/base.ts` + `skin/paint/`, ~30 ms, no bitmaps shipped). Dropping a real `.wsz` on the player, or Skins ▸ Load skin…, loads it (`skin/wsz.ts`: ZIP via `DecompressionStream`, BMPs, VISCOLOR/PLEDIT.TXT; missing sheets fall back to the default).
  - Player (`player/player.ts`, a module singleton outside React; `player/types.ts` is the UI contract): source → preamp → 10 peaking filters (Winamp bands, `presets.ts` = winamp.q1 presets) → balance → volume → analyser. Built-in songs are Song data rendered by the Remy Quest engine (`renderOffline`) in 8 s segments ahead of the playhead (`synth.ts`; intro + loops ≈ 2.5 min + 8 s fade, 16-bit LRU cache capped at 96 MB), so seeking anywhere works. Visitor files/URLs play through an `<audio>` element (titles from ID3/filename, `probe.ts`). Settings: `localStorage['remyamp.settings.v1']`; window layout: `remyamp.layout.v1`.
  - Playlist (`player/library.ts`): Remy Whippin' Intro and three Winamp-era originals in `src/winamp/songs/` (demoscene, eurodance, lo-fi), then the 12 Remy Quest tracks and Night of the Cabald.
- Remy Trader (`#/trader`): fREMY/ETH market from the shared Alchemy event index (`workers/remy-data`, `/api/data/snapshot`), order ticket via RemyRouter `buyFloor`/`sellFloor`, and a Uniswap v4 market-maker desk via PositionManager action scripts. The desk (`src/apps/TraderRange.tsx`, model in `src/lib/liquidityRange.ts`) places any range the pool's ticks allow, from one step to 0–∞, on a draggable liquidity chart; edges at the market stay anchored to it so asks stay fREMY-only and bids ETH-only. v4 math (TickMath, SqrtPriceMath, LiquidityAmounts) is ported to bigint in `src/lib/v4math.ts`.
- Wallpaper: `public/wallpaper/remy-bliss.svg` (the Remy kite is inline SVG in `src/os/Desktop.tsx`).
- Halloween: Display Properties offers the **Halloween** colour scheme (purple Luna, pumpkin Start button and tray) and the **Haunted Remys** wallpaper: a Halloween Remy full-bleed under a vignette, drifting fog and bats (`HauntedSky` in `src/os/Halloween.tsx`), a different one each visit unless one is pinned (desktop right-click → Summon a Halloween Remy). Through October, visitors without saved display prefs get both by default (`loadPrefs` in `src/os/shell.ts`). The free-mint flyer cross-fades six Halloween Remys.
- Deep links: `/#/<app>` (e.g. `/#/vault`, `/#/gallery/123`).
- Art: the art index is the last path segment of `tokenURI` (re-mints keep the original art); pictures come from `/media/remy/…` (see below).
- Recovery: one RemyReclaim per Payment Processor v2 theft wave (`RECLAIMS` in `src/config.ts`, read through `src/lib/reclaim.ts`): wave 1 (2026-09-26, 120 Remys, `data/owed.json`) and wave 2 (2026-09-28/29, 52 Remys from 17 wallets, `data/owed-2.json`). Wave 2 deploys from `remy-boys-recovery` with `OWED=data/owed-2.json forge script script/Deploy.s.sol --rpc-url base --broadcast` through the CREATE2 factory, so its address (`0xacDF…4DE6`) is fixed before deploy and anyone can broadcast it; until it has code the site treats wave 2 as not deployed. The collection owner then enables claims per wave (Launch Control or the Recovery Center owner row).
- Participant snapshot: `python3 scripts/participants.py [--min-hold-days 7] [--tiers 10,5,3,2]` scans every Transfer of the collection and rbREMY/rbREMYLS/wREMY/REMY/fREMY since the collection's deploy block (via `mainnet.base.org`) and writes `.cache/participants/remy-participants-<block>.csv`: every wallet holding Remy equivalents now (wallet balances, live fREMY/ETH v4 LP positions, and stolen NFTs RemyReclaim still owes) that held ≥ N days in one stretch, tiered 1–5 by Remys held now (`--tiers` are the floors of tiers 1–4). Wrapping, staking (rbREMYLS), LP adds/removes and the theft/re-mint don't break a streak. It drops wallets holding nothing now (full dumpers), snipers, protocol/marketplace contracts, and the attacker. Logs are cached per 20k blocks, so reruns only fetch new blocks.

## Art delivery (`/media/*`, R2)

Art is not in `public/` or the Pages build. Sources live in git under `media/` (`media/remy/Character<idx>.webp`, 600×600 originals; `media/quest/`, the Remy Quest art). `npm run media:sync` builds the variants and uploads them to the private R2 bucket `remy-media`; `workers/remy-media` serves it on `basedremyboys.club/media/*` with `Cache-Control: public, max-age=31536000, immutable` and the edge cache, so a browser downloads each file once.

- `remy/v1/<128|320|600>/<idx>.webp`: 128/320 are sharp resizes (WebP q82, ~4 KB / ~17 KB); 600 is the original bytes (~65 KB). `src/lib/media.ts`: `remyImg(idx, sizes)` gives `<img>` `src`/`srcSet`/`sizes` so the browser picks the smallest sufficient variant; `remySrc(idx, width)` for CSS/SVG/canvas. Pass the rendered CSS width as `sizes`. Bump `REMY_RECIPE` if the resize recipe changes.
- `quest/<hash>/<path>`: `media/quest/<path>` under a 16-hex content hash of the whole directory (`__QUEST_MEDIA__`, computed by `vite.config.ts`), so regenerated Quest art gets new URLs; use `questSrc(path)`.
- `halloween/v1/<128|320|600|1024>/<id>.webp`: Halloween Remys by token id; 1024 is the source in `media/halloween/<id>.webp`, the rest are the Remy recipe. `npm run halloween:art` (`scripts/halloween-art.mjs`) reads every minted token's `tokenURI` on Base, downloads new art from IPFS and regenerates `src/lib/halloweenIds.ts`; rerun it as more are minted, then `npm run media:sync`. Use `halloweenSrc`/`halloweenImg`.
- Pages `/assets/*` (Vite-fingerprinted JS/CSS, hex hashes) is immutable too (`public/_headers`). `functions/assets/_middleware.ts` turns Pages' SPA fallback (index.html, 200) for a missing asset into an uncached 404: during a deploy a new index.html can request a new asset from the old deployment, and the edge would otherwise cache that HTML as the asset for a year.
- `npm run dev`/`preview` serve `/media/*` from `media/` and `.cache/media` (resizing on first request); no network needed.
- `npm run media:sync` needs `MEDIA_UPLOAD_TOKEN` (the Worker secret; kept in the git-ignored `.env.local`). It lists the bucket through the Worker and uploads only objects whose MD5 differs, so reruns are cheap. **Run it before deploying Pages** whenever `media/` changed, or the new Quest hash 404s.
- Worker: `cd workers/remy-media && bun test && bun run deploy`. Rotate the token with `openssl rand -hex 32`, `bunx wrangler secret put MEDIA_UPLOAD_TOKEN`, and update `.env.local`.

## Remy Quest art pipeline

`npm run quest:art` regenerates the committed, deterministic Remy Quest art in two stages. Stage 1 (`scripts/quest-art.mjs`, needs `ffmpeg` and `cwebp`, e.g. `brew install ffmpeg webp`) writes `media/quest/art.json` (sampled palette, overworld look, art-derived type, epithet) and `minis.webp` (32×32 posterized portraits). Stage 2 (`scripts/quest-art.py`, run through `uv` with rembg/numpy/pillow) cuts every original out with rembg's `isnet-anime` model (masks cached in the git-ignored `.cache/quest-art/`; ~40 min the first time, ~2 min after) and paints:
- `sprites/<idx>.webp` (76×116) and `sprites/far/<idx>.webp` (52×79, the distant foe): full-body pixel chibis — area-reduced cut-out, median-cut palette, generated legs and shoes, tinted outline. Lazy-loaded per Remy (~2 KB each).
- `heads.webp` / `sides.webp`: 16px front/profile overworld heads with the real hair silhouette and a repainted face (hand-placed eyes, brows, mouth), sharing one 256-colour palette.
- the canonical `bald` flag in `art.json`. `scripts/quest-bald.json` is the reviewed Cabald roster (240 Remys): detector candidates (crown vs cheek chromaticity + texture) checked by eye.

`src/quest/art/index.ts` loads the atlases behind the boot screen (`art.get/head/side/mini`, `art.sprite(idx, far?)`, `art.baldList()`). Sprites are never mirrored: shirt slogans and meme captions are part of the art. Story Remys keep their fixed types (`TYPE_OVERRIDE` in `data.ts`); every other Remy's type comes from its art.

Where the art shows up:
- Overworld (`world.ts`, `gfx/`): real-clock time of day (`gfx/daylight.ts`; dev override `?hour=21`) with a pixel lighting pass, lit windows and lamps, water reflections, footprints, dither fades and themed battle wipes. The player is the Remy chosen at new game (`S.avatar`, never bald); NPCs, the follower (lead party Remy) and roaming wild Remys use their real pixel heads.
- THE FLOOR museum (Liquidity City house door at 22,18; `maps.ts`, `gfx/`): framed originals, hologram pedestals, curator quest with three living paintings (one-time catchable battles; mint one or meet all three for the Patron reward). Billboards in Liquidity City and Genesis Town. Any exhibit opens `viewArt(idx)` (`viewer.ts`), the HD museum viewer.
- Battles (`battle.ts` rules/sequencing; `battle/stage.ts`, `fx.ts`, `sprites.ts`, `backdrops.ts` + `bg/`, `splash.ts` presentation): a low-res canvas scene with seven parallax pixel backdrops, sprites on themed pads, per-move pixel FX, catch/faint/level-up choreography, VS and Cabald splashes, and a Mint Certificate on every catch.
- UI (`skin.ts` pixel 9-slice frames, icons and sprite busts; `ui.ts`, `menus.ts`, `dex.ts`, `style.css`): speaker busts in text boxes, Emerald-style party/summary/bag, REMYDEX with a CABALD filter, trainer card. `shell.ts`/`shell.css`: the REMY ADVANCE handheld on desktop, touch layouts on phones.
- Scenes (`scenes.ts`, `scenekit.ts`, `scenestage.ts`): animated pixel title, staged Prof. intro, naming board, choose-your-Remy picker, starter lab, Hall of Fame and credits.

## Night of the Cabald (`/halloween/`, playable inside an X post)

A Halloween retro FPS in vanilla TS (~27 KB gzipped). You play as your chosen Remy (HUD face, hands in its palette) in the haunted Remy mansion: gallery (walls of Remy portraits that turn spectral when lightning strikes), ballroom, foyer, crypt, library and a moonlit graveyard. Endless waves of Cabald grunts (bald Remys, rotted green, rising from graves), ghosts (any Remy, glowing negative, through walls), kamikaze jack-o'-lanterns, fireball admins, and THE CABALD boss every 5th wave. Weapons: Candy Popper, Boomstick (gallery), Sugar Rush (crypt), Jack Launcher (graveyard after wave 3); lanterns chain-explode. Score = kill points × combo (up to ×10) + wave bonuses.

- `src/haunt/`: `render.ts` (software raycaster into a packed framebuffer: DDA walls, floor/ceiling casting, sky panorama, bilinear tile lighting + lantern, fog, z-buffered billboards), `level.ts` (carved map, baked/dynamic light, BFS flow field), `game.ts` (simulation), `gfx.ts` (procedural textures/sprites; Quest sprites recoloured into monsters), `assets.ts` (art catalogue, 128px faces, ~14 Quest sprites), `hud.ts`, `input.ts` (WASD + pointer-lock mouse with drag-to-look fallback; touch: left thumb stick, right thumb aim + fire, tap the left status panel to swap weapons), `audio.ts` + `song.ts` (synth SFX; music through the Remy Quest engine, a Toccata-in-D-minor metal loop). Storage (best, chosen Remy, mute) is optional, so sandboxed embeds still play.
- X player card: `halloween/index.html` sets `twitter:card=player` with a 480×480 `twitter:player` pointing at itself and `public/halloween/card.png` as the poster. A post containing `https://basedremyboys.club/halloween/` plays inline.
- Share loop: game over offers "Post your score" (X intent, `via=basedremyboys`) linking `/halloween/?s=<score>&w=<wave>&r=<remy>`, which opens on a "beat it" dare. The Pages Function `functions/halloween/[[path]].ts` rewrites that link's card title and player URL (HTMLRewriter; other paths untouched). `npx wrangler pages deploy dist` from the repo root ships it with the site; `npx wrangler pages dev dist` runs it locally.

## Remy Quest story: Base, the chains and THE CABALD

The game is "A Base Adventure": Genesis Town, Mempool Meadow, Liquidity City, THE FLOOR and Rug Pull Canyon are all on Base. Prof. Gwei is a mainnet veteran who moved to Base for the gas. Ethereum mainnet, Solana and Robinhood Chain appear as visiting cultures (light, affectionate parody; no prices or logos). Their main stage is the **Bridge Terminal** in Liquidity City (`bridge.ts`, `gfx/terminal.ts`; door at city 5,19), which has a departures board and chain gates. The optional Bridge Tour has four trainers (Base customs, mainnet, Solana, Robinhood Chain) and awards 2 Ledger Pros + 1 Max Hopium once (`frequent_bridger`). A Cabald courier there exposes the drain.

The Cabald ("There is no Cabald. I love you.") is a cross-chain cabal draining liquidity from every chain through the Rug Tower, their "unofficial bridge". **Every bald Remy is a Cabald member, and only bald Remys are** (`art.get(idx).bald`): Cabald roles resolve at runtime through `cabaldRemy(seed)`, everyone else through `civRemy(seed)` (`data.ts`, `maps.ts` `resolveCast`), wild encounters/roamers/starters/gifts never roll a bald Remy, and the REMYDEX lists members as uncatchable (completion counts mintable Remys only). Dev builds run `auditCast()` (`castcheck.ts`) after boot and log any violation. The Cabald has uniformed grunts on every map, the recurring admins SHORT & SQUEEZE, ADMIN ESCROW occupying the Exchange until beaten, propaganda billboards, and the RUG LORD as CABALD BOSS. The finale returns liquidity to all four chains. Cabald trainers (a `CABALD` title or a bald portrait) get the Cabald battle presentation (propaganda splash, delayed "I love you.", boss cracks, a torn banner on the last faint), and grunts use the `cabald` music track. Loading an old save restores the `dex` and `badge_rug` flags a player should already have, and replaces a missing or bald avatar (`state.ts`).

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

`workers/remy-remix` is an independent Cloudflare Worker on `basedremyboys.club/api/remix*`. `OPENROUTER_API_KEY` is a Worker secret, never a `VITE_*` variable. The Worker reads source art straight from the `remy-media` R2 bucket (`MEDIA` binding, `remote = true` so `wrangler dev` reads the real bucket), allows only models in its enabled registry, and returns sanitized errors.

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
# At frontend root (upload new/changed art first):
npm run media:sync
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

## Shared chain data and Alchemy

`workers/remy-data` serves `/api/data/snapshot` and `/api/data/health` on the production domain. One durable SQLite-backed index owns the pool event cursor and the complete published snapshot for all visitors. Two server-side Alchemy log subscriptions watch this pool and the Remy/fREMY/vault contracts; event bursts coalesce into at most one refresh per 15 seconds. A 60-second heartbeat recovers missed events, reconnects subscriptions, and updates LP ownership; if subscriptions are unavailable it polls every 30 seconds. Every refresh reads the current block, backfills from the durable cursor with a 128-block reorg overlap, and pins grouped public/LP reads to that same block with Multicall3. The small launch quote runs as a separate eth_call. Current live data needs five RPC calls per refresh, independent of visitor count.

The public API is a fixed read-only snapshot, not an arbitrary RPC proxy. It uses a 15-second edge cache; the frontend shares one React Query entry and one 30-second polling timer across all windows. Welcome/Today stats, the network tray, market history, pool availability, and LP positions use this API. Quotes for the selected order, wallet balances, NFT enumeration/metadata, approval checks, and receipt checks still read Alchemy or the wallet directly. Grouped caller-independent reads use bounded Multicall3 batches; the quoter preserves its direct-call context. A confirmed transaction invalidates frontend caches once at the end of the sequence. The server preserves its last complete snapshot on a failure and answers 503 after two minutes of staleness; it never substitutes empty market data.

`.env.production` contains the **public browser key**, Alchemy app `remy frontend`, restricted to `basedremyboys.club` and the contract allowlist. Its presence in the shipped bundle is intentional. The private `newremy` server key is stored only as the `remy-data` Worker's `ALCHEMY_API_KEY` secret. JPEG Markets credentials and allowlists are independent. Wallet chain registration uses the wallet's normal chain RPC because the website-only key rejects wallet/server origins. For local development use a separate development key; for forks also set `VITE_DATA_API` to a service indexing that fork.

```sh
cd workers/remy-data
bun install --frozen-lockfile
bun test
bun run typecheck
bunx wrangler secret put ALCHEMY_API_KEY # private server key, supplied via stdin/prompt
bun run deploy
curl https://basedremyboys.club/api/data/health
# Wait for ok:true before deploying the frontend:
cd ../..
npm run build
npx wrangler pages deploy dist --project-name remyboys --branch main
```

The 128-block overlap handles shallow reorgs; a deeper historical reorg requires rebuilding the index. The API exposes `generatedAt` and the indexed block, and its health endpoint reports subscription count and refresh failures.
