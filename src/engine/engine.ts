import type {
  AgingClass, AppState, Band, Demand, Economics, InventoryItem, MatchMode, Opportunity, PlantId, RouteCalibration, Settings, Spec,
} from '../types'
import { MATERIAL, PLANT } from '../data/catalog'
import { daysBetween, inr, num, qty as fmtQty, shortGrade, specLabel } from './format'

/* ────────────────────────────  Agent 02 · Aging  ──────────────────────────── */

export const AGING_ORDER: AgingClass[] = ['Active', 'Slow', 'Dead', 'Obsolete']
export const AGING_LABEL: Record<AgingClass, string> = {
  Active: 'Active',
  Slow: 'Slow · 90–180d',
  Dead: 'Dead · 180–365d',
  Obsolete: 'Obsolete · 365d+',
}

export function idleDays(item: InventoryItem): number {
  return Math.max(0, daysBetween(item.lastMovement))
}

export function agingClass(item: InventoryItem): AgingClass {
  const d = idleDays(item)
  if (d > 365) return 'Obsolete'
  if (d > 180) return 'Dead'
  if (d > 90) return 'Slow'
  return 'Active'
}

export function bookValue(item: InventoryItem): number {
  return item.qty * item.unitCost
}

export function available(item: InventoryItem): number {
  return Math.max(0, item.qty - item.reserved)
}

/** Stock beyond N months of the plant's own consumption is surplus and can be offered to sister plants. */
export function surplusQty(item: InventoryItem, s: Settings): number {
  return Math.max(0, available(item) - item.monthlyUse * s.surplusCoverMonths)
}

export function weightT(materialKey: string, q: number): number {
  const m = MATERIAL[materialKey]
  return m.uom === 'T' ? q : (q * m.kgPerUnit) / 1000
}

/* ──────────────────────────  Agent 05 · Logistics  ────────────────────────── */

const ROAD_FACTOR = 1.3

export function roadKm(a: PlantId, b: PlantId): number {
  if (a === b) return 0
  const pa = PLANT[a]
  const pb = PLANT[b]
  const R = 6371
  const dLat = ((pb.lat - pa.lat) * Math.PI) / 180
  const dLng = ((pb.lng - pa.lng) * Math.PI) / 180
  const h = Math.sin(dLat / 2) ** 2 + Math.cos((pa.lat * Math.PI) / 180) * Math.cos((pb.lat * Math.PI) / 180) * Math.sin(dLng / 2) ** 2
  const km = 2 * R * Math.asin(Math.sqrt(h)) * ROAD_FACTOR
  return Math.max(35, Math.round(km / 5) * 5)
}

export function transitDays(km: number, cal?: RouteCalibration): number {
  return Math.max(1, Math.round((Math.ceil(km / 450) + (km > 60 ? 1 : 0)) * (cal?.transitFactor ?? 1)))
}

export function freightPerT(from: PlantId, to: PlantId, s: Settings, cal?: RouteCalibration): number {
  return roadKm(from, to) * s.freightPerTonKm * s.freightIndex * (cal?.freightFactor ?? 1)
}

/* ──────────────────────────  Agent 03 · Equivalence  ──────────────────────── */

interface EquivalenceResult {
  mode: MatchMode
  gradeUpgrade: boolean
  yieldPct: number
  strips: number
  note: string
}

const EDGE_TRIM_MM = 10

