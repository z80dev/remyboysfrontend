import type { ReactNode } from 'react'
import { remySrc } from '../lib/media'

/*
 * Remy OS XP icon set. Every icon is drawn on a 32×32 grid in the Luna idiom: soft top-left light,
 * glossy gradients, a thin darker outline, a ground shadow and a 3/4 view where the object has depth.
 * Gradients live once in <IconDefs/> (mounted at the app root) and are shared by id.
 */

const stops = (id: string, a: string, b: string, x2 = 0, y2 = 1) => (
  <linearGradient key={id} id={id} x1="0" y1="0" x2={x2} y2={y2}>
    <stop offset="0" stopColor={a} />
    <stop offset="1" stopColor={b} />
  </linearGradient>
)

const radial = (id: string, a: string, b: string, cx = 0.35, cy = 0.3) => (
  <radialGradient key={id} id={id} cx={cx} cy={cy} r="0.75">
    <stop offset="0" stopColor={a} />
    <stop offset="1" stopColor={b} />
  </radialGradient>
)

/** Shared gradients and clip paths. Rendered once, visually hidden but not display:none (Chrome drops refs into display:none SVGs). */
export function IconDefs() {
  return (
    <svg width="0" height="0" style={{ position: 'absolute' }} aria-hidden="true" focusable="false">
      <defs>
        {radial('xi-blue', '#a9d4ff', '#1552c8')}
        {radial('xi-green', '#c8f59a', '#2b8a1c')}
        {radial('xi-red', '#ffb39e', '#c2200c')}
        {radial('xi-yellow', '#fff3b0', '#e39b00')}
        {radial('xi-orange', '#ffd08a', '#dd6a0c')}
        {radial('xi-globe', '#bfe3ff', '#1b62c9', 0.3, 0.25)}
        {stops('xi-gold', '#fff4b5', '#cf8d00')}
        {stops('xi-bronze', '#ffd9a8', '#a85a1c')}
        {stops('xi-steel', '#fbfcfd', '#a3adb8')}
        {stops('xi-steel-side', '#aab3bd', '#66707b')}
        {stops('xi-steel-top', '#ffffff', '#cfd6de')}
        {stops('xi-beige', '#fffdf5', '#d8d0b6')}
        {stops('xi-beige-side', '#d3caae', '#a79e82')}
        {stops('xi-screen', '#5aa6ff', '#0b3aa0')}
        {stops('xi-folder', '#ffeaa6', '#f2bf36')}
        {stops('xi-folder-back', '#f7d673', '#d49c1c')}
        {stops('xi-leather', '#c98449', '#6a3a14')}
        {stops('xi-wood', '#f3d6a4', '#c48f4c')}
        {stops('xi-card', '#8fc2ff', '#2a62d6')}
        {stops('xi-sky', '#5aa0f2', '#cfe6ff')}
        {stops('xi-grass', '#8fd24f', '#3f8a21')}
        {stops('xi-paper', '#ffffff', '#e6e9f0')}
        {stops('xi-eth', '#e6ecff', '#8c9bd6')}
        {stops('xi-shield-green', '#9be27a', '#237a18')}
        {stops('xi-shield-red', '#ff9a86', '#b8200d')}
        {stops('xi-shield-yellow', '#fff09a', '#d99200')}
        <linearGradient id="xi-gloss" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#fff" stopOpacity="0.9" />
          <stop offset="1" stopColor="#fff" stopOpacity="0" />
        </linearGradient>
        <radialGradient id="xi-shade" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stopColor="#000" stopOpacity="0.32" />
          <stop offset="1" stopColor="#000" stopOpacity="0" />
        </radialGradient>
        <clipPath id="xi-shield-clip">
          <path d={SHIELD} />
        </clipPath>
      </defs>
    </svg>
  )
}

const SHIELD = 'M16 3.2c-4.2 1.9-7.4 2.5-10.6 2.5v8.6c0 7 4.6 11.9 10.6 14.6 6-2.7 10.6-7.6 10.6-14.6V5.7c-3.2 0-6.4-.6-10.6-2.5z'

const Shadow = ({ y = 29.2, rx = 12 }: { y?: number; rx?: number }) => <ellipse cx="16" cy={y} rx={rx} ry="2.2" fill="url(#xi-shade)" />

const Gloss = ({ d }: { d: string }) => <path d={d} fill="url(#xi-gloss)" opacity="0.75" />

/** Round glossy "orb" used for message-box and navigation icons. */
const Orb = ({ fill, stroke, children }: { fill: string; stroke: string; children: ReactNode }) => (
  <>
    <Shadow y={29.6} rx={10} />
    <circle cx="16" cy="15.5" r="12.6" fill={fill} stroke={stroke} strokeWidth="1" />
    <circle cx="16" cy="15.5" r="11.4" fill="none" stroke="#fff" strokeOpacity="0.55" strokeWidth="1" />
    {children}
    <ellipse cx="14.2" cy="9.4" rx="7.6" ry="4.4" fill="url(#xi-gloss)" opacity="0.7" />
  </>
)

/** Four wavy panes of the Remy flag, in plain colour (used where art would be too small to read). */
export const FLAG_COLORS = ['#f0532d', '#7cc220', '#1f9bf0', '#ffbe1a'] as const

