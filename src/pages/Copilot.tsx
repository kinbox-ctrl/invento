import { useEffect, useRef, useState, type ReactNode } from 'react'
import { ArrowUp, Bot, Sparkles } from 'lucide-react'
import type { Nav } from '../App'
import type { AgingClass, AppState, Opportunity, PlantId } from '../types'
import { useStore } from '../store'
import { MATERIAL, MATERIALS, PLANT, PLANTS } from '../data/catalog'
import { agingClass, bookValue, idleDays, portfolio } from '../engine/engine'
import { inr, qty, shortGrade, specLabel } from '../engine/format'
import { AgingPill, BandPill, PlantTag } from '../components/ui'

interface Answer { text: ReactNode; table?: { head: string[]; rows: ReactNode[][] }; action?: { label: string; go: () => void } }
interface Msg { role: 'user' | 'bot'; q?: string; a?: Answer }

const SUGGESTIONS = [
  'How much working capital is idle?',
  'Show dead stock at Pune',
  'Where do we have surplus CR4?',
  'Top 5 savings opportunities',
  'What can Chennai receive from sister plants?',
  'Which transfers are in transit?',
]

function findPlant(q: string): PlantId | null {
  const s = q.toLowerCase()
  return PLANTS.find((p) => s.includes(p.name.toLowerCase()) || s.includes(p.city.toLowerCase().split(',')[0]) || new RegExp(`\\b${p.id.toLowerCase()}\\b`).test(s))?.id ?? null
}
function findMaterialFamily(q: string): string[] | null {
  const s = q.toLowerCase().replace(/\s+/g, '')
  const hits = MATERIALS.filter((m) => s.includes(m.key.toLowerCase().replace(/-.*/, '')) || s.includes(shortGrade(m.key).toLowerCase().replace(/\s+/g, '')))
  if (/bolt|fastener/.test(s)) return MATERIALS.filter((m) => m.category === 'Fastener').map((m) => m.key)
  if (/insert|tool/.test(s)) return ['CNMG']
  return hits.length ? hits.map((m) => m.key) : null
}

