export const PAD_BUTTON = 56
export const PAD_SIZE = PAD_BUTTON * 3 + 8
export const HEADER_HEIGHT = 48
/** Fit the fixed logical board to its actual client, reserving reachable controls rather than relying on viewport width. */
export function fitBoard(width: number, height: number, menuHeight: number, controls: boolean, statusHeight = 0) {
  const landscape = controls && width > height && width >= 480
  const padding = controls || width < 400 || height < 470 ? 8 : 16
  const playHeight = Math.max(0, height - menuHeight - HEADER_HEIGHT - statusHeight)
  const controlSpace = controls ? PAD_SIZE + 16 : 0
  const availableWidth = Math.max(0, width - padding * 2 - (landscape ? controlSpace : 0))
  const availableHeight = Math.max(0, playHeight - padding * 2 - (landscape ? 0 : controlSpace))
  const board = Math.min(368, availableWidth, availableHeight)
  return { board, padding, landscape, playHeight }
}
