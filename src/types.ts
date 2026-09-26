export type PlantId = 'MNS' | 'PNE' | 'FBD' | 'CHN' | 'SND'

export interface Plant {
  id: PlantId
  name: string
  city: string
  state: string
  division: string
  lat: number
  lng: number
  head: string
}

export type Category = 'Coil' | 'Sheet' | 'Tube' | 'Fastener' | 'Tooling'
export type Uom = 'T' | 'pcs'

/** Canonical material master entry (the "normalized" identity every local part maps onto). */
export interface Material {
  key: string
  name: string
  category: Category
  /** Items in the same family are substitutable; higher rank may substitute lower. */
  family: string
  rank: number
  standard: string
  uom: Uom
  kgPerUnit: number
  /** Current market buy price per uom (₹). */
  marketPrice: number
  /** Scrap realisation per tonne (₹). */
  scrapPerT: number
  props: { label: string; value: string }[]
}

export interface Spec {
  material: string
  thickness?: number
  width?: number
  od?: number
}

export type Condition = 'Good' | 'Surface rust' | 'Unverified'

export interface InventoryItem {
  id: string
  plantId: PlantId
  localPartNo: string
  localDesc: string
  spec: Spec
  qty: number
  reserved: number
  unitCost: number
  lastMovement: string
  batch: string
  mtc: boolean
  condition: Condition
  monthlyUse: number
  bin: string
}

export interface Demand {
  id: string
  plantId: PlantId
  source: 'BOM' | 'PR'
  program: string
  part: string
  localPartNo: string
  spec: Spec
  qty: number
  covered: number
  needBy: string
}

export type AgingClass = 'Active' | 'Slow' | 'Dead' | 'Obsolete'
export type Band = 'Green' | 'Amber' | 'Red'
export type MatchMode = 'Direct' | 'Slit' | 'Cut-to-length'

export interface Economics {
  suppliedQty: number
  deliveredQty: number
  weightT: number
  externalUnit: number
  externalTotal: number
  freightTotal: number
  handlingTotal: number
  processingTotal: number
  tripTotal: number
  transferTotal: number
  transferUnit: number
  savings: number
  savingsPct: number
  scrapValue: number
  secondaryValue: number
  bookValue: number
  carryingAvoided: number
  recommendation: 'Redeploy' | 'Secondary sale' | 'Scrap'
  interState: boolean
  ewayBill: boolean
}

export interface Opportunity {
  key: string
  supply: InventoryItem
  demand: Demand
  distanceKm: number
  transitDays: number
  mode: MatchMode
  gradeUpgrade: boolean
  yieldPct: number
  strips: number
  confidence: number
  band: Band
  flags: string[]
  econ: Economics
  rationale: string[]
}

export type TransferStatus = 'Pending QA' | 'Approved' | 'In Transit' | 'Received'

export interface Transfer {
  id: string
  oppKey: string
  supplyId: string
  demandId: string
  from: PlantId
  to: PlantId
  material: string
  description: string
  qty: number
  deliveredQty: number
  weightT?: number
  uom: Uom
  status: TransferStatus
  createdAt: string
  updatedAt: string
  confidence: number
  band: Band
  estimate: { freightPerT: number; transitDays: number; yieldPct: number; savings: number }
  actual?: { freightPerT: number; transitDays: number; yieldPct: number; savings: number }
  ewayBill?: string
}

export interface AuditEvent {
  id: string
  ts: string
  actor: string
  action: string
  detail: string
  tone: 'info' | 'good' | 'warn' | 'bad'
}

export interface Settings {
  freightPerTonKm: number
  handlingPerT: number
  slitPerT: number
  tripFixed: number
  truckCapacityT: number
  inboundFreightPerT: number
  carryingRate: number
  secondarySaleFactor: number
  surplusCoverMonths: number
  marketIndex: number
  freightIndex: number
  scrapIndex: number
  demandIndex: number
}

export interface RouteCalibration {
  freightFactor: number
  transitFactor: number
  yieldFactor: number
  samples: number
}

export interface AppState {
  version: number
  inventory: InventoryItem[]
  demand: Demand[]
  transfers: Transfer[]
  audit: AuditEvent[]
  rejected: Record<string, string>
  settings: Settings
  calibration: Record<string, RouteCalibration>
  lastScan: string
}