/** Wavy pane outline on a 100×86 canvas. The flag rises to the right and ripples like the 2001 original. */
export function flagPane(col: 0 | 1, row: 0 | 1): string {
  const x0 = col === 0 ? 4 : 52
  const x1 = col === 0 ? 48 : 96
  const y0 = row === 0 ? 8 : 46
  const y1 = row === 0 ? 42 : 80
  const wave = (x: number) => 7 * Math.sin((x / 100) * Math.PI * 1.7 + 0.2) - x * 0.05
  const lean = (y: number) => (y - 44) * -0.12
  const pts = (y: number, from: number, to: number) => {
    const out: string[] = []
    const steps = 8
    for (let i = 0; i <= steps; i++) {
      const x = from + ((to - from) * i) / steps
      out.push(`${(x + lean(y)).toFixed(2)} ${(y + wave(x)).toFixed(2)}`)
    }
    return out
  }
  const top = pts(y0, x0, x1)
  const bottom = pts(y1, x1, x0)
  return `M${top.join(' L')} L${bottom.join(' L')} Z`
}

const PANES = [flagPane(0, 0), flagPane(1, 0), flagPane(0, 1), flagPane(1, 1)]

/** Small colour flag (start button, tray, favicon-sized spots). */
export function FlagMark({ size = 16, className }: { size?: number; className?: string }) {
  return (
    <svg className={className} width={size} height={size * 0.86} viewBox="0 0 100 86" aria-hidden="true" focusable="false">
      {PANES.map((d, i) => (
        <path key={d} d={d} fill={FLAG_COLORS[i]} stroke="#000" strokeOpacity="0.18" strokeWidth="2" />
      ))}
      {PANES.map((d) => (
        <path key={`g${d}`} d={d} fill="url(#xi-gloss)" opacity="0.35" />
      ))}
    </svg>
  )
}

/** The Remy flag: four waving panes, each a Remy face washed in one of the four colours. */
export function RemyFlag({ size = 96, art = [2069, 420, 777, 42], className }: { size?: number; art?: readonly number[]; className?: string }) {
  const uid = `rf${size}${art.join('')}`
  return (
    <svg className={className} width={size} height={size * 0.86} viewBox="0 0 100 86" aria-hidden="true" focusable="false">
      <defs>
        {PANES.map((d, i) => (
          <clipPath key={d} id={`${uid}-${i}`}>
            <path d={d} />
          </clipPath>
        ))}
      </defs>
      {PANES.map((d, i) => {
        const col = i % 2
        const row = i >> 1
        return (
          <g key={d} clipPath={`url(#${uid}-${i})`}>
            <rect x="0" y="0" width="100" height="86" fill={FLAG_COLORS[i]} />
            <image
              href={remySrc(art[i], 128)}
              x={col === 0 ? -6 : 42}
              y={row === 0 ? -6 : 32}
              width="62"
              height="62"
              preserveAspectRatio="xMidYMin slice"
            />
            <rect x="0" y="0" width="100" height="86" fill={FLAG_COLORS[i]} opacity="0.6" style={{ mixBlendMode: 'color' }} />
            <rect x="0" y="0" width="100" height="86" fill={FLAG_COLORS[i]} opacity="0.18" />
            <path d={d} fill="url(#xi-gloss)" opacity="0.3" />
          </g>
        )
      })}
      {PANES.map((d) => (
        <path key={`o${d}`} d={d} fill="none" stroke="#fff" strokeOpacity="0.55" strokeWidth="1.2" />
      ))}
    </svg>
  )
}

