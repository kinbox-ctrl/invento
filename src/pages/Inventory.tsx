import { useMemo, useState } from 'react'
import { ArrowDownUp, ArrowRight, Check, FileUp, PackageSearch, Search, Sparkles, Wand2, X } from 'lucide-react'
import type { Nav } from '../App'
import type { AgingClass, Category, InventoryItem, PlantId } from '../types'
import { useStore } from '../store'
import { MATERIAL, PLANT, PLANTS } from '../data/catalog'
import { daysAgo } from '../data/seed'
import { AGING_ORDER, agingClass, available, bookValue, idleDays, normalizeLine, surplusQty, type NormalizedRow } from '../engine/engine'
import { inr, num, qty, shortGrade, specLabel } from '../engine/format'
import { AgingPill, BandPill, Card, Drawer, Empty, Modal, PlantTag, Seg } from '../components/ui'
import OpportunityDrawer from '../components/OpportunityDrawer'

type Sort = 'value' | 'idle' | 'qty'

export default function Inventory({ nav }: { nav: Nav }) {
  const { state, opportunities } = useStore()
  const [plant, setPlant] = useState<PlantId | 'all'>('all')
  const [aging, setAging] = useState<AgingClass | 'all'>('all')
  const [cat, setCat] = useState<Category | 'all'>('all')
  const [q, setQ] = useState('')
  const [sort, setSort] = useState<Sort>('value')
  const [openId, setOpenId] = useState<string | null>(nav.param ?? null)
  const [importing, setImporting] = useState(false)

  const rows = useMemo(() => {
    const s = q.toLowerCase()
    return state.inventory
      .filter((i) => plant === 'all' || i.plantId === plant)
      .filter((i) => cat === 'all' || MATERIAL[i.spec.material].category === cat)
      .filter((i) => !s || `${i.localPartNo} ${i.localDesc} ${MATERIAL[i.spec.material].name} ${specLabel(i.spec)} ${i.batch}`.toLowerCase().includes(s))
      .sort((a, b) => (sort === 'value' ? bookValue(b) - bookValue(a) : sort === 'idle' ? idleDays(b) - idleDays(a) : b.qty - a.qty))
  }, [state.inventory, plant, cat, q, sort])
  const shown = rows.filter((i) => aging === 'all' || agingClass(i) === aging)
  const counts = Object.fromEntries(AGING_ORDER.map((c) => [c, rows.filter((i) => agingClass(i) === c).length])) as Record<AgingClass, number>
  const total = shown.reduce((a, i) => a + bookValue(i), 0)
  const open = state.inventory.find((i) => i.id === openId)

  return (
    <div className="page">
      <Card pad={false}>
        <div className="toolbar">
          <Seg
            value={aging}
            onChange={setAging}
            options={[{ value: 'all', label: 'All', count: rows.length }, ...AGING_ORDER.map((c) => ({ value: c, label: c, count: counts[c] }))]}
          />
          <select className="select" value={plant} onChange={(e) => setPlant(e.target.value as PlantId | 'all')} aria-label="Plant">
            <option value="all">All plants</option>
            {PLANTS.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
          <select className="select" value={cat} onChange={(e) => setCat(e.target.value as Category | 'all')} aria-label="Category">
            <option value="all">All categories</option>
            {(['Coil', 'Sheet', 'Tube', 'Fastener', 'Tooling'] as Category[]).map((c) => <option key={c}>{c}</option>)}
          </select>
          <div className="search" style={{ marginLeft: 0, width: 260, background: 'var(--surface)' }}>
            <Search size={14} />
            <input placeholder="Part no., grade, batch…" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Filter inventory" />
          </div>
          <div className="row" style={{ marginLeft: 'auto' }}>
            <select className="select" value={sort} onChange={(e) => setSort(e.target.value as Sort)} aria-label="Sort">
              <option value="value">Sort: book value</option>
              <option value="idle">Sort: days idle</option>
              <option value="qty">Sort: quantity</option>
            </select>
            <button className="btn primary" onClick={() => setImporting(true)}><FileUp size={15} />Import ledger</button>
          </div>
        </div>
        <div className="table-wrap">
          <table className="t">
            <thead>
              <tr>
                <th>Normalised material</th>
                <th>Local part no.</th>
                <th>Plant</th>
                <th className="r">On hand</th>
                <th className="r">Surplus</th>
                <th className="r">Book value</th>
                <th>Aging</th>
                <th>Matches</th>
              </tr>
            </thead>
            <tbody>
              {shown.map((i) => {
                const m = MATERIAL[i.spec.material]
                const matches = opportunities.filter((o) => o.supply.id === i.id)
                const sur = surplusQty(i, state.settings)
                return (
                  <tr key={i.id} className="click" onClick={() => setOpenId(i.id)}>
                    <td>
                      <div className="cell-main">{shortGrade(m.key)} <span className="ink2" style={{ fontWeight: 450 }}>{specLabel(i.spec)}</span></div>
                      <div className="cell-sub">{m.category} · {m.standard.split(' · ')[0]}</div>
                    </td>
                    <td>
                      <div className="mono">{i.localPartNo}</div>
                      <div className="cell-sub">{i.localDesc}</div>
                    </td>
                    <td><PlantTag id={i.plantId} /></td>
                    <td className="r">{qty(i.qty, m.uom)}{i.reserved > 0 && <div className="cell-sub">{qty(i.reserved, m.uom)} reserved</div>}</td>
                    <td className="r">{sur > 0 ? qty(sur, m.uom) : <span className="muted">—</span>}</td>
                    <td className="r" style={{ fontWeight: 600 }}>{inr(bookValue(i))}</td>
                    <td><AgingPill cls={agingClass(i)} days={idleDays(i)} /></td>
                    <td>
                      {matches.length ? (
                        <span className="pill brand"><Sparkles size={12} />{matches.length} · {inr(matches.reduce((a, o) => a + o.econ.savings, 0))}</span>
                      ) : <span className="muted" style={{ fontSize: 12 }}>—</span>}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
          {shown.length === 0 && <Empty icon={<PackageSearch size={22} />} title="No lots match these filters" text="Try clearing the aging, plant or category filter." />}
        </div>
        <div className="row-between" style={{ padding: '12px 16px', borderTop: '1px solid var(--line)', fontSize: 12.5 }}>
          <span className="muted">{shown.length} lots</span>
          <span>Total book value <b className="tnum">{inr(total)}</b></span>
        </div>
      </Card>

      {open && <ItemDrawer item={open} onClose={() => setOpenId(null)} />}
      {importing && <ImportModal onClose={() => setImporting(false)} />}
    </div>
  )
}

function ItemDrawer({ item, onClose }: { item: InventoryItem; onClose: () => void }) {
  const { state, opportunities } = useStore()
  const [opp, setOpp] = useState<string | null>(null)
  const m = MATERIAL[item.spec.material]
  const matches = opportunities.filter((o) => o.supply.id === item.id)
  const twins = state.inventory.filter((i) => i.id !== item.id && MATERIAL[i.spec.material].family === m.family)
  const o = opportunities.find((x) => x.key === opp)
  if (o) return <OpportunityDrawer opp={o} onClose={() => setOpp(null)} />
  return (
    <Drawer
      onClose={onClose}
      badge={<AgingPill cls={agingClass(item)} days={idleDays(item)} />}
      title={`${m.name}`}
      sub={<span className="row" style={{ gap: 6 }}><PlantTag id={item.plantId} /> · <span className="mono">{item.localPartNo}</span></span>}
    >
      <div className="grid g-3" style={{ gridTemplateColumns: 'repeat(3,1fr)' }}>
        <div className="card kpi"><div className="kpi-label">On hand</div><div className="kpi-value" style={{ fontSize: 20 }}>{qty(item.qty, m.uom)}</div></div>
        <div className="card kpi"><div className="kpi-label">Book value</div><div className="kpi-value" style={{ fontSize: 20 }}>{inr(bookValue(item))}</div></div>
        <div className="card kpi"><div className="kpi-label">Carrying / yr</div><div className="kpi-value" style={{ fontSize: 20 }}>{inr(bookValue(item) * state.settings.carryingRate)}</div></div>
      </div>
      <section>
        <h4 className="section-t">Normalised record · Agent 01</h4>
        <dl className="kv">
          <dt>Local description</dt><dd className="mono">{item.localDesc}</dd>
          <dt>Canonical grade</dt><dd>{m.name}</dd>
          <dt>Standard</dt><dd>{m.standard}</dd>
          <dt>Dimensions</dt><dd>{specLabel(item.spec)}</dd>
          {m.props.flatMap((p) => [<dt key={`${p.label}-t`}>{p.label}</dt>, <dd key={`${p.label}-d`}>{p.value}</dd>])}
          <dt>Batch · bin</dt><dd className="mono">{item.batch} · {item.bin}</dd>
          <dt>Unit cost</dt><dd>{inr(item.unitCost, { compact: false })} / {m.uom === 'T' ? 'T' : 'pc'}</dd>
          <dt>Consumption</dt><dd>{item.monthlyUse ? `${qty(item.monthlyUse, m.uom)} / month` : 'No consumption in 90 days'}</dd>
          <dt>Available surplus</dt><dd>{qty(surplusQty(item, state.settings), m.uom)} <span className="muted">after {state.settings.surplusCoverMonths} months cover</span></dd>
          <dt>MTC · condition</dt><dd>{item.mtc ? 'On file' : 'Missing'} · {item.condition}</dd>
          <dt>Last movement</dt><dd>{new Date(item.lastMovement).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</dd>
        </dl>
      </section>
      <section>
        <h4 className="section-t">Redeployment matches · Agents 03–04</h4>
        {matches.length === 0 ? (
          <div className="callout" style={{ background: 'var(--surface-2)' }}>
            {available(item) <= item.monthlyUse * state.settings.surplusCoverMonths ? 'Stock is within this plant’s own consumption cover — not offered to sister plants.' : 'No open demand at sister plants matches this grade and gauge yet. Invento re-checks on every scan.'}
          </div>
        ) : (
          <div className="card">
            {matches.map((x) => (
              <div className="opp" key={x.key} onClick={() => setOpp(x.key)}>
                <div className="stack" style={{ gap: 4 }}>
                  <div className="row"><ArrowRight size={13} /><PlantTag id={x.demand.plantId} /> · {x.demand.part}</div>
                  <div className="row"><BandPill band={x.band} score={x.confidence} /><span className="muted" style={{ fontSize: 12 }}>{qty(x.econ.suppliedQty, m.uom)} · {x.mode}</span></div>
                </div>
                <div className="saving" style={{ fontSize: 16 }}>{inr(x.econ.savings)}</div>
              </div>
            ))}
          </div>
        )}
      </section>
      {twins.length > 0 && (
        <section>
          <h4 className="section-t">Same family in other plants</h4>
          <div className="table-wrap card">
            <table className="t">
              <tbody>
                {twins.map((t) => (
                  <tr key={t.id}>
                    <td><PlantTag id={t.plantId} /></td>
                    <td className="mono">{t.localPartNo}</td>
                    <td>{shortGrade(t.spec.material)} {specLabel(t.spec)}</td>
                    <td className="r">{qty(t.qty, MATERIAL[t.spec.material].uom)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </Drawer>
  )
}

const SAMPLE = `MNS, CR4-1.2mm-Coil-1500, CRCA DEEP DRAW COIL, 14, 84500, 160
PNE, RM-HR-250-3.00-1250, HR SHEET E250 3.00X1250, 22, 61000, 240
FBD, 10004611, COIL CR IS513 DC04 1.20X1250, 6.5, 83800, 95
SND, S-BOP-M10x30-flake, Hex bolt M10x30 8.8 Geomet, 18000, 7.1, 300
CHN, JBMC/MISC/0042, WELDING WIRE ER70S-6 1.2MM, 2, 145000, 410`

function ImportModal({ onClose }: { onClose: () => void }) {
  const { dispatch, toast } = useStore()
  const [text, setText] = useState(SAMPLE)
  const [parsed, setParsed] = useState<NormalizedRow[] | null>(null)

  const run = () => setParsed(text.split('\n').map((l) => l.trim()).filter(Boolean).map(normalizeLine))
  const good = (parsed ?? []).filter((r) => r.spec && r.plantId && r.confidence >= 60)
  const commit = () => {
    const items: InventoryItem[] = good.map((r, i) => ({
      id: `INV-IMP-${Date.now().toString(36)}-${i}`,
      plantId: r.plantId!,
      localPartNo: r.localPartNo,
      localDesc: r.raw.split(',')[2]?.trim() ?? r.localPartNo,
      spec: r.spec!,
      qty: r.qty,
      reserved: 0,
      unitCost: r.unitCost,
      lastMovement: daysAgo(r.idle),
      batch: `IMP${String(Date.now()).slice(-5)}${i}`,
      mtc: true,
      condition: 'Unverified',
      monthlyUse: 0,
      bin: 'RCV-1',
    }))
    dispatch({ type: 'import', items })
    toast(`${items.length} lots normalised and added — matches refreshed`)
    onClose()
  }

  return (
    <Modal
      wide
      title={<span className="row"><Wand2 size={17} />Import plant ledger · Agent 01 Normalizer</span>}
      onClose={onClose}
      footer={
        <>
          <button className="btn" onClick={onClose}>Cancel</button>
          {parsed ? (
            <button className="btn primary" onClick={commit} disabled={!good.length}><Check size={15} />Add {good.length} lots</button>
          ) : (
            <button className="btn primary" onClick={run}><Wand2 size={15} />Normalise</button>
          )}
        </>
      }
    >
      <div className="callout brand">
        <Sparkles size={16} style={{ flex: 'none', marginTop: 2 }} />
        <div>Paste a raw SAP / ERP extract — <span className="mono">plant, part no, description, qty, unit cost, days idle</span>. Each plant’s own nomenclature is resolved to a canonical grade and gauge. Lines Invento can’t resolve are held for the material-master team instead of guessed.</div>
      </div>
      {!parsed ? (
        <textarea className="input" rows={8} value={text} onChange={(e) => setText(e.target.value)} aria-label="Ledger lines" />
      ) : (
        <div className="table-wrap card">
          <table className="t">
            <thead><tr><th>Raw line</th><th>Resolved as</th><th className="r">Qty</th><th>Confidence</th><th>Notes</th></tr></thead>
            <tbody>
              {parsed.map((r, i) => {
                const ok = r.spec && r.plantId && r.confidence >= 60
                return (
                  <tr key={i}>
                    <td className="mono" style={{ fontSize: 11.5, maxWidth: 240 }}>{r.localPartNo}<div className="cell-sub">{r.plantId ? PLANT[r.plantId].name : 'Unknown plant'}</div></td>
                    <td>{r.spec ? <><b>{shortGrade(r.spec.material)}</b> {specLabel(r.spec)}</> : <span className="muted">Unresolved</span>}</td>
                    <td className="r">{r.spec ? qty(r.qty, MATERIAL[r.spec.material].uom) : num(r.qty)}</td>
                    <td>{ok ? <span className="pill good"><Check size={12} />{r.confidence}%</span> : <span className="pill bad"><X size={12} />{r.confidence}%</span>}</td>
                    <td className="muted" style={{ fontSize: 12 }}>{r.note}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
      {parsed && <button className="btn sm ghost" style={{ alignSelf: 'flex-start' }} onClick={() => setParsed(null)}><ArrowDownUp size={14} />Edit input</button>}
    </Modal>
  )
}
