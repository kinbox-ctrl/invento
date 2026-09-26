import { useMemo, useState } from 'react'
import { AlertTriangle, ArrowRight, Check, CheckCircle2, XCircle, CheckCheck, RotateCcw, SearchX, Sparkles } from 'lucide-react'
import type { Nav } from '../App'
import type { Band, PlantId } from '../types'
import { useStore } from '../store'
import { MATERIAL, PLANTS } from '../data/catalog'
import { inr, num, qty, shortGrade, specLabel } from '../engine/format'
import { BandPill, Card, Confidence, Empty, Kpi, Modal, PlantTag, Seg } from '../components/ui'
import OpportunityDrawer from '../components/OpportunityDrawer'

export default function Opportunities({ nav }: { nav: Nav }) {
  const { state, opportunities, dispatch, toast } = useStore()
  const [band, setBand] = useState<Band | 'all'>('all')
  const [mode, setMode] = useState<'all' | 'Direct' | 'Slit'>('all')
  const [plant, setPlant] = useState<PlantId | 'all'>('all')
  const [openKey, setOpenKey] = useState<string | null>(nav.param ?? null)
  const [confirmBulk, setConfirmBulk] = useState(false)
  const [showRejected, setShowRejected] = useState(false)

  const shown = useMemo(
    () =>
      opportunities
        .filter((o) => band === 'all' || o.band === band)
        .filter((o) => mode === 'all' || o.mode === mode)
        .filter((o) => plant === 'all' || o.supply.plantId === plant || o.demand.plantId === plant),
    [opportunities, band, mode, plant],
  )
  const sum = (b: Band) => opportunities.filter((o) => o.band === b).reduce((a, o) => a + Math.max(0, o.econ.savings), 0)
  const greens = opportunities.filter((o) => o.band === 'Green' && o.econ.savings > 0)
  const open = opportunities.find((o) => o.key === openKey)
  const rejected = Object.entries(state.rejected)

  const approveGreens = () => {
    greens.forEach((o) => dispatch({ type: 'approve', opp: o }))
    toast(`${greens.length} Green transfers raised · ${inr(greens.reduce((a, o) => a + o.econ.savings, 0))} savings sent for QA`)
    setConfirmBulk(false)
  }

  return (
    <div className="page">
      <div className="grid g-kpi" style={{ gridTemplateColumns: 'repeat(4, minmax(0,1fr))' }}>
        <Kpi hero icon={<Sparkles size={15} />} label="Total identified" value={inr(opportunities.reduce((a, o) => a + Math.max(0, o.econ.savings), 0))} foot={`${opportunities.length} matches across ${new Set(opportunities.map((o) => `${o.supply.plantId}${o.demand.plantId}`)).size} lanes`} />
        <Kpi icon={<CheckCircle2 size={15} color="var(--good)" />} label="Green · ready" value={inr(sum('Green'))} foot="High confidence — ready to approve" />
        <Kpi icon={<AlertTriangle size={15} color="var(--warn)" />} label="Amber · review" value={inr(sum('Amber'))} foot="Needs QA or engineering review" />
        <Kpi icon={<XCircle size={15} color="var(--bad)" />} label="Red · blocked" value={inr(sum('Red'))} foot="Blocked — missing MTC, condition or economics" />
      </div>

      <Card pad={false}>
        <div className="toolbar">
          <Seg
            value={band}
            onChange={setBand}
            options={[
              { value: 'all', label: 'All', count: opportunities.length },
              { value: 'Green', label: 'Green', count: opportunities.filter((o) => o.band === 'Green').length },
              { value: 'Amber', label: 'Amber', count: opportunities.filter((o) => o.band === 'Amber').length },
              { value: 'Red', label: 'Red', count: opportunities.filter((o) => o.band === 'Red').length },
            ]}
          />
          <Seg value={mode} onChange={setMode} options={[{ value: 'all', label: 'Any mode' }, { value: 'Direct', label: 'A · Direct' }, { value: 'Slit', label: 'B · Slit/trim' }]} />
          <select className="select" value={plant} onChange={(e) => setPlant(e.target.value as PlantId | 'all')} aria-label="Plant">
            <option value="all">All plants</option>
            {PLANTS.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
          <div className="row" style={{ marginLeft: 'auto' }}>
            {rejected.length > 0 && <button className="btn ghost" onClick={() => setShowRejected(true)}>Rejected ({rejected.length})</button>}
            <button className="btn primary" disabled={!greens.length} onClick={() => setConfirmBulk(true)}><CheckCheck size={15} />Approve all Green ({greens.length})</button>
          </div>
        </div>
        <div className="table-wrap">
          <table className="t">
            <thead>
              <tr>
                <th>Lane</th>
                <th>Surplus → requirement</th>
                <th className="r">Quantity</th>
                <th>Mode</th>
                <th>Confidence</th>
                <th className="r">Landed / unit</th>
                <th className="r">Net saving</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {shown.map((o) => {
                const md = MATERIAL[o.demand.spec.material]
                return (
                  <tr key={o.key} className="click" onClick={() => setOpenKey(o.key)}>
                    <td>
                      <div className="lane" style={{ gap: 6 }}>
                        <PlantTag id={o.supply.plantId} />
                        <ArrowRight size={13} className="muted" />
                        <PlantTag id={o.demand.plantId} />
                      </div>
                      <div className="cell-sub">{num(o.distanceKm)} km · {o.transitDays} d transit</div>
                    </td>
                    <td>
                      <div className="cell-main">{shortGrade(o.supply.spec.material)} {specLabel(o.supply.spec)} <span className="muted" style={{ fontWeight: 400 }}>→</span> {o.demand.part}</div>
                      <div className="cell-sub"><span className="mono">{o.supply.localPartNo}</span> ≡ <span className="mono">{o.demand.localPartNo}</span></div>
                    </td>
                    <td className="r">{qty(o.econ.deliveredQty, md.uom)}</td>
                    <td>
                      <span className="pill neutral">{o.mode === 'Slit' ? `B · ${o.strips}×${o.demand.spec.width}` : 'A · Direct'}</span>
                      {o.gradeUpgrade && <div className="cell-sub">grade upgrade</div>}
                    </td>
                    <td>
                      <div className="stack" style={{ gap: 3 }}>
                        <BandPill band={o.band} />
                        <Confidence value={o.confidence} band={o.band} />
                      </div>
                    </td>
                    <td className="r">
                      <div>{inr(o.econ.transferUnit, { compact: false })}</div>
                      <div className="cell-sub">vs {inr(o.econ.externalUnit, { compact: false })}</div>
                    </td>
                    <td className="r">
                      <div style={{ fontWeight: 700, color: o.econ.savings > 0 ? 'var(--good-ink)' : 'var(--bad-ink)', fontSize: 14 }}>{inr(o.econ.savings)}</div>
                      <div className="cell-sub">{(o.econ.savingsPct * 100).toFixed(1)}% preserved</div>
                    </td>
                    <td className="r" onClick={(e) => e.stopPropagation()}>
                      <button
                        className="btn sm"
                        disabled={o.econ.savings <= 0 || o.band === 'Red'}
                        title={o.band === 'Red' ? 'Resolve red flags before approving' : 'Approve and send for QA'}
                        onClick={() => { dispatch({ type: 'approve', opp: o }); toast(`Transfer raised · ${inr(o.econ.savings)} saving`) }}
                      >
                        <Check size={14} />Approve
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
          {shown.length === 0 && (
            <Empty icon={<SearchX size={22} />} title="No opportunities for this filter" text="Invento only shows surplus that matches open demand at a different plant. Add demand or import a ledger to find more." action={<button className="btn sm" onClick={() => nav.go('demand')}>Go to demand</button>} />
          )}
        </div>
      </Card>

      {open && <OpportunityDrawer opp={open} onClose={() => setOpenKey(null)} />}
      {confirmBulk && (
        <Modal
          title="Approve all Green recommendations?"
          onClose={() => setConfirmBulk(false)}
          footer={<><button className="btn" onClick={() => setConfirmBulk(false)}>Cancel</button><button className="btn primary" onClick={approveGreens}><CheckCheck size={15} />Approve {greens.length} transfers</button></>}
        >
          <p style={{ margin: 0 }} className="ink2">Each transfer is raised as a requisition and routed to Quality Engineering for sign-off before dispatch. Nothing moves without QA approval.</p>
          <div className="card">
            {greens.map((o) => (
              <div key={o.key} className="row-between" style={{ padding: '10px 14px', borderBottom: '1px solid var(--line)' }}>
                <span className="row" style={{ gap: 6 }}><PlantTag id={o.supply.plantId} /><ArrowRight size={12} /><PlantTag id={o.demand.plantId} /><span className="muted">· {shortGrade(o.supply.spec.material)}</span></span>
                <b className="good-ink tnum">{inr(o.econ.savings)}</b>
              </div>
            ))}
          </div>
        </Modal>
      )}
      {showRejected && (
        <Modal title="Rejected recommendations" onClose={() => setShowRejected(false)}>
          {rejected.length === 0 && <div className="muted">Nothing rejected.</div>}
          {rejected.map(([k, reason]) => {
            const [sid, did] = k.split('>')
            const s = state.inventory.find((i) => i.id === sid)
            const d = state.demand.find((x) => x.id === did)
            return (
              <div key={k} className="row-between card" style={{ padding: '10px 14px' }}>
                <div>
                  <div style={{ fontWeight: 600 }}>{s ? `${shortGrade(s.spec.material)} ${specLabel(s.spec)}` : sid} → {d?.part ?? did}</div>
                  <div className="muted" style={{ fontSize: 12 }}>{reason}</div>
                </div>
                <button className="btn sm" onClick={() => { dispatch({ type: 'restore', key: k }); toast('Recommendation restored', 'info') }}><RotateCcw size={14} />Restore</button>
              </div>
            )
          })}
        </Modal>
      )}
    </div>
  )
}
