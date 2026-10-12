import { HEIGHT, WIDTH } from './engine'

export const STATUS_HEIGHT = 56
export const CONTROL_HEIGHT = 60
const MIN_GUTTER = 104

/** Fit the fixed logical field into the measured client body, not the browser's nominal width. */
export function fitField(width: number, height: number, controls: boolean) {
  // A short portrait body is not landscape unless its width can spare both gutters and a useful field.
  const landscape = controls && width >= MIN_GUTTER * 2 + WIDTH / 2 &&
    width > height * 1.5 && height < HEIGHT + STATUS_HEIGHT + CONTROL_HEIGHT
  const availableWidth = landscape ? Math.max(0, width - MIN_GUTTER * 2) : width
  const availableHeight = landscape ? height : Math.max(0, height - STATUS_HEIGHT - (controls ? CONTROL_HEIGHT : 0))
  const scale = Math.max(0, Math.min(1, availableWidth / WIDTH, availableHeight / HEIGHT))
  return { width: WIDTH * scale, height: HEIGHT * scale, landscape }
}
