import type { ReactNode } from 'react'

const paths: Record<string, ReactNode> = {
  home: (
    <>
      <path d="M4 15 16 5l12 10" />
      <path d="M7 13v13h7v-7h4v7h7V13" />
    </>
  ),
  recovery: (
    <>
      <path d="M16 3 5 7v8c0 7 5 12 11 14 6-2 11-7 11-14V7z" />
      <path d="m11 16 4 4 7-8" />
    </>
  ),
  approvals: (
    <>
      <circle cx="11" cy="16" r="5" />
      <path d="M16 16h12M24 16v5M28 16v4" />
    </>
  ),
  exchange: (
    <>
      <path d="M6 11h18l-5-5M26 21H8l5 5" />
    </>
  ),
  vault: (
    <>
      <rect x="4" y="5" width="24" height="22" rx="3" />
      <circle cx="16" cy="16" r="5" />
      <path d="M16 11v2M16 19v2M11 16h2M19 16h2M7 27v2M25 27v2" />
    </>
  ),
  gallery: (
    <>
      <rect x="4" y="6" width="24" height="20" rx="2" />
      <circle cx="11" cy="12" r="2.5" />
      <path d="m4 23 8-7 6 5 4-3 6 5" />
    </>
  ),
  paint: (
    <>
      <path d="M22 4 12 18l3 3L28 10z" />
      <path d="M12 18c-4 0-6 3-6 6 0 2-1 3-2 4 5 0 11-1 11-7" />
    </>
  ),
  wallet: (
    <>
      <rect x="4" y="8" width="24" height="18" rx="3" />
      <path d="M4 12h20M21 18h7" />
    </>
  ),
}

export function Icon({ name, size = 32 }: { name: keyof typeof paths | string; size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {paths[name]}
    </svg>
  )
}
