import type { ReactNode } from 'react'

const PINS = [8, 12, 16, 20, 24]

/** Remy head over a gold fREMY chip, with a blue key. */
export const icon: ReactNode = (
  <svg viewBox='0 0 32 32' width='32' height='32' shapeRendering='crispEdges' aria-hidden='true'>
    {PINS.map(p => (
      <g key={p} fill='#808080'>
        <rect x={p} y='3' width='2' height='3' />
        <rect x={p} y='26' width='2' height='3' />
        <rect x='3' y={p} width='3' height='2' />
        <rect x='26' y={p} width='3' height='2' />
      </g>
    ))}
    <rect x='6' y='6' width='20' height='20' fill='#202020' />
    <rect x='7' y='7' width='18' height='18' fill='#f0c020' />
    <rect x='7' y='7' width='18' height='1' fill='#fff080' />
    <rect x='7' y='24' width='18' height='1' fill='#a07000' />
    <rect x='10' y='5' width='12' height='4' fill='#6b3a1a' />
    <rect x='9' y='7' width='14' height='3' fill='#6b3a1a' />
    <rect x='10' y='10' width='12' height='10' fill='#f2c39b' />
    <rect x='9' y='10' width='1' height='5' fill='#6b3a1a' />
    <rect x='22' y='10' width='1' height='5' fill='#6b3a1a' />
    <rect x='12' y='13' width='2' height='2' fill='#000000' />
    <rect x='18' y='13' width='2' height='2' fill='#000000' />
    <rect x='13' y='17' width='6' height='1' fill='#a0402a' />
    <rect x='11' y='20' width='10' height='3' fill='#2a60c0' />
    <rect x='19' y='22' width='6' height='6' fill='#000080' />
    <rect x='20' y='23' width='4' height='4' fill='#3070ff' />
    <rect x='21' y='24' width='2' height='2' fill='#000080' />
    <rect x='24' y='25' width='6' height='2' fill='#3070ff' />
    <rect x='27' y='27' width='1' height='2' fill='#3070ff' />
    <rect x='29' y='27' width='1' height='2' fill='#3070ff' />
  </svg>
)

export default icon
