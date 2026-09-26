import { useMemo, useState } from 'react'
import { ArrowRight, FlaskConical, RotateCcw, Save, TrendingDown, TrendingUp } from 'lucide-react'
import type { Nav } from '../App'
import type { PlantId, Settings } from '../types'
import { useStore } from '../store'
import { DEFAULT_SETTINGS, PLANTS } from '../data/catalog'
import { agingClass, bookValue, findOpportunities, minEconomicQty, surplusQty } from '../engine/engine'
import { inr, num, shortGrade, specLabel } from '../engine/format'
import { BandPill, Card, PlantTag, Slider } from '../components/ui'
import { BarList } from '../components/charts'

const PRESETS: { label: string; desc: string; patch: Partial<Settings> }[] = [
  { label: 'Steel prices −5% next quarter', desc: 'Hold vs. liquidate idle stock', patch: { marketIndex: 0.95 } },
  { label: 'Inter-plant freight +10%', desc: 'Re-test minimum economic quantities', patch: { freightIndex: 1.1 } },
  { label: 'EV programme demand +40%', desc: 'Re-prioritise surplus allocation', patch: { demandIndex: 1.4 } },
  { label: 'Scrap prices +25%', desc: 'When does scrapping beat reuse?', patch: { scrapIndex: 1.25 } },
]

