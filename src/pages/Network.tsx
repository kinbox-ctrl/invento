import { useMemo, useState } from 'react'
import { ArrowDownLeft, ArrowUpRight, Factory, UserRound } from 'lucide-react'
import type { Nav } from '../App'
import type { PlantId } from '../types'
import { useStore } from '../store'
import { PLANT, PLANT_COLOR, PLANTS } from '../data/catalog'
import { agingClass, bookValue, roadKm, transitDays } from '../engine/engine'
import { inr, num } from '../engine/format'
import { Card, PlantTag } from '../components/ui'
import { Legend, useTip } from '../components/charts'

// Coarse India outline (lng, lat) — context only, not survey-accurate.
const OUTLINE: [number, number][] = [
  [68.4, 23.6], [69.5, 22.4], [70.4, 20.9], [72.6, 21.1], [72.8, 19], [73.4, 16], [74.4, 14], [74.9, 12.7], [75.8, 11.2], [76.4, 9.5], [77.3, 8.1], [77.8, 8.2],
  [78.2, 8.9], [79, 9.3], [79.9, 10.3], [79.8, 11.6], [80.3, 13.3], [80.1, 15.1], [81.2, 16.3], [82.3, 16.6], [83.4, 17.6], [84.8, 19.2], [86.4, 19.9],
  [87, 21.5], [88.2, 21.6], [89, 22], [88.7, 24.2], [88.1, 24.5], [88.4, 26.3], [89.8, 26], [92, 26.8], [95.2, 27.9], [96.1, 29.4], [94.6, 29.3],
  [92.5, 27.8], [89.6, 28.2], [88.1, 27.9], [88.2, 26.7], [86, 26.6], [84.1, 27.5], [81.8, 27.9], [80.1, 28.8], [81, 30.2], [79, 31.3], [78.8, 32.5],
  [79.5, 32.8], [78.4, 34.6], [77.8, 35.5], [76, 35.8], [74.5, 34.8], [73.8, 34.3], [74.3, 33], [74.6, 32.4], [75.3, 32.2], [74.5, 31], [73.9, 30.4],
  [73.4, 29.9], [72.8, 29], [71, 27.9], [70.2, 26.5], [70.1, 25.7], [69.5, 25.1], [68.8, 24.3],
]
const K = 17
const px = (lng: number) => (lng - 67.5) * 0.93 * K
const py = (lat: number) => (37 - lat) * K

