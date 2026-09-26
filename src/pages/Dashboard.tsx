import { useMemo, useState } from 'react'
import { ArrowRight, BadgeIndianRupee, Boxes, CheckCircle2, Hourglass, Loader2, PiggyBank, Sparkles, TrendingDown } from 'lucide-react'
import type { Nav } from '../App'
import type { Opportunity } from '../types'
import { useStore } from '../store'
import { AGENTS, PLANT, PLANTS } from '../data/catalog'
import { AGING_LABEL, AGING_ORDER, agingClass, bookValue, portfolio } from '../engine/engine'
import { inr, shortGrade, specLabel, timeAgo } from '../engine/format'
import { AGING_COLOR, BandPill, Card, Kpi, PlantTag } from '../components/ui'
import { AreaTrend, BarList, Donut, Legend, StackedBars } from '../components/charts'
import OpportunityDrawer from '../components/OpportunityDrawer'

export default function Dashboard({ nav }: { nav: Nav }) {
  const { state, opportunities } = useStore()
  const [open, setOpen] = useState<Opportunity | null>(null)
  const pf = useMemo(() => portfolio(state.inventory), [state.inventory])
  const viable = opportunities.filter((o) => o.econ.savings > 0 && o.band !== 'Red')
  const identified = viable.reduce((a, o) => a + o.econ.savings, 0)
  const realized = state.transfers.filter((t) => t.status === 'Received').reduce((a, t) => a + (t.actual?.savings ?? t.estimate.savings), 0)
  const inFlight = state.transfers.filter((t) => t.status !== 'Received').reduce((a, t) => a + t.estimate.savings, 0)
  const capitalFreed = viable.reduce((a, o) => a + o.econ.bookValue, 0)

  const byPlant = PLANTS.map((p) => {
    const items = state.inventory.filter((i) => i.plantId === p.id)
    return { label: <PlantTag id={p.id} />, key: p.name, values: AGING_ORDER.map((c) => items.filter((i) => agingClass(i) === c).reduce((a, i) => a + bookValue(i), 0)) }
  })

  // 12-month idle-capital history, anchored on today's computed value.
  const trend = useMemo(() => {
    const months = Array.from({ length: 12 }, (_, i) => {
      const d = new Date()
      d.setMonth(d.getMonth() - (11 - i))
      return d.toLocaleDateString('en-IN', { month: 'short' })
    })
    const shape = [0.78, 0.82, 0.86, 0.93, 0.97, 1.04, 1.1, 1.14, 1.16, 1.12, 1.06, 1]
    return months.map((m, i) => ({ label: m, value: pf.idle * shape[i] }))
  }, [pf.idle])

  const lanes = useMemo(() => {
    const m = new Map<string, number>()
    viable.forEach((o) => {
      const k = `${o.supply.plantId}>${o.demand.plantId}`
      m.set(k, (m.get(k) ?? 0) + o.econ.savings)
    })
    return [...m.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6)
  }, [viable])

  return (
    <div className="page">
      <div className="ribbon">
        <div style={{ position: 'relative', zIndex: 1 }}>
          <div className="row" style={{ gap: 8, marginBottom: 10 }}>
            <span className="pill" style={{ background: 'rgba(45,212,191,.15)', color: '#5eead4' }}><Sparkles size={12} />Invento found new opportunities</span>
          </div>
          <h2>{inr(pf.idle)} is sitting idle across 5 plants.</h2>
          <p>
            {viable.length} surplus lots match open demand at sister plants. Redeploying them preserves {inr(identified)} of cash that would otherwise go to fresh mill buys, and frees {inr(capitalFreed)} of locked working capital.
          </p>
          <div className="row" style={{ marginTop: 16, gap: 10 }}>
            <button className="btn primary" onClick={() => nav.go('opportunities')}>Review opportunities <ArrowRight size={15} /></button>
            <button className="btn" style={{ background: 'rgba(255,255,255,.08)', color: '#fff', borderColor: 'rgba(255,255,255,.2)' }} onClick={() => nav.go('scenarios')}>Run what-if</button>
          </div>
        </div>
        <div className="ribbon-stats">
          <div className="ribbon-stat"><div className="v">{viable.filter((o) => o.band === 'Green').length}</div><div className="l">Green matches ready</div></div>
          <div className="ribbon-stat"><div className="v">{inr(inFlight)}</div><div className="l">Savings in flight</div></div>
          <div className="ribbon-stat"><div className="v">{inr(realized)}</div><div className="l">Realised to date</div></div>
        </div>
      </div>

      <div className="grid g-kpi">
        <Kpi icon={<Boxes size={15} />} label="Group inventory value" value={inr(pf.total)} foot={`${state.inventory.length} lots · 5 plants`} />
        <Kpi icon={<Hourglass size={15} />} label="Idle capital > 90 days" value={inr(pf.idle)} foot={<><span className="bad-ink" style={{ fontWeight: 600 }}>{(pf.idleShare * 100).toFixed(0)}%</span> of inventory</>} />
        <Kpi icon={<TrendingDown size={15} />} label="Carrying cost / year" value={inr(pf.idle * state.settings.carryingRate)} foot={`at ${(state.settings.carryingRate * 100).toFixed(0)}% p.a. on idle stock`} />
        <Kpi icon={<PiggyBank size={15} />} label="Identified savings" value={inr(identified)} foot={`${viable.length} viable redeployments`} hero />
        <Kpi icon={<BadgeIndianRupee size={15} />} label="Realised savings" value={inr(realized)} foot={`${state.transfers.filter((t) => t.status === 'Received').length} transfers received`} />
      </div>

      <div className="grid g-main">
        <Card title="Inventory value by aging class" sub="Book value per plant. Hover a segment for detail.">
          <div style={{ marginBottom: 14 }}>
            <Legend items={AGING_ORDER.map((c) => ({ label: AGING_LABEL[c], color: AGING_COLOR[c] }))} />
          </div>
          <StackedBars rows={byPlant} series={AGING_ORDER.map((c) => ({ label: AGING_LABEL[c], color: AGING_COLOR[c] }))} format={(v) => inr(v)} labelWidth={110} />
        </Card>
        <Card title="Aging mix" sub="Share of group book value">
          <div className="row" style={{ gap: 20, alignItems: 'center' }}>
            <Donut
              data={AGING_ORDER.map((c) => ({ label: AGING_LABEL[c], value: pf.byClass[c], color: AGING_COLOR[c] }))}
              format={(v) => inr(v)}
              center={
                <div>
                  <div style={{ fontSize: 20, fontWeight: 700, letterSpacing: '-0.02em' }}>{(pf.idleShare * 100).toFixed(0)}%</div>
                  <div className="muted" style={{ fontSize: 11 }}>idle &gt; 90d</div>
                </div>
              }
            />
            <div className="stack grow" style={{ gap: 10 }}>
              {AGING_ORDER.map((c) => (
                <div key={c} className="row-between" style={{ fontSize: 13 }}>
                  <span className="row"><i style={{ width: 9, height: 9, borderRadius: 3, background: AGING_COLOR[c] }} />{AGING_LABEL[c]}</span>
                  <b className="tnum">{inr(pf.byClass[c])}</b>
                </div>
              ))}
            </div>
          </div>
        </Card>
      </div>

      <div className="grid g-main">
        <Card title="Top redeployment opportunities" sub="Ranked by net enterprise saving" pad={false} action={<button className="btn sm ghost" onClick={() => nav.go('opportunities')}>View all <ArrowRight size={14} /></button>}>
          <div style={{ marginTop: 10 }}>
            {viable.slice(0, 5).map((o) => (
              <div className="opp" key={o.key} onClick={() => setOpen(o)}>
                <div className="stack" style={{ gap: 6 }}>
                  <div className="lane">
                    <PlantTag id={o.supply.plantId} />
                    <span className="lane-arrow"><ArrowRight size={13} />{o.distanceKm} km</span>
                    <PlantTag id={o.demand.plantId} />
                  </div>
                  <div style={{ fontWeight: 600 }}>
                    {shortGrade(o.supply.spec.material)} {specLabel(o.supply.spec)} <span className="muted" style={{ fontWeight: 400 }}>for</span> {o.demand.part}
                  </div>
                  <div className="row wrap" style={{ gap: 6 }}>
                    <BandPill band={o.band} score={o.confidence} />
                    <span className="pill neutral">{o.mode === 'Slit' ? `Slit → ${o.strips} × ${o.demand.spec.width}` : 'Direct match'}</span>
                  </div>
                </div>
                <div className="stack" style={{ alignItems: 'flex-end', justifyContent: 'center' }}>
                  <div className="saving">{inr(o.econ.savings)}</div>
                  <div className="muted" style={{ fontSize: 12 }}>{(o.econ.savingsPct * 100).toFixed(1)}% cash preserved</div>
                </div>
              </div>
            ))}
          </div>
        </Card>

        <Card title="Agent pipeline" sub={nav.scanStep != null ? 'Scanning all plant ledgers…' : `Last run ${timeAgo(state.lastScan)}`} action={<button className="btn sm" onClick={nav.runScan} disabled={nav.scanStep != null}>Run</button>}>
          <div className="stack" style={{ gap: 6 }}>
            {AGENTS.map((a, i) => {
              const st = nav.scanStep == null ? 'done' : i < nav.scanStep ? 'done' : i === nav.scanStep ? 'run' : 'wait'
              return (
                <div key={a.n} className={`agent ${st}`} style={{ padding: '7px 10px', alignItems: 'center', opacity: st === 'wait' ? 0.55 : 1 }}>
                  <span className="n">{a.n}</span>
                  <span className="grow nm" style={{ fontWeight: 560 }}>{a.name}</span>
                  {st === 'run' ? <Loader2 size={14} className="spin" color="var(--brand)" /> : st === 'done' ? <CheckCircle2 size={14} color="var(--good)" /> : null}
                </div>
              )
            })}
          </div>
        </Card>
      </div>

      <div className="grid g-main">
        <Card title="Idle capital trend" sub="Stock with no movement for more than 90 days, trailing 12 months">
          <AreaTrend points={trend} format={(v) => inr(v)} color="var(--s1)" />
        </Card>
        <Card title="Savings by lane" sub="Identified net savings per supply → demand plant pair">
          {lanes.length ? (
            <BarList
              rows={lanes.map(([k, v]) => {
                const [a, b] = k.split('>') as [keyof typeof PLANT, keyof typeof PLANT]
                return { key: `${PLANT[a].name} → ${PLANT[b].name}`, label: <span className="mono" style={{ fontSize: 12 }}>{a} → {b}</span>, value: v, sub: 'Net saving' }
              })}
              format={(v) => inr(v)}
              color="var(--s3)"
            />
          ) : <div className="muted">No viable lanes.</div>}
        </Card>
      </div>

      <Card title="Recent activity" sub="Audit trail — every approval, dispatch and receipt is logged" action={<button className="btn sm ghost" onClick={() => nav.go('transfers')}>Transfers <ArrowRight size={14} /></button>}>
        <div className="timeline">
          {state.audit.slice(0, 6).map((e) => (
            <div className="tl-item" key={e.id}>
              <span className="tl-dot" style={{ background: `var(--${e.tone === 'info' ? 'surface-3' : e.tone === 'good' ? 'good-soft' : e.tone === 'warn' ? 'warn-soft' : 'bad-soft'})` }}>
                <i style={{ background: `var(--${e.tone === 'info' ? 'ink-3' : e.tone === 'good' ? 'good' : e.tone === 'warn' ? 'warn' : 'bad'})` }} />
              </span>
              <div className="row-between" style={{ alignItems: 'flex-start' }}>
                <div>
                  <div style={{ fontWeight: 600, fontSize: 13 }}>{e.action} <span className="muted" style={{ fontWeight: 400 }}>· {e.actor}</span></div>
                  <div className="ink2" style={{ fontSize: 12.5 }}>{e.detail}</div>
                </div>
                <span className="muted nowrap" style={{ fontSize: 12 }}>{timeAgo(e.ts)}</span>
              </div>
            </div>
          ))}
        </div>
      </Card>

      {open && <OpportunityDrawer opp={open} onClose={() => setOpen(null)} />}
    </div>
  )
}
