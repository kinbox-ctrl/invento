import type { AppState, AuditEvent, Condition, Demand, InventoryItem, PlantId, Spec, Transfer } from '../types'
import { DEFAULT_SETTINGS, MATERIAL } from './catalog'

const DAY = 86_400_000
export const daysAgo = (d: number) => new Date(Date.now() - d * DAY).toISOString()
export const daysAhead = (d: number) => new Date(Date.now() + d * DAY).toISOString()

/**
 * Every plant runs its own ERP node with its own part-numbering schema.
 * This is the silo problem Invento's normalizer solves: the same CR4 1.2 × 1250 coil
 * is "CR4-1.2mm-Coil-1250" in Manesar and "10004521" in Faridabad.
 */
function localPart(plant: PlantId, spec: Spec, seq: number): { no: string; desc: string } {
  const m = MATERIAL[spec.material]
  const t = spec.thickness ?? 0
  const w = spec.width ?? 0
  const g = spec.material
  const isFlat = m.category === 'Coil' || m.category === 'Sheet'
  const isTube = m.category === 'Tube'
  switch (plant) {
    case 'MNS':
      if (isFlat) return { no: `${g}-${t}mm-${m.category}-${w}`, desc: `${m.name} ${t} × ${w} mm` }
      if (isTube) return { no: `TUBE-${g}-${spec.od}x${t}`, desc: `ERW tube ${spec.od} OD × ${t} wall` }
      return { no: `CONS-${g}`, desc: m.name }
    case 'PNE':
      if (isFlat) return { no: `RM-${m.family}-${g.slice(-3)}-${t.toFixed(2)}-${w}`, desc: `${m.family} SHEET ${g} ${t.toFixed(2)}X${w}` }
      if (isTube) return { no: `RM-TB-${spec.od}-${t}`, desc: `TUBE ${g} ${spec.od}X${t}` }
      return { no: `BO-${g.replace(/[^A-Z0-9]/gi, '')}`, desc: `BOUGHT OUT ${m.name.toUpperCase()}` }
    case 'FBD':
      return { no: `1000${4500 + seq}`, desc: isFlat ? `COIL ${m.family} ${m.standard.split(' · ')[0]} ${t.toFixed(2)}X${w}` : m.name.toUpperCase() }
    case 'CHN':
      if (isFlat) return { no: `JBMC/ST/${g}/${Math.round(t * 100)}/${w}`, desc: `${g} ${t}t x ${w}w` }
      if (isTube) return { no: `JBMC/TB/${g}/${spec.od}`, desc: `${g} tube Ø${spec.od} × ${t}` }
      return { no: `JBMC/FS/${g}`, desc: m.name }
    case 'SND':
      if (isFlat) return { no: `S-${m.family}-${g}-${t}x${w}`, desc: `${m.family} ${g} ${t}x${w}` }
      if (isTube) return { no: `S-TB-${spec.od}x${t}`, desc: `Tube ${spec.od}x${t}` }
      return { no: `S-BOP-${g}`, desc: m.name }
  }
}