function answer(q: string, state: AppState, opps: Opportunity[], go: Nav['go']): Answer {
  const s = q.toLowerCase()
  const plant = findPlant(q)
  const mats = findMaterialFamily(q)
  const inv = state.inventory.filter((i) => !plant || i.plantId === plant)

  if (/transit|dispatch|shipment|on the way/.test(s)) {
    const ts = state.transfers.filter((t) => t.status !== 'Received' && (!plant || t.from === plant || t.to === plant))
    return {
      text: ts.length ? <>There {ts.length === 1 ? 'is' : 'are'} <b>{ts.length}</b> open transfer{ts.length === 1 ? '' : 's'} worth <b>{inr(ts.reduce((a, t) => a + t.estimate.savings, 0))}</b> in savings.</> : 'No transfers are currently open.',
      table: { head: ['Lane', 'Material', 'Qty', 'Status'], rows: ts.map((t) => [<span className="row" style={{ gap: 4 }}><PlantTag id={t.from} />→<PlantTag id={t.to} /></span>, t.description, qty(t.qty, t.uom), t.status]) },
      action: { label: 'Open transfers', go: () => go('transfers') },
    }
  }

  const agingWord: AgingClass | null = /obsolete|365|write.?off/.test(s) ? 'Obsolete' : /dead|non.?moving/.test(s) ? 'Dead' : /slow/.test(s) ? 'Slow' : null
  if (agingWord) {
    const cls: AgingClass[] = agingWord === 'Dead' ? ['Dead', 'Obsolete'] : [agingWord]
    const items = inv.filter((i) => cls.includes(agingClass(i))).sort((a, b) => bookValue(b) - bookValue(a))
    return {
      text: <>{plant ? PLANT[plant].name : 'Across the group'}, <b>{items.length}</b> lot{items.length === 1 ? '' : 's'} {agingWord === 'Dead' ? 'have not moved for 180+ days' : agingWord === 'Obsolete' ? 'are older than 365 days' : 'are slow-moving (90–180 days)'}, carrying <b>{inr(items.reduce((a, i) => a + bookValue(i), 0))}</b> of book value. {items.filter((i) => opps.some((o) => o.supply.id === i.id)).length} of them already have a sister-plant match.</>,
      table: { head: ['Material', 'Plant', 'Qty', 'Value', 'Age'], rows: items.map((i) => [`${shortGrade(i.spec.material)} ${specLabel(i.spec)}`, <PlantTag id={i.plantId} />, qty(i.qty, MATERIAL[i.spec.material].uom), inr(bookValue(i)), <AgingPill cls={agingClass(i)} days={idleDays(i)} />]) },
      action: { label: 'Open inventory', go: () => go('inventory') },
    }
  }

  if (/receive|need|inbound|import|get from/.test(s) && plant) {
    const xs = opps.filter((o) => o.demand.plantId === plant && o.econ.savings > 0)
    return {
      text: <>{PLANT[plant].name} can source <b>{xs.length}</b> requirement{xs.length === 1 ? '' : 's'} from sister plants instead of buying new, saving <b>{inr(xs.reduce((a, o) => a + o.econ.savings, 0))}</b>.</>,
      table: { head: ['From', 'Material', 'For', 'Saving', 'Band'], rows: xs.map((o) => [<PlantTag id={o.supply.plantId} />, `${shortGrade(o.supply.spec.material)} ${specLabel(o.supply.spec)}`, o.demand.part, inr(o.econ.savings), <BandPill band={o.band} />]) },
      action: { label: 'Review opportunities', go: () => go('opportunities') },
    }
  }

  if (/top|best|saving|opportunit|redeploy/.test(s)) {
    const n = parseInt(s.match(/\b(\d{1,2})\b/)?.[1] ?? '5', 10)
    const xs = opps.filter((o) => o.econ.savings > 0 && (!plant || o.supply.plantId === plant || o.demand.plantId === plant)).slice(0, n)
    return {
      text: <>Top {xs.length} redeployment{xs.length === 1 ? '' : 's'}{plant ? ` involving ${PLANT[plant].name}` : ''}, worth <b>{inr(xs.reduce((a, o) => a + o.econ.savings, 0))}</b> combined.</>,
      table: { head: ['Lane', 'Material → part', 'Saving', 'Band'], rows: xs.map((o) => [<span className="row" style={{ gap: 4 }}><PlantTag id={o.supply.plantId} />→<PlantTag id={o.demand.plantId} /></span>, `${shortGrade(o.supply.spec.material)} → ${o.demand.part}`, inr(o.econ.savings), <BandPill band={o.band} score={o.confidence} />]) },
      action: { label: 'Open redeployment', go: () => go('opportunities') },
    }
  }

  if (mats) {
    const fam = new Set(mats.map((k) => MATERIAL[k].family))
    const items = state.inventory.filter((i) => fam.has(MATERIAL[i.spec.material].family) && (!plant || i.plantId === plant))
    const dem = state.demand.filter((d) => fam.has(MATERIAL[d.spec.material].family))
    return {
      text: <>Found <b>{items.length}</b> lot{items.length === 1 ? '' : 's'} of {mats.map(shortGrade).join(' / ')}-family material ({inr(items.reduce((a, i) => a + bookValue(i), 0))}) and <b>{dem.length}</b> open requirement{dem.length === 1 ? '' : 's'} for it. Different plants call it different things — Invento normalises them to one grade.</>,
      table: { head: ['Plant', 'Local part no.', 'Spec', 'Qty', 'Aging'], rows: items.map((i) => [<PlantTag id={i.plantId} />, <span className="mono">{i.localPartNo}</span>, `${shortGrade(i.spec.material)} ${specLabel(i.spec)}`, qty(i.qty, MATERIAL[i.spec.material].uom), <AgingPill cls={agingClass(i)} days={idleDays(i)} />]) },
    }
  }

  if (/idle|capital|working|locked|value|how much|summary|overview/.test(s)) {
    const pf = portfolio(inv)
    const viable = opps.filter((o) => o.econ.savings > 0 && o.band !== 'Red' && (!plant || o.supply.plantId === plant))
    return {
      text: <>{plant ? PLANT[plant].name : 'The group'} holds <b>{inr(pf.total)}</b> of inventory, of which <b>{inr(pf.idle)}</b> ({(pf.idleShare * 100).toFixed(0)}%) has not moved for more than 90 days — costing roughly <b>{inr(pf.idle * state.settings.carryingRate)}</b> a year to carry. Invento has matched {viable.length} surplus lots to sister-plant demand worth <b>{inr(viable.reduce((a, o) => a + o.econ.savings, 0))}</b> in avoided purchases.</>,
      table: { head: ['Aging class', 'Book value', 'Share'], rows: (['Active', 'Slow', 'Dead', 'Obsolete'] as AgingClass[]).map((c) => [<AgingPill cls={c} />, inr(pf.byClass[c]), `${((pf.byClass[c] / (pf.total || 1)) * 100).toFixed(1)}%`]) },
      action: { label: 'Open command center', go: () => go('dashboard') },
    }
  }

  return {
    text: <>I can answer questions about stock, aging, demand, redeployment and transfers across Manesar, Pune, Faridabad, Chennai and Sanand. Try naming a plant, a grade (CR4, DP590, HR E250…) or an aging class.</>,
  }
}

