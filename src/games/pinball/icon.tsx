import type { ReactNode } from 'react'

// Chrome pinball over a tilted cosmic-blue table with a flag-coloured rocket fin.
export const icon: ReactNode = (
  <svg viewBox="0 0 32 32" width="32" height="32" aria-hidden="true">
    <defs>
      <linearGradient id="pb-table" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#3a74ff" />
        <stop offset="1" stopColor="#071a66" />
      </linearGradient>
      <radialGradient id="pb-ball" cx="0.35" cy="0.3" r="0.75">
        <stop offset="0" stopColor="#ffffff" />
        <stop offset="0.4" stopColor="#b8c8ea" />
        <stop offset="0.55" stopColor="#3a4f86" />
        <stop offset="1" stopColor="#a6b6d8" />
      </radialGradient>
    </defs>
    <path d="M7 4 L27 6 L30 28 L2 26 Z" fill="url(#pb-table)" stroke="#c8d2ea" strokeWidth="1.2" strokeLinejoin="round" />
    <circle cx="9" cy="10" r="0.6" fill="#fff" />
    <circle cx="22" cy="9" r="0.5" fill="#fff" />
    <circle cx="13" cy="20" r="0.5" fill="#dfe8ff" />
    <circle cx="25" cy="18" r="0.6" fill="#fff" />
    <path d="M17 8 L20.5 12 L20.5 19 L17 23 L13.5 19 L13.5 12 Z" fill="#e8eefc" stroke="#5a6688" strokeWidth="0.6" />
    <path d="M13.5 15 L10.5 20 L13.5 19 Z" fill="#d42032" />
    <path d="M20.5 15 L23.5 20 L20.5 19 Z" fill="#ffffff" stroke="#3a74ff" strokeWidth="0.5" />
    <path d="M17 18 L17 23 L16 21 Z" fill="#3a74ff" />
    <circle cx="17" cy="13" r="1.4" fill="#3af0ff" stroke="#2a3150" strokeWidth="0.5" />
    <path d="M6 24 L12 22.5" stroke="#d42032" strokeWidth="1.6" strokeLinecap="round" />
    <path d="M26 24 L20 22.5" stroke="#d42032" strokeWidth="1.6" strokeLinecap="round" />
    <ellipse cx="24.5" cy="27.5" rx="4" ry="1.4" fill="#000" opacity="0.35" />
    <circle cx="23" cy="24" r="4.2" fill="url(#pb-ball)" stroke="#2a3150" strokeWidth="0.5" />
    <circle cx="21.6" cy="22.5" r="1.1" fill="#fff" />
  </svg>
)

export default icon
