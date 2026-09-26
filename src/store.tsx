import { createContext, useCallback, useContext, useEffect, useMemo, useReducer, useState, type ReactNode } from 'react'
import type { AppState, AuditEvent, Demand, InventoryItem, Opportunity, Settings, Transfer } from './types'
import { createSeed } from './data/seed'
import { MATERIAL, PLANT } from './data/catalog'
import { findOpportunities, freightPerT, laneKey } from './engine/engine'
import { inr, qty, shortGrade, specLabel } from './engine/format'

const STORAGE_KEY = 'invento:v3'
export const CURRENT_USER = 'V. Sharma (Group SCM)'

type Action =
  | { type: 'approve'; opp: Opportunity }
  | { type: 'reject'; key: string; reason: string; label: string }
  | { type: 'restore'; key: string }
  | { type: 'qa'; id: string }
  | { type: 'dispatch'; id: string }
  | { type: 'receive'; id: string; actual: { freightPerT: number; transitDays: number; yieldPct: number } }
  | { type: 'settings'; patch: Partial<Settings> }
  | { type: 'import'; items: InventoryItem[] }
  | { type: 'addDemand'; demand: Demand }
  | { type: 'scan' }
  | { type: 'reset' }

let n = 0
const uid = (p: string) => `${p}-${Date.now().toString(36)}${(n++).toString(36)}`

function log(state: AppState, action: string, detail: string, tone: AuditEvent['tone'] = 'info', actor = CURRENT_USER): AppState {
  return { ...state, audit: [{ id: uid('AUD'), ts: new Date().toISOString(), actor, action, detail, tone }, ...state.audit].slice(0, 200) }
}

