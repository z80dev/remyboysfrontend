/**
 * Procedural pixel renderer design for Remy's Challenge (EP4 look).
 * All sprites are 32x32 at 1x, drawn with fillRect on integer coordinates, no smoothing.
 * Coordinates below are pixels inside the 32 px cell; "1px dark outline" means #000000.
 */

/** 16-colour-ish palette. Every tile/sprite uses only these. */
export const PALETTE = {
  black: '#000000', white: '#ffffff', grey: '#c0c0c0', dark: '#808080', charcoal: '#404040',
  floor: '#c0c0c0', floorLine: '#a0a0a0',
  wall: '#808080', wallHi: '#e0e0e0', wallLo: '#404040',
  water: '#0040c0', waterHi: '#4080ff', waterLo: '#002080',
  fire: '#e02000', fireMid: '#ff8000', fireHi: '#ffe040',
  ice: '#c0e0ff', iceHi: '#ffffff', iceLo: '#80a0e0',
  force: '#a0a0a0', forceArrow: '#40c040',
  gold: '#f0c020', goldHi: '#fff080', goldLo: '#a07000',
  blue: '#3070ff', red: '#e02020', green: '#20c020', yellow: '#f0e000',
  brown: '#8a5020', dirt: '#8a6030', gravel: '#909090', purple: '#a040c0', cyan: '#40e0e0',
  checkA: '#008000', checkB: '#00a000'
} as const

export const KEY_COLORS = { blue: PALETTE.blue, red: PALETTE.red, green: PALETTE.green, yellow: PALETTE.yellow } as const

/** Bottom-layer tile looks. Animated tiles cycle `frames` on a 4-frame / 200 ms clock shared by all tiles. */
export const TILE_SPEC = {
  Floor: 'grey #c0c0c0 with 1px #a0a0a0 grout on right and bottom edges (tiles read as a grid).',
  Wall: 'raised bevel: #808080 face, 2px #e0e0e0 top/left, 2px #404040 bottom/right.',
  Chip: 'floor; 18x18 silicon frame at (7,7) #202020 with 3 grey pins per side; inside a 14px gold coin (gold, goldHi top-left arc, goldLo bottom-right arc) with a 3x7 black lowercase f at centre.',
  Socket: '"Bridge Gate": floor; two dark pillars at x 3-8 and 24-29; gold lattice bars between them every 4px; a 6x6 chip silhouette notch at centre.',
  Exit: 'black square with concentric blue/cyan/white squares at 4px steps; frames rotate colours outward (portal shimmer).',
  Water: 'water fill; 3 wavy waterHi ripple lines (2px tall, 8px period) whose x offset shifts 2px per frame; waterLo dots under each crest.',
  Fire: 'red base; 3 flame tongues (fireMid outer, fireHi core) heights 18/24/14, heights rotate per frame.',
  Ice: 'ice fill; diagonal iceHi highlight stripe from (4,26) to (26,4), 3px wide; iceLo 1px border.',
  IceCorner: 'IceNW/NE/SW/SE: ice plus a wall-bevel triangle filling the named corner half (the blocked edges).',
  Force: 'force grey; two forceArrow chevrons pointing in direction, scrolling 4px per frame toward that edge. ForceRandom: four-way arrows that flicker direction each frame.',
  Key: 'floor; key in key colour: 8px ring at top-left (2px stroke, hollow), 14px shaft to bottom-right, two teeth. 1px black outline.',
  Door: 'raised bevel in key colour; black keyhole (4px circle + 2x6 slot) centred.',
  Boots: 'floor; item drawn centred 20px: Flippers = two cyan duck-foot shapes; Fire Boots = red boot with yellow flame stripe; Ice Skates = grey boot with white blade; Suction Boots = brown boot with 3 black cup dots under sole.',
  Dirt: 'dirt brown with scattered darker 2px clods.',
  Gravel: 'gravel grey with a dense 2px speckle of white/charcoal.',
  Bomb: 'floor; 16px black sphere with white glint, brown fuse with fireHi spark (spark blinks per frame).',
  Trap: 'floor; brown recessed square (inset bevel) with two dark jaw bars; open trap lighter.',
  Clone: 'charcoal machine with grey rivets and a dark slot facing the clone direction.',
  Buttons: '12px round button, 2px inset bevel: Brown=brown, Red=red, Green=green, Blue=blue. Pressed state is 1px lower with darker face.',
  ToggleWall: 'closed = wall bevel tinted green outline; open (ToggleFloor) = floor with green dashed square outline.',
  Teleport: 'blue whirl: concentric blue/cyan rings, rotating 90 deg per frame.',
  Thief: 'floor; ABSOLUTELY NOBODY: real bald head (cabald seed 10, 16px scaled 2x) on a dark cape; placeholder = flat charcoal silhouette.',
  Hint: 'floor; recessed grey square with a black bold "?" glyph.',
  Popup: 'floor with a raised 4px-high dark rim ring (looks like a ridge).',
  InvisibleWall: 'drawn as floor. HiddenWall: floor until bumped, then plain wall.',
  BlueWall: 'BlueWall and FakeBlueWall identical: raised bevel, blue face, waterHi bevel. Never distinguish them visually.',
  Thin: 'floor with a 3px wall-bevel strip along the named edge(s) (ThinSE = bottom and right).',
  RecessedWall: 'floor with an inset bevel square (like Popup but sunken).'
} as const