const icons: Record<string, ReactNode> = {
  /* Beige CRT in 3/4 view with the flag on a blue screen: "Welcome to Remy OS". */
  computer: (
    <>
      <Shadow />
      <path d="M11 24.5h10l2.4 3.2H8.6z" fill="url(#xi-beige-side)" stroke="#8a8266" strokeWidth=".6" />
      <path d="M26 5.4 29 7v14.6l-3 1.6z" fill="url(#xi-beige-side)" stroke="#8a8266" strokeWidth=".6" />
      <rect x="3.2" y="4.2" width="22.8" height="19.6" rx="2.2" fill="url(#xi-beige)" stroke="#8a8266" strokeWidth=".8" />
      <rect x="5.6" y="6.4" width="18" height="13.8" rx="1.2" fill="url(#xi-screen)" stroke="#27324a" strokeWidth=".7" />
      <g transform="translate(9.6 8.6) scale(.1)">
        {PANES.map((d, i) => (
          <path key={d} d={d} fill={FLAG_COLORS[i]} />
        ))}
      </g>
      <path d="M5.9 6.8h17.4L5.9 16.6z" fill="#fff" opacity=".18" />
      <circle cx="22.8" cy="22" r=".7" fill="#4cc23a" />
    </>
  ),
  /* Security Center shield, quartered in the flag colours. */
  recovery: (
    <>
      <Shadow />
      <g clipPath="url(#xi-shield-clip)">
        <rect x="0" y="0" width="16" height="15" fill={FLAG_COLORS[0]} />
        <rect x="16" y="0" width="16" height="15" fill={FLAG_COLORS[1]} />
        <rect x="0" y="15" width="16" height="17" fill={FLAG_COLORS[2]} />
        <rect x="16" y="15" width="16" height="17" fill={FLAG_COLORS[3]} />
        <path d="M0 15h32M16 0v32" stroke="#fff" strokeWidth="1.3" />
        <path d="M5 4h22v8.5C20 15 11 14 5 16z" fill="url(#xi-gloss)" opacity=".7" />
      </g>
      <path d={SHIELD} fill="none" stroke="#2b3450" strokeWidth=".9" />
      <path d="M16 4.6c-3.7 1.6-6.6 2.2-9.3 2.3v7.4c0 6.2 3.9 10.6 9.3 13.1" fill="none" stroke="#fff" strokeOpacity=".6" strokeWidth=".8" />
    </>
  ),
  shieldOk: (
    <>
      <Shadow />
      <path d={SHIELD} fill="url(#xi-shield-green)" stroke="#1b4f12" strokeWidth=".9" />
      <path d="m10.5 15.6 3.9 3.9 7.4-8.1" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
      <Gloss d="M6.6 6.8c3 0 6-.6 9.4-2.1 3.4 1.5 6.4 2.1 9.4 2.1v5.4c-5.7 2.4-13 2.5-18.8.2z" />
    </>
  ),
  shieldBad: (
    <>
      <Shadow />
      <path d={SHIELD} fill="url(#xi-shield-red)" stroke="#6b1206" strokeWidth=".9" />
      <path d="m11.6 11 8.8 8.8m0-8.8-8.8 8.8" stroke="#fff" strokeWidth="3" strokeLinecap="round" />
      <Gloss d="M6.6 6.8c3 0 6-.6 9.4-2.1 3.4 1.5 6.4 2.1 9.4 2.1v5.4c-5.7 2.4-13 2.5-18.8.2z" />
    </>
  ),
  shieldWarn: (
    <>
      <Shadow />
      <path d={SHIELD} fill="url(#xi-shield-yellow)" stroke="#7a5200" strokeWidth=".9" />
      <path d="M16 9.5v7.4" stroke="#3a2a00" strokeWidth="3.2" strokeLinecap="round" />
      <circle cx="16" cy="21.4" r="1.8" fill="#3a2a00" />
      <Gloss d="M6.6 6.8c3 0 6-.6 9.4-2.1 3.4 1.5 6.4 2.1 9.4 2.1v5.4c-5.7 2.4-13 2.5-18.8.2z" />
    </>
  ),
  /* Brass padlock with a steel shackle. */
  approvals: (
    <>
      <Shadow />
      <path d="M10.2 14.5V10a5.8 5.8 0 0 1 11.6 0v4.5" fill="none" stroke="#5e6670" strokeWidth="3.8" />
      <path d="M10.2 14.5V10a5.8 5.8 0 0 1 11.6 0v4.5" fill="none" stroke="url(#xi-steel)" strokeWidth="2.2" />
      <rect x="5.6" y="13.4" width="20.8" height="14.6" rx="2.6" fill="url(#xi-gold)" stroke="#8a5a00" strokeWidth=".9" />
      <path d="M26.4 15.4 28.6 14v11.6l-2.2 2.1z" fill="#b87a00" stroke="#8a5a00" strokeWidth=".6" />
      <circle cx="16" cy="19.3" r="2.3" fill="#5a3a00" />
      <path d="M15 20.4h2l.6 4.3h-3.2z" fill="#5a3a00" />
      <Gloss d="M6.6 14.4h18.8v4c-6 1.6-12.8 1.6-18.8 0z" />
    </>
  ),
  /* Two coins trading places under a green arrow: legacy tokens become fREMY. */
  exchange: (
    <>
      <Shadow />
      <ellipse cx="11" cy="20.6" rx="7.6" ry="7.4" fill="#7a3f10" />
      <circle cx="11" cy="19.6" r="7.4" fill="url(#xi-bronze)" stroke="#6e3a0e" strokeWidth=".8" />
      <circle cx="11" cy="19.6" r="5.2" fill="none" stroke="#fff" strokeOpacity=".45" strokeWidth=".8" />
      <text x="11" y="22.4" textAnchor="middle" fontSize="8" fontWeight="700" fontFamily="Trebuchet MS, sans-serif" fill="#6e3a0e">
        rb
      </text>
      <ellipse cx="21.4" cy="23" rx="7.6" ry="7.4" fill="#8a5c00" />
      <circle cx="21.4" cy="22" r="7.4" fill="url(#xi-gold)" stroke="#8a5a00" strokeWidth=".8" />
      <circle cx="21.4" cy="22" r="5.2" fill="none" stroke="#fff" strokeOpacity=".6" strokeWidth=".8" />
      <text x="21.4" y="25.2" textAnchor="middle" fontSize="9.5" fontWeight="700" fontFamily="Trebuchet MS, sans-serif" fontStyle="italic" fill="#7a4f00">
        f
      </text>
      <path d="M6 10.4C8.6 4.6 17.8 2.8 23.2 8.6" fill="none" stroke="#1d6b12" strokeWidth="4.2" strokeLinecap="round" />
      <path d="M6 10.4C8.6 4.6 17.8 2.8 23.2 8.6" fill="none" stroke="#6cd23d" strokeWidth="2.4" strokeLinecap="round" />
      <path d="m25.8 5.2-.3 7.6-7-2.8z" fill="#5cc22e" stroke="#1d6b12" strokeWidth=".9" strokeLinejoin="round" />
    </>
  ),
  /* Steel safe, 3/4 view, with dial and handle. */
  vault: (
    <>
      <Shadow />
      <path d="M4 7.6 9 4.2h18.4l-5 3.4z" fill="url(#xi-steel-top)" stroke="#59626d" strokeWidth=".7" strokeLinejoin="round" />
      <path d="m22.4 7.6 5-3.4v19.4l-5 3.8z" fill="url(#xi-steel-side)" stroke="#59626d" strokeWidth=".7" strokeLinejoin="round" />
      <rect x="4" y="7.6" width="18.4" height="19.8" rx="1.4" fill="url(#xi-steel)" stroke="#59626d" strokeWidth=".8" />
      <rect x="6" y="9.6" width="14.4" height="15.8" rx="1" fill="none" stroke="#7d8793" strokeWidth=".8" />
      <circle cx="12.4" cy="17.5" r="4.6" fill="url(#xi-steel-side)" stroke="#434b55" strokeWidth=".8" />
      <circle cx="12.4" cy="17.5" r="2.8" fill="url(#xi-steel)" stroke="#434b55" strokeWidth=".5" />
      <path d="M12.4 13.3v1.4M12.4 20.3v1.4M8.2 17.5h1.4M15.2 17.5h1.4" stroke="#2f363e" strokeWidth=".8" />
      <rect x="17.4" y="14.2" width="1.8" height="6.6" rx=".9" fill="#3a424b" />
      <path d="M5.2 28v1.4M20.2 28v1.4" stroke="#3a424b" strokeWidth="1.6" />
      <path d="M4.6 8.2h17.2L4.6 18z" fill="#fff" opacity=".35" />
    </>
  ),
  /* "My Pictures": folder with a Bliss snapshot tucked inside. */
  gallery: (
    <>
      <Shadow />
      <path d="M3.4 8a1.6 1.6 0 0 1 1.6-1.6h7.2l2.2 2.4h12.8a1.6 1.6 0 0 1 1.6 1.6V26H3.4z" fill="url(#xi-folder-back)" stroke="#a87812" strokeWidth=".8" />
      <g transform="rotate(-7 16 13)">
        <rect x="8" y="6.2" width="16.4" height="12.4" fill="#fff" stroke="#8b8b8b" strokeWidth=".6" />
        <rect x="9.2" y="7.4" width="14" height="10" fill="url(#xi-sky)" />
        <path d="M9.2 14.6c3-2.4 7.4-3.2 14-1.4v4.2h-14z" fill="url(#xi-grass)" />
        <circle cx="19.8" cy="10" r="1.4" fill="#fff" opacity=".9" />
      </g>
      <path
        d="M2 13.2h26.6a1 1 0 0 1 1 1.2l-2 12.4a1.6 1.6 0 0 1-1.6 1.2H4.6A1.6 1.6 0 0 1 3 26.8L1 14.4a1 1 0 0 1 1-1.2z"
        fill="url(#xi-folder)"
        stroke="#a87812"
        strokeWidth=".8"
      />
      <path d="M2.2 14.2h26.2l-.4 2.6c-8.6 1-17.2 1-25.4 0z" fill="#fff" opacity=".45" />
    </>
  ),
  /* Creative studio: a gleaming framed picture with a starburst. */
  remix: (
    <>
      <Shadow />
      <path d="M7 6h20v18H7z" fill="url(#xi-beige)" stroke="#655b43" strokeWidth=".8" />
      <path d="M9.2 8.2h15.6v13.6H9.2z" fill="url(#xi-screen)" stroke="#334b72" strokeWidth=".8" />
      <path d="M10 19c3.4-4.7 6.2-3.2 8.4-1.3 2-4.3 3.8-4.4 6.2-.7v4H10z" fill="url(#xi-grass)" />
      <circle cx="20.5" cy="12" r="2.1" fill="url(#xi-yellow)" />
      <path d="m7 6 20 0v5c-6.4 1.4-13.6 1.2-20 0z" fill="url(#xi-gloss)" opacity=".65" />
      <path d="m7 24 4.4 3.2h14.8L27 24z" fill="url(#xi-beige-side)" stroke="#655b43" strokeWidth=".6" />
      <path d="m5 11 .9 2.1 2.1.9-2.1.9L5 16l-.9-2.1L2 13.1l2.1-.9z" fill="url(#xi-yellow)" stroke="#9d6700" strokeWidth=".5" />
    </>
  ),
  /* Remy Advance handheld: blue shell, lit screen with a grass horizon, d-pad and A/B buttons. */
  quest: (
    <>
      <Shadow />
      <rect x="2.4" y="8" width="27.2" height="17.4" rx="6" fill="url(#xi-blue)" stroke="#0b2a7a" strokeWidth=".9" />
      <rect x="9.8" y="10" width="12.4" height="10" rx="1.2" fill="#12183a" stroke="#0b2a7a" strokeWidth=".7" />
      <rect x="11" y="11.2" width="10" height="7.6" fill="url(#xi-screen)" />
      <path d="M11 16.4c3-1.4 6.4-1.6 10-.4v2.8H11z" fill="url(#xi-grass)" />
      <circle cx="17.6" cy="13.2" r="1.3" fill="url(#xi-yellow)" />
      <path d="M5 15.4h1.5v-1.5h1.8v1.5h1.5v1.8H8.3v1.5H6.5v-1.5H5z" fill="#1d2440" />
      <circle cx="24.4" cy="16.8" r="1.5" fill="url(#xi-red)" stroke="#6a1a14" strokeWidth=".4" />
      <circle cx="27" cy="14.6" r="1.5" fill="url(#xi-red)" stroke="#6a1a14" strokeWidth=".4" />
      <path d="M4.6 10.6c5.6-1.9 17.2-1.9 22.8 0" fill="none" stroke="#fff" strokeOpacity=".55" strokeWidth=".9" strokeLinecap="round" />
    </>
  ),
  /* Jack-o'-lantern: Night of the Cabald. */
  pumpkin: (
    <>
      <Shadow />
      <path d="M15.4 9.4c0-3 1-5 3.4-6l1 1.4c-2 1-2.4 2.6-2.4 4.6z" fill="#4d6b1f" />
      <ellipse cx="10" cy="18" rx="7.4" ry="9.6" fill="#d9590b" />
      <ellipse cx="22" cy="18" rx="7.4" ry="9.6" fill="#d9590b" />
      <ellipse cx="16" cy="18" rx="8" ry="10.6" fill="#f47a16" stroke="#9a3a06" strokeWidth=".6" />
      <path d="m9.4 16 3.4-4.2 2.8 4.2zm7 0 2.8-4.2 3.4 4.2zM8 20.4c3.2 4.6 12.8 4.6 16 0l-2 1-1.6 2-2-1.4-1.6 2-1.6-2-1.6 2-2-1.6-1.6 1.4z" fill="#ffe36b" />
    </>
  ),
  /* Leather wallet with a card peeking out. */
  wallet: (
    <>
      <Shadow />
      <rect x="7" y="4.6" width="16" height="10" rx="1.2" fill="url(#xi-card)" stroke="#1a3f94" strokeWidth=".7" transform="rotate(-8 15 9)" />
      <rect x="3" y="9.4" width="25" height="17.6" rx="3" fill="url(#xi-leather)" stroke="#43240a" strokeWidth=".9" />
      <rect x="4.8" y="11.2" width="21.4" height="14" rx="2" fill="none" stroke="#f0c48c" strokeOpacity=".7" strokeWidth=".7" strokeDasharray="1.4 1.1" />
      <path d="M19.4 14.4h9.6a1 1 0 0 1 1 1v6.6a1 1 0 0 1-1 1h-9.6a3 3 0 0 1-3-3v-2.6a3 3 0 0 1 3-3z" fill="#8d5222" stroke="#43240a" strokeWidth=".8" />
      <circle cx="20.6" cy="18.7" r="1.8" fill="url(#xi-gold)" stroke="#7a5000" strokeWidth=".5" />
      <path d="M3.6 10.6h23.6c-6 2.2-17.6 2.4-23.6 1.4z" fill="#fff" opacity=".25" />
    </>
  ),
  folder: (
    <>
      <Shadow />
      <path d="M3.4 8a1.6 1.6 0 0 1 1.6-1.6h7.2l2.2 2.4h12.8a1.6 1.6 0 0 1 1.6 1.6V26H3.4z" fill="url(#xi-folder-back)" stroke="#a87812" strokeWidth=".8" />
      <path
        d="M2 12.2h26.6a1 1 0 0 1 1 1.2l-2 13.4a1.6 1.6 0 0 1-1.6 1.2H4.6A1.6 1.6 0 0 1 3 26.8L1 13.4a1 1 0 0 1 1-1.2z"
        fill="url(#xi-folder)"
        stroke="#a87812"
        strokeWidth=".8"
      />
      <path d="M2.2 13.2h26.2l-.4 2.6c-8.6 1-17.2 1-25.4 0z" fill="#fff" opacity=".45" />
    </>
  ),
  globe: (
    <>
      <Shadow y={29.6} rx={10} />
      <circle cx="16" cy="15.5" r="12.6" fill="url(#xi-globe)" stroke="#0f3f8f" strokeWidth=".9" />
      <path
        d="M9.6 7.6c2 .4 3.4 1.8 3 3.6-.4 1.6-2.6 1.4-3 3.2-.4 1.6 1.4 2.4 1 4.2-.3 1.6-2 2-3.2 1.2A12.6 12.6 0 0 1 9.6 7.6zM18.2 4.4c2.6.2 5.8 1.8 7.6 4.4-1.4.8-3.2.2-4.4 1.2-1.2 1 .2 2.8-1 3.8-1.4 1.2-3.4-.2-4-1.8-.6-1.6.6-2.6.2-4.2-.4-1.4.2-2.8 1.6-3.4zM20.6 17.4c1.8-.4 3.6.6 3.8 2.4.2 2-1.4 4.2-3.4 5.4-1.2.6-2.2-.6-2-2 .2-1.8-.8-2.8-.4-4 .3-1 1-1.6 2-1.8z"
        fill="url(#xi-grass)"
        stroke="#236014"
        strokeWidth=".5"
      />
      <ellipse cx="13.6" cy="9" rx="7.4" ry="4.2" fill="url(#xi-gloss)" opacity=".65" />
    </>
  ),
  info: (
    <Orb fill="url(#xi-blue)" stroke="#0d3a91">
      <circle cx="16" cy="9.8" r="1.9" fill="#fff" />
      <path d="M13.6 13.4h3.8v8.4h1.6v1.8h-5.4v-1.8h1.4v-6.6h-1.4z" fill="#fff" />
    </Orb>
  ),
  error: (
    <Orb fill="url(#xi-red)" stroke="#7a1206">
      <path d="m11.2 10.7 9.6 9.6m0-9.6-9.6 9.6" stroke="#fff" strokeWidth="3.2" strokeLinecap="round" />
    </Orb>
  ),
  question: (
    <Orb fill="url(#xi-blue)" stroke="#0d3a91">
      <path d="M12.6 12.2c0-2.2 1.6-3.6 3.6-3.6s3.6 1.3 3.6 3.2c0 2.8-3.4 3-3.4 5.6" fill="none" stroke="#fff" strokeWidth="2.6" strokeLinecap="round" />
      <circle cx="16.4" cy="21.8" r="1.7" fill="#fff" />
    </Orb>
  ),
  warning: (
    <>
      <Shadow y={29.4} />
      <path d="M14.2 4.4a2 2 0 0 1 3.6 0l11.4 21.2a2 2 0 0 1-1.8 3H4.6a2 2 0 0 1-1.8-3z" fill="url(#xi-yellow)" stroke="#8a5c00" strokeWidth=".9" />
      <path d="M16 11v8.2" stroke="#2c2100" strokeWidth="3.2" strokeLinecap="round" />
      <circle cx="16" cy="23.8" r="1.9" fill="#2c2100" />
      <path d="M15.4 6.4c.3-.6.9-.6 1.2 0l4 7.6c-3 .8-6.2.8-9.2 0z" fill="#fff" opacity=".55" />
    </>
  ),
  back: (
    <Orb fill="url(#xi-green)" stroke="#1d5e12">
      <path d="M8.4 15.6 15 9.4v3.8h8.6v4.8H15v3.8z" fill="#fff" stroke="#1d5e12" strokeWidth=".6" strokeLinejoin="round" />
    </Orb>
  ),
  forward: (
    <Orb fill="url(#xi-green)" stroke="#1d5e12">
      <path d="M23.6 15.6 17 9.4v3.8H8.4v4.8H17v3.8z" fill="#fff" stroke="#1d5e12" strokeWidth=".6" strokeLinejoin="round" />
    </Orb>
  ),
  go: (
    <>
      <rect x="3" y="3" width="26" height="26" rx="4" fill="url(#xi-green)" stroke="#1d5e12" strokeWidth="1" />
      <path d="M22.8 16 15.6 9.4v4H8.6v5.2h7v4z" fill="#fff" />
      <path d="M4.2 4.2h23.6v10c-8 2-15.6 2-23.6 0z" fill="url(#xi-gloss)" opacity=".6" />
    </>
  ),
  logoff: (
    <>
      <rect x="3" y="3" width="26" height="26" rx="4" fill="url(#xi-orange)" stroke="#8a3a00" strokeWidth="1" />
      <circle cx="12" cy="13" r="4.4" fill="none" stroke="#fff" strokeWidth="2.6" />
      <path d="m15 16.2 7.6 7.6m-3.2-3.2 2.2-2.2m.2 4.6 2-2" stroke="#fff" strokeWidth="2.4" strokeLinecap="round" />
      <path d="M4.2 4.2h23.6v10c-8 2-15.6 2-23.6 0z" fill="url(#xi-gloss)" opacity=".55" />
    </>
  ),
  power: (
    <>
      <rect x="3" y="3" width="26" height="26" rx="4" fill="url(#xi-red)" stroke="#6a1006" strokeWidth="1" />
      <path d="M11.4 10.8a7.4 7.4 0 1 0 9.2 0" fill="none" stroke="#fff" strokeWidth="2.6" strokeLinecap="round" />
      <path d="M16 7.4v8" stroke="#fff" strokeWidth="2.6" strokeLinecap="round" />
      <path d="M4.2 4.2h23.6v10c-8 2-15.6 2-23.6 0z" fill="url(#xi-gloss)" opacity=".5" />
    </>
  ),
  standby: (
    <>
      <rect x="3" y="3" width="26" height="26" rx="4" fill="url(#xi-yellow)" stroke="#7a5000" strokeWidth="1" />
      <path d="M19.6 8.4a8 8 0 1 0 4 11.6 7 7 0 0 1-4-11.6z" fill="#fff" />
      <path d="M4.2 4.2h23.6v10c-8 2-15.6 2-23.6 0z" fill="url(#xi-gloss)" opacity=".5" />
    </>
  ),
  restart: (
    <>
      <rect x="3" y="3" width="26" height="26" rx="4" fill="url(#xi-green)" stroke="#1d5e12" strokeWidth="1" />
      <path d="M22.6 13.4a7 7 0 1 0-.4 6" fill="none" stroke="#fff" strokeWidth="2.6" strokeLinecap="round" />
      <path d="m24.2 7.6-.4 7-6.4-2.6z" fill="#fff" />
      <path d="M4.2 4.2h23.6v10c-8 2-15.6 2-23.6 0z" fill="url(#xi-gloss)" opacity=".5" />
    </>
  ),
  /* White die in 3/4 view: "Random". */
  random: (
    <>
      <Shadow />
      <path d="m16 3.6 11.4 5.6L16 14.8 4.6 9.2z" fill="#fff" stroke="#5f6b7a" strokeWidth=".8" strokeLinejoin="round" />
      <path d="M4.6 9.2 16 14.8v13.4L4.6 22.4z" fill="url(#xi-steel)" stroke="#5f6b7a" strokeWidth=".8" strokeLinejoin="round" />
      <path d="M27.4 9.2 16 14.8v13.4l11.4-5.8z" fill="url(#xi-steel-side)" stroke="#5f6b7a" strokeWidth=".8" strokeLinejoin="round" />
      <ellipse cx="16" cy="9.2" rx="1.8" ry="1" fill="#c0201a" />
      <circle cx="8" cy="14.4" r="1.2" fill="#1d2a44" />
      <circle cx="12.6" cy="21.4" r="1.2" fill="#1d2a44" />
      <circle cx="19.6" cy="17.6" r="1.1" fill="#fff" />
      <circle cx="21.6" cy="20.6" r="1.1" fill="#fff" />
      <circle cx="23.8" cy="16.4" r="1.1" fill="#fff" />
      <circle cx="21.6" cy="13.6" r="1.1" fill="#fff" />
    </>
  ),
  search: (
    <>
      <Shadow />
      <path d="m18.6 19.4 7.8 7.8" stroke="#3b2a1a" strokeWidth="5" strokeLinecap="round" />
      <path d="m18.6 19.4 7.8 7.8" stroke="#8a5a2a" strokeWidth="3" strokeLinecap="round" />
      <circle cx="13" cy="13" r="8.6" fill="#cfe7ff" fillOpacity=".75" stroke="#4d5763" strokeWidth="2.4" />
      <path d="M8.4 10.6a5.4 5.4 0 0 1 5-3.6" fill="none" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" />
    </>
  ),
  download: (
    <>
      <Shadow />
      <path d="M4 20h24v6.4a1.6 1.6 0 0 1-1.6 1.6H5.6A1.6 1.6 0 0 1 4 26.4z" fill="url(#xi-steel)" stroke="#59626d" strokeWidth=".8" />
      <path d="M12.4 3.6h7.2v9.2h4.6L16 21.6l-8.2-8.8h4.6z" fill="url(#xi-green)" stroke="#1d5e12" strokeWidth=".9" strokeLinejoin="round" />
      <path d="M13.4 4.6h5.2v4.6c-1.8.6-3.4.6-5.2 0z" fill="#fff" opacity=".45" />
    </>
  ),
  /* fREMY: gold coin with an italic f. */
  coin: (
    <>
      <Shadow y={29.4} rx={10} />
      <ellipse cx="16" cy="17" rx="11.8" ry="11.6" fill="#8a5c00" />
      <circle cx="16" cy="15.6" r="11.6" fill="url(#xi-gold)" stroke="#8a5a00" strokeWidth=".9" />
      <circle cx="16" cy="15.6" r="8.6" fill="none" stroke="#fff" strokeOpacity=".6" strokeWidth="1" />
      <text x="16" y="20.4" textAnchor="middle" fontSize="14" fontWeight="700" fontStyle="italic" fontFamily="Trebuchet MS, sans-serif" fill="#7a4f00">
        f
      </text>
      <ellipse cx="13.4" cy="9.2" rx="6.4" ry="3.4" fill="url(#xi-gloss)" opacity=".7" />
    </>
  ),
  eth: (
    <>
      <Shadow y={29.4} rx={10} />
      <circle cx="16" cy="15.6" r="12" fill="url(#xi-eth)" stroke="#3f4d8c" strokeWidth=".9" />
      <path d="m16 5.6-6.2 10.2L16 19.4l6.2-3.6z" fill="#3c3c6e" />
      <path d="M16 5.6v13.8l6.2-3.6z" fill="#5f67a8" />
      <path d="m9.8 17 6.2 8.8 6.2-8.8-6.2 3.6z" fill="#3c3c6e" />
      <path d="M16 20.6v5.2l6.2-8.8z" fill="#5f67a8" />
      <ellipse cx="13.4" cy="8.8" rx="6.4" ry="3.2" fill="url(#xi-gloss)" opacity=".55" />
    </>
  ),
  /* Two linked monitors: the tray's network indicator. */
  network: (
    <>
      <rect x="2" y="4" width="15" height="12" rx="1.4" fill="url(#xi-beige)" stroke="#6d6650" strokeWidth=".9" />
      <rect x="3.8" y="5.8" width="11.4" height="8" fill="url(#xi-screen)" />
      <rect x="15" y="14" width="15" height="12" rx="1.4" fill="url(#xi-beige)" stroke="#6d6650" strokeWidth=".9" />
      <rect x="16.8" y="15.8" width="11.4" height="8" fill="url(#xi-screen)" />
      <path d="M9.5 16v4.6h5.5" fill="none" stroke="#2a2a2a" strokeWidth="1.2" />
    </>
  ),
  display: (
    <>
      <Shadow />
      <rect x="3.2" y="4.2" width="25.6" height="18.4" rx="2" fill="url(#xi-steel-side)" stroke="#3d4550" strokeWidth=".8" />
      <rect x="5.4" y="6.4" width="21.2" height="14" fill="url(#xi-sky)" />
      <path d="M5.4 16.4c5-3.4 12.4-4.2 21.2-1.6v5.6H5.4z" fill="url(#xi-grass)" />
      <path d="M13 22.6h6l1.4 4H11.6z" fill="url(#xi-steel)" stroke="#3d4550" strokeWidth=".6" />
      <path d="M8 27h16" stroke="#3d4550" strokeWidth="1.8" strokeLinecap="round" />
    </>
  ),
  /* Trading terminal: dark CRT with a green up-trend and red/green candles. */
  trader: (
    <>
      <Shadow />
      <path d="M11 24.4h10l2.4 3.4H8.6z" fill="url(#xi-steel-side)" stroke="#3d4550" strokeWidth=".6" />
      <rect x="2.6" y="3.8" width="26.8" height="20.6" rx="2" fill="url(#xi-steel)" stroke="#3d4550" strokeWidth=".8" />
      <rect x="4.6" y="5.8" width="22.8" height="15.4" rx="1" fill="#071b3a" stroke="#1d2a44" strokeWidth=".6" />
      <path d="M4.6 10.4h22.8M4.6 15h22.8" stroke="#1f3f73" strokeWidth=".5" />
      <path d="M8 13.6v4.4M13 11.4v4.6M18 9.4v3.8" stroke="#8a95a8" strokeWidth=".6" />
      <rect x="7" y="14.4" width="2" height="2.8" fill="#e8492c" />
      <rect x="12" y="12" width="2" height="3.2" fill="#3ddc4a" />
      <rect x="17" y="10" width="2" height="2.6" fill="#3ddc4a" />
      <path d="M5.8 18.6 10.4 16l4 1.2 4.4-5 3.4 1.6 4.2-5" fill="none" stroke="#6cff6a" strokeWidth="1.3" strokeLinejoin="round" />
      <path d="M4.8 6h22.4L4.8 13.4z" fill="#fff" opacity=".12" />
      <circle cx="26" cy="22.8" r=".7" fill="#4cc23a" />
    </>
  ),
  /* Clipboard checklist: Launch Control. */
  launch: (
    <>
      <Shadow />
      <rect x="5" y="4.6" width="22" height="24.4" rx="2" fill="url(#xi-wood)" stroke="#8a5a24" strokeWidth=".9" />
      <rect x="7.6" y="7.6" width="16.8" height="19" fill="url(#xi-paper)" stroke="#9aa3b3" strokeWidth=".6" />
      <rect x="11" y="2.6" width="10" height="4.6" rx="1.2" fill="url(#xi-steel)" stroke="#59626d" strokeWidth=".8" />
      <path
        d="m9.6 12.2 1.6 1.6 2.8-3.2M9.6 17.4l1.6 1.6 2.8-3.2"
        fill="none"
        stroke="#2b8a1c"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <rect x="9.8" y="21" width="3.6" height="3.4" fill="#fff" stroke="#8c96a8" strokeWidth=".7" />
      <path d="M15.6 12.4h6.8M15.6 17.6h6.8M15.6 22.8h6.8" stroke="#8c96a8" strokeWidth="1.1" />
    </>
  ),
  check: <path d="m6 17 6.6 6.6L26.4 9" fill="none" stroke="#2b8a1c" strokeWidth="4.4" strokeLinecap="round" strokeLinejoin="round" />,
  help: (
    <>
      <Shadow />
      <path
        d="M5 5.4h9.4a2 2 0 0 1 1.6.8 2 2 0 0 1 1.6-.8H27v20.4h-9.4a2 2 0 0 0-1.6.8 2 2 0 0 0-1.6-.8H5z"
        fill="url(#xi-paper)"
        stroke="#5a6478"
        strokeWidth=".8"
      />
      <path d="M16 6.4v20" stroke="#8c96a8" strokeWidth=".8" />
      <circle cx="22.4" cy="20.6" r="6.6" fill="url(#xi-blue)" stroke="#0d3a91" strokeWidth=".8" />
      <path d="M20.4 19.2c0-1.2.9-2 2-2s2 .7 2 1.8c0 1.5-1.8 1.6-1.8 3" fill="none" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" />
      <circle cx="22.6" cy="24.2" r=".9" fill="#fff" />
      <path d="M7.4 9h6M7.4 12h6M7.4 15h4.4M18.4 9h6M18.4 12h4" stroke="#8c96a8" strokeWidth="1" />
    </>
  ),
  /* Sheet of paper written in Wingdings, with a pencil: Remy TextEdit. */
  textedit: (
    <>
      <Shadow />
      <path d="M5.4 3.4h15.4l5.8 5.8v19.4H5.4z" fill="url(#xi-paper)" stroke="#5a6478" strokeWidth=".8" />
      <path d="M20.8 3.4v5.8h5.8" fill="#dfe4ee" stroke="#5a6478" strokeWidth=".8" />
      <circle cx="9.4" cy="12.6" r="1.3" fill="#2a2a2a" />
      <rect x="12" y="11.3" width="2.6" height="2.6" fill="#2a2a2a" />
      <path d="m17.2 11.2 1.5 1.5-1.5 1.5-1.5-1.5z" fill="#2a2a2a" />
      <path d="M8 17.6h3M13 17.6h2.6" stroke="#2a2a2a" strokeWidth="1.6" strokeLinecap="round" />
      <path d="m8.4 23 1.4-1.6 1.4 1.6M13 21.6h2.4v2.4H13" fill="none" stroke="#2a2a2a" strokeWidth="1" />
      <path d="m28.4 12.6 1.8 1.8-11.6 11.6-2.8 1 1-2.8z" fill="#ffbe1a" stroke="#8a5a24" strokeWidth=".7" strokeLinejoin="round" />
      <path d="m27 14 1.8 1.8" stroke="#8a5a24" strokeWidth=".7" />
      <path d="m15.8 27 .4-1.2.8.8z" fill="#2a2a2a" />
    </>
  ),
  /* Tilted dark badge with the gold lightning bolt: Winamp. */
  winamp: (
    <>
      <defs>
        <linearGradient id="xi-wa-plate" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#6d7192" />
          <stop offset=".55" stopColor="#30334a" />
          <stop offset="1" stopColor="#1a1b28" />
        </linearGradient>
        <linearGradient id="xi-wa-bolt" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#fff3b0" />
          <stop offset=".45" stopColor="#ffbe1a" />
          <stop offset="1" stopColor="#c46a08" />
        </linearGradient>
      </defs>
      <Shadow />
      <rect x="5.4" y="4.4" width="21.2" height="21.2" rx="4.4" transform="rotate(-12 16 15)" fill="url(#xi-wa-plate)" stroke="#0e0f18" strokeWidth=".9" />
      <rect x="6.6" y="5.6" width="18.8" height="18.8" rx="3.6" transform="rotate(-12 16 15)" fill="none" stroke="#a9adc8" strokeOpacity=".55" strokeWidth=".7" />
      <path d="M19.6 4.2 9.2 16.4h6.2l-3.6 11.4 11.4-14h-6.4z" fill="url(#xi-wa-bolt)" stroke="#5a3204" strokeWidth=".9" strokeLinejoin="round" />
      <path d="m18 7.4-6.2 7.6h3" fill="none" stroke="#fffbe0" strokeWidth=".8" strokeLinecap="round" opacity=".8" />
    </>
  ),
}

export type IconName = keyof typeof icons

export function Icon({ name, size = 32, className }: { name: string; size?: number; className?: string }) {
  return (
    <svg className={className} width={size} height={size} viewBox="0 0 32 32" aria-hidden="true" focusable="false">
      {icons[name] ?? icons.folder}
    </svg>
  )
}