function reducer(state: AppState, a: Action): AppState {
  switch (a.type) {
    case 'approve': {
      const o = a.opp
      const m = MATERIAL[o.demand.spec.material]
      const now = new Date().toISOString()
      const cal = state.calibration[laneKey(o.supply.plantId, o.demand.plantId)]
      const t: Transfer = {
        id: uid('TRF'),
        oppKey: o.key,
        supplyId: o.supply.id,
        demandId: o.demand.id,
        from: o.supply.plantId,
        to: o.demand.plantId,
        material: o.demand.spec.material,
        description: `${shortGrade(o.supply.spec.material)} ${specLabel(o.supply.spec)}${o.mode === 'Slit' ? ` → slit ${o.strips} × ${o.demand.spec.width}` : ''}`,
        qty: o.econ.suppliedQty,
        deliveredQty: o.econ.deliveredQty,
        weightT: o.econ.weightT,
        uom: m.uom,
        status: 'Pending QA',
        createdAt: now,
        updatedAt: now,
        confidence: o.confidence,
        band: o.band,
        estimate: {
          freightPerT: Math.round(freightPerT(o.supply.plantId, o.demand.plantId, state.settings, cal)),
          transitDays: o.transitDays,
          yieldPct: o.yieldPct,
          savings: Math.round(o.econ.savings),
        },
      }
      const next: AppState = {
        ...state,
        transfers: [t, ...state.transfers],
        inventory: state.inventory.map((i) => (i.id === o.supply.id ? { ...i, reserved: i.reserved + o.econ.suppliedQty } : i)),
        demand: state.demand.map((d) => (d.id === o.demand.id ? { ...d, covered: d.covered + o.econ.deliveredQty } : d)),
      }
      return log(next, 'Transfer approved', `${t.description} · ${qty(t.qty, t.uom)} ${PLANT[t.from].name} → ${PLANT[t.to].name} · saves ${inr(t.estimate.savings)}`, 'good')
    }
    case 'reject':
      return log({ ...state, rejected: { ...state.rejected, [a.key]: a.reason } }, 'Recommendation rejected', `${a.label} — ${a.reason}`, 'warn')
    case 'restore': {
      const rejected = { ...state.rejected }
      delete rejected[a.key]
      return log({ ...state, rejected }, 'Recommendation restored', a.key)
    }
    case 'qa': {
      const t = state.transfers.find((x) => x.id === a.id)
      if (!t) return state
      return log(
        { ...state, transfers: state.transfers.map((x) => (x.id === a.id ? { ...x, status: 'Approved', updatedAt: new Date().toISOString() } : x)) },
        'QA sign-off',
        `${t.description} · MTC and condition verified`,
        'good',
        'Quality Engineering',
      )
    }
    case 'dispatch': {
      const t = state.transfers.find((x) => x.id === a.id)
      if (!t) return state
      const ewb = `EWB ${Math.floor(1000 + Math.random() * 8999)} ${Math.floor(1000 + Math.random() * 8999)} ${Math.floor(1000 + Math.random() * 8999)}`
      return log(
        {
          ...state,
          transfers: state.transfers.map((x) => (x.id === a.id ? { ...x, status: 'In Transit', ewayBill: ewb, updatedAt: new Date().toISOString() } : x)),
          inventory: state.inventory.map((i) =>
            i.id === t.supplyId ? { ...i, qty: Math.max(0, i.qty - t.qty), reserved: Math.max(0, i.reserved - t.qty), lastMovement: new Date().toISOString() } : i,
          ),
        },
        'Dispatched',
        `${t.description} · ${qty(t.qty, t.uom)} → ${PLANT[t.to].name} · ${ewb}`,
      )
    }
    case 'receive': {
      const t = state.transfers.find((x) => x.id === a.id)
      if (!t) return state
      const w = t.weightT ?? (t.uom === 'T' ? t.qty : 0)
      const e = t.estimate
      const savings = Math.round(e.savings - (a.actual.freightPerT - e.freightPerT) * w - ((e.yieldPct - a.actual.yieldPct) / 100) * e.savings)
      const key = laneKey(t.from, t.to)
      const old = state.calibration[key] ?? { freightFactor: 1, transitFactor: 1, yieldFactor: 1, samples: 0 }
      const k = old.samples + 1
      const blend = (f: number, ratio: number) => Math.round(f * ((old.samples + ratio) / k) * 1000) / 1000
      const calibration = {
        ...state.calibration,
        [key]: {
          freightFactor: blend(old.freightFactor, a.actual.freightPerT / e.freightPerT),
          transitFactor: blend(old.transitFactor, a.actual.transitDays / e.transitDays),
          yieldFactor: blend(old.yieldFactor, a.actual.yieldPct / e.yieldPct),
          samples: k,
        },
      }
      return log(
        {
          ...state,
          calibration,
          transfers: state.transfers.map((x) => (x.id === a.id ? { ...x, status: 'Received', actual: { ...a.actual, savings }, updatedAt: new Date().toISOString() } : x)),
        },
        'Received',
        `${t.description} at ${PLANT[t.to].name} · actual ₹${a.actual.freightPerT}/T, ${a.actual.transitDays} d, ${a.actual.yieldPct}% yield · lane recalibrated`,
        'good',
        `${PLANT[t.to].head} (${PLANT[t.to].name})`,
      )
    }
    case 'settings':
      return { ...state, settings: { ...state.settings, ...a.patch } }
    case 'import':
      return log({ ...state, inventory: [...state.inventory, ...a.items] }, 'Ledger imported', `${a.items.length} lines normalised and added`, 'info', 'Agent 01 · Normalizer')
    case 'addDemand':
      return log({ ...state, demand: [...state.demand, a.demand] }, 'Demand added', `${a.demand.part} · ${PLANT[a.demand.plantId].name}`)
    case 'scan':
      return log({ ...state, lastScan: new Date().toISOString() }, 'Scan completed', `${state.inventory.length} ledger lines · ${state.demand.length} demand lines · 5 plants normalised`, 'info', 'Invento Engine')
    case 'reset':
      return createSeed()
  }
}

function load(): AppState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const s = JSON.parse(raw) as AppState
      if (s.version === 3) return s
    }
  } catch {
    /* fall through to seed */
  }
  return createSeed()
}

interface Toast { id: number; text: string; tone: 'good' | 'info' | 'warn' }

interface Ctx {
  state: AppState
  dispatch: (a: Action) => void
  opportunities: Opportunity[]
  toast: (text: string, tone?: Toast['tone']) => void
  toasts: Toast[]
}

const StoreContext = createContext<Ctx | null>(null)

export function StoreProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, undefined, load)
  const [toasts, setToasts] = useState<Toast[]>([])

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
    } catch {
      /* storage unavailable — keep working in memory */
    }
  }, [state])

  const opportunities = useMemo(() => findOpportunities(state, state.settings), [state.inventory, state.demand, state.rejected, state.calibration, state.settings])

  const toast = useCallback((text: string, tone: Toast['tone'] = 'good') => {
    const id = Date.now() + Math.random()
    setToasts((t) => [...t, { id, text, tone }])
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3600)
  }, [])

  return <StoreContext.Provider value={{ state, dispatch, opportunities, toast, toasts }}>{children}</StoreContext.Provider>
}

export function useStore(): Ctx {
  const c = useContext(StoreContext)
  if (!c) throw new Error('useStore outside provider')
  return c
}
