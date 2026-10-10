export const S = {
  title: 'Solitaire', deal: '&Deal', undo: '&Undo', deck: 'Dec&k…', options: '&Options…', exit: 'E&xit', contents: '&Contents', about: '&About Solitaire…',
  game: '&Game', help: '&Help', optionTitle: 'Solitaire Options', draw: 'Draw', one: 'Draw One', three: 'Draw Three', scoring: 'Scoring',
  standard: 'Standard', vegas: 'Vegas', none: 'None', timed: 'Timed game', status: 'Status bar', outline: 'Outline dragging', keep: 'Keep score', sound: 'Sound',
  ok: 'OK', cancel: 'Cancel', yes: 'Yes', no: 'No', confirm: 'This will end the current game. Do you want to continue?', again: 'Deal again?',
  cabald: 'There is no Cabald. I love you.', bankTip: 'Play money. Do not bridge.', score: 'Score:', time: 'Time:',
  won: 'You won. Press any key or click to skip the bouncing cards.', dealt: 'A new game has been dealt.', moved: 'Card moved.', flipped: 'Card turned over. Five points.',
  drawn: 'Stock drawn.', invalid: 'That move is not allowed.', undone: 'Last move undone.', picked: 'Card picked up.', cancelled: 'Pickup cancelled.',
  stock: 'Stock', waste: 'Waste', foundation: 'Foundation', tableau: 'Tableau', helpTitle: 'Solitaire Help',
  flavour: 'Still the most-used program on Remy OS.', version: '5.1 (Build 2600.remy_sp2.4490)',
  credits: ['Remade for the Remy Boys community, 2026.', 'After Microsoft Solitaire (1990) by Wes Cherry, cards by Susan Kare.',
    'This product is licensed to: Remy Boy', 'Remys available to Remy OS: 4,490'],
  sections: {
    Rules: 'Build tableau piles downward in alternating colors. Move an exposed run as a unit. Only a King may fill an empty column. Click an exposed face-down card to turn it over. Build foundations upward by suit from Ace to King; foundation cards may return to the tableau. Only the top waste card may be played.',
    Scoring: 'Standard: waste to tableau +5; any card to foundation +10; turning a card +5; foundation to tableau −15. Recycling costs 100 in Draw One or 20 in Draw Three; score cannot fall below zero. Timed play costs 2 points every 10 seconds and awards floor(700000 / seconds) on wins lasting at least 30 seconds. Vegas: each deal costs $52, each foundation card pays $5; returning it costs $5. Draw One permits one pass; Draw Three permits three. Keep score carries your bank. None hides scoring. Play money. Do not bridge.',
    Keyboard: 'Left and Right select stock, waste, foundations, then the seven tableau columns. Up and Down select an exposed card within a column. Space or Enter picks up or drops a card; on the stock it draws. Escape cancels a pickup. Ctrl+Z undoes one move. F2 deals; F1 opens Help. Alt+Shift+2 completes the game.',
    Tips: 'Double-click within 500 milliseconds or right-click a card to send it home. Right-click or long-press the felt to send all possible cards home. On touch, tap a card and then its destination, or drag. Ctrl+Alt+Shift-click draws one card in Draw Three. Any click or key skips the win cascade.'
  }
}
