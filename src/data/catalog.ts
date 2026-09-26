import type { Material, Plant, PlantId, Settings } from '../types'

export const PLANTS: Plant[] = [
  { id: 'MNS', name: 'Manesar', city: 'Manesar', state: 'Haryana', division: 'Chassis & Structures', lat: 28.354, lng: 76.937, head: 'R. Malhotra' },
  { id: 'PNE', name: 'Pune', city: 'Chakan, Pune', state: 'Maharashtra', division: 'Pressings & Assemblies', lat: 18.76, lng: 73.86, head: 'S. Kulkarni' },
  { id: 'FBD', name: 'Faridabad', city: 'Faridabad', state: 'Haryana', division: 'Tool Room & Sub-assemblies', lat: 28.408, lng: 77.317, head: 'A. Chauhan' },
  { id: 'CHN', name: 'Chennai', city: 'Oragadam, Chennai', state: 'Tamil Nadu', division: 'EV Bus Components', lat: 12.84, lng: 79.95, head: 'K. Raghavan' },
  { id: 'SND', name: 'Sanand', city: 'Sanand', state: 'Gujarat', division: 'Sheet Metal Components', lat: 22.99, lng: 72.37, head: 'P. Desai' },
]

export const PLANT: Record<PlantId, Plant> = Object.fromEntries(PLANTS.map((p) => [p.id, p])) as Record<PlantId, Plant>

/** Categorical slot order is fixed per plant — colour follows the plant everywhere. */
export const PLANT_COLOR: Record<PlantId, string> = {
  MNS: 'var(--s1)',
  PNE: 'var(--s2)',
  FBD: 'var(--s3)',
  CHN: 'var(--s4)',
  SND: 'var(--s5)',
}

const steel = (ys: string, uts: string, el: string, extra: { label: string; value: string }[] = []) => [
  { label: 'Yield strength', value: ys },
  { label: 'Tensile strength', value: uts },
  { label: 'Elongation', value: el },
  ...extra,
]