export function equivalence(supply: Spec, demand: Spec): EquivalenceResult | null {
  const ms = MATERIAL[supply.material]
  const md = MATERIAL[demand.material]
  if (!ms || !md) return null
  if (ms.family !== md.family) return null
  if (ms.rank < md.rank) return null
  const gradeUpgrade = ms.rank > md.rank

  if (ms.category === 'Fastener' || ms.category === 'Tooling') {
    return { mode: 'Direct', gradeUpgrade, yieldPct: 100, strips: 1, note: gradeUpgrade ? `${ms.name} exceeds required ${md.name.split(' ').slice(-1)[0]} spec` : 'Identical specification' }
  }

  if (ms.category === 'Tube') {
    if (supply.od !== demand.od || Math.abs((supply.thickness ?? 0) - (demand.thickness ?? 0)) > 0.05) return null
    return { mode: 'Direct', gradeUpgrade, yieldPct: 100, strips: 1, note: 'OD and wall thickness identical' }
  }

  // Flat products
  if (supply.thickness == null || demand.thickness == null || supply.width == null || demand.width == null) return null
  if (Math.abs(supply.thickness - demand.thickness) > 0.05) return null
  const sw = supply.width
  const dw = demand.width
  if (Math.abs(sw - dw) <= 2) {
    return { mode: 'Direct', gradeUpgrade, yieldPct: 100, strips: 1, note: 'Grade, gauge and width match' }
  }
  if (sw < dw) return null
  const strips = Math.floor((sw - EDGE_TRIM_MM) / dw)
  if (strips < 1) return null
  const yieldPct = ((strips * dw) / sw) * 100
  if (yieldPct < 70) return null
  return {
    mode: 'Slit',
    gradeUpgrade,
    yieldPct,
    strips,
    note: `Slit ${sw} mm → ${strips} × ${dw} mm (${yieldPct.toFixed(1)}% yield)`,
  }
}

/* ─────────────────────  Agents 06 + 07 · Valuation & Scrap  ───────────────── */

export function economics(
  supply: InventoryItem,
  demand: Demand,
  deliveredQty: number,
  yieldPct: number,
  mode: MatchMode,
  s: Settings,
  cal?: RouteCalibration,
): Economics {
  const m = MATERIAL[demand.spec.material]
  const ms = MATERIAL[supply.spec.material]
  const suppliedQty = deliveredQty / (yieldPct / 100)
  const wSupplied = weightT(supply.spec.material, suppliedQty)

  const externalUnit = m.marketPrice * s.marketIndex + (m.uom === 'T' ? s.inboundFreightPerT : (m.kgPerUnit / 1000) * s.inboundFreightPerT)
  const externalTotal = externalUnit * deliveredQty

  const freightTotal = wSupplied * freightPerT(supply.plantId, demand.plantId, s, cal)
  const handlingTotal = wSupplied * s.handlingPerT
  const processingTotal = mode === 'Slit' ? wSupplied * s.slitPerT : 0
  const trips = Math.max(1, Math.ceil(wSupplied / s.truckCapacityT))
  const tripTotal = trips * s.tripFixed
  const transferTotal = freightTotal + handlingTotal + processingTotal + tripTotal
  const savings = externalTotal - transferTotal

  const bv = suppliedQty * supply.unitCost
  const scrapValue = wSupplied * ms.scrapPerT * s.scrapIndex
  const secondaryValue = bv * s.secondarySaleFactor * s.marketIndex
  const best = Math.max(savings, scrapValue, secondaryValue)
  const recommendation = best === savings ? 'Redeploy' : best === secondaryValue ? 'Secondary sale' : 'Scrap'
  const interState = PLANT[supply.plantId].state !== PLANT[demand.plantId].state

  return {
    suppliedQty,
    deliveredQty,
    weightT: wSupplied,
    externalUnit,
    externalTotal,
    freightTotal,
    handlingTotal,
    processingTotal,
    tripTotal,
    transferTotal,
    transferUnit: transferTotal / deliveredQty,
    savings,
    savingsPct: externalTotal > 0 ? savings / externalTotal : 0,
    scrapValue,
    secondaryValue,
    bookValue: bv,
    carryingAvoided: bv * s.carryingRate,
    recommendation,
    interState,
    ewayBill: bv > 50_000,
  }
}

/** Minimum quantity (in the demand's uom) at which a transfer on this lane beats a fresh buy. */
export function minEconomicQty(materialKey: string, from: PlantId, to: PlantId, s: Settings, slit = false): number {
  const m = MATERIAL[materialKey]
  const perUnitW = m.uom === 'T' ? 1 : m.kgPerUnit / 1000
  const buy = m.marketPrice * s.marketIndex + perUnitW * s.inboundFreightPerT
  const move = perUnitW * (freightPerT(from, to, s) + s.handlingPerT + (slit ? s.slitPerT : 0))
  const margin = buy - move
  if (margin <= 0) return Infinity
  return s.tripFixed / margin
}

/* ─────────────────────  Agent 10 · Validation & Confidence  ───────────────── */

export function bandOf(score: number): Band {
  return score >= 85 ? 'Green' : score >= 70 ? 'Amber' : 'Red'
}

