const icon = <svg viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">
  <ellipse cx="16" cy="29" rx="12" ry="2" fill="#000" opacity=".25" />
  {['#f0532d', '#7cc220', '#1f9bf0', '#ffbe1a'].map((colour, i) => <g key={colour} fill="none" stroke={colour} strokeWidth="1.4" strokeLinecap="round">
    <path d={`M12 ${10 + i * 4} L${5 - i % 2} ${5 + i * 6} L2 ${3 + i * 8}`} />
    <path d={`M20 ${10 + i * 4} L${27 + i % 2} ${5 + i * 6} L30 ${3 + i * 8}`} />
  </g>)}
  <g transform="rotate(10 16 16)"><rect x="10" y="5" width="13" height="23" rx="2" fill="#101010" stroke="#000" strokeWidth=".6" />
    <path d="M11 6h10v1H11z" fill="#606060" /><text x="12" y="14" fontSize="6" fontFamily="serif" fill="#fff">K♠</text>
    <circle cx="14" cy="8" r=".8" fill="#fff" /><circle cx="19" cy="8" r=".8" fill="#fff" /></g>
</svg>
export default icon