export const MATERIALS: Material[] = [
  { key: 'CR2', name: 'CR2 Cold-Rolled Steel', category: 'Coil', family: 'CR', rank: 1, standard: 'IS 513 CR2 · DC01 · SPCC', uom: 'T', kgPerUnit: 1000, marketPrice: 81000, scrapPerT: 31500, props: steel('≤ 280 MPa', '270–410 MPa', '≥ 28 %', [{ label: 'Surface', value: 'Matt, oiled' }]) },
  { key: 'CR3', name: 'CR3 Cold-Rolled Steel (Drawing)', category: 'Coil', family: 'CR', rank: 2, standard: 'IS 513 CR3 · DC03 · SPCD', uom: 'T', kgPerUnit: 1000, marketPrice: 83000, scrapPerT: 31500, props: steel('≤ 240 MPa', '270–370 MPa', '≥ 34 %', [{ label: 'Surface', value: 'Matt, oiled' }]) },
  { key: 'CR4', name: 'CR4 Cold-Rolled Steel (Deep Drawing)', category: 'Coil', family: 'CR', rank: 3, standard: 'IS 513 CR4 · DC04 · SPCE', uom: 'T', kgPerUnit: 1000, marketPrice: 85000, scrapPerT: 31500, props: steel('140–210 MPa', '270–350 MPa', '≥ 38 %', [{ label: 'Surface', value: 'Bright, oiled' }]) },
  { key: 'HRE250', name: 'HR E250 Hot-Rolled Structural', category: 'Coil', family: 'HR', rank: 1, standard: 'IS 2062 E250 BR', uom: 'T', kgPerUnit: 1000, marketPrice: 61500, scrapPerT: 30000, props: steel('≥ 250 MPa', '≥ 410 MPa', '≥ 23 %', [{ label: 'Surface', value: 'Pickled & oiled' }]) },
  { key: 'HRE350', name: 'HR E350 Hot-Rolled High-Strength', category: 'Coil', family: 'HR', rank: 2, standard: 'IS 2062 E350 BR', uom: 'T', kgPerUnit: 1000, marketPrice: 66000, scrapPerT: 30000, props: steel('≥ 350 MPa', '≥ 490 MPa', '≥ 22 %', [{ label: 'Surface', value: 'Pickled & oiled' }]) },
  { key: 'DP590', name: 'DP590 Dual-Phase AHSS', category: 'Coil', family: 'AHSS', rank: 1, standard: 'HCT590X · JSC590Y', uom: 'T', kgPerUnit: 1000, marketPrice: 98000, scrapPerT: 32000, props: steel('340–420 MPa', '≥ 590 MPa', '≥ 20 %', [{ label: 'Microstructure', value: 'Ferrite + martensite' }]) },
  { key: 'DP780', name: 'DP780 Dual-Phase AHSS', category: 'Coil', family: 'AHSS', rank: 2, standard: 'HCT780X · JSC780Y', uom: 'T', kgPerUnit: 1000, marketPrice: 107500, scrapPerT: 32000, props: steel('450–560 MPa', '≥ 780 MPa', '≥ 14 %', [{ label: 'Microstructure', value: 'Ferrite + martensite' }]) },
  { key: 'GI275', name: 'GI Z275 Galvanised Steel', category: 'Coil', family: 'GI', rank: 1, standard: 'IS 277 GP · DX51D+Z275', uom: 'T', kgPerUnit: 1000, marketPrice: 91500, scrapPerT: 29000, props: steel('≤ 300 MPa', '270–500 MPa', '≥ 22 %', [{ label: 'Coating', value: 'Zn 275 g/m²' }]) },
  { key: 'SS304', name: 'SS 304 Austenitic Stainless', category: 'Sheet', family: 'SS304', rank: 1, standard: 'ASTM A240 304 · 1.4301', uom: 'T', kgPerUnit: 1000, marketPrice: 242000, scrapPerT: 112000, props: steel('≥ 205 MPa', '≥ 515 MPa', '≥ 40 %', [{ label: 'Finish', value: '2B' }]) },
  { key: 'ST52', name: 'ERW Tube ST52', category: 'Tube', family: 'ST52', rank: 1, standard: 'DIN 2393 ST52 · E355', uom: 'T', kgPerUnit: 1000, marketPrice: 88000, scrapPerT: 30000, props: steel('≥ 355 MPa', '≥ 490 MPa', '≥ 22 %', [{ label: 'Process', value: 'ERW, annealed' }]) },
  { key: 'M8x25-ZP', name: 'Hex Bolt M8×25 8.8 Zn-plated', category: 'Fastener', family: 'M8x25-8.8', rank: 1, standard: 'ISO 4017 · Class 8.8', uom: 'pcs', kgPerUnit: 0.015, marketPrice: 4.3, scrapPerT: 30000, props: [{ label: 'Property class', value: '8.8' }, { label: 'Coating', value: 'Zn electroplated' }, { label: 'Salt spray', value: '96 h' }] },
  { key: 'M8x25-ZF', name: 'Hex Bolt M8×25 8.8 Zn-flake', category: 'Fastener', family: 'M8x25-8.8', rank: 2, standard: 'ISO 4017 · Class 8.8', uom: 'pcs', kgPerUnit: 0.015, marketPrice: 5.1, scrapPerT: 30000, props: [{ label: 'Property class', value: '8.8' }, { label: 'Coating', value: 'Zn flake (Geomet)' }, { label: 'Salt spray', value: '720 h' }] },
  { key: 'M10x30-ZP', name: 'Hex Bolt M10×30 8.8 Zn-plated', category: 'Fastener', family: 'M10x30-8.8', rank: 1, standard: 'ISO 4017 · Class 8.8', uom: 'pcs', kgPerUnit: 0.03, marketPrice: 6.2, scrapPerT: 30000, props: [{ label: 'Property class', value: '8.8' }, { label: 'Coating', value: 'Zn electroplated' }, { label: 'Salt spray', value: '96 h' }] },
  { key: 'M10x30-ZF', name: 'Hex Bolt M10×30 8.8 Zn-flake', category: 'Fastener', family: 'M10x30-8.8', rank: 2, standard: 'ISO 4017 · Class 8.8', uom: 'pcs', kgPerUnit: 0.03, marketPrice: 7.4, scrapPerT: 30000, props: [{ label: 'Property class', value: '8.8' }, { label: 'Coating', value: 'Zn flake (Geomet)' }, { label: 'Salt spray', value: '720 h' }] },
  { key: 'M12x40-ZF', name: 'Hex Bolt M12×40 10.9 Zn-flake', category: 'Fastener', family: 'M12x40-10.9', rank: 1, standard: 'ISO 4017 · Class 10.9', uom: 'pcs', kgPerUnit: 0.05, marketPrice: 14.8, scrapPerT: 30000, props: [{ label: 'Property class', value: '10.9' }, { label: 'Coating', value: 'Zn flake (Geomet)' }, { label: 'Salt spray', value: '720 h' }] },
  { key: 'CNMG', name: 'Carbide Insert CNMG 120408', category: 'Tooling', family: 'CNMG120408', rank: 1, standard: 'ISO 1832 · P25 grade', uom: 'pcs', kgPerUnit: 0.01, marketPrice: 460, scrapPerT: 1800000, props: [{ label: 'Grade', value: 'P25 CVD coated' }, { label: 'Nose radius', value: '0.8 mm' }, { label: 'Chipbreaker', value: 'Medium machining' }] },
]