function confidence(supply: InventoryItem, demand: Demand, eq: EquivalenceResult, transit: number) {
  let score = 98
  const flags: string[] = []
  if (eq.gradeUpgrade) { score -= 5; flags.push('Grade upgrade') }
  if (eq.mode === 'Slit') { score -= 3 + Math.round((100 - eq.yieldPct) / 3); flags.push('Slitting required') }
  if (!supply.mtc) { score -= 18; flags.push('No MTC on file') }
  if (supply.condition === 'Surface rust') { score -= 12; flags.push('Surface rust') }
  if (supply.condition === 'Unverified') { score -= 10; flags.push('Condition unverified') }
  if (idleDays(supply) > 365) { score -= 6; flags.push('Batch > 12 months') }
  const slack = daysBetween(new Date().toISOString(), demand.needBy) - transit
  if (slack < 3) { score -= 12; flags.push('Tight lead time') }
  return { score: Math.max(20, Math.min(99, score)), flags }
}

/* ─────────────────────  Agent 09 · Engineering & Business Reasoning  ──────── */

function reasoning(o: Omit<Opportunity, 'rationale'>): string[] {
  const { supply, demand, econ } = o
  const ms = MATERIAL[supply.spec.material]
  const md = MATERIAL[demand.spec.material]
  const from = PLANT[supply.plantId].name
  const to = PLANT[demand.plantId].name
  const lines: string[] = []
  lines.push(
    `${from} holds ${fmtQty(available(supply), ms.uom)} of ${shortGrade(ms.key)} ${specLabel(supply.spec)} (local part ${supply.localPartNo}) that has not moved for ${idleDays(supply)} days.`,
  )
  lines.push(
    `${to} needs ${fmtQty(demand.qty - demand.covered, md.uom)} of ${shortGrade(md.key)} ${specLabel(demand.spec)} for "${demand.part}" (${demand.program}) by ${new Date(demand.needBy).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}.`,
  )
  if (o.mode === 'Slit') lines.push(`Slitting ${supply.spec.width} mm into ${o.strips} × ${demand.spec.width} mm strips gives ${o.yieldPct.toFixed(1)}% usable yield; ${num(econ.suppliedQty, 1)} T of coil covers ${num(econ.deliveredQty, 1)} T of demand.`)
  if (o.gradeUpgrade) lines.push(`${shortGrade(ms.key)} is a higher-spec substitute for ${shortGrade(md.key)} within the ${ms.family} family — mechanical properties meet or exceed the drawing.`)
  lines.push(
    `Landed cost via transfer is ${inr(econ.transferUnit, { compact: false })}/${md.uom === 'T' ? 'T' : 'pc'} against ${inr(econ.externalUnit, { compact: false })}/${md.uom === 'T' ? 'T' : 'pc'} for a fresh buy — ${inr(econ.savings)} saved (${(econ.savingsPct * 100).toFixed(1)}% of cash preserved).`,
  )
  const alt = Math.max(econ.scrapValue, econ.secondaryValue)
  if (econ.recommendation === 'Redeploy') lines.push(`Redeploying beats the best disposal alternative (${inr(alt)}) by ${inr(econ.savings - alt)}.`)
  else lines.push(`Caution: ${econ.recommendation.toLowerCase()} would recover ${inr(alt)}, more than the transfer saves.`)
  if (o.flags.length) lines.push(`Risk checks: ${o.flags.join(', ')}.`)
  return lines
}

/* ─────────────────────  Agent 04 · Cross-Plant Demand Matcher  ────────────── */

export const oppKey = (supplyId: string, demandId: string) => `${supplyId}>${demandId}`
export const laneKey = (a: PlantId, b: PlantId) => `${a}>${b}`

export function openDemand(d: Demand, s: Settings): number {
  return Math.max(0, d.qty * s.demandIndex - d.covered)
}

/**
 * Candidate generation → greedy allocation by net savings. Each surplus lot and each demand line
 * is consumed as it is allocated so the same tonne is never promised twice.
 */
