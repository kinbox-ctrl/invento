import { useState, type ReactNode } from 'react'

/* Shared hover tooltip — every chart gets a per-mark tooltip. */
export interface Tip { x: number; y: number; title: string; rows: { label: string; value: string; color?: string }[] }

export function useTip() {
  const [tip, setTip] = useState<Tip | null>(null)
  const node = tip ? (
    <div className="chart-tip" style={{ left: tip.x, top: tip.y }}>
      <div className="tt">{tip.title}</div>
      {tip.rows.map((r) => (
        <div className="tr" key={r.label}>
          <span>
            {r.color && <i style={{ width: 8, height: 8, borderRadius: 2, background: r.color, display: 'inline-block' }} />}
            {r.label}
          </span>
          <b className="tnum">{r.value}</b>
        </div>
      ))}
    </div>
  ) : null
  return { tip: node, show: (e: React.MouseEvent, t: Omit<Tip, 'x' | 'y'>) => setTip({ ...t, x: e.clientX, y: e.clientY }), hide: () => setTip(null) }
}

export function Legend({ items }: { items: { label: string; color: string }[] }) {
  return (
    <div className="legend">
      {items.map((i) => (
        <span key={i.label}>
          <i style={{ background: i.color }} />
          {i.label}
        </span>
      ))}
    </div>
  )
}

/* Horizontal stacked bars — one row per category, segments separated by a 2px surface gap. */
export function StackedBars({
  rows, series, format, labelWidth = 96,
}: {
  rows: { label: ReactNode; key: string; values: number[] }[]
  series: { label: string; color: string }[]
  format: (v: number) => string
  labelWidth?: number
}) {
  const { tip, show, hide } = useTip()
  const max = Math.max(1, ...rows.map((r) => r.values.reduce((a, b) => a + b, 0)))
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {rows.map((r) => {
        const total = r.values.reduce((a, b) => a + b, 0)
        return (
          <div key={r.key} style={{ display: 'grid', gridTemplateColumns: `${labelWidth}px 1fr 72px`, alignItems: 'center', gap: 12 }}>
            <div style={{ fontSize: 13 }}>{r.label}</div>
            <div
              style={{ display: 'flex', gap: 2, height: 22, width: `${(total / max) * 100}%`, minWidth: 4 }}
              onMouseLeave={hide}
            >
              {r.values.map((v, i) =>
                v > 0 ? (
                  <div
                    key={i}
                    onMouseMove={(e) =>
                      show(e, {
                        title: String(r.key),
                        rows: series.map((s, j) => ({ label: s.label, value: format(r.values[j]), color: s.color })).concat([{ label: 'Total', value: format(total), color: '' }]),
                      })
                    }
                    style={{
                      flex: v,
                      background: series[i].color,
                      borderRadius: i === 0 ? '4px 0 0 4px' : i === r.values.length - 1 || r.values.slice(i + 1).every((x) => x === 0) ? '0 4px 4px 0' : 0,
                      transition: 'flex 0.4s ease, opacity 0.15s',
                      cursor: 'default',
                    }}
                  />
                ) : null,
              )}
            </div>
            <div className="tnum" style={{ fontSize: 12.5, fontWeight: 600, textAlign: 'right' }}>{format(total)}</div>
          </div>
        )
      })}
      {tip}
    </div>
  )
}

/* Donut — for a part-to-whole with ≤ 4 ordered classes; always with legend + centre headline. */
export function Donut({ data, size = 168, thickness = 22, center, format }: { data: { label: string; value: number; color: string }[]; size?: number; thickness?: number; center: ReactNode; format: (v: number) => string }) {
  const { tip, show, hide } = useTip()
  const total = data.reduce((a, b) => a + b.value, 0) || 1
  const r = (size - thickness) / 2
  const c = 2 * Math.PI * r
  const gap = 3
  let acc = 0
  return (
    <div style={{ position: 'relative', width: size, height: size, flex: 'none' }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ transform: 'rotate(-90deg)' }} onMouseLeave={hide}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--surface-3)" strokeWidth={thickness} />
        {data.map((d) => {
          const len = (d.value / total) * c
          const seg = (
            <circle
              key={d.label}
              cx={size / 2}
              cy={size / 2}
              r={r}
              fill="none"
              stroke={d.color}
              strokeWidth={thickness}
              strokeDasharray={`${Math.max(0, len - gap)} ${c}`}
              strokeDashoffset={-acc}
              onMouseMove={(e) => show(e, { title: d.label, rows: [{ label: 'Value', value: format(d.value), color: d.color }, { label: 'Share', value: `${((d.value / total) * 100).toFixed(1)}%` }] })}
              style={{ transition: 'stroke-dasharray 0.5s ease' }}
            />
          )
          acc += len
          return seg
        })}
      </svg>
      <div style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', textAlign: 'center' }}>{center}</div>
      {tip}
    </div>
  )
}

