import type { CSSProperties } from 'react'

// Hand-drawn decorations shared across the app. All are purely decorative:
// aria-hidden and pointer-events-none.
//
// Mascot style: thick dark ink outline over a flat butter fill that's printed
// slightly off-register (the fill is nudged down-left of the line), dot eyes,
// a flat orange bill.

const INK = '#2e2219'
const BODY = '#f8dc93'
const BILL = '#f0a04b'

/** Four-point sparkle, outlined like a doodle. */
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
        fill="var(--color-butter-deep)"
        stroke={INK}
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
    </svg>
  )
}

/** A strip of soft gingham washi tape. */
export function Washi({ className = '', rotate = -4 }: { className?: string; rotate?: number }) {
  return <div aria-hidden className={`washi pointer-events-none ${className}`} style={{ rotate: `${rotate}deg` }} />
}

/** Round duck-face badge — the app logo (also the favicon and home-screen
 *  icon). Unlike the full-body ducks it's drawn clean and symmetric, with no
 *  off-register fill, so it stays crisp at tiny sizes. */
export function DuckFace({ size = 64, className = '' }: { size?: number; className?: string }) {
  return (
    <svg aria-hidden width={size} height={size} viewBox="0 0 100 100" className={`pointer-events-none ${className}`}>
      <circle cx="50" cy="50" r="43" fill={BODY} stroke={INK} strokeWidth="5" />
      <circle cx="37" cy="43" r="4.8" fill={INK} />
      <circle cx="63" cy="43" r="4.8" fill={INK} />
      <path
        d="M29 58 C31 49 69 49 71 58 C69 68 31 68 29 58 Z"
        fill={BILL}
        stroke={INK}
        strokeWidth="3.2"
        strokeLinejoin="round"
      />
      <path d="M32 58.5 Q50 61 68 58.5" stroke={INK} strokeWidth="2.2" fill="none" strokeLinecap="round" />
    </svg>
  )
}

const STAND_BODY =
  'M27 21 C25 3 67 1 68 19 C69 31 67 45 66 56 C83 59 95 73 93 90 C91 106 77 114 55 114 C32 114 16 108 17 92 C18 78 23 70 29 64 C28 50 27 35 27 21 Z'

/** The whole duck, standing — a chunky bean with a wing tucked on its belly. */
export function Duck({ size = 90, className = '' }: { size?: number; className?: string }) {
  return (
    <svg
      aria-hidden
      width={size}
      height={size * 1.3}
      viewBox="0 0 100 130"
      className={`pointer-events-none ${className}`}
    >
      {/* legs + feet (behind the body) */}
      <path d="M40 110 L40 121 M66 110 L66 121" stroke={INK} strokeWidth="4" strokeLinecap="round" />
      <path
        d="M30 124 C30 119 46 118 47 123 C47 127 31 128 30 124 Z M58 124 C58 119 74 118 75 123 C75 127 59 128 58 124 Z"
        fill={BILL}
        stroke={INK}
        strokeWidth="3.5"
        strokeLinejoin="round"
      />
      {/* off-register fill, then the ink line on top */}
      <path d={STAND_BODY} fill={BODY} transform="translate(-3 2.5)" />
      <path d={STAND_BODY} fill="none" stroke={INK} strokeWidth="4.5" strokeLinejoin="round" />
      {/* wing */}
      <path
        d="M52 86 C57 76 75 76 80 87 C72 93 60 93 52 88"
        fill="none"
        stroke={INK}
        strokeWidth="4"
        strokeLinecap="round"
      />
      {/* face */}
      <circle cx="41" cy="23" r="3" fill={INK} />
      <circle cx="57" cy="22" r="3" fill={INK} />
      <path
        d="M33 34 C39 26 61 26 67 33 C63 42 39 44 33 34 Z"
        fill={BILL}
        stroke={INK}
        strokeWidth="3.5"
        strokeLinejoin="round"
      />
      <path d="M37 34.5 Q50 37.5 63 33.5" stroke={INK} strokeWidth="2.2" fill="none" strokeLinecap="round" />
    </svg>
  )
}

const LOUNGE_BODY =
  'M16 50 C12 36 24 28 35 31 C45 21 70 20 86 29 C98 37 98 54 86 60 C70 67 36 68 22 63 C17 60 17 55 16 50 Z'

/** The duck flopped on its belly, feet in the air — for idle/empty moments. */
export function LoungingDuck({ size = 140, className = '' }: { size?: number; className?: string }) {
  return (
    <svg
      aria-hidden
      width={size}
      height={size * 0.66}
      viewBox="0 0 112 74"
      className={`pointer-events-none ${className}`}
    >
      {/* feet kicked up behind */}
      <path d="M88 34 L98 20 M93 38 L104 26" stroke={INK} strokeWidth="3.5" strokeLinecap="round" />
      <path
        d="M92 16 C93 9 103 10 100 21 C97 23 91 21 92 16 Z M99 23 C101 16 111 18 106 28 C103 30 97 28 99 23 Z"
        fill={BILL}
        stroke={INK}
        strokeWidth="3"
        strokeLinejoin="round"
      />
      <path d={LOUNGE_BODY} fill={BODY} transform="translate(-2.5 2.5)" />
      <path d={LOUNGE_BODY} fill="none" stroke={INK} strokeWidth="4" strokeLinejoin="round" />
      <path d="M50 42 C52 52 68 54 74 44" fill="none" stroke={INK} strokeWidth="3.5" strokeLinecap="round" />
      {/* sleepy closed eye + bill resting on the ground */}
      <path d="M26 40 Q29 43 32 40" stroke={INK} strokeWidth="2.6" fill="none" strokeLinecap="round" />
      <path
        d="M6 50 C8 43 22 43 25 49 C23 56 9 57 6 50 Z"
        fill={BILL}
        stroke={INK}
        strokeWidth="3"
        strokeLinejoin="round"
      />
    </svg>
  )
}