/** Player (your Remy). Head = Quest 16px head scaled 2x into y 0-15, x 8-23; body drawn procedurally y 16-31. */
export const HERO_SPEC = {
  body: 'shirt colour from loadPalette(remy).shirt: torso 12x8 at (10,16), arms 3x7 at both sides; legs 4x7 dark blue jeans at x 11-14 and 17-20; black 4x2 shoes. 1px black outline around silhouette.',
  south: 'front head atlas rect; arms down; shoes forward.',
  east: 'profile head atlas rect; one arm forward, legs in stride (alternate per step).',
  west: 'profile head flipped horizontally (allowed for 16px heads); mirrored body.',
  north: 'back of head: head silhouette from the front rect filled with palette.hair, a 2px darker crown band; body shows back of shirt, no face.',
  swim: 'water tile under; only the head (front) visible at y 6-21, lower half covered by 2 ripple rows; small white splash pixels at sides. Used for flippers-in-water and the drown frame.',
  burnt: 'charcoal-tinted head silhouette (multiply #404040), black smoke puffs above, body replaced by a small ash pile of charcoal/fireMid pixels.',
  placeholder: 'until heads decode: flat silhouette in palette.hair (or #6b3a1a) for head, shirt-colour body.'
} as const

/** All nine monsters. Each faces its direction; rotate the pattern, never mirror Remy art. 2-frame walk wobble. */
export const MONSTER_SPEC = {
  bug: 'Mempool Bug: purple oval beetle 18x14, six 1px black legs, two antennae forward, white "tx" stripe dots on back.',
  paramecium: 'Gas Spike: cyan teardrop flame-of-gas with 4 spiky points, a little gas-pump nozzle on the rear; spikes alternate per frame.',
  fireball: 'Burn: 18px fireball (fireHi core, fireMid ring, fire edge) with a trailing tail opposite to direction; flicker per frame.',
  glider: 'Airdrop: white paper plane, grey fold line down the middle, nose in direction; tiny blue shadow under it.',
  ball: 'Hopium Ball: 18px pink/purple sphere with white highlight and a green up-arrow printed on it; squash 2px on bounce frame.',
  tank: 'Escrow Tank: dark green body 22x16, grey treads, short barrel in direction, gold circle with a black C on the turret.',
  walker: 'FUD Walker: grey storm-cloud body with two stubby black legs and a yellow lightning bolt; legs alternate per frame.',
  blob: 'Rug Blob: carpet slime: red rug with yellow fringe tassels at the edges and a geometric diamond pattern; edges ripple per frame.',
  teeth: 'Cabald Grunt: real bald Remy head (loadHeads rect of a loadCabald index, seeded per level) scaled 2x on a black cape body with red lining; front/profile/back like the hero. Only monster using Remy art.'
} as const

export const BLOCK_SPEC = 'Block: brown crate: raised bevel (#c08040 hi, #603010 lo), brown face with an X of two 2px darker planks.'

/** Options > Color Off: 1-bit homage. */
export const MONOCHROME_SPEC = {
  palette: 'only black, white and #808080; dithered 50% checker for any mid tone.',
  rule: 'every tile and item must remain identifiable by shape/symbol alone. Draw a small black symbol centred where colour carried meaning.',
  symbols: {
    keysAndDoors: 'blue = circle, red = diamond, green = triangle, yellow = square (on the key bow and on the door keyhole plate).',
    water: 'horizontal wavy lines', fire: 'flame outline', ice: 'diagonal hatching', force: 'arrows only',
    buttons: 'Brown = "T" (trap), Red = "+" (clone), Green = "/" (toggle), Blue = "<>" (reverse)',
    boots: 'outline drawings plus letter F, B, S, U (Flippers, Boots, Skates, sUction) in a corner'
  },
  sprites: 'monsters and hero become black outline + white fill; Remy heads are converted to 3-level grey.'
} as const

/** Window chrome. */
export const CHROME_SPEC = {
  background: '32px checkerboard checkA/checkB, each tile with a 1px lighter top-left and darker bottom-right line.',
  viewport: '4px Win9x sunken bevel around the 288x288 viewport.',
  panel: 'labels LEVEL / TIME / CHIPS LEFT in bold 11px black over red kit LED digits; inventory 4x2 recessed 32px slots (keys top row, boots bottom row; key count shown as small digit).'
} as const
