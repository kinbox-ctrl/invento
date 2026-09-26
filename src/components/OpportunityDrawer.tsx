import { useState } from 'react'
import { ArrowRight, Check, FileCheck2, Route as RouteIcon, Scissors, ShieldCheck, Sparkles, Truck, X } from 'lucide-react'
import type { Opportunity } from '../types'
import { MATERIAL, PLANT } from '../data/catalog'
import { agingClass, idleDays } from '../engine/engine'
import { inr, num, qty, shortGrade, specLabel } from '../engine/format'
import { useStore } from '../store'
import { AgingPill, BandPill, Drawer, PlantTag } from './ui'

export default function OpportunityDrawer({ opp, onClose }: { opp: Opportunity; onClose: () => void }) {
  const { state, dispatch, toast } = useStore()
  const [rejecting, setRejecting] = useState(false)
  const [reason, setReason] = useState('Quality concern on batch')
  const { supply, demand, econ } = opp
  const ms = MATERIAL[supply.spec.material]
  const md = MATERIAL[demand.spec.material]
  const unit = md.uom === 'T' ? 'T' : 'pc'
  const alt = [
    { label: 'Internal redeploy', value: econ.savings, note: 'Avoided buy − transfer cost' },
    { label: 'Secondary market sale', value: econ.secondaryValue, note: `${Math.round(state.settings.secondarySaleFactor * 100)}% of book value` },
    { label: 'Scrap liquidation', value: econ.scrapValue, note: `₹${num(ms.scrapPerT)}/T scrap` },
  ]
  const altMax = Math.max(...alt.map((a) => Math.abs(a.value)))

  const approve = () => {
    dispatch({ type: 'approve', opp })
    toast(`Transfer raised · ${inr(econ.savings)} saving sent for QA sign-off`)
    onClose()
  }
  const reject = () => {
    dispatch({ type: 'reject', key: opp.key, reason, label: `${shortGrade(supply.spec.material)} ${PLANT[supply.plantId].name} → ${PLANT[demand.plantId].name}` })
    toast('Recommendation rejected and logged', 'warn')
    onClose()
  }

  return (
    <Drawer
      onClose={onClose}
      badge={
        <div className="row wrap">
          <BandPill band={opp.band} score={opp.confidence} />
          <span className="pill brand">{opp.mode === 'Slit' ? <Scissors size={12} /> : <Check size={12} />}Mode {opp.mode === 'Direct' ? 'A · Direct match' : 'B · Slit & trim'}</span>
          {opp.gradeUpgrade && <span className="pill outline">Grade upgrade</span>}
        </div>
      }
      title={`${shortGrade(supply.spec.material)} ${specLabel(supply.spec)} → ${demand.part}`}
      sub={
        <span className="row wrap" style={{ gap: 6 }}>
          <PlantTag id={supply.plantId} /> <ArrowRight size={13} /> <PlantTag id={demand.plantId} /> · {num(opp.distanceKm)} km · {opp.transitDays} day transit
        </span>
      }
      footer={
        rejecting ? (
          <>
            <select className="select grow" value={reason} onChange={(e) => setReason(e.target.value)} aria-label="Rejection reason">
              <option>Quality concern on batch</option>
              <option>Demand already covered by PO</option>
              <option>Customer-approved source restriction</option>
              <option>Plant retaining for upcoming programme</option>
              <option>Logistics constraint</option>
            </select>
            <button className="btn" onClick={() => setRejecting(false)}>Back</button>
            <button className="btn danger" onClick={reject}>Confirm reject</button>
          </>
        ) : (
          <>
            <button className="btn danger" onClick={() => setRejecting(true)}><X size={15} />Reject</button>
            <button className="btn primary" onClick={approve} disabled={econ.savings <= 0}>
              <Check size={15} />Approve transfer · {inr(econ.savings)}
            </button>
          </>
        )
      }
    >
      <div className="ribbon" style={{ gridTemplateColumns: '1fr', padding: 18 }}>
        <div className="ribbon-stats" style={{ gridTemplateColumns: 'repeat(3,1fr)' }}>
          <div className="ribbon-stat"><div className="v">{inr(econ.savings)}</div><div className="l">Net enterprise saving</div></div>
          <div className="ribbon-stat"><div className="v">{(econ.savingsPct * 100).toFixed(1)}%</div><div className="l">Cash preserved</div></div>
          <div className="ribbon-stat"><div className="v">{inr(econ.carryingAvoided)}</div><div className="l">Carrying cost avoided / yr</div></div>
        </div>
      </div>

      <section>
        <h4 className="section-t"><Sparkles size={12} style={{ verticalAlign: -1 }} /> Why this transfer · Agent 09</h4>
        <div className="callout brand" style={{ flexDirection: 'column', gap: 6 }}>
          {opp.rationale.map((l, i) => (
            <div key={i} style={{ display: 'flex', gap: 8 }}>
              <span className="mono muted" style={{ fontSize: 11, paddingTop: 2 }}>{String(i + 1).padStart(2, '0')}</span>
              <span>{l}</span>
            </div>
          ))}
        </div>
      </section>

      <section>
        <h4 className="section-t">Material equivalence · Agent 03</h4>
        <div className="table-wrap card">
          <table className="t">
            <thead><tr><th>Field</th><th>Surplus ({PLANT[supply.plantId].name})</th><th>Demand ({PLANT[demand.plantId].name})</th></tr></thead>
            <tbody>
              <tr><td className="muted">Local part no.</td><td className="mono">{supply.localPartNo}</td><td className="mono">{demand.localPartNo}</td></tr>
              <tr><td className="muted">Grade</td><td>{ms.name}</td><td>{md.name}</td></tr>
              <tr><td className="muted">Standard</td><td>{ms.standard}</td><td>{md.standard}</td></tr>
              <tr><td className="muted">Dimensions</td><td className="tnum">{specLabel(supply.spec)}</td><td className="tnum">{specLabel(demand.spec)}</td></tr>
              {ms.props.map((p, i) => (
                <tr key={p.label}><td className="muted">{p.label}</td><td>{p.value}</td><td>{md.props[i]?.value ?? '—'}</td></tr>
              ))}
              <tr><td className="muted">Processing</td><td colSpan={2}>{opp.mode === 'Slit' ? `Slit ${supply.spec.width} mm → ${opp.strips} × ${demand.spec.width} mm · ${opp.yieldPct.toFixed(1)}% yield` : 'None — use as received'}</td></tr>
            </tbody>
          </table>
        </div>
      </section>

      <section>
        <h4 className="section-t">Transfer economics · Agents 05 + 06</h4>
        <div className="compare">
          <div className="compare-col">
            <div className="row" style={{ fontWeight: 650 }}>Route A · External new buy</div>
            <div className="compare-row"><span className="muted">Material</span><span>{inr(md.marketPrice, { compact: false })}/{unit}</span></div>
            <div className="compare-row"><span className="muted">Inbound freight</span><span>{inr(econ.externalUnit - md.marketPrice, { compact: false })}/{unit}</span></div>
            <div className="compare-row"><span className="muted">Quantity</span><span>{qty(econ.deliveredQty, md.uom)}</span></div>
            <div className="compare-row total"><span>Total outlay</span><span>{inr(econ.externalTotal)}</span></div>
          </div>
          <div className="compare-col win">
            <div className="row" style={{ fontWeight: 650 }}><Truck size={15} /> Route B · Inter-plant transfer</div>
            <div className="compare-row"><span className="muted">Material</span><span>₹0 (sunk at {PLANT[supply.plantId].name})</span></div>
            <div className="compare-row"><span className="muted">Freight {num(opp.distanceKm)} km</span><span>{inr(econ.freightTotal)}</span></div>
            <div className="compare-row"><span className="muted">Handling + trip docs</span><span>{inr(econ.handlingTotal + econ.tripTotal)}</span></div>
            {econ.processingTotal > 0 && <div className="compare-row"><span className="muted">Slitting</span><span>{inr(econ.processingTotal)}</span></div>}
            <div className="compare-row total"><span>Total · {inr(econ.transferUnit, { compact: false })}/{unit}</span><span>{inr(econ.transferTotal)}</span></div>
          </div>
        </div>
        <div className="row wrap" style={{ marginTop: 10, gap: 6 }}>
          <span className="pill neutral"><RouteIcon size={12} />{num(econ.weightT, 2)} T moved · {Math.max(1, Math.ceil(econ.weightT / 25))} truck{Math.ceil(econ.weightT / 25) > 1 ? 's' : ''}</span>
          <span className="pill neutral"><FileCheck2 size={12} />{econ.interState ? 'Inter-state stock transfer · GST 18% (ITC eligible)' : 'Intra-state · no GST on transfer'}</span>
          {econ.ewayBill && <span className="pill neutral">E-way bill required</span>}
        </div>
      </section>

      <section>
        <h4 className="section-t">Scrap vs. redeploy · Agent 07</h4>
        {alt.map((a) => (
          <div className="hbar-row" key={a.label} style={{ gridTemplateColumns: '160px 1fr 90px' }}>
            <div>
              <div style={{ fontWeight: 560 }}>{a.label}</div>
              <div className="muted" style={{ fontSize: 11.5 }}>{a.note}</div>
            </div>
            <div style={{ height: 14 }}>
              <div style={{ height: 14, borderRadius: '0 4px 4px 0', width: `${(Math.abs(a.value) / altMax) * 100}%`, background: a.label === 'Internal redeploy' ? 'var(--s3)' : 'var(--axis)' }} />
            </div>
            <div className="tnum" style={{ textAlign: 'right', fontWeight: 650 }}>{inr(a.value)}</div>
          </div>
        ))}
      </section>

      <section>
        <h4 className="section-t"><ShieldCheck size={12} style={{ verticalAlign: -1 }} /> Validation · Agent 10</h4>
        <dl className="kv">
          <dt>Batch</dt><dd className="mono">{supply.batch} · bin {supply.bin}</dd>
          <dt>Aging</dt><dd><AgingPill cls={agingClass(supply)} days={idleDays(supply)} /></dd>
          <dt>MTC on file</dt><dd>{supply.mtc ? <span className="pill good"><Check size={12} />Yes</span> : <span className="pill bad"><X size={12} />Missing — request from mill</span>}</dd>
          <dt>Condition</dt><dd>{supply.condition}</dd>
          <dt>Need-by</dt><dd>{new Date(demand.needBy).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })} · {demand.source === 'BOM' ? 'Scheduled BOM run' : 'Open purchase requisition'}</dd>
          <dt>Risk flags</dt><dd>{opp.flags.length ? <div className="row wrap" style={{ gap: 4 }}>{opp.flags.map((f) => <span key={f} className="pill outline">{f}</span>)}</div> : 'None'}</dd>
        </dl>
      </section>
    </Drawer>
  )
}
