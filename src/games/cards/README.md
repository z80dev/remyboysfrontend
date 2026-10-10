# Remy Cards.dll

Shared by Solitaire, FreeCell, Spider Solitaire, and The Remy Hearts Network. This module has no Games-folder entry.

## Rules and rendering boundary

Rule engines import `model.ts`: physical card IDs, rank-major Clubs/Diamonds/Hearts/Spades decks, seeded shuffling, colour and accessible labels, native geometry, stack hit-testing, and movement timing. Cards are 71 × 96 logical pixels; games scale the canvas context and convert pointer coordinates back into logical coordinates.

UI layers import `index.ts`. `drawFace`, `drawBack`, `drawEmpty`, and `drawHighlight` paint synchronously without owning a loop. Face rank/suit indices are procedural pixel masks. Courts resolve the canonical Quest civilian/Cabald identities lazily through the games kit; the Jack of Spades shows SHORT above and SQUEEZE rotated below. Portraits never mirror. An offline portrait retains a readable patterned monogram. `subscribeCardArt` requests a redraw when a lazy image finishes decoding.

## Backs and interaction

`useDeckBack` and `DeckDialog` share a validated `{ back, remy }` preference at `remygames.cards.v1`. The thirteen backs reproduce the classic small-card silhouette with Remy motifs. Cancel does not write a choice; OK and a double-click commit it. My Remy validates against the kit's Cabald roster before selection. A corrupt choice falls back to Luna Lattice.

`useStockAnimation` sleeps for 6–10 seconds between brief cycles and never runs while hidden or dragging. Only stock/undealt piles use its clock: exposed back fans and the Deck dialog remain static.

`useCardPointer` handles pointer capture, drag thresholds, Windows' 500 ms double-click interval, and a 450 ms touch/pen long-press with ring progress and vibration. Games own move legality, keyboard selection, and drawing either a full-card or outline drag overlay. Pass `disabled` while hidden or blocked by a dialog.

`useCardTweens` supplies transient ease-out overlays for 120–220 ms moves and deals. Commit the pure engine transaction first, omit those physical card IDs from the static layer, and draw the hook's positions last. Hidden windows and reduced-motion users skip movement. No requestAnimationFrame remains scheduled after a tween completes.

All seven card effects are synthesized through the kit, softly filtered, global-mute-aware, and rate-limited. No audio files or private audio contexts are used. Game celebrations own their jingles.

## Regression checks

`bun test tests/games/cards.test.ts` checks deck ordering, physical-card uniqueness, seeded shuffle integrity, accessible court labels, pile hit-test boundaries, mixed fan offsets, double-click timing, and tween timing. The four game test files independently cover their rules and scoring. Browser review covers native and Pocket geometry, portrait fallbacks, thirteen previews, selection sharing, and animated-stock lifecycle.
