export const deckStrings = {
  title: 'Select Card Back',
  promptTitle: 'My Remy',
  prompt: 'Art index (0 to 4489):',
  random: 'Random',
  invalid: 'Enter an art index from 0 to 4489.',
  bald: 'That Remy is busy not existing. Pick another.',
  unavailable: 'The Remy catalog could not be loaded. Please try again.',
  ok: 'OK',
  cancel: 'Cancel',
} as const

export const CARD_RANK_NAMES = ['', 'Ace', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Jack', 'Queen', 'King'] as const
export const CARD_COURT_NAMES = {
  hearts: ['Rival', 'Nurse', 'Prof. Gwei'],
  diamonds: ['Clerk', 'Curator', 'Maxi'],
  clubs: ['the Remy Boys club', 'the Remy Boys club', 'the Remy Boys club'],
  spades: ['Short and Squeeze', 'the Rug Lord', 'Admin Escrow'],
} as const
export const FACE_DOWN_LABEL = 'Face-down card'
export const CARD_BACKS = [
  { id: 0, name: 'Luna Lattice', animated: false },
  { id: 1, name: 'Red Weave', animated: false },
  { id: 2, name: 'Remy-Bot', animated: true },
  { id: 3, name: 'I Love You Roses', animated: false },
  { id: 4, name: 'Mempool Ivy', animated: false },
  { id: 5, name: 'Whale Watch', animated: false },
  { id: 6, name: 'Rug Tower', animated: true },
  { id: 7, name: 'Base Beach', animated: true },
  { id: 8, name: 'Ace Up the Sleeve', animated: true, tooltip: 'There is no ace.' },
  { id: 9, name: 'fREMY Gold', animated: false },
  { id: 10, name: 'The Flag', animated: false },
  { id: 11, name: 'Haunted Remys', animated: false },
  { id: 12, name: 'My Remy…', animated: false },
] as const
