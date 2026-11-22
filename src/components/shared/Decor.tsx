import type { CSSProperties } from 'react'

// Small hand-drawn decorations shared across the app. All are purely
// decorative: aria-hidden and pointer-events-none.

/** Four-point sparkle with a dark outline, like a sticker. */
export function Sparkle({
  size = 22,
  className = '',
  delay = 0,
  style,
}: {
  size?: number
  className?: string
  delay?: number
  style?: CSSProperties
}) {
  return (
    <svg
      aria-hidden
      width={size}
      height={size}
      viewBox="0 0 24 24"
      className={`pointer-events-none animate-twinkle ${className}`}
      style={{ animationDelay: `${delay}s`, ...style }}
    >
      <path
        d="M12 1.5 C13 8 16 11 22.5 12 C16 13 13 16 12 22.5 C11 16 8 13 1.5 12 C8 11 11 8 12 1.5 Z"
        fill="var(--color-sparkle)"
        stroke="var(--color-text-primary)"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
    </svg>
  )
}

/** A strip of gingham washi tape. */
export function Washi({ className = '', rotate = -4 }: { className?: string; rotate?: number }) {
  return <div aria-hidden className={`washi pointer-events-none ${className}`} style={{ rotate: `${rotate}deg` }} />
}

/** The toodoo goose, drawn round and soft. */
export function GooseFace({ size = 64, className = '' }: { size?: number; className?: string }) {
  return (
    <svg aria-hidden width={size} height={size} viewBox="0 0 100 100" className={`pointer-events-none ${className}`}>
      {/* sprout */}
      <path d="M50 14 C50 8 52 4 56 2" stroke="#7aa94a" strokeWidth="3" fill="none" strokeLinecap="round" />
      <ellipse cx="60" cy="5" rx="7" ry="4" fill="#8fbf5a" transform="rotate(-20 60 5)" />
      {/* head */}
      <ellipse cx="50" cy="56" rx="40" ry="40" fill="#fbe9a0" />
      <ellipse cx="50" cy="56" rx="40" ry="40" fill="none" stroke="#f2d872" strokeWidth="3" />
      {/* cheeks */}
      <ellipse cx="24" cy="66" rx="7" ry="4.5" fill="#ec8f86" opacity="0.55" />
      <ellipse cx="76" cy="66" rx="7" ry="4.5" fill="#ec8f86" opacity="0.55" />
      {/* eyes */}
      <circle cx="34" cy="50" r="4.6" fill="#5a4030" />
      <circle cx="66" cy="50" r="4.6" fill="#5a4030" />
      <circle cx="35.5" cy="48.5" r="1.4" fill="#fff" />
      <circle cx="67.5" cy="48.5" r="1.4" fill="#fff" />
      {/* beak */}
      <ellipse cx="50" cy="66" rx="17" ry="9" fill="#f7a23e" />
      <path d="M34 66 Q50 69 66 66" stroke="#e5781f" strokeWidth="2.4" fill="none" strokeLinecap="round" />
    </svg>
  )
}

/** A pair of carrots for the bottom corner. */
export function Carrots({ className = '' }: { className?: string }) {
  return (
    <svg aria-hidden width="86" height="70" viewBox="0 0 86 70" className={`pointer-events-none ${className}`}>
      <g transform="rotate(-35 30 40)">
        <path d="M18 18 L42 18 L30 66 Z" fill="#ea7a3c" />
        <path d="M22 28 L28 28 M24 40 L31 40" stroke="#c95e25" strokeWidth="2" strokeLinecap="round" />
        <path d="M30 18 L24 4 M30 18 L31 2 M30 18 L38 6" stroke="#7aa94a" strokeWidth="3.5" strokeLinecap="round" />
      </g>
      <g transform="rotate(-35 62 46)">
        <path d="M52 26 L72 26 L62 68 Z" fill="#f08a48" />
        <path d="M56 36 L61 36 M58 48 L64 48" stroke="#c95e25" strokeWidth="2" strokeLinecap="round" />
        <path d="M62 26 L57 14 M62 26 L63 12 M62 26 L69 16" stroke="#7aa94a" strokeWidth="3.5" strokeLinecap="round" />
      </g>
    </svg>
  )
}

/** Little blossom sticker. */
export function Blossom({ size = 34, className = '' }: { size?: number; className?: string }) {
  return (
    <svg aria-hidden width={size} height={size} viewBox="0 0 40 40" className={`pointer-events-none ${className}`}>
      {[0, 72, 144, 216, 288].map((a) => (
        <ellipse key={a} cx="20" cy="10" rx="7" ry="9" fill="#ec8f86" transform={`rotate(${a} 20 20)`} />
      ))}
      <circle cx="20" cy="20" r="5" fill="#f7c86a" />
    </svg>
  )
}
