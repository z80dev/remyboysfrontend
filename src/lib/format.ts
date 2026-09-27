import { formatUnits } from 'viem'

export function fmt(value: bigint | undefined, decimals = 18, digits = 4): string {
  if (value === undefined) return '…'
  const n = Number(formatUnits(value, decimals))
  if (n === 0) return '0'
  if (n < 10 ** -digits) return `<${10 ** -digits}`
  return n.toLocaleString('en-US', { maximumFractionDigits: digits })
}

export const shortAddr = (a: string) => `${a.slice(0, 6)}…${a.slice(-4)}`

export const deadline = () => BigInt(Math.floor(Date.now() / 1000) + 20 * 60)

export function chunk<T>(items: T[], size: number): T[][] {
  const out: T[][] = []
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size))
  return out
}