type Row = [PlantId, Spec, number, number, number, boolean, Condition, number]
// plant, spec, qty, unit cost, days idle, MTC on file, condition, monthly use
const INVENTORY: Row[] = [
  ['MNS', { material: 'CR4', thickness: 1.2, width: 1250 }, 42.5, 84000, 214, true, 'Good', 0],
  ['MNS', { material: 'DP590', thickness: 1.6, width: 1100 }, 18, 97500, 128, true, 'Good', 0],
  ['MNS', { material: 'HRE250', thickness: 3, width: 1500 }, 36, 61000, 12, true, 'Good', 20],
  ['MNS', { material: 'GI275', thickness: 0.8, width: 1000 }, 9.5, 91000, 402, false, 'Surface rust', 0],
  ['MNS', { material: 'M10x30-ZF' }, 48000, 7.2, 240, true, 'Good', 0],
  ['MNS', { material: 'ST52', od: 60.3, thickness: 3.2 }, 12, 88000, 150, true, 'Good', 0],
  ['MNS', { material: 'CR2', thickness: 1, width: 1250 }, 14, 80000, 18, true, 'Good', 10],
  ['MNS', { material: 'CNMG' }, 1200, 420, 380, true, 'Good', 0],
  ['PNE', { material: 'HRE350', thickness: 4, width: 1500 }, 28, 65500, 196, true, 'Good', 0],
  ['PNE', { material: 'CR4', thickness: 1.2, width: 620 }, 3, 85500, 9, true, 'Good', 12],
  ['PNE', { material: 'DP780', thickness: 1.4, width: 1200 }, 22, 107000, 305, true, 'Good', 0],
  ['PNE', { material: 'M8x25-ZP' }, 60000, 4.1, 110, true, 'Good', 0],
  ['PNE', { material: 'SS304', thickness: 1.5, width: 1250 }, 4.2, 238000, 420, true, 'Good', 0],
  ['PNE', { material: 'CR3', thickness: 0.9, width: 1000 }, 16, 82000, 95, true, 'Good', 0],
  ['FBD', { material: 'CR4', thickness: 1.2, width: 1250 }, 11, 83500, 132, true, 'Good', 0],
  ['FBD', { material: 'HRE250', thickness: 2.5, width: 1250 }, 30, 60500, 260, true, 'Good', 0],
  ['FBD', { material: 'M10x30-ZP' }, 30000, 5.9, 21, true, 'Good', 12000],
  ['FBD', { material: 'GI275', thickness: 1, width: 1200 }, 17, 90500, 188, true, 'Good', 0],
  ['FBD', { material: 'CNMG' }, 400, 455, 30, true, 'Good', 150],
  ['FBD', { material: 'DP590', thickness: 1.6, width: 1250 }, 25, 97000, 44, true, 'Good', 10],
  ['CHN', { material: 'ST52', od: 60.3, thickness: 3.2 }, 5, 89000, 6, true, 'Good', 8],
  ['CHN', { material: 'HRE350', thickness: 5, width: 1500 }, 20, 66000, 30, true, 'Good', 12],
  ['CHN', { material: 'GI275', thickness: 0.8, width: 1000 }, 8, 91500, 12, true, 'Good', 6],
  ['CHN', { material: 'M12x40-ZF' }, 25000, 14.5, 200, true, 'Good', 0],
  ['CHN', { material: 'CR2', thickness: 1, width: 1250 }, 21, 80500, 370, true, 'Good', 0],
  ['SND', { material: 'DP590', thickness: 1.6, width: 1250 }, 30, 97800, 170, true, 'Good', 0],
  ['SND', { material: 'HRE250', thickness: 3, width: 1500 }, 15, 61500, 120, true, 'Unverified', 0],
  ['SND', { material: 'CR3', thickness: 0.9, width: 1000 }, 5, 83000, 14, true, 'Good', 4],
  ['SND', { material: 'M8x25-ZF' }, 45000, 4.9, 20, true, 'Good', 15000],
  ['SND', { material: 'SS304', thickness: 1.5, width: 1250 }, 2, 240000, 25, true, 'Good', 1],
  ['SND', { material: 'DP780', thickness: 1.4, width: 1200 }, 9, 106000, 200, false, 'Good', 0],
]

