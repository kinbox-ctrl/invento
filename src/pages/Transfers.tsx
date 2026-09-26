import { useState } from 'react'
import { ArrowRight, BrainCircuit, ClipboardCheck, PackageCheck, ShieldCheck, Truck } from 'lucide-react'
import type { Nav } from '../App'
import type { Transfer, TransferStatus } from '../types'
import { useStore } from '../store'
import { PLANT } from '../data/catalog'
import { inr, num, qty, timeAgo } from '../engine/format'
import { BandPill, Card, Kpi, Modal, PlantTag } from '../components/ui'

const COLS: { status: TransferStatus; icon: typeof Truck; hint: string }[] = [
  { status: 'Pending QA', icon: ShieldCheck, hint: 'Awaiting quality sign-off' },
  { status: 'Approved', icon: ClipboardCheck, hint: 'Ready to dispatch' },
  { status: 'In Transit', icon: Truck, hint: 'E-way bill generated' },
  { status: 'Received', icon: PackageCheck, hint: 'Actuals captured' },
]

export default function Transfers({ nav: _nav }: { nav: Nav }) {
  const { state, dispatch, toast } = useStore()
  const [receiving, setReceiving] = useState<Transfer | null>(null)
  const received = state.transfers.filter((t) => t.status === 'Received')
  const realized = received.reduce((a, t) => a + (t.actual?.savings ?? 0), 0)
  const estOfReceived = received.reduce((a, t) => a + t.estimate.savings, 0)
  const accuracy = estOfReceived ? 1 - Math.abs(realized - estOfReceived) / estOfReceived : 1
  const freightErr = received.length ? received.reduce((a, t) => a + Math.abs((t.actual!.freightPerT - t.estimate.freightPerT) / t.estimate.freightPerT), 0) / received.length : 0

  return (
    <div className="page">
      <div className="grid g-kpi" style={{ gridTemplateColumns: 'repeat(4, minmax(0,1fr))' }}>
        <Kpi hero icon={<PackageCheck size={15} />} label="Realised savings" value={inr(realized)} foot={`${received.length} transfers received`} />
        <Kpi icon={<Truck size={15} />} label="In the pipeline" value={inr(state.transfers.filter((t) => t.status !== 'Received').reduce((a, t) => a + t.estimate.savings, 0))} foot={`${state.transfers.filter((t) => t.status !== 'Received').length} open transfers`} />
        <Kpi icon={<BrainCircuit size={15} />} label="Estimate accuracy" value={`${(accuracy * 100).toFixed(1)}%`} foot="Realised vs. estimated saving" />
        <Kpi icon={<Truck size={15} />} label="Freight estimate error" value={`${(freightErr * 100).toFixed(1)}%`} foot="Mean absolute, shrinks as lanes calibrate" />
      </div>

      <div className="kanban">
        {COLS.map((c) => {
          const items = state.transfers.filter((t) => t.status === c.status)
          const Icon = c.icon
          return (
            <div className="kcol" key={c.status}>
              <div className="kcol-h">
                <span className="row"><Icon size={15} />{c.status}</span>
                <span className="pill neutral">{items.length}</span>
              </div>
              <div className="muted" style={{ fontSize: 11.5, padding: '0 4px', marginTop: -6 }}>{c.hint}</div>
              {items.map((t) => (
                <div className="kcard" key={t.id}>
                  <div className="row" style={{ gap: 6, fontSize: 12.5 }}>
                    <PlantTag id={t.from} /><ArrowRight size={12} className="muted" /><PlantTag id={t.to} />
                  </div>
                  <div style={{ fontWeight: 600, fontSize: 13 }}>{t.description}</div>
                  <div className="row-between" style={{ fontSize: 12 }}>
                    <span className="muted">{qty(t.qty, t.uom)}</span>
                    <b className="good-ink tnum">{inr(t.actual?.savings ?? t.estimate.savings)}</b>
                  </div>
                  <div className="row-between">
                    <BandPill band={t.band} score={t.confidence} />
                    <span className="muted" style={{ fontSize: 11.5 }}>{timeAgo(t.updatedAt)}</span>
                  </div>
                  {t.ewayBill && <div className="mono muted" style={{ fontSize: 11 }}>{t.ewayBill}</div>}
                  {t.status === 'Received' && t.actual && (
                    <div style={{ fontSize: 11.5, borderTop: '1px dashed var(--line-strong)', paddingTop: 8 }} className="stack">
                      <Delta label="Freight / T" est={t.estimate.freightPerT} act={t.actual.freightPerT} fmt={(v) => `₹${num(v)}`} lowerIsBetter />
                      <Delta label="Transit" est={t.estimate.transitDays} act={t.actual.transitDays} fmt={(v) => `${v} d`} lowerIsBetter />
                      <Delta label="Yield" est={t.estimate.yieldPct} act={t.actual.yieldPct} fmt={(v) => `${v.toFixed(1)}%`} />
                    </div>
                  )}
                  {t.status === 'Pending QA' && (
                    <button className="btn sm" onClick={() => { dispatch({ type: 'qa', id: t.id }); toast('QA sign-off recorded') }}><ShieldCheck size={14} />QA sign-off</button>
                  )}
                  {t.status === 'Approved' && (
                    <button className="btn sm primary" onClick={() => { dispatch({ type: 'dispatch', id: t.id }); toast(`Dispatched to ${PLANT[t.to].name} · e-way bill generated`) }}><Truck size={14} />Dispatch</button>
                  )}
                  {t.status === 'In Transit' && (
                    <button className="btn sm" onClick={() => setReceiving(t)}><PackageCheck size={14} />Record receipt</button>
                  )}
                </div>
              ))}
              {items.length === 0 && <div className="muted" style={{ fontSize: 12, textAlign: 'center', padding: '24px 0' }}>Nothing here</div>}
            </div>
          )
        })}
      </div>

      <div className="grid g-2">
        <Card title="Continuous learning loop" sub="Every receipt recalibrates the lane — generic assumptions give way to plant-specific actuals">
          <div className="table-wrap">
            <table className="t">
              <thead><tr><th>Lane</th><th className="r">Freight factor</th><th className="r">Transit factor</th><th className="r">Yield factor</th><th className="r">Receipts</th></tr></thead>
              <tbody>
                {Object.entries(state.calibration).map(([k, c]) => {
                  const [a, b] = k.split('>') as [Transfer['from'], Transfer['to']]
                  return (
                    <tr key={k}>
                      <td><span className="row" style={{ gap: 6 }}><PlantTag id={a} /><ArrowRight size={12} /><PlantTag id={b} /></span></td>
                      <td className="r"><Factor v={c.freightFactor} /></td>
                      <td className="r"><Factor v={c.transitFactor} /></td>
                      <td className="r"><Factor v={c.yieldFactor} good /></td>
                      <td className="r">{c.samples}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </Card>
        <Card title="Audit trail" sub="Immutable log of decisions and movements">
          <div className="timeline" style={{ maxHeight: 320, overflowY: 'auto' }}>
            {state.audit.slice(0, 30).map((e) => (
              <div className="tl-item" key={e.id}>
                <span className="tl-dot" style={{ background: 'var(--surface-3)' }}><i style={{ background: `var(--${e.tone === 'good' ? 'good' : e.tone === 'warn' ? 'warn' : e.tone === 'bad' ? 'bad' : 'ink-3'})` }} /></span>
                <div>
                  <div className="row-between"><b style={{ fontSize: 13 }}>{e.action}</b><span className="muted" style={{ fontSize: 11.5 }}>{new Date(e.ts).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</span></div>
                  <div className="ink2" style={{ fontSize: 12.5 }}>{e.detail}</div>
                  <div className="muted" style={{ fontSize: 11.5 }}>{e.actor}</div>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {receiving && <ReceiveModal t={receiving} onClose={() => setReceiving(null)} />}
    </div>
  )
}

function Factor({ v, good }: { v: number; good?: boolean }) {
  const off = v - 1
  const bad = good ? off < -0.005 : off > 0.005
  const better = good ? off > 0.005 : off < -0.005
  return <span className="tnum" style={{ fontWeight: 600, color: bad ? 'var(--serious-ink)' : better ? 'var(--good-ink)' : undefined }}>×{v.toFixed(3)}</span>
}

function Delta({ label, est, act, fmt, lowerIsBetter }: { label: string; est: number; act: number; fmt: (v: number) => string; lowerIsBetter?: boolean }) {
  const diff = act - est
  const good = lowerIsBetter ? diff <= 0 : diff >= 0
  return (
    <div className="row-between">
      <span className="muted">{label}</span>
      <span className="tnum">{fmt(est)} → <b style={{ color: diff === 0 ? undefined : good ? 'var(--good-ink)' : 'var(--serious-ink)' }}>{fmt(act)}</b></span>
    </div>
  )
}

function ReceiveModal({ t, onClose }: { t: Transfer; onClose: () => void }) {
  const { dispatch, toast } = useStore()
  const [freight, setFreight] = useState(Math.round(t.estimate.freightPerT * 1.06))
  const [days, setDays] = useState(t.estimate.transitDays + 1)
  const [yieldPct, setYield] = useState(Math.round((t.estimate.yieldPct - (t.estimate.yieldPct < 100 ? 0.6 : 0)) * 10) / 10)
  const save = () => {
    dispatch({ type: 'receive', id: t.id, actual: { freightPerT: freight, transitDays: days, yieldPct } })
    toast(`Receipt recorded at ${PLANT[t.to].name} · lane recalibrated`)
    onClose()
  }
  return (
    <Modal title={`Record receipt at ${PLANT[t.to].name}`} onClose={onClose} footer={<><button className="btn" onClick={onClose}>Cancel</button><button className="btn primary" onClick={save}><PackageCheck size={15} />Confirm receipt</button></>}>
      <div className="callout brand"><BrainCircuit size={16} style={{ flex: 'none', marginTop: 2 }} /><div>Actuals from the receiving dock and shop floor feed the learning loop. Future estimates on the <b>{t.from} → {t.to}</b> lane will use them.</div></div>
      <div className="grid g-3" style={{ gridTemplateColumns: 'repeat(3,1fr)' }}>
        <div className="field"><label>Actual freight ₹/T <span className="muted">(est. {num(t.estimate.freightPerT)})</span></label><input className="input" type="number" value={freight} onChange={(e) => setFreight(parseFloat(e.target.value) || 0)} /></div>
        <div className="field"><label>Transit days <span className="muted">(est. {t.estimate.transitDays})</span></label><input className="input" type="number" value={days} onChange={(e) => setDays(parseInt(e.target.value, 10) || 1)} /></div>
        <div className="field"><label>Usable yield % <span className="muted">(est. {t.estimate.yieldPct.toFixed(1)})</span></label><input className="input" type="number" step="0.1" value={yieldPct} onChange={(e) => setYield(parseFloat(e.target.value) || 0)} /></div>
      </div>
    </Modal>
  )
}
