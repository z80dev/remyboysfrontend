/** localStorage that never throws: a sandboxed post embed may deny storage entirely, and the game must still run. */
export function load(key: string): string | null {
  try {
    return localStorage.getItem(key)
  } catch {
    return null
  }
}

export function save(key: string, value: string) {
  try {
    localStorage.setItem(key, value)
  } catch {
    // Storage denied (sandboxed iframe, private mode): settings just don't persist.
  }
}
