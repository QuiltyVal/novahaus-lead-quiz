/**
 * Global SVG gradient definitions.
 * Include once in layout — all icons reference url(#brand-gradient).
 */
export default function SvgDefs() {
  return (
    <svg
      width="0"
      height="0"
      style={{ position: 'absolute', overflow: 'hidden' }}
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="brand-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style={{ stopColor: '#be4a74' }} />
          <stop offset="100%" style={{ stopColor: '#2a6784' }} />
        </linearGradient>
      </defs>
    </svg>
  )
}