export default function NetworkPage({ nav }: { nav: Nav }) {
  const { state, opportunities } = useStore()
  const [sel, setSel] = useState<PlantId>('MNS')
  const { tip, show, hide } = useTip()

  const stats = useMemo(
    () =>
      Object.fromEntries(
        PLANTS.map((p) => {
          const inv = state.inventory.filter((i) => i.plantId === p.id)
          const total = inv.reduce((a, i) => a + bookValue(i), 0)
          const idle = inv.filter((i) => agingClass(i) !== 'Active').reduce((a, i) => a + bookValue(i), 0)
          const out = opportunities.filter((o) => o.supply.plantId === p.id && o.econ.savings > 0)
          const inn = opportunities.filter((o) => o.demand.plantId === p.id && o.econ.savings > 0)
          return [p.id, { total, idle, lots: inv.length, out, inn, demand: state.demand.filter((d) => d.plantId === p.id).length }]
        }),
      ) as Record<PlantId, { total: number; idle: number; lots: number; out: typeof opportunities; inn: typeof opportunities; demand: number }>,
    [state, opportunities],
  )

  const lanes = useMemo(() => {
    const m = new Map<string, { from: PlantId; to: PlantId; savings: number; n: number }>()
    opportunities.filter((o) => o.econ.savings > 0 && o.band !== 'Red').forEach((o) => {
      const k = `${o.supply.plantId}>${o.demand.plantId}`
      const cur = m.get(k) ?? { from: o.supply.plantId, to: o.demand.plantId, savings: 0, n: 0 }
      cur.savings += o.econ.savings
      cur.n++
      m.set(k, cur)
    })
    return [...m.values()]
  }, [opportunities])
  const moving = state.transfers.filter((t) => t.status === 'In Transit' || t.status === 'Approved' || t.status === 'Pending QA')
  const maxS = Math.max(1, ...lanes.map((l) => l.savings))

  const arc = (a: PlantId, b: PlantId, bend = 0.18) => {
    const x1 = px(PLANT[a].lng), y1 = py(PLANT[a].lat), x2 = px(PLANT[b].lng), y2 = py(PLANT[b].lat)
    const mx = (x1 + x2) / 2, my = (y1 + y2) / 2
    const dx = x2 - x1, dy = y2 - y1
    return `M${x1},${y1} Q${mx - dy * bend},${my + dx * bend} ${x2},${y2}`
  }
  const st = stats[sel]
  const p = PLANT[sel]

  return (
    <div className="page">
      <div className="grid g-main" style={{ alignItems: 'start' }}>
        <Card title="Group plant network" sub="Arrow width ∝ identified saving on the lane. Dashed lanes carry transfers already in motion.">
          <div style={{ marginBottom: 10 }}>
            <Legend items={[{ label: 'Redeployment lane (saving)', color: 'var(--brand)' }, { label: 'Transfer in progress', color: 'var(--ink-2)' }]} />
          </div>
          <div style={{ display: 'grid', placeItems: 'center' }}>
            <svg viewBox={`${px(67.8)} ${py(36.2)} ${px(97) - px(67.8)} ${py(7.5) - py(36.2)}`} style={{ width: '100%', maxWidth: 620, height: 'auto' }} onMouseLeave={hide}>
              <defs>
                <pattern id="dots" width="10" height="10" patternUnits="userSpaceOnUse"><circle cx="1" cy="1" r="0.9" fill="var(--line-strong)" /></pattern>
                <marker id="arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" fill="var(--brand)" /></marker>
              </defs>
              <path d={`M${OUTLINE.map(([lng, lat]) => `${px(lng)},${py(lat)}`).join(' L')} Z`} fill="url(#dots)" stroke="var(--line-strong)" strokeWidth="1.2" />
              <path d={`M${OUTLINE.map(([lng, lat]) => `${px(lng)},${py(lat)}`).join(' L')} Z`} fill="var(--surface-2)" opacity="0.5" />
              {lanes.map((l) => (
                <path
                  key={`${l.from}${l.to}`}
                  d={arc(l.from, l.to)}
                  fill="none"
                  stroke="var(--brand)"
                  strokeOpacity={sel === l.from || sel === l.to ? 0.9 : 0.35}
                  strokeWidth={1.5 + (l.savings / maxS) * 5}
                  strokeLinecap="round"
                  markerEnd="url(#arrow)"
                  onMouseMove={(e) => show(e, { title: `${PLANT[l.from].name} → ${PLANT[l.to].name}`, rows: [{ label: 'Saving', value: inr(l.savings), color: 'var(--brand)' }, { label: 'Matches', value: String(l.n) }, { label: 'Road km', value: num(roadKm(l.from, l.to)) }] })}
                  style={{ cursor: 'default', transition: 'stroke-opacity .2s' }}
                />
              ))}
              {moving.map((t) => (
                <path key={t.id} d={arc(t.from, t.to, -0.12)} fill="none" stroke="var(--ink-2)" strokeWidth="1.6" strokeDasharray="4 5" className="flow" />
              ))}
              {PLANTS.map((pl) => {
                const x = px(pl.lng), y = py(pl.lat)
                const r = 7 + Math.sqrt(stats[pl.id].total / 1e7) * 5
                return (
                  <g key={pl.id} onClick={() => setSel(pl.id)} style={{ cursor: 'pointer' }}
                    onMouseMove={(e) => show(e, { title: `${pl.name} · ${pl.division}`, rows: [{ label: 'Inventory', value: inr(stats[pl.id].total), color: PLANT_COLOR[pl.id] }, { label: 'Idle > 90d', value: inr(stats[pl.id].idle) }] })}>
                    <circle cx={x} cy={y} r={r + 6} fill={PLANT_COLOR[pl.id]} opacity={sel === pl.id ? 0.22 : 0.1} />
                    <circle cx={x} cy={y} r={r} fill={PLANT_COLOR[pl.id]} stroke="var(--surface)" strokeWidth="2.5" />
                    <text x={x + r + 8} y={y + 4} fontSize="12.5" fontWeight={650} fill="var(--ink)" style={{ paintOrder: 'stroke', stroke: 'var(--surface)', strokeWidth: 4 }}>{pl.name}</text>
                  </g>
                )
              })}
            </svg>
          </div>
          {tip}
        </Card>

        <div className="stack" style={{ gap: 16 }}>
          <Card>
            <div className="row" style={{ gap: 12, marginBottom: 14 }}>
              <div className="kpi-icon" style={{ width: 42, height: 42, borderRadius: 11, background: PLANT_COLOR[sel], color: '#fff' }}><Factory size={20} /></div>
              <div>
                <div style={{ fontWeight: 680, fontSize: 17 }}>{p.name} <span className="plant-code">{p.id}</span></div>
                <div className="muted" style={{ fontSize: 12.5 }}>{p.division} · {p.city}, {p.state}</div>
              </div>
            </div>
            <div className="grid g-2" style={{ gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <Mini label="Inventory" value={inr(st.total)} />
              <Mini label="Idle > 90 days" value={inr(st.idle)} sub={`${((st.idle / (st.total || 1)) * 100).toFixed(0)}% of plant stock`} />
              <Mini label="Can give" value={inr(st.out.reduce((a, o) => a + o.econ.savings, 0))} sub={`${st.out.length} outbound matches`} icon={<ArrowUpRight size={13} />} />
              <Mini label="Can receive" value={inr(st.inn.reduce((a, o) => a + o.econ.savings, 0))} sub={`${st.inn.length} inbound matches`} icon={<ArrowDownLeft size={13} />} />
            </div>
            <div className="row" style={{ marginTop: 14, fontSize: 12.5 }}><UserRound size={14} className="muted" />Plant head: <b>{p.head}</b></div>
            <div className="row" style={{ marginTop: 12, gap: 8 }}>
              <button className="btn sm" onClick={() => nav.go('inventory')}>Inventory</button>
              <button className="btn sm" onClick={() => nav.go('opportunities')}>Opportunities</button>
            </div>
          </Card>
          <Card title="Lanes from this plant" pad={false}>
            <div className="table-wrap" style={{ marginTop: 10 }}>
              <table className="t">
                <thead><tr><th>To</th><th className="r">Road km</th><th className="r">Transit</th><th className="r">Freight / T</th></tr></thead>
                <tbody>
                  {PLANTS.filter((x) => x.id !== sel).map((x) => {
                    const km = roadKm(sel, x.id)
                    return (
                      <tr key={x.id}>
                        <td><PlantTag id={x.id} /></td>
                        <td className="r">{num(km)}</td>
                        <td className="r">{transitDays(km, state.calibration[`${sel}>${x.id}`])} d</td>
                        <td className="r">{inr(km * state.settings.freightPerTonKm * state.settings.freightIndex * (state.calibration[`${sel}>${x.id}`]?.freightFactor ?? 1), { compact: false })}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      </div>

      <div className="grid g-kpi">
        {PLANTS.map((pl) => (
          <button key={pl.id} className="card kpi" style={{ textAlign: 'left', cursor: 'pointer', borderColor: sel === pl.id ? PLANT_COLOR[pl.id] : undefined, boxShadow: sel === pl.id ? `0 0 0 1px ${PLANT_COLOR[pl.id]}` : undefined }} onClick={() => setSel(pl.id)}>
            <div className="kpi-label"><PlantTag id={pl.id} code /></div>
            <div className="kpi-value" style={{ fontSize: 21 }}>{inr(stats[pl.id].total)}</div>
            <div className="meter" style={{ marginTop: 4 }}><i style={{ width: `${(stats[pl.id].idle / (stats[pl.id].total || 1)) * 100}%`, background: 'var(--serious)' }} /></div>
            <div className="kpi-foot">{((stats[pl.id].idle / (stats[pl.id].total || 1)) * 100).toFixed(0)}% idle · {stats[pl.id].lots} lots · {stats[pl.id].demand} demand</div>
          </button>
        ))}
      </div>
    </div>
  )
}

function Mini({ label, value, sub, icon }: { label: string; value: string; sub?: string; icon?: React.ReactNode }) {
  return (
    <div style={{ background: 'var(--surface-2)', border: '1px solid var(--line)', borderRadius: 10, padding: '10px 12px' }}>
      <div className="muted row" style={{ fontSize: 12, gap: 4 }}>{icon}{label}</div>
      <div style={{ fontWeight: 680, fontSize: 17, letterSpacing: '-0.02em' }} className="tnum">{value}</div>
      {sub && <div className="muted" style={{ fontSize: 11.5 }}>{sub}</div>}
    </div>
  )
}