export const MATERIAL: Record<string, Material> = Object.fromEntries(MATERIALS.map((m) => [m.key, m]))

export const DEFAULT_SETTINGS: Settings = {
  freightPerTonKm: 2.35,
  handlingPerT: 400,
  slitPerT: 1200,
  tripFixed: 6500,
  truckCapacityT: 25,
  inboundFreightPerT: 1500,
  carryingRate: 0.18,
  secondarySaleFactor: 0.55,
  surplusCoverMonths: 3,
  marketIndex: 1,
  freightIndex: 1,
  scrapIndex: 1,
  demandIndex: 1,
}

export const AGENTS = [
  { n: '01', name: 'Inventory Ingestion & Normalizer', short: 'Normalize', desc: 'Standardizes part descriptions, units and metadata across plant ERPs.' },
  { n: '02', name: 'Surplus & Aging Classifier', short: 'Classify', desc: 'Buckets stock into Active, Slow >90d, Dead >180d, Obsolete >365d.' },
  { n: '03', name: 'Material Equivalence', short: 'Equivalence', desc: 'Matches grade, gauge and width — including slitting and upgrades.' },
  { n: '04', name: 'Cross-Plant Demand Matcher', short: 'Demand match', desc: 'Correlates idle surplus with BOM runs and open PRs at sister plants.' },
  { n: '05', name: 'Logistics & Route Optimizer', short: 'Logistics', desc: 'Road distance, freight, trips and transit lead time per lane.' },
  { n: '06', name: 'Transfer Valuation', short: 'Valuation', desc: 'Transfer pricing, inter-state GST stock transfer and e-way bills.' },
  { n: '07', name: 'Scrap vs. Redeploy Optimizer', short: 'Scrap vs reuse', desc: 'Internal reuse vs. secondary sale vs. scrap liquidation.' },
  { n: '08', name: 'Alternative Scenario', short: 'Scenarios', desc: 'What-if sensitivity on prices, freight, scrap and demand.' },
  { n: '09', name: 'Engineering & Business Reasoning', short: 'Reasoning', desc: 'Plain-language rationale for every recommendation.' },
  { n: '10', name: 'Validation & Confidence', short: 'Confidence', desc: 'Green / Amber / Red on MTCs, condition and batch age.' },
]
