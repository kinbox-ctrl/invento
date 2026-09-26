import { useState } from 'react'
import { Database, RotateCcw, Save } from 'lucide-react'
import type { Nav } from '../App'
import type { Settings } from '../types'
import { useStore } from '../store'
import { AGENTS, DEFAULT_SETTINGS, MATERIALS } from '../data/catalog'
import { inr } from '../engine/format'
import { Card, Modal } from '../components/ui'

const FIELDS: { key: keyof Settings; label: string; unit: string; step: number; hint: string }[] = [
  { key: 'freightPerTonKm', label: 'Road freight', unit: '₹ / T-km', step: 0.05, hint: 'Full-truck-load contracted rate' },
  { key: 'handlingPerT', label: 'Loading & handling', unit: '₹ / T', step: 50, hint: 'Both ends, crane + packing' },
  { key: 'slitPerT', label: 'Slitting / trimming', unit: '₹ / T', step: 50, hint: 'Service-centre job-work rate' },
  { key: 'tripFixed', label: 'Fixed cost per trip', unit: '₹', step: 500, hint: 'Documentation, e-way bill, escort' },
  { key: 'truckCapacityT', label: 'Truck capacity', unit: 'T', step: 1, hint: 'Per trip' },
  { key: 'inboundFreightPerT', label: 'Mill inbound freight', unit: '₹ / T', step: 50, hint: 'Added to external new-buy cost' },
  { key: 'carryingRate', label: 'Carrying cost', unit: '× p.a.', step: 0.01, hint: 'Capital + storage + insurance' },
  { key: 'secondarySaleFactor', label: 'Secondary-sale recovery', unit: '× book', step: 0.01, hint: 'Share of book value realised' },
  { key: 'surplusCoverMonths', label: 'Own-use cover retained', unit: 'months', step: 1, hint: 'Stock kept back before offering to other plants' },
]

export default function SettingsPage({ nav: _nav }: { nav: Nav }) {
  const { state, dispatch, toast } = useStore()
  const [s, setS] = useState(state.settings)
  const [confirm, setConfirm] = useState(false)
  const dirty = JSON.stringify(s) !== JSON.stringify(state.settings)

  return (
    <div className="page">
      <div className="grid g-main" style={{ alignItems: 'start' }}>
        <Card title="Engine assumptions" sub="Deterministic inputs used by the logistics, valuation and scrap agents. Every figure is auditable." action={<button className="btn primary sm" disabled={!dirty} onClick={() => { dispatch({ type: 'settings', patch: s }); toast('Assumptions saved — opportunities recalculated') }}><Save size={14} />Save</button>}>
          <div className="grid g-3" style={{ gap: 14 }}>
            {FIELDS.map((f) => (
              <div className="field" key={f.key}>
                <label>{f.label} <span className="muted">· {f.unit}</span></label>
                <input className="input tnum" type="number" step={f.step} value={s[f.key]} onChange={(e) => setS({ ...s, [f.key]: parseFloat(e.target.value) || 0 })} />
                <span className="muted" style={{ fontSize: 11.5 }}>{f.hint}</span>
              </div>
            ))}
          </div>
        </Card>
        <Card title="Demo data" sub="Stored in this browser only">
          <div className="stack" style={{ gap: 10, fontSize: 13 }}>
            <div className="row-between"><span className="muted">Ledger lines</span><b>{state.inventory.length}</b></div>
            <div className="row-between"><span className="muted">Demand lines</span><b>{state.demand.length}</b></div>
            <div className="row-between"><span className="muted">Transfers</span><b>{state.transfers.length}</b></div>
            <div className="row-between"><span className="muted">Audit events</span><b>{state.audit.length}</b></div>
            <button className="btn danger" style={{ marginTop: 8 }} onClick={() => setConfirm(true)}><RotateCcw size={15} />Reset to demo data</button>
          </div>
        </Card>
      </div>

      <Card title="The ten agents" sub="Deterministic engines handle ledgers, transit maths and valuation; AI agents handle matching, correlation and explanation.">
        <div className="pipe">
          {AGENTS.map((a) => (
            <div className="agent" key={a.n} style={{ flexDirection: 'column', gap: 6 }}>
              <div className="row" style={{ gap: 8 }}>
                <span className="mono pill brand">{a.n}</span>
                <span className="nm">{a.name}</span>
              </div>
              <div className="st">{a.desc}</div>
            </div>
          ))}
        </div>
      </Card>

      <Card title="Material master" sub="Canonical grades every local part number is normalised to" pad={false}>
        <div className="table-wrap" style={{ marginTop: 12 }}>
          <table className="t">
            <thead><tr><th>Material</th><th>Family</th><th>Standard</th><th>Key properties</th><th className="r">Market price</th><th className="r">Scrap / T</th></tr></thead>
            <tbody>
              {MATERIALS.map((m) => (
                <tr key={m.key}>
                  <td><div className="cell-main">{m.name}</div><div className="cell-sub">{m.category}</div></td>
                  <td><span className="pill outline mono">{m.family}{m.rank > 1 ? ` · r${m.rank}` : ''}</span></td>
                  <td className="ink2">{m.standard}</td>
                  <td className="ink2" style={{ fontSize: 12 }}>{m.props.slice(0, 2).map((p) => `${p.label}: ${p.value}`).join(' · ')}</td>
                  <td className="r">{inr(m.marketPrice, { compact: false })}<span className="muted"> /{m.uom === 'T' ? 'T' : 'pc'}</span></td>
                  <td className="r">{inr(m.scrapPerT, { compact: false })}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {confirm && (
        <Modal title="Reset all demo data?" onClose={() => setConfirm(false)} footer={<><button className="btn" onClick={() => setConfirm(false)}>Cancel</button><button className="btn danger" onClick={() => { dispatch({ type: 'reset' }); setS({ ...DEFAULT_SETTINGS }); setConfirm(false); toast('Demo data restored', 'info') }}><Database size={15} />Reset</button></>}>
          <p style={{ margin: 0 }} className="ink2">This clears approvals, transfers, imported lots and custom assumptions in this browser, and reloads the five-plant demo dataset.</p>
        </Modal>
      )}
    </div>
  )
}
