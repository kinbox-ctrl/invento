import { useMemo, useState } from 'react'
import { CalendarClock, CheckCircle2, Plus, ShoppingCart, Sparkles } from 'lucide-react'
import type { Nav } from '../App'
import type { Demand, PlantId } from '../types'
import { useStore } from '../store'
import { MATERIAL, MATERIALS, PLANTS } from '../data/catalog'
import { daysAhead, localPart } from '../data/seed'
import { daysBetween, inr, qty, shortGrade, specLabel } from '../engine/format'
import { Card, Kpi, Modal, PlantTag, Seg } from '../components/ui'
import OpportunityDrawer from '../components/OpportunityDrawer'

type Status = 'all' | 'match' | 'buy' | 'covered'

export default function DemandPage({ nav }: { nav: Nav }) {
  const { state, opportunities } = useStore()
  const [filter, setFilter] = useState<Status>('all')
  const [adding, setAdding] = useState(false)
  const [openKey, setOpenKey] = useState<string | null>(null)

  const rows = useMemo(
    () =>
      state.demand
        .map((d) => {
          const m = MATERIAL[d.spec.material]
          const opps = opportunities.filter((o) => o.demand.id === d.id && o.econ.savings > 0)
          const matched = opps.reduce((a, o) => a + o.econ.deliveredQty, 0)
          const want = d.qty * state.settings.demandIndex
          const status: Exclude<Status, 'all'> = d.covered >= want - 1e-6 ? 'covered' : opps.length ? 'match' : 'buy'
          return { d, m, opps, matched, want, status, value: want * m.marketPrice * state.settings.marketIndex }
        })
        .sort((a, b) => new Date(a.d.needBy).getTime() - new Date(b.d.needBy).getTime()),
    [state.demand, opportunities, state.settings],
  )
  const shown = rows.filter((r) => filter === 'all' || r.status === filter)
  const totalValue = rows.reduce((a, r) => a + r.value, 0)
  const internal = rows.reduce((a, r) => a + ((Math.min(r.want, r.d.covered + r.matched) / r.want) * r.value || 0), 0)
  const open = opportunities.find((o) => o.key === openKey)

  return (
    <div className="page">
      <div className="grid g-kpi" style={{ gridTemplateColumns: 'repeat(4, minmax(0,1fr))' }}>
        <Kpi icon={<CalendarClock size={15} />} label="Open demand (market value)" value={inr(totalValue)} foot={`${rows.length} lines · next 60 days`} />
        <Kpi icon={<Sparkles size={15} />} label="Coverable from sister plants" value={inr(internal)} foot={`${((internal / totalValue) * 100).toFixed(0)}% of demand value`} hero />
        <Kpi icon={<CheckCircle2 size={15} />} label="Already covered by transfers" value={rows.filter((r) => r.status === 'covered').length} foot="demand lines" />
        <Kpi icon={<ShoppingCart size={15} />} label="External buy required" value={rows.filter((r) => r.status === 'buy').length} foot="no internal surplus matches" />
      </div>

      <Card pad={false}>
        <div className="toolbar">
          <Seg
            value={filter}
            onChange={setFilter}
            options={[
              { value: 'all', label: 'All', count: rows.length },
              { value: 'match', label: 'Internal match', count: rows.filter((r) => r.status === 'match').length },
              { value: 'covered', label: 'Covered', count: rows.filter((r) => r.status === 'covered').length },
              { value: 'buy', label: 'Buy externally', count: rows.filter((r) => r.status === 'buy').length },
            ]}
          />
          <button className="btn primary" style={{ marginLeft: 'auto' }} onClick={() => setAdding(true)}><Plus size={15} />Add requirement</button>
        </div>
        <div className="table-wrap">
          <table className="t">
            <thead>
              <tr>
                <th>Requirement</th>
                <th>Plant</th>
                <th>Material</th>
                <th className="r">Required</th>
                <th>Need by</th>
                <th>Internal coverage</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {shown.map(({ d, m, opps, matched, want, status }) => {
                const cov = Math.min(1, (d.covered + matched) / want)
                const days = daysBetween(new Date().toISOString(), d.needBy)
                return (
                  <tr key={d.id} className={opps.length ? 'click' : ''} onClick={() => opps[0] && setOpenKey(opps[0].key)} style={nav.param === d.id ? { background: 'var(--brand-soft)' } : undefined}>
                    <td>
                      <div className="cell-main">{d.part}</div>
                      <div className="cell-sub">{d.program} · <span className="mono">{d.source}</span></div>
                    </td>
                    <td><PlantTag id={d.plantId} /></td>
                    <td>
                      <div>{shortGrade(m.key)} {specLabel(d.spec)}</div>
                      <div className="cell-sub mono">{d.localPartNo}</div>
                    </td>
                    <td className="r">{qty(want, m.uom)}</td>
                    <td>
                      <div>{new Date(d.needBy).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</div>
                      <div className="cell-sub" style={days < 20 ? { color: 'var(--serious-ink)' } : undefined}>in {days} days</div>
                    </td>
                    <td style={{ minWidth: 150 }}>
                      <div className="meter" style={{ width: 120 }}><i style={{ width: `${cov * 100}%`, background: 'var(--s3)' }} /></div>
                      <div className="cell-sub">{(cov * 100).toFixed(0)}% · {opps.length} source{opps.length === 1 ? '' : 's'}</div>
                    </td>
                    <td>
                      {status === 'covered' && <span className="pill good"><CheckCircle2 size={12} />Covered</span>}
                      {status === 'match' && <span className="pill brand"><Sparkles size={12} />Save {inr(opps.reduce((a, o) => a + o.econ.savings, 0))}</span>}
                      {status === 'buy' && <span className="pill neutral"><ShoppingCart size={12} />External buy</span>}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </Card>
      {adding && <AddDemand onClose={() => setAdding(false)} />}
      {open && <OpportunityDrawer opp={open} onClose={() => setOpenKey(null)} />}
    </div>
  )
}

function AddDemand({ onClose }: { onClose: () => void }) {
  const { dispatch, toast } = useStore()
  const [plant, setPlant] = useState<PlantId>('PNE')
  const [material, setMaterial] = useState('CR4')
  const [part, setPart] = useState('Mounting Bracket Blank')
  const [program, setProgram] = useState('New Programme')
  const [thickness, setThickness] = useState(1.2)
  const [width, setWidth] = useState(600)
  const [od, setOd] = useState(60.3)
  const [q, setQ] = useState(10)
  const [ahead, setAhead] = useState(30)
  const [source, setSource] = useState<'BOM' | 'PR'>('BOM')
  const m = MATERIAL[material]
  const flat = m.category === 'Coil' || m.category === 'Sheet'

  const save = () => {
    const spec = flat ? { material, thickness, width } : m.category === 'Tube' ? { material, od, thickness } : { material }
    const d: Demand = {
      id: `DMD-${Date.now().toString(36)}`,
      plantId: plant,
      source,
      program,
      part,
      localPartNo: localPart(plant, spec, 90).no,
      spec,
      qty: q,
      covered: 0,
      needBy: daysAhead(ahead),
    }
    dispatch({ type: 'addDemand', demand: d })
    toast('Requirement added — matching against group surplus')
    onClose()
  }

  return (
    <Modal title="Add demand requirement" onClose={onClose} footer={<><button className="btn" onClick={onClose}>Cancel</button><button className="btn primary" onClick={save}>Add & match</button></>}>
      <div className="grid g-2" style={{ gridTemplateColumns: '1fr 1fr' }}>
        <div className="field"><label>Part</label><input className="input" value={part} onChange={(e) => setPart(e.target.value)} /></div>
        <div className="field"><label>Programme</label><input className="input" value={program} onChange={(e) => setProgram(e.target.value)} /></div>
        <div className="field"><label>Plant</label>
          <select className="select" value={plant} onChange={(e) => setPlant(e.target.value as PlantId)}>{PLANTS.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</select>
        </div>
        <div className="field"><label>Source</label>
          <select className="select" value={source} onChange={(e) => setSource(e.target.value as 'BOM' | 'PR')}><option value="BOM">Scheduled BOM run</option><option value="PR">Open purchase requisition</option></select>
        </div>
        <div className="field" style={{ gridColumn: '1 / -1' }}><label>Material</label>
          <select className="select" value={material} onChange={(e) => setMaterial(e.target.value)}>{MATERIALS.map((x) => <option key={x.key} value={x.key}>{x.name}</option>)}</select>
        </div>
        {(flat || m.category === 'Tube') && <div className="field"><label>Thickness (mm)</label><input className="input" type="number" step="0.1" value={thickness} onChange={(e) => setThickness(parseFloat(e.target.value))} /></div>}
        {flat && <div className="field"><label>Width (mm)</label><input className="input" type="number" value={width} onChange={(e) => setWidth(parseInt(e.target.value, 10))} /></div>}
        {m.category === 'Tube' && <div className="field"><label>OD (mm)</label><input className="input" type="number" step="0.1" value={od} onChange={(e) => setOd(parseFloat(e.target.value))} /></div>}
        <div className="field"><label>Quantity ({m.uom})</label><input className="input" type="number" value={q} onChange={(e) => setQ(parseFloat(e.target.value))} /></div>
        <div className="field"><label>Need in (days)</label><input className="input" type="number" value={ahead} onChange={(e) => setAhead(parseInt(e.target.value, 10))} /></div>
      </div>
    </Modal>
  )
}
