/**
 * SVG Icons — stroke-based, using url(#brand-gradient)
 *
 * All icons render at the size dictated by their parent container.
 * Default viewBox: 24×24. Stroke: currentColor fallback, gradient via CSS/inline.
 */

const gradientStroke = 'url(#brand-gradient)'

/* ── Location Pin ──────────────────────────── */
export function IconLocation({ size = 32, strokeWidth = 2 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={gradientStroke} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" />
      <circle cx="12" cy="9" r="2.5" />
    </svg>
  )
}

/* ── Euro / Savings ────────────────────────── */
export function IconSavings({ size = 32, strokeWidth = 2 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={gradientStroke} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <path d="M15 9.5C14.3 8.6 13.2 8 12 8c-2.2 0-4 1.8-4 4s1.8 4 4 4c1.2 0 2.3-.6 3-1.5" />
      <line x1="8" y1="11" x2="14" y2="11" />
      <line x1="8" y1="13" x2="14" y2="13" />
    </svg>
  )
}

/* ── Calendar with Check ───────────────────── */
export function IconCalendar({ size = 32, strokeWidth = 2 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={gradientStroke} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="18" rx="2" />
      <line x1="16" y1="2" x2="16" y2="6" />
      <line x1="8" y1="2" x2="8" y2="6" />
      <line x1="3" y1="10" x2="21" y2="10" />
      <path d="M9 16l2 2 4-4" />
    </svg>
  )
}

/* ── Chart Up / Trend ──────────────────────── */
export function IconChartUp({ size = 32, strokeWidth = 2 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={gradientStroke} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
      <polyline points="22 7 13.5 15.5 8.5 10.5 2 17" />
      <polyline points="16 7 22 7 22 13" />
      <line x1="2" y1="20" x2="22" y2="20" />
    </svg>
  )
}

/* ── Garden / Tree ─────────────────────────── */
export function IconGarden({ size = 32, strokeWidth = 2 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={gradientStroke} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22V10" />
      <path d="M12 10C12 10 8 7 8 4.5C8 2.5 10 1 12 3c2-2 4-.5 4 1.5C16 7 12 10 12 10z" />
      <path d="M7 15c-2 0-4 1-4 3s2 4 5 4" />
      <path d="M17 15c2 0 4 1 4 3s-2 4-5 4" />
    </svg>
  )
}

/* ── Sun / Terrace ─────────────────────────── */
export function IconSun({ size = 32, strokeWidth = 2 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={gradientStroke} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="5" />
      <line x1="12" y1="1" x2="12" y2="4" />
      <line x1="12" y1="20" x2="12" y2="23" />
      <line x1="4.22" y1="4.22" x2="6.34" y2="6.34" />
      <line x1="17.66" y1="17.66" x2="19.78" y2="19.78" />
      <line x1="1" y1="12" x2="4" y2="12" />
      <line x1="20" y1="12" x2="23" y2="12" />
      <line x1="4.22" y1="19.78" x2="6.34" y2="17.66" />
      <line x1="17.66" y1="6.34" x2="19.78" y2="4.22" />
    </svg>
  )
}

/* ── Checkmark ─────────────────────────────── */
export function IconCheck({ size = 32, strokeWidth = 2 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={gradientStroke} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <path d="M8 12l3 3 5-5" />
    </svg>
  )
}

/* ── Lock ──────────────────────────────────── */
export function IconLock({ size = 32, strokeWidth = 2 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={gradientStroke} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
      <rect x="5" y="11" width="14" height="10" rx="2" />
      <path d="M8 11V7a4 4 0 018 0v4" />
      <circle cx="12" cy="16" r="1.5" />
    </svg>
  )
}

/* ── Tram / ÖPNV ──────────────────────────── */
export function IconTram({ size = 32, strokeWidth = 2 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={gradientStroke} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
      <rect x="4" y="3" width="16" height="16" rx="3" />
      <line x1="12" y1="1" x2="12" y2="3" />
      <line x1="8" y1="1" x2="16" y2="1" />
      <line x1="4" y1="13" x2="20" y2="13" />
      <circle cx="8" cy="16" r="1" />
      <circle cx="16" cy="16" r="1" />
      <line x1="6" y1="19" x2="4" y2="22" />
      <line x1="18" y1="19" x2="20" y2="22" />
    </svg>
  )
}

/* ── Tree / Park ──────────────────────────── */
export function IconTree({ size = 32, strokeWidth = 2 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={gradientStroke} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22V14" />
      <path d="M12 6L7 14h10L12 6z" />
      <path d="M12 2L6 10h12L12 2z" />
    </svg>
  )
}

/* ── Shopping Bag ─────────────────────────── */
export function IconShopping({ size = 32, strokeWidth = 2 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={gradientStroke} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4H6z" />
      <line x1="3" y1="6" x2="21" y2="6" />
      <path d="M16 10a4 4 0 01-8 0" />
    </svg>
  )
}

/* ── Convenience map for Quiz icons ────────── */
export const QUIZ_ICONS = {
  'fire': ({ size = 24, strokeWidth = 1.5 }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={gradientStroke} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22c4-3 7-6.5 7-10.5C19 6 15 2 12 2c-1 2-2 3-3 4-1.5 1.5-3 3-3 5.5C6 15.5 8 19 12 22z" />
    </svg>
  ),
  'calendar': ({ size = 24, strokeWidth = 1.5 }) => <IconCalendar size={size} strokeWidth={strokeWidth} />,
  'lightbulb': ({ size = 24, strokeWidth = 1.5 }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={gradientStroke} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 18h6" />
      <path d="M10 22h4" />
      <path d="M12 2a7 7 0 00-4 12.7V17h8v-2.3A7 7 0 0012 2z" />
    </svg>
  ),
  'money': ({ size = 24, strokeWidth = 1.5 }) => <IconSavings size={size} strokeWidth={strokeWidth} />,
  'bank': ({ size = 24, strokeWidth = 1.5 }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={gradientStroke} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 21h18" />
      <path d="M3 10h18" />
      <path d="M12 3l9 7H3l9-7z" />
      <line x1="6" y1="10" x2="6" y2="21" />
      <line x1="10" y1="10" x2="10" y2="21" />
      <line x1="14" y1="10" x2="14" y2="21" />
      <line x1="18" y1="10" x2="18" y2="21" />
    </svg>
  ),
  'check': ({ size = 24, strokeWidth = 1.5 }) => <IconCheck size={size} strokeWidth={strokeWidth} />,
  'lock': ({ size = 24, strokeWidth = 1.5 }) => <IconLock size={size} strokeWidth={strokeWidth} />,
  'handshake': ({ size = 24, strokeWidth = 1.5 }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={gradientStroke} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 11l-2.5-2.5L14 12l-4-4-5 5" />
      <path d="M2 15l5-5 4 4 3.5-3.5L20 11v6H2v-6z" />
    </svg>
  ),
  'document': ({ size = 24, strokeWidth = 1.5 }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={gradientStroke} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="8" y1="13" x2="16" y2="13" />
      <line x1="8" y1="17" x2="16" y2="17" />
    </svg>
  ),
}