type DRow = [PlantId, 'BOM' | 'PR', string, string, Spec, number, number]
// plant, source, programme, part, spec, qty, need-by (days ahead)
const DEMAND: DRow[] = [
  ['PNE', 'BOM', 'LCV Cross-member Line', 'Structural Bracket Blank', { material: 'CR4', thickness: 1.2, width: 620 }, 20, 24],
  ['CHN', 'BOM', 'eBus 12m Roof Frame', 'Roof Hoop Tube', { material: 'ST52', od: 60.3, thickness: 3.2 }, 10, 30],
  ['CHN', 'PR', 'eBus Battery Pack', 'Battery Tray Stiffener', { material: 'DP590', thickness: 1.6, width: 600 }, 15, 40],
  ['SND', 'BOM', 'SUV Long Member', 'Long Member Reinforcement', { material: 'HRE250', thickness: 2.5, width: 1250 }, 20, 18],
  ['PNE', 'PR', 'Tractor Chassis', 'Chassis Cross Plate', { material: 'HRE250', thickness: 3, width: 1500 }, 12, 35],
  ['CHN', 'PR', 'eBus Seat Frames', 'Seat Frame Bolts', { material: 'M10x30-ZP' }, 40000, 28],
  ['MNS', 'BOM', 'Hatchback Door Line', 'Door Hinge Reinforcement', { material: 'DP780', thickness: 1.4, width: 580 }, 10, 26],
  ['FBD', 'PR', 'Tool Room Consumables', 'Turning Inserts', { material: 'CNMG' }, 600, 14],
  ['SND', 'BOM', 'SUV Wheel-arch', 'Wheel-arch Inner Panel', { material: 'GI275', thickness: 0.8, width: 1000 }, 8, 21],
  ['PNE', 'BOM', 'LCV Floor Line', 'Floor Cross Member', { material: 'CR2', thickness: 1, width: 1250 }, 15, 45],
  ['CHN', 'BOM', 'eBus Side Wall', 'Side Wall Bracket', { material: 'HRE350', thickness: 4, width: 740 }, 18, 33],
  ['MNS', 'PR', 'Assembly Line Fasteners', 'Hex Bolt M8', { material: 'M8x25-ZP' }, 35000, 20],
  ['FBD', 'BOM', 'Exhaust Sub-assembly', 'Exhaust Heat-shield Bracket', { material: 'SS304', thickness: 1.5, width: 1250 }, 3, 38],
  ['SND', 'PR', 'Compact SUV Inner Panels', 'Inner Panel Blank', { material: 'CR3', thickness: 0.9, width: 1000 }, 12, 42],
  ['PNE', 'BOM', 'LCV Cab Line', 'Dash Panel', { material: 'CR4', thickness: 1.2, width: 1250 }, 6, 50],
  ['MNS', 'BOM', 'Truck Frame Line', 'Frame Rail Blank', { material: 'HRE350', thickness: 5, width: 1500 }, 22, 16],
]

let seq = 0
const id = (p: string) => `${p}-${(++seq).toString().padStart(4, '0')}`

function seedInventory(): InventoryItem[] {
  return INVENTORY.map(([plantId, spec, qty, unitCost, idle, mtc, condition, monthlyUse], i) => {
    const lp = localPart(plantId, spec, i)
    return {
      id: id('INV'),
      plantId,
      localPartNo: lp.no,
      localDesc: lp.desc,
      spec,
      qty,
      reserved: 0,
      unitCost,
      lastMovement: daysAgo(idle),
      batch: `${plantId}${(24 + (i % 3)).toString()}${String(1000 + i * 37).slice(-4)}`,
      mtc,
      condition,
      monthlyUse,
      bin: `${'ABCDEFGH'[i % 8]}-${(i % 12) + 1}-${(i % 4) + 1}`,
    }
  })
}

function seedDemand(): Demand[] {
  return DEMAND.map(([plantId, source, program, part, spec, qty, ahead], i) => ({
    id: id('DMD'),
    plantId,
    source,
    program,
    part,
    localPartNo: localPart(plantId, spec, 40 + i).no,
    spec,
    qty,
    covered: 0,
    needBy: daysAhead(ahead),
  }))
}