/* Area trend with crosshair tooltip. Single series → title names it, no legend box. */
export function AreaTrend({ points, format, height = 180, color = 'var(--s1)' }: { points: { label: string; value: number }[]; format: (v: number) => string; height?: number; color?: string }) {
  const [hover, setHover] = useState<number | null>(null)
  const W = 640
  const H = height
  const pad = { l: 8, r: 8, t: 14, b: 24 }
  const max = Math.max(...points.map((p) => p.value)) * 1.12
  const min = 0
  const x = (i: number) => pad.l + (i / (points.length - 1)) * (W - pad.l - pad.r)
  const y = (v: number) => pad.t + (1 - (v - min) / (max - min)) * (H - pad.t - pad.b)
  const line = points.map((p, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(p.value).toFixed(1)}`).join(' ')
  const area = `${line} L${x(points.length - 1)},${H - pad.b} L${x(0)},${H - pad.b} Z`
  const grid = [0.25, 0.5, 0.75, 1].map((f) => min + f * (max - min))
  return (
    <div style={{ position: 'relative' }}>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        width="100%"
        height={H}
        preserveAspectRatio="none"
        onMouseMove={(e) => {
          const rect = (e.currentTarget as SVGSVGElement).getBoundingClientRect()
          const px = ((e.clientX - rect.left) / rect.width) * W
          const i = Math.round(((px - pad.l) / (W - pad.l - pad.r)) * (points.length - 1))
          setHover(Math.max(0, Math.min(points.length - 1, i)))
        }}
        onMouseLeave={() => setHover(null)}
      >
        <defs>
          <linearGradient id="areaFill" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0" stopColor={color} stopOpacity="0.22" />
            <stop offset="1" stopColor={color} stopOpacity="0" />
          </linearGradient>
        </defs>
        {grid.map((g) => (
          <line key={g} x1={pad.l} x2={W - pad.r} y1={y(g)} y2={y(g)} stroke="var(--grid)" strokeWidth="1" vectorEffect="non-scaling-stroke" />
        ))}
        <line x1={pad.l} x2={W - pad.r} y1={H - pad.b} y2={H - pad.b} stroke="var(--axis)" strokeWidth="1" vectorEffect="non-scaling-stroke" />
        <path d={area} fill="url(#areaFill)" />
        <path d={line} fill="none" stroke={color} strokeWidth="2" vectorEffect="non-scaling-stroke" strokeLinejoin="round" />
        {hover != null && <line x1={x(hover)} x2={x(hover)} y1={pad.t} y2={H - pad.b} stroke="var(--ink-3)" strokeDasharray="3 3" vectorEffect="non-scaling-stroke" />}
      </svg>
      {/* HTML overlays keep text & markers undistorted */}
      <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: 20, pointerEvents: 'none' }}>
        {points.map((p, i) =>
          i % 2 === 0 || i === points.length - 1 ? (
            <span key={p.label} className="muted" style={{ position: 'absolute', left: `${(x(i) / W) * 100}%`, transform: 'translateX(-50%)', fontSize: 11 }}>
              {p.label}
            </span>
          ) : null,
        )}
      </div>
      {(hover ?? points.length - 1) != null && (() => {
        const i = hover ?? points.length - 1
        return (
          <>
            <span
              style={{
                position: 'absolute', left: `${(x(i) / W) * 100}%`, top: y(points[i].value), width: 10, height: 10, borderRadius: 99,
                background: color, border: '2px solid var(--surface)', transform: 'translate(-50%,-50%)', pointerEvents: 'none', boxShadow: 'var(--shadow-sm)',
              }}
            />
            <div
              className="chart-tip"
              style={{ position: 'absolute', left: `${(x(i) / W) * 100}%`, top: y(points[i].value), transform: `translate(${i > points.length * 0.7 ? '-100%' : '-50%'}, calc(-100% - 12px))`, minWidth: 0, whiteSpace: 'nowrap' }}
            >
              <div className="tt">{points[i].label}</div>
              <b className="tnum">{format(points[i].value)}</b>
            </div>
          </>
        )
      })()}
    </div>
  )
}

/* Simple ranked horizontal bars (single measure). */
export function BarList({ rows, format, color = 'var(--s1)' }: { rows: { key: string; label: ReactNode; value: number; sub?: string; color?: string }[]; format: (v: number) => string; color?: string }) {
  const { tip, show, hide } = useTip()
  const max = Math.max(1, ...rows.map((r) => Math.abs(r.value)))
  return (
    <div>
      {rows.map((r) => (
        <div className="hbar-row" key={r.key} onMouseLeave={hide}>
          <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.label}</div>
          <div style={{ height: 16, display: 'flex', alignItems: 'center' }}>
            <div
              onMouseMove={(e) => show(e, { title: r.key, rows: [{ label: r.sub ?? 'Value', value: format(r.value), color: r.color ?? color }] })}
              style={{
                height: 16, width: `${(Math.abs(r.value) / max) * 100}%`, minWidth: 3, borderRadius: '0 4px 4px 0',
                background: r.value < 0 ? 'var(--bad)' : r.color ?? color, transition: 'width 0.4s ease',
              }}
            />
          </div>
          <div className="tnum" style={{ textAlign: 'right', fontWeight: 600, fontSize: 12.5 }}>{format(r.value)}</div>
        </div>
      ))}
      {tip}
    </div>
  )
}
