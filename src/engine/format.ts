import type { Spec, Uom } from '../types'
import { MATERIAL } from '../data/catalog'

/** Indian-system currency: ₹1.23 Cr, ₹45.6 L, ₹12,300 */
export function inr(v: number, opts: { compact?: boolean; decimals?: number } = {}): string {
  const { compact = true } = opts
  const sign = v < 0 ? '−' : ''
  const a = Math.abs(v)
  if (compact && a >= 1e7) return `${sign}₹${(a / 1e7).toFixed(opts.decimals ?? 2)} Cr`
  if (compact && a >= 1e5) return `${sign}₹${(a / 1e5).toFixed(opts.decimals ?? 1)} L`
  if (a > 0 && a < 100) return `${sign}₹${a.toFixed(2)}`
  return `${sign}₹${Math.round(a).toLocaleString('en-IN')}`
}

export function num(v: number, d = 0): string {
  return v.toLocaleString('en-IN', { maximumFractionDigits: d, minimumFractionDigits: 0 })
}

export function qty(v: number, uom: Uom): string {
  return uom === 'T' ? `${num(v, 1)} T` : `${num(v)} pcs`
}

export function specLabel(spec: Spec): string {
  const m = MATERIAL[spec.material]
  if (!m) return spec.material
  if (m.category === 'Tube') return `Ø${spec.od} × ${spec.thickness} mm`
  if (spec.thickness && spec.width) return `${spec.thickness.toFixed(2)} × ${spec.width} mm`
  return m.standard.split(' · ').slice(-1)[0]
}

export function shortGrade(key: string): string {
  const m = MATERIAL[key]
  if (!m) return key
  if (m.category === 'Fastener') return m.name.replace('Hex Bolt ', '')
  if (m.category === 'Tooling') return 'CNMG 120408'
  const special: Record<string, string> = { HRE250: 'HR E250', HRE350: 'HR E350', GI275: 'GI Z275', SS304: 'SS 304', ST52: 'ERW ST52' }
  return special[key] ?? key
}

export function daysBetween(a: string | number, b: string | number = Date.now()): number {
  return Math.floor((new Date(b).getTime() - new Date(a).getTime()) / 86_400_000)
}

export function dateLabel(iso: string): string {
  return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
}

export function timeAgo(iso: string): string {
  const s = (Date.now() - new Date(iso).getTime()) / 1000
  if (s < 60) return 'just now'
  if (s < 3600) return `${Math.floor(s / 60)} min ago`
  if (s < 86400) return `${Math.floor(s / 3600)} h ago`
  return `${Math.floor(s / 86400)} d ago`
}

export function pct(v: number, d = 0): string {
  return `${(v * 100).toFixed(d)}%`
}