export default function Copilot({ nav }: { nav: Nav }) {
  const { state, opportunities } = useStore()
  const [msgs, setMsgs] = useState<Msg[]>([])
  const [q, setQ] = useState('')
  const [thinking, setThinking] = useState(false)
  const endRef = useRef<HTMLDivElement>(null)
  useEffect(() => endRef.current?.scrollIntoView({ behavior: 'smooth' }), [msgs, thinking])

  const ask = (text: string) => {
    if (!text.trim() || thinking) return
    setMsgs((m) => [...m, { role: 'user', q: text }])
    setQ('')
    setThinking(true)
    setTimeout(() => {
      setMsgs((m) => [...m, { role: 'bot', a: answer(text, state, opportunities, nav.go) }])
      setThinking(false)
    }, 450)
  }

  return (
    <div className="page" style={{ maxWidth: 980 }}>
      {msgs.length === 0 && (
        <div className="card" style={{ padding: '36px 28px', textAlign: 'center' }}>
          <div className="bot-icon" style={{ width: 52, height: 52, borderRadius: 14, margin: '0 auto 14px' }}><Sparkles size={24} /></div>
          <h2 style={{ margin: 0, fontSize: 22, letterSpacing: '-0.02em' }}>Ask anything about group inventory</h2>
          <p className="muted" style={{ margin: '6px auto 20px', maxWidth: 520 }}>Answers are computed live from the normalised ledger, demand feeds and transfer records — the same numbers you see everywhere else in Invento.</p>
          <div className="row wrap" style={{ justifyContent: 'center', gap: 8 }}>
            {SUGGESTIONS.map((s) => <button key={s} className="chip" onClick={() => ask(s)}>{s}</button>)}
          </div>
        </div>
      )}
      <div className="chat">
        {msgs.map((m, i) =>
          m.role === 'user' ? (
            <div className="msg user" key={i}><div className="bubble">{m.q}</div></div>
          ) : (
            <div className="msg bot" key={i}>
              <div className="bot-icon"><Bot size={16} /></div>
              <div className="bubble">
                <div>{m.a!.text}</div>
                {m.a!.table && m.a!.table.rows.length > 0 && (
                  <div className="table-wrap card" style={{ marginTop: 12 }}>
                    <table className="t">
                      <thead><tr>{m.a!.table.head.map((h) => <th key={h}>{h}</th>)}</tr></thead>
                      <tbody>{m.a!.table.rows.map((r, j) => <tr key={j}>{r.map((c, k) => <td key={k}>{c}</td>)}</tr>)}</tbody>
                    </table>
                  </div>
                )}
                {m.a!.action && <button className="btn sm" style={{ marginTop: 12 }} onClick={m.a!.action.go}>{m.a!.action.label} →</button>}
              </div>
            </div>
          ),
        )}
        {thinking && (
          <div className="msg bot"><div className="bot-icon"><Bot size={16} /></div><div className="bubble muted">Querying ledger across 5 plants…</div></div>
        )}
        <div ref={endRef} />
      </div>
      <form
        className="card"
        style={{ display: 'flex', gap: 8, padding: 8, position: 'sticky', bottom: 0, boxShadow: 'var(--shadow)' }}
        onSubmit={(e) => { e.preventDefault(); ask(q) }}
      >
        <input className="input grow" style={{ border: 0, boxShadow: 'none' }} placeholder="e.g. Show dead stock at Sanand" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Ask Copilot" />
        <button className="btn primary icon" type="submit" aria-label="Send" disabled={!q.trim()}><ArrowUp size={17} /></button>
      </form>
      {msgs.length > 0 && (
        <div className="row wrap" style={{ gap: 6 }}>
          {SUGGESTIONS.map((s) => <button key={s} className="chip" onClick={() => ask(s)}>{s}</button>)}
        </div>
      )}
    </div>
  )
}
