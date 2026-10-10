/**
 * Wingdings: the Unicode character for each printable ASCII byte (0x21–0x7E) in the Windows Wingdings font,
 * per Unicode's Wingdings/Webdings compatibility mapping (L2/13-120). Index 0 is "!".
 */
const GLYPHS = [
  '🖉', '✂', '✁', '👓', '🕭', '🕮', '🕯', '🕿', '✆', '🖂', '🖃', '📪', '📫', '📬', '📭', '📁',
  '📂', '📄', '🗏', '🗐', '🗄', '⌛', '🖮', '🖰', '🖲', '🖳', '🖴', '🖫', '🖬', '✇', '✍', '🖎',
  '✌', '👌', '👍', '👎', '☜', '☞', '☝', '☟', '🖐', '☺', '😐', '☹', '💣', '☠', '🏳', '🏱',
  '✈', '☼', '💧', '❄', '🕆', '✞', '🕈', '✠', '✡', '☪', '☯', 'ॐ', '☸', '♈', '♉', '♊',
  '♋', '♌', '♍', '♎', '♏', '♐', '♑', '♒', '♓', '🙰', '🙵', '●', '🔾', '■', '□', '🞐',
  '❑', '❒', '⬧', '⧫', '◆', '❖', '⬥', '⌧', '⮹', '⌘', '🏵', '🏶', '🙶', '🙷',
]

/** Rewrites every printable ASCII character as its Wingdings glyph; spaces, newlines and anything else pass through. */
export function toWingdings(text: string): string {
  let out = ''
  for (const ch of text) {
    const code = ch.charCodeAt(0)
    out += code > 0x20 && code < 0x7f ? GLYPHS[code - 0x21] : ch
  }
  return out
}