export function findOpportunities(state: Pick<AppState, 'inventory' | 'demand' | 'rejected' | 'calibration'>, s: Settings): Opportunity[] {
  const supplyLeft = new Map(state.inventory.map((i) => [i.id, surplusQty(i, s)]))
  const demandLeft = new Map(state.demand.map((d) => [d.id, openDemand(d, s)]))

  type Cand = { supply: InventoryItem; demand: Demand; eq: EquivalenceResult; unitSaving: number; conf: number }
  const cands: Cand[] = []
  for (const d of state.demand) {
    if ((demandLeft.get(d.id) ?? 0) <= 0) continue
    for (const inv of state.inventory) {
      if (inv.plantId === d.plantId) continue
      if ((supplyLeft.get(inv.id) ?? 0) <= 0) continue
      if (state.rejected[oppKey(inv.id, d.id)]) continue
      const eq = equivalence(inv.spec, d.spec)
      if (!eq) continue
      const probe = economics(inv, d, 1, eq.yieldPct, eq.mode, s, state.calibration[laneKey(inv.plantId, d.plantId)])
      const km = roadKm(inv.plantId, d.plantId)
      const conf = confidence(inv, d, eq, transitDays(km, state.calibration[laneKey(inv.plantId, d.plantId)])).score
      cands.push({ supply: inv, demand: d, eq, unitSaving: probe.savings + probe.tripTotal, conf })
    }
  }
  // Trustworthy sources first (a Green lot beats a slightly cheaper Red one), then by value.
  const weight = (c: Cand) => c.unitSaving * openDemand(c.demand, s) * (bandOf(c.conf) === 'Green' ? 1 : bandOf(c.conf) === 'Amber' ? 0.6 : 0.3)
  cands.sort((a, b) => weight(b) - weight(a))

  const out: Opportunity[] = []
  for (const c of cands) {
    const sLeft = supplyLeft.get(c.supply.id) ?? 0
    const dLeft = demandLeft.get(c.demand.id) ?? 0
    if (sLeft <= 0 || dLeft <= 0) continue
    const uomD = MATERIAL[c.demand.spec.material].uom
    let delivered = Math.min(dLeft, sLeft * (c.eq.yieldPct / 100))
    delivered = uomD === 'pcs' ? Math.floor(delivered) : Math.round(delivered * 100) / 100
    if (delivered <= 0) continue
    const cal = state.calibration[laneKey(c.supply.plantId, c.demand.plantId)]
    const econ = economics(c.supply, c.demand, delivered, c.eq.yieldPct, c.eq.mode, s, cal)
    const km = roadKm(c.supply.plantId, c.demand.plantId)
    const transit = transitDays(km, cal)
    const conf = confidence(c.supply, c.demand, c.eq, transit)
    if (econ.savings <= 0) conf.flags.push('Negative economics')
    const base: Omit<Opportunity, 'rationale'> = {
      key: oppKey(c.supply.id, c.demand.id),
      supply: c.supply,
      demand: c.demand,
      distanceKm: km,
      transitDays: transit,
      mode: c.eq.mode,
      gradeUpgrade: c.eq.gradeUpgrade,
      yieldPct: c.eq.yieldPct,
      strips: c.eq.strips,
      confidence: conf.score,
      band: econ.savings <= 0 ? 'Red' : bandOf(conf.score),
      flags: conf.flags,
      econ,
    }
    out.push({ ...base, rationale: reasoning(base) })
    supplyLeft.set(c.supply.id, sLeft - econ.suppliedQty)
    demandLeft.set(c.demand.id, dLeft - delivered)
  }
  return out.sort((a, b) => b.econ.savings - a.econ.savings)
}

/* ─────────────────────────────  Roll-ups  ─────────────────────────────── */

export function portfolio(inventory: InventoryItem[]) {
  const byClass: Record<AgingClass, number> = { Active: 0, Slow: 0, Dead: 0, Obsolete: 0 }
  let total = 0
  for (const i of inventory) {
    const v = bookValue(i)
    total += v
    byClass[agingClass(i)] += v
  }
  const idle = byClass.Slow + byClass.Dead + byClass.Obsolete
  return { total, byClass, idle, idleShare: total ? idle / total : 0 }
}

/* ─────────────────────  Agent 01 · Ingestion & Normalizer  ───────────────── */

export interface NormalizedRow {
  raw: string
  plantId: PlantId | null
  localPartNo: string
  spec: Spec | null
  qty: number
  unitCost: number
  idle: number
  confidence: number
  note: string
}

