import { useEffect, type ReactNode } from 'react'
import { AlertTriangle, CheckCircle2, CircleDot, Clock, OctagonAlert, Skull, X, XCircle } from 'lucide-react'
import type { AgingClass, Band, PlantId } from '../types'
import { PLANT, PLANT_COLOR } from '../data/catalog'
import { AGING_LABEL } from '../engine/engine'

export function PlantTag({ id, code = false }: { id: PlantId; code?: boolean }) {
  return (
    <span className="plant-tag">
      <span className="plant-dot" style={{ background: PLANT_COLOR[id] }} />
      {PLANT[id].name}
      {code && <span className="plant-code">{id}</span>}
    </span>
  )
}

export const BAND_TONE: Record<Band, string> = { Green: 'good', Amber: 'warn', Red: 'bad' }

export function BandPill({ band, score }: { band: Band; score?: number }) {
  const Icon = band === 'Green' ? CheckCircle2 : band === 'Amber' ? AlertTriangle : XCircle
  return (
    <span className={`pill ${BAND_TONE[band]}`}>
      <Icon size={12} strokeWidth={2.5} />
      {band}
      {score != null && <span className="tnum" style={{ opacity: 0.8 }}>· {score}%</span>}
    </span>
  )
}

export const AGING_TONE: Record<AgingClass, string> = { Active: 'good', Slow: 'warn', Dead: 'serious', Obsolete: 'bad' }
export const AGING_COLOR: Record<AgingClass, string> = { Active: 'var(--good)', Slow: 'var(--warn)', Dead: 'var(--serious)', Obsolete: 'var(--bad)' }
const AGING_ICON: Record<AgingClass, typeof Clock> = { Active: CircleDot, Slow: Clock, Dead: OctagonAlert, Obsolete: Skull }

export function AgingPill({ cls, days }: { cls: AgingClass; days?: number }) {
  const Icon = AGING_ICON[cls]
  return (
    <span className={`pill ${AGING_TONE[cls]}`} title={AGING_LABEL[cls]}>
      <Icon size={12} strokeWidth={2.5} />
      {cls}
      {days != null && <span className="tnum" style={{ opacity: 0.8 }}>· {days}d</span>}
    </span>
  )
}

export function Confidence({ value, band }: { value: number; band: Band }) {
  const color = band === 'Green' ? 'var(--good)' : band === 'Amber' ? 'var(--warn)' : 'var(--bad)'
  return (
    <span className="conf">
      <span className="meter">
        <i style={{ width: `${value}%`, background: color }} />
      </span>
      <span className="tnum" style={{ fontWeight: 600, fontSize: 12.5 }}>{value}%</span>
    </span>
  )
}

export function Kpi({ label, value, foot, icon, hero }: { label: string; value: ReactNode; foot?: ReactNode; icon: ReactNode; hero?: boolean }) {
  return (
    <div className={`card kpi ${hero ? 'hero' : ''}`}>
      <div className="kpi-label">
        <span className="kpi-icon">{icon}</span>
        {label}
      </div>
      <div className="kpi-value tnum">{value}</div>
      {foot && <div className="kpi-foot">{foot}</div>}
    </div>
  )
}

export function Card({ title, sub, action, children, pad = true, className = '' }: { title?: ReactNode; sub?: ReactNode; action?: ReactNode; children: ReactNode; pad?: boolean; className?: string }) {
  return (
    <section className={`card ${className}`}>
      {(title || action) && (
        <div className="card-h">
          <div>
            {title && <h3 className="card-t">{title}</h3>}
            {sub && <p className="card-s">{sub}</p>}
          </div>
          {action}
        </div>
      )}
      {pad ? <div className="card-b">{children}</div> : children}
    </section>
  )
}

export function Seg<T extends string>({ value, options, onChange }: { value: T; options: { value: T; label: ReactNode; count?: number }[]; onChange: (v: T) => void }) {
  return (
    <div className="seg" role="tablist">
      {options.map((o) => (
        <button key={o.value} className={o.value === value ? 'on' : ''} onClick={() => onChange(o.value)} role="tab" aria-selected={o.value === value}>
          {o.label}
          {o.count != null && <span className="c">{o.count}</span>}
        </button>
      ))}
    </div>
  )
}

function useEscape(onClose: () => void) {
  useEffect(() => {
    const h = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [onClose])
}

export function Drawer({ title, sub, onClose, children, footer, badge }: { title: ReactNode; sub?: ReactNode; onClose: () => void; children: ReactNode; footer?: ReactNode; badge?: ReactNode }) {
  useEscape(onClose)
  return (
    <>
      <div className="scrim" onClick={onClose} />
      <aside className="drawer" role="dialog" aria-modal="true">
        <div className="drawer-h">
          <div className="grow">
            {badge && <div style={{ marginBottom: 6 }}>{badge}</div>}
            <div style={{ fontSize: 17, fontWeight: 650, letterSpacing: '-0.02em' }}>{title}</div>
            {sub && <div className="muted" style={{ fontSize: 13, marginTop: 2 }}>{sub}</div>}
          </div>
          <button className="btn icon ghost" onClick={onClose} aria-label="Close">
            <X size={18} />
          </button>
        </div>
        <div className="drawer-b">{children}</div>
        {footer && <div className="drawer-f">{footer}</div>}
      </aside>
    </>
  )
}

export function Modal({ title, onClose, children, footer, wide }: { title: ReactNode; onClose: () => void; children: ReactNode; footer?: ReactNode; wide?: boolean }) {
  useEscape(onClose)
  return (
    <>
      <div className="scrim" onClick={onClose} />
      <div className={`modal ${wide ? 'wide' : ''}`} role="dialog" aria-modal="true">
        <div className="drawer-h">
          <div className="grow" style={{ fontSize: 16, fontWeight: 650 }}>{title}</div>
          <button className="btn icon ghost sm" onClick={onClose} aria-label="Close">
            <X size={16} />
          </button>
        </div>
        <div className="drawer-b">{children}</div>
        {footer && <div className="drawer-f">{footer}</div>}
      </div>
    </>
  )
}

export function Empty({ icon, title, text, action }: { icon: ReactNode; title: string; text?: string; action?: ReactNode }) {
  return (
    <div className="empty">
      <div className="empty-icon">{icon}</div>
      <div style={{ fontWeight: 600, color: 'var(--ink)' }}>{title}</div>
      {text && <div style={{ maxWidth: 380, fontSize: 13 }}>{text}</div>}
      {action}
    </div>
  )
}

export function Slider({ label, value, min, max, step, format, onChange, hint }: { label: string; value: number; min: number; max: number; step: number; format: (v: number) => string; onChange: (v: number) => void; hint?: string }) {
  return (
    <div className="slider">
      <div className="slider-top">
        <span className="ink2">{label}</span>
        <b>{format(value)}</b>
      </div>
      <input type="range" min={min} max={max} step={step} value={value} onChange={(e) => onChange(parseFloat(e.target.value))} aria-label={label} />
      {hint && <div className="muted" style={{ fontSize: 11.5 }}>{hint}</div>}
    </div>
  )
}
