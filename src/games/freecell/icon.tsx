export const icon = <svg viewBox='0 0 32 32' xmlns='http://www.w3.org/2000/svg'>
  <ellipse cx='16' cy='27' rx='14' ry='3' fill='#000' opacity='.25'/>
  <rect x='1' y='9' width='30' height='17' rx='2' fill='#008000' stroke='#004000' strokeWidth='.6'/>
  {[3,10,17,24].map(x => <g key={x}><rect x={x} y='14' width='6' height='8' fill='#006000'/>
    <path d={`M${x} 22v-8h6`} fill='none' stroke='#003000'/><path d={`M${x} 22h6v-8`} fill='none' stroke='#40a040'/></g>)}
  <g transform='rotate(-12 13 12)'><path d='M8 14L7 7l4 3 2-6 2 6 4-3-1 7z' fill='#ffd700' stroke='#000' strokeWidth='.6'/>
    <path d='M8 13h10' stroke='#c09000'/><rect x='12' y='11' width='2' height='2' fill='#e00000'/><rect x='9' y='11' width='1' height='1' fill='#0000c0'/></g>
  <g transform='rotate(9 27 18)'><rect x='24' y='12' width='6' height='9' rx='.6' fill='#fff' stroke='#000' strokeWidth='.6'/>
    <path d='M26 17l1-3 1 3m-1.6-1h1.2' stroke='#000' strokeWidth='.6' fill='none'/></g>
</svg>
export default icon