export default function Scenarios({ nav: _nav }: { nav: Nav }) {
  const { state, opportunities: base, dispatch, toast } = useStore()
  const [s, setS] = useState<Settings>(state.settings)
  const set = (patch: Partial<Settings>) => setS((x) => ({ ...x, ...patch }))
  const scen = useMemo(() => findOpportunities(state, s), [state, s])

  const tot = (xs: typeof base) => xs.filter((o) => o.econ.savings > 0 && o.band !== 'Red').reduce((a, o) => a + o.econ.savings, 0)
  const baseTotal = tot(base)
  const scenTotal = tot(scen)
  const delta = scenTotal - baseTotal

  const compare = useMemo(() => {
    const keys = new Set([...base.map((o) => o.key), ...scen.map((o) => o.key)])
    return [...keys]
      .map((k) => ({ k, b: base.find((o) => o.key === k), n: scen.find((o) => o.key === k) }))
      .map((r) => ({ ...r, o: (r.n ?? r.b)!, bv: r.b?.econ.savings ?? 0, nv: r.n?.econ.savings ?? 0 }))
      .sort((a, b) => b.nv - a.nv)
  }, [base, scen])

  // Minimum economic quantity for CR4 from Manesar to every other plant.
  const meq = PLANTS.filter((p) => p.id !== 'MNS').map((p) => ({
    key: `Manesar → ${p.name}`,
    label: <PlantTag id={p.id} />,
    base: minEconomicQty('CR4', 'MNS', p.id as PlantId, state.settings, true),
    scen: minEconomicQty('CR4', 'MNS', p.id as PlantId, s, true),
  }))

  // Hold vs liquidate for idle stock that has no internal home.
  const matchedIds = new Set(scen.map((o) => o.supply.id))
  const orphans = state.inventory.filter((i) => agingClass(i) !== 'Active' && !matchedIds.has(i.id) && surplusQty(i, s) > 0)
  const hold = orphans.reduce((a, i) => a + bookValue(i) * (s.carryingRate / 4) + bookValue(i) * Math.max(0, 1 - s.marketIndex), 0)
  const liquidate = orphans.reduce((a, i) => a + bookValue(i) * s.secondarySaleFactor * s.marketIndex, 0)

  const dirty = JSON.stringify(s) !== JSON.stringify(state.settings)

  return (
    <div className="page">
      <div className="grid g-main-r" style={{ alignItems: 'start' }}>
        <div className="stack" style={{ gap: 16, position: 'sticky', top: 0 }}>
          <Card title="Scenario drivers" sub="Agent 08 · results update instantly" action={<button className="btn sm ghost" onClick={() => setS(state.settings)}><RotateCcw size={14} />Reset</button>}>
            <div className="stack" style={{ gap: 18 }}>
              <Slider label="New-buy material price" value={s.marketIndex} min={0.8} max={1.2} step={0.01} format={(v) => `${v >= 1 ? '+' : ''}${((v - 1) * 100).toFixed(0)}%`} onChange={(v) => set({ marketIndex: v })} />
              <Slider label="Inter-plant freight rate" value={s.freightIndex} min={0.8} max={1.6} step={0.01} format={(v) => `${v >= 1 ? '+' : ''}${((v - 1) * 100).toFixed(0)}%`} onChange={(v) => set({ freightIndex: v })} hint={`₹${(s.freightPerTonKm * s.freightIndex).toFixed(2)} per tonne-km`} />
              <Slider label="Scrap realisation" value={s.scrapIndex} min={0.7} max={1.5} step={0.01} format={(v) => `${v >= 1 ? '+' : ''}${((v - 1) * 100).toFixed(0)}%`} onChange={(v) => set({ scrapIndex: v })} />
              <Slider label="Demand volume" value={s.demandIndex} min={0.5} max={1.6} step={0.05} format={(v) => `${v >= 1 ? '+' : ''}${((v - 1) * 100).toFixed(0)}%`} onChange={(v) => set({ demandIndex: v })} />
              <Slider label="Carrying cost" value={s.carryingRate} min={0.1} max={0.25} step={0.01} format={(v) => `${(v * 100).toFixed(0)}% p.a.`} onChange={(v) => set({ carryingRate: v })} />
              <Slider label="Own-use cover kept at plant" value={s.surplusCoverMonths} min={0} max={6} step={1} format={(v) => `${v} months`} onChange={(v) => set({ surplusCoverMonths: v })} />
            </div>
          </Card>
          <Card title="Presets" sub="From the SCM leadership playbook">
            <div className="stack" style={{ gap: 8 }}>
              {PRESETS.map((p) => (
                <button key={p.label} className="btn" style={{ justifyContent: 'flex-start', height: 'auto', padding: '10px 12px', textAlign: 'left' }} onClick={() => setS({ ...state.settings, ...p.patch })}>
                  <FlaskConical size={15} style={{ flex: 'none' }} />
                  <span className="stack" style={{ gap: 0 }}>
                    <span>{p.label}</span>
                    <span className="muted" style={{ fontSize: 12, fontWeight: 450 }}>{p.desc}</span>
                  </span>
                </button>
              ))}
            </div>
          </Card>
        </div>

        <div className="stack" style={{ gap: 16 }}>
          <div className="grid g-3">
            <div className="card kpi hero">
              <div className="kpi-label">Scenario savings</div>
              <div className="kpi-value tnum">{inr(scenTotal)}</div>
              <div className="kpi-foot">baseline {inr(baseTotal)}</div>
            </div>
            <div className="card kpi">
              <div className="kpi-label">Change vs. baseline</div>
              <div className="kpi-value tnum" style={{ color: delta >= 0 ? 'var(--good-ink)' : 'var(--bad-ink)' }}>
                {delta >= 0 ? <TrendingUp size={20} style={{ verticalAlign: -2 }} /> : <TrendingDown size={20} style={{ verticalAlign: -2 }} />} {inr(delta)}
              </div>
              <div className="kpi-foot">{baseTotal ? `${((delta / baseTotal) * 100).toFixed(1)}%` : '—'}</div>
            </div>
            <div className="card kpi">
              <div className="kpi-label">Viable redeployments</div>
              <div className="kpi-value tnum">{scen.filter((o) => o.econ.savings > 0 && o.band !== 'Red').length}</div>
              <div className="kpi-foot">baseline {base.filter((o) => o.econ.savings > 0 && o.band !== 'Red').length}</div>
            </div>
          </div>

          <Card title="Hold vs. liquidate — idle stock with no internal home" sub={`${orphans.length} lots aged > 90 days that no sister plant needs`}>
            <div className="compare">
              <div className="compare-col">
                <b>Hold one more quarter</b>
                <div className="compare-row"><span className="muted">Carrying cost (3 mo)</span><span>{inr(orphans.reduce((a, i) => a + bookValue(i) * (s.carryingRate / 4), 0))}</span></div>
                <div className="compare-row"><span className="muted">Value erosion from price move</span><span>{inr(orphans.reduce((a, i) => a + bookValue(i) * Math.max(0, 1 - s.marketIndex), 0))}</span></div>
                <div className="compare-row total"><span>Cost of holding</span><span className="bad-ink">{inr(hold)}</span></div>
              </div>
              <div className="compare-col">
                <b>Liquidate now (secondary market)</b>
                <div className="compare-row"><span className="muted">Book value</span><span>{inr(orphans.reduce((a, i) => a + bookValue(i), 0))}</span></div>
                <div className="compare-row"><span className="muted">Recovery rate</span><span>{((s.secondarySaleFactor * s.marketIndex) * 100).toFixed(0)}%</span></div>
                <div className="compare-row total"><span>Cash recovered</span><span className="good-ink">{inr(liquidate)}</span></div>
              </div>
            </div>
            <div className="callout warn" style={{ marginTop: 12 }}>
              Holding costs {inr(hold)} this quarter with no identified consumer. Recommend listing the {orphans.filter((i) => agingClass(i) === 'Obsolete' || agingClass(i) === 'Dead').length} Dead/Obsolete lots for secondary sale; keep Slow lots one more scan cycle.
            </div>
          </Card>

          <Card title="Minimum economic transfer quantity · CR4 slit coil from Manesar" sub="Below this tonnage the fixed trip cost outweighs the saving. Hover for values.">
            <div className="grid g-2" style={{ gap: 20 }}>
              <div>
                <div className="section-t">Baseline</div>
                <BarList rows={meq.map((r) => ({ key: r.key, label: r.label, value: r.base, sub: 'Tonnes' }))} format={(v) => `${num(v, 2)} T`} color="var(--axis)" />
              </div>
              <div>
                <div className="section-t">Scenario</div>
                <BarList rows={meq.map((r) => ({ key: r.key, label: r.label, value: r.scen, sub: 'Tonnes' }))} format={(v) => `${num(v, 2)} T`} color="var(--s1)" />
              </div>
            </div>
          </Card>

          <Card title="Impact per opportunity" pad={false}>
            <div className="table-wrap" style={{ marginTop: 12 }}>
              <table className="t">
                <thead><tr><th>Opportunity</th><th>Band</th><th className="r">Baseline</th><th className="r">Scenario</th><th className="r">Δ</th></tr></thead>
                <tbody>
                  {compare.map(({ k, o, bv, nv, n }) => (
                    <tr key={k}>
                      <td>
                        <div className="row" style={{ gap: 6, fontSize: 12.5 }}><PlantTag id={o.supply.plantId} /><ArrowRight size={12} /><PlantTag id={o.demand.plantId} /></div>
                        <div className="cell-sub">{shortGrade(o.supply.spec.material)} {specLabel(o.supply.spec)} → {o.demand.part}</div>
                      </td>
                      <td>{n ? <BandPill band={n.band} /> : <span className="pill neutral">Dropped</span>}</td>
                      <td className="r">{inr(bv)}</td>
                      <td className="r" style={{ fontWeight: 600 }}>{inr(nv)}</td>
                      <td className="r" style={{ color: nv - bv > 0 ? 'var(--good-ink)' : nv - bv < 0 ? 'var(--bad-ink)' : 'var(--ink-3)', fontWeight: 600 }}>{nv - bv === 0 ? '—' : inr(nv - bv)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>

          <div className="row" style={{ justifyContent: 'flex-end' }}>
            <button className="btn" onClick={() => setS({ ...DEFAULT_SETTINGS })}>Restore factory assumptions</button>
            <button className="btn primary" disabled={!dirty} onClick={() => { dispatch({ type: 'settings', patch: s }); toast('Scenario applied as the new baseline') }}><Save size={15} />Apply as baseline</button>
          </div>
        </div>
      </div>
    </div>
  )
}