const GRADE_ALIASES: [RegExp, string][] = [
  [/\b(CR4|DC04|SPCE|CRCA[- ]?DD|EDD)\b/i, 'CR4'],
  [/\b(CR3|DC03|SPCD|CRCA[- ]?D)\b/i, 'CR3'],
  [/\b(CR2|CR1|DC01|SPCC|CRCA)\b/i, 'CR2'],
  [/\b(E\s?350|HR\s?E350|S355)\b/i, 'HRE350'],
  [/\b(E\s?250|HR\s?E250|S275|HRPO|HR[- ]PO|IS\s?2062)\b/i, 'HRE250'],
  [/\b(DP\s?780|HCT780|JSC780)\b/i, 'DP780'],
  [/\b(DP\s?590|HCT590|JSC590)\b/i, 'DP590'],
  [/\b(GI|GP|Z275|DX51D)\b/i, 'GI275'],
  [/\b(SS\s?304|1\.4301)\b/i, 'SS304'],
  [/\b(ST\s?52|E355)\b/i, 'ST52'],
  [/\bCNMG\s?120408\b/i, 'CNMG'],
]

/**
 * Parses a free-text local ERP line — "CR4-1.2mm-Coil-1250", "COIL CR IS513 CR4 1.20X1250",
 * "S-CRCA-DD-1.2x1250" — into a canonical spec. Deterministic rules first; anything it cannot
 * resolve is surfaced with low confidence for human review rather than guessed.
 */
export function normalizeLine(line: string): NormalizedRow {
  const cells = line.split(/[,\t;]/).map((c) => c.trim())
  const [plantRaw = '', part = '', desc = '', qtyRaw = '0', costRaw = '0', idleRaw = '0'] = cells
  const text = `${part} ${desc}`
  const plant = (['MNS', 'PNE', 'FBD', 'CHN', 'SND'] as PlantId[]).find(
    (p) => plantRaw.toUpperCase().startsWith(p) || PLANT[p].name.toLowerCase() === plantRaw.toLowerCase(),
  ) ?? null
  let material: string | null = null
  let conf = 50
  const notes: string[] = []

  const bolt = text.match(/M(8|10|12)\s*[x×]\s*(25|30|40)/i)
  if (bolt) {
    const flake = /flake|geomet|zf\b/i.test(text)
    material = `M${bolt[1]}x${bolt[2]}-${flake ? 'ZF' : bolt[1] === '12' ? 'ZF' : 'ZP'}`
    if (!MATERIAL[material]) material = null
    conf = material ? 92 : 40
    if (material) notes.push('Fastener size + class')
  } else {
    for (const [re, key] of GRADE_ALIASES) {
      if (re.test(text)) { material = key; conf = 88; notes.push(`Grade alias → ${shortGrade(key)}`); break }
    }
  }
  const dims = text.match(/(\d+(?:\.\d+)?)\s*(?:mm)?\s*[x×X-]\s*(?:coil-?|sheet-?)?\s*(\d{3,4})/i)
  let spec: Spec | null = null
  if (material) {
    const m = MATERIAL[material]
    spec = { material }
    if (m.category === 'Coil' || m.category === 'Sheet') {
      const alt = text.match(/(\d+(?:\.\d+)?)\s*mm.*?(\d{3,4})/i)
      const d = dims ?? alt
      if (d) {
        spec.thickness = parseFloat(d[1])
        spec.width = parseInt(d[2], 10)
        notes.push(`Gauge ${spec.thickness} × ${spec.width}`)
      } else {
        conf -= 30
        notes.push('Dimensions not found')
      }
    }
    if (m.category === 'Tube') {
      const t = text.match(/(\d+(?:\.\d+)?)\s*[x×X]\s*(\d+(?:\.\d+)?)/)
      if (t) { spec.od = parseFloat(t[1]); spec.thickness = parseFloat(t[2]) } else conf -= 30
    }
  } else {
    notes.push('No grade recognised — route to material master team')
  }
  if (!plant) { conf -= 20; notes.push('Unknown plant code') }
  return {
    raw: line,
    plantId: plant,
    localPartNo: part,
    spec,
    qty: parseFloat(qtyRaw) || 0,
    unitCost: parseFloat(costRaw) || 0,
    idle: parseInt(idleRaw, 10) || 0,
    confidence: Math.max(5, conf),
    note: notes.join(' · '),
  }
}
