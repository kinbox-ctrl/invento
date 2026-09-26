import { useId } from 'react'

/**
 * Invento mark — a steel coil unwinding into a strip that leaves as an arrow:
 * idle stock set back in motion toward a sister plant.
 */
export function LogoMark({ size = 32 }: { size?: number }) {
  const id = useId().replace(/:/g, '')
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" aria-hidden="true" style={{ flex: 'none', display: 'block' }}>
      <defs>
        <linearGradient id={`g${id}`} x1="0" y1="0" x2="32" y2="32" gradientUnits="userSpaceOnUse">
          <stop stopColor="#2dd4bf" />
          <stop offset="0.5" stopColor="#0891b2" />
          <stop offset="1" stopColor="#1e3a8a" />
        </linearGradient>
        <linearGradient id={`s${id}`} x1="0" y1="0" x2="0" y2="32" gradientUnits="userSpaceOnUse">
          <stop stopColor="#fff" stopOpacity="0.28" />
          <stop offset="0.5" stopColor="#fff" stopOpacity="0" />
        </linearGradient>
      </defs>
      <rect width="32" height="32" rx="9" fill={`url(#g${id})`} />
      <rect width="32" height="32" rx="9" fill={`url(#s${id})`} />
      <g transform="translate(0.2 0.8)">
      {/* coil: outer wrap opens at the top-right where the strip feeds out */}
      <path d="M13.5 8.5A8.5 8.5 0 1 0 22 17" stroke="#fff" strokeWidth="2.6" strokeLinecap="round" />
      <circle cx="13.5" cy="17" r="4.4" stroke="#fff" strokeWidth="2.2" opacity="0.72" />
      <circle cx="13.5" cy="17" r="1.5" fill="#fff" />
      {/* strip leaving as an arrow */}
      <path d="M13.5 8.5H25.2" stroke="#fff" strokeWidth="2.6" strokeLinecap="round" />
      <path d="M22.4 5.4 25.6 8.5 22.4 11.6" stroke="#fff" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
      </g>
    </svg>
  )
}

export function Logo({ size = 32, light, sub }: { size?: number; light?: boolean; sub?: string }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: size * 0.32 }}>
      <span style={{ borderRadius: size * 0.28, boxShadow: '0 6px 20px rgba(8,145,178,.35)', display: 'inline-flex' }}>
        <LogoMark size={size} />
      </span>
      <span style={{ display: 'inline-flex', flexDirection: 'column', lineHeight: 1 }}>
        <span style={{ fontWeight: 760, fontSize: size * 0.6, letterSpacing: '-0.045em', color: light ? '#fff' : 'var(--ink)' }}>
          invent<span style={{ color: light ? '#5eead4' : 'var(--brand)' }}>o</span>
        </span>
        {sub && <span style={{ fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase', color: light ? 'rgba(255,255,255,.5)' : 'var(--ink-3)', marginTop: 4, fontWeight: 600 }}>{sub}</span>}
      </span>
    </span>
  )
}