function seedTransfers(): Transfer[] {
  const t = (
    o: Partial<Transfer> & Pick<Transfer, 'from' | 'to' | 'material' | 'description' | 'qty' | 'status' | 'estimate'>,
    ago: number,
  ): Transfer => ({
    id: id('TRF'),
    oppKey: `hist-${seq}`,
    supplyId: '',
    demandId: '',
    deliveredQty: o.qty,
    uom: 'T',
    createdAt: daysAgo(ago),
    updatedAt: daysAgo(Math.max(0, ago - 6)),
    confidence: 91,
    band: 'Green',
    ...o,
  })
  return [
    t({ from: 'MNS', to: 'FBD', material: 'HRE250', description: 'HR E250 2.0 × 1250 coil', qty: 24, status: 'Received', confidence: 94, estimate: { freightPerT: 690, transitDays: 1, yieldPct: 100, savings: 1_381_000 }, actual: { freightPerT: 720, transitDays: 1, yieldPct: 100, savings: 1_380_300 }, ewayBill: 'EWB 4121 8870 2231' }, 62),
    t({ from: 'SND', to: 'PNE', material: 'CR4', description: 'CR4 1.0 × 1250 coil → slit 2 × 610', qty: 18, deliveredQty: 17.6, status: 'Received', confidence: 88, estimate: { freightPerT: 2350, transitDays: 3, yieldPct: 97.6, savings: 1_372_000 }, actual: { freightPerT: 2510, transitDays: 4, yieldPct: 96.8, savings: 1_351_400 }, ewayBill: 'EWB 3310 5520 1182' }, 48),
    t({ from: 'PNE', to: 'CHN', material: 'M12x40-ZF', description: 'Hex bolt M12×40 10.9 Zn-flake', qty: 30000, deliveredQty: 30000, uom: 'pcs', status: 'Received', confidence: 96, estimate: { freightPerT: 3900, transitDays: 3, yieldPct: 100, savings: 437_000 }, actual: { freightPerT: 3750, transitDays: 3, yieldPct: 100, savings: 437_200 }, ewayBill: 'EWB 2208 9912 6604' }, 35),
    t({ from: 'FBD', to: 'SND', material: 'DP590', description: 'DP590 1.6 × 1250 coil', qty: 12, status: 'In Transit', confidence: 90, estimate: { freightPerT: 2780, transitDays: 3, yieldPct: 100, savings: 1_091_000 }, ewayBill: 'EWB 5402 1187 3390' }, 2),
  ]
}

function seedAudit(): AuditEvent[] {
  const e = (ago: number, actor: string, action: string, detail: string, tone: AuditEvent['tone']): AuditEvent => ({
    id: id('AUD'),
    ts: new Date(Date.now() - ago * 3_600_000).toISOString(),
    actor,
    action,
    detail,
    tone,
  })
  return [
    e(0.2, 'Invento Engine', 'Scan completed', '31 ledger lines · 16 demand lines · 5 plants normalised', 'info'),
    e(48, 'P. Desai (Sanand)', 'Dispatched', 'DP590 1.6 × 1250 · 12 T → Sanand · EWB 5402 1187 3390', 'info'),
    e(52, 'Q. Engineering', 'QA sign-off', 'DP590 1.6 × 1250 · MTC HCT590X verified', 'good'),
    e(35 * 24, 'K. Raghavan (Chennai)', 'Received', 'M12×40 10.9 · 30,000 pcs · actual freight ₹3,750/T', 'good'),
    e(48 * 24, 'S. Kulkarni (Pune)', 'Received', 'CR4 1.0 × 1250 · 17.6 T · slit yield 96.8 %', 'good'),
  ]
}

export function createSeed(): AppState {
  seq = 0
  return {
    version: 3,
    inventory: seedInventory(),
    demand: seedDemand(),
    transfers: seedTransfers(),
    audit: seedAudit(),
    rejected: {},
    settings: { ...DEFAULT_SETTINGS },
    calibration: {
      'MNS>FBD': { freightFactor: 1.04, transitFactor: 1, yieldFactor: 1, samples: 1 },
      'SND>PNE': { freightFactor: 1.07, transitFactor: 1.33, yieldFactor: 0.992, samples: 1 },
      'PNE>CHN': { freightFactor: 0.96, transitFactor: 1, yieldFactor: 1, samples: 1 },
    },
    lastScan: new Date().toISOString(),
  }
}

export { localPart }
