export const strings = {
  title: 'Taipei',
  start: 'Match the tiles. Free the Remys.',
  flavour: '144 tiles. Four are definitely not the Cabald.',
  version: '5.1 (Build 2600.remy_sp2.4490)',
  about: ['Remade for the Remy Boys community, 2026.', 'After Taipei (1990) by Dave Norris (Microsoft Entertainment Pack 1).', 'This product is licensed to: Remy Boy', 'Remys available to Remy OS: 4,490'],
  menu: { game: '&Game', options: '&Options', help: '&Help', new: '&New', select: '&Select Game…', restart: 'Start &Over', backup: '&Backup', hint: '&Hint', best: 'Best &Times…', exit: 'E&xit', layout: '&Layout', solvable: '&Solvable Deals', timer: 'Show &Timer', free: 'Highlight &Free Tiles', sound: '&Sound', tiles: 'Tile &Set', contents: '&Contents', about: '&About Taipei…' },
  layouts: { standard: 'Standard', bridge: 'Bridge', castle: 'Castle', 'rug-tower': 'Rug Tower', pyramid: 'Pyramid', spiral: 'Spiral', flag: 'The Flag' },
  sets: { remy: 'Remy', classic: 'Classic' },
  noMoves: 'There are no more moves.',
  noHint: 'No matching pairs. Try Backup.',
  win: 'Congratulations! You removed all 144 tiles.',
  record: 'A new best time for this layout.',
  selectPrompt: 'Select a game number from 1 to 99999:',
  invalidNumber: 'Enter a whole number from 1 to 99999.',
  selectTitle: 'Select Game',
  layoutTitle: 'Layout',
  tileTitle: 'Tile Set',
  bestTitle: 'Best Times',
  bestHeading: 'Fastest Tile Matchers',
  helpTitle: 'Taipei Help',
  rulesTitle: 'Rules', scoringTitle: 'Scoring', keyboardTitle: 'Keyboard', tipsTitle: 'Tips',
  help: {
    Rules: 'Remove two free matching tiles. A tile is free when no tile covers it and either its left or right side is open. Identical faces match. Any Flower matches any Flower; any Season matches any Season. Remove all 144 tiles to finish. The Seasons are interchangeable. Just like their alibis.',
    Scoring: 'Taipei has no score. The timer measures visible playing time. It continues when another window is active, and stops when Taipei is minimized. Best times are recorded separately for each layout. Solvable deals guarantee a solution at the start, not after every possible match.',
    Keyboard: 'F2 starts a new game. F3 selects a numbered game. Arrows move to the nearest free tile in that direction; Space selects it. H cycles through available pairs. Ctrl+Z backs up one match. F1 opens Help. Hold P or the right mouse button to peek. On a touch screen, hold for a moment to peek. Double-tap, press + or −, or use the zoom button for 2×; drag to pan.',
    Tips: 'Free the edges first. The Remys in the middle are patient. Backup restores removed pairs in reverse order. Start Over repeats the same numbered deal. Solvable Deals is on by default; turn it off for classic random deals. Hint identifies a legal pair, not necessarily a winning move.'
  },
  ok: 'OK', cancel: 'Cancel', newGame: 'New Game', backup: 'Backup', startOver: 'Start Over',
  zoom: 'Zoom', zoomIn: '2×', zoomOut: '1×', zoomLabel: 'Toggle 2× zoom',
  peekLabel: 'Peeking beneath tiles',
  freeLabel: 'free', blockedLabel: 'blocked', selectedLabel: 'selected',
  suits: ['Coins', 'Candles', 'Remys', 'Dots', 'Bamboo', 'Characters'],
  winds: ['East', 'South', 'West', 'North'],
  compass: ['E', 'S', 'W', 'N'],
  chains: ['BASE', 'MAIN', 'SOL', 'HOOD'],
  dragons: ['BULL', 'BEAR', 'WHALE'],
  classicDragons: ['Red Dragon', 'Green Dragon', 'White Dragon'],
  flowers: ['Plum', 'Orchid', 'Chrysanthemum', 'Bamboo'],
  seasons: ['Spring', 'Summer', 'Autumn', 'Winter'],
  numerals: ['一', '二', '三', '四', '五', '六', '七', '八', '九'],
  flowerGlyph: 'F', seasonGlyph: 'C', coinGlyph: 'f',
  tilesLeft: (n: number) => `Tiles left: ${n}`,
  gameNumber: (n: number) => `Game #${n}`,
  time: (value: string) => `Time: ${value}`,
  match: (n: number) => `Match removed. ${n} tiles left.`,
  restored: (n: number) => `Pair restored. ${n} tiles left.`,
  tile: (label: string, status: string) => `${label}, ${status}`,
  hintPair: (a: string, b: string) => `Hint: ${a} and ${b}.`,
  geometryError: 'Taipei layout has no removable geometry ordering'
}
export type HelpTab = keyof typeof strings.help
export function faceLabel(face: number, classic: boolean): string {
  if (face < 27) return `${strings.suits[Math.floor(face / 9) + (classic ? 3 : 0)]} ${face % 9 + 1}`
  if (face < 31) return classic ? strings.winds[face - 27] : `${strings.chains[face - 27]} (${strings.winds[face - 27]})`
  if (face < 34) return (classic ? strings.classicDragons : strings.dragons)[face - 31]
  return face < 38 ? strings.flowers[face - 34] : strings.seasons[face - 38]
}
