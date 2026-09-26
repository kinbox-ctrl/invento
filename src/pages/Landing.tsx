import { useMemo, useState } from 'react'
import {
  ArrowRight, BadgeCheck, Boxes, BrainCircuit, Check, EyeOff, FileSearch, Gauge, Layers, Lock, Recycle, Route, Scale, ScanSearch, Scissors, ShieldCheck, Sparkles, Truck,
} from 'lucide-react'
import { useStore } from '../store'
import { AGENTS, PLANT_COLOR } from '../data/catalog'
import { portfolio } from '../engine/engine'
import { inr, shortGrade, specLabel } from '../engine/format'
import { BandPill, PlantTag } from '../components/ui'
import { Logo } from '../components/Logo'

export default function Landing({ onOpen }: { onOpen: (route?: string) => void }) {
  const { state, opportunities } = useStore()
  const pf = useMemo(() => portfolio(state.inventory), [state.inventory])
  const viable = opportunities.filter((o) => o.econ.savings > 0 && o.band !== 'Red')
  const identified = viable.reduce((a, o) => a + o.econ.savings, 0)
  const [base, setBase] = useState(200)
  const [share, setShare] = useState(2)
  const released = (base * share) / 100
  const scroll = (id: string) => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' })

  return (
    <div className="lp">
      {/* ─── Nav ─── */}
      <header className="lp-nav">
        <div className="lp-wrap row-between">
          <Logo light size={34} />
          <nav className="lp-links">
            <button onClick={() => scroll('problem')}>Problem</button>
            <button onClick={() => scroll('how')}>How it works</button>
            <button onClick={() => scroll('economics')}>Economics</button>
            <button onClick={() => scroll('impact')}>Impact</button>
          </nav>
          <button className="btn primary" onClick={() => onOpen()}>Open dashboard <ArrowRight size={15} /></button>
        </div>
      </header>

      {/* ─── Hero ─── */}
      <section className="lp-hero">
        <div className="lp-grid-bg" />
        <div className="lp-wrap lp-hero-in">
          <div className="lp-hero-copy">
            <span className="lp-eyebrow"><Sparkles size={13} />AI inventory intelligence for multi-plant manufacturing</span>
            <h1>Turn idle plant stock into <span className="lp-grad">enterprise value.</span></h1>
            <p className="lp-lede">
              Invento finds steel coils, fasteners and tooling sitting idle in one plant that a sister plant is about to buy new — matches them grade-for-grade, proves the transfer economics, and routes every move for approval.
            </p>
            <div className="row wrap" style={{ gap: 12, marginTop: 28 }}>
              <button className="btn primary lp-cta" onClick={() => onOpen()}>Open live dashboard <ArrowRight size={16} /></button>
              <button className="btn lp-ghost lp-cta" onClick={() => scroll('how')}>See how it works</button>
            </div>
            <div className="lp-trust">
              <span><Check size={14} />Sits on top of SAP / ERP</span>
              <span><Check size={14} />Every transfer human-approved</span>
              <span><Check size={14} />Explainable, auditable maths</span>
            </div>
          </div>

          {/* Live preview — real numbers from the demo engine */}
          <div className="lp-preview" onClick={() => onOpen('opportunities')} role="button" tabIndex={0}>
            <div className="lp-preview-top">
              <span className="dot" /><span className="dot" /><span className="dot" />
              <span className="mono" style={{ marginLeft: 8, fontSize: 11, opacity: 0.6 }}>invento · command center</span>
              <span className="lp-live"><span className="pulse" />live</span>
            </div>
            <div className="lp-preview-kpis">
              <div><div className="l">Idle &gt; 90 days</div><div className="v">{inr(pf.idle)}</div></div>
              <div><div className="l">Savings found</div><div className="v" style={{ color: '#5eead4' }}>{inr(identified)}</div></div>
              <div><div className="l">Matches</div><div className="v">{viable.length}</div></div>
            </div>
            <div className="lp-preview-list">
              {viable.slice(0, 4).map((o, i) => (
                <div className="lp-opp" key={o.key} style={{ animationDelay: `${0.25 + i * 0.12}s` }}>
                  <div className="grow" style={{ minWidth: 0 }}>
                    <div className="row" style={{ gap: 6, fontSize: 12 }}>
                      <i className="plant-dot" style={{ background: PLANT_COLOR[o.supply.plantId] }} />{o.supply.plantId}
                      <ArrowRight size={11} style={{ opacity: 0.5 }} />
                      <i className="plant-dot" style={{ background: PLANT_COLOR[o.demand.plantId] }} />{o.demand.plantId}
                      <span style={{ opacity: 0.5 }}>· {o.mode === 'Slit' ? 'slit' : 'direct'}</span>
                    </div>
                    <div className="lp-opp-t">{shortGrade(o.supply.spec.material)} {specLabel(o.supply.spec)} → {o.demand.part}</div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div className="lp-opp-v">{inr(o.econ.savings)}</div>
                    <div style={{ fontSize: 11, opacity: 0.6 }}>{o.confidence}% conf.</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="lp-wrap lp-stats">
          <div><b>15–20%</b><span>annual carrying cost on idle stock</span></div>
          <div><b>94.2%</b><span>cash preserved on a typical coil transfer</span></div>
          <div><b>10</b><span>purpose-built agents, one decision pipeline</span></div>
          <div><b>3 weeks</b><span>to a proof of value on two plants</span></div>
        </div>
      </section>

      {/* ─── Problem ─── */}
      <section className="lp-sec" id="problem">
        <div className="lp-wrap">
          <div className="lp-head">
            <span className="lp-kicker">01 · The challenge</span>
            <h2>One enterprise. Dispersed inventory. Zero cross-plant discovery.</h2>
            <p>Plants buy fresh from the mill while identical material ages in a sister plant a few hundred kilometres away.</p>
          </div>
          <div className="lp-cards4">
            {[
              { icon: EyeOff, t: 'Isolated plant silos', d: 'Coils, fasteners and tooling idle in one division stay invisible to sister plants procuring the same spec externally.' },
              { icon: Lock, t: 'Locked working capital', d: 'Cash trapped in stock that has not moved for 90, 180 or 365 days — compounding carrying cost every month.' },
              { icon: FileSearch, t: 'Nomenclature mismatch', d: 'CR4-1.2mm-Coil-1250 in one ERP, 10004521 in another. Identical grades never meet in a manual search.' },
              { icon: Recycle, t: 'Value lost to scrap', d: 'Aging stock ends up written off or liquidated at scrap rates instead of being used at full purchase value.' },
            ].map(({ icon: Icon, t, d }) => (
              <div className="lp-card" key={t}>
                <div className="lp-icon"><Icon size={20} /></div>
                <h3>{t}</h3>
                <p>{d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── How it works ─── */}
      <section className="lp-sec lp-alt" id="how">
        <div className="lp-wrap">
          <div className="lp-head">
            <span className="lp-kicker">02 · How it works</span>
            <h2>From idle stock to an explainable transfer decision.</h2>
            <p>Deterministic engines handle ledgers, freight and valuation. AI agents handle matching, demand correlation and explanation.</p>
          </div>
          <div className="lp-steps">
            {[
              { icon: ScanSearch, t: 'Discover', d: 'Continuously scans every plant ledger, normalises part data and classifies aging velocity.' },
              { icon: Layers, t: 'Match', d: 'Maps technical equivalents by grade, gauge and width — including slitting and trimming options.' },
              { icon: Scale, t: 'Value', d: 'Calculates freight, handling, processing and GST to prove positive net savings before anything moves.' },
              { icon: ShieldCheck, t: 'Approve', d: 'Plant heads and QA approve every transfer. Receipts feed actuals back to sharpen the next estimate.' },
            ].map(({ icon: Icon, t, d }, i) => (
              <div className="lp-step" key={t}>
                <div className="lp-step-n">{String(i + 1).padStart(2, '0')}</div>
                <div className="lp-icon"><Icon size={20} /></div>
                <h3>{t}</h3>
                <p>{d}</p>
              </div>
            ))}
          </div>
          <div className="lp-agents">
            {AGENTS.map((a) => (
              <div className="lp-agent" key={a.n}>
                <span className="mono">{a.n}</span>
                <div>
                  <b>{a.name}</b>
                  <p>{a.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Equivalence ─── */}
      <section className="lp-sec">
        <div className="lp-wrap lp-split">
          <div className="lp-head" style={{ textAlign: 'left', margin: 0 }}>
            <span className="lp-kicker">03 · Material intelligence</span>
            <h2>Eliminating part-number silos.</h2>
            <p><b>Mode A — direct match:</b> finds identical grade and dimension behind different local nomenclature.</p>
            <p><b>Mode B — substitution & sizing:</b> finds where slitting, trimming or a grade upgrade lets surplus satisfy a smaller part more cheaply than a fresh mill order.</p>
            <button className="btn primary" style={{ marginTop: 12 }} onClick={() => onOpen('inventory')}>Explore the normalised ledger <ArrowRight size={15} /></button>
          </div>
          <div className="lp-match">
            <div className="lp-match-row">
              <div className="lp-part">
                <PlantTag id="MNS" />
                <span className="mono">CR4-1.2mm-Coil-1250</span>
                <small>Idle 214 days · 42.5 T</small>
              </div>
              <div className="lp-eq"><span>≡</span></div>
              <div className="lp-part">
                <PlantTag id="PNE" />
                <span className="mono">RM-CR-CR4-1.20-620</span>
                <small>Needed in 24 days · 20 T</small>
              </div>
            </div>
            <div className="lp-match-body">
              {[
                ['Material', 'CR4 cold-rolled · IS 513 / DC04'],
                ['Verification', 'Yield, elongation, surface finish match drawing'],
                ['Processing', <span className="row" style={{ gap: 6 }}><Scissors size={13} />Slit 1250 mm → 2 × 620 mm · 99.2% yield</span>],
                ['Confidence', <BandPill band="Green" score={95} />],
              ].map(([k, v]) => (
                <div className="row-between" key={String(k)} style={{ padding: '10px 0', borderBottom: '1px solid var(--line)', fontSize: 13.5 }}>
                  <span className="muted">{k}</span><span style={{ fontWeight: 560, textAlign: 'right' }}>{v}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ─── Economics ─── */}
      <section className="lp-sec lp-dark" id="economics">
        <div className="lp-wrap">
          <div className="lp-head">
            <span className="lp-kicker">04 · Transfer economics</span>
            <h2>Fully transparent. Every rupee accounted for.</h2>
            <p>Worked example: 20 tonnes of CR4 steel coil needed at Pune.</p>
          </div>
          <div className="lp-econ">
            <div className="lp-route">
              <div className="lp-route-h"><Truck size={18} />Route A · External new buy</div>
              <Row k="Base material" v="₹85,000 / T" />
              <Row k="Freight & handling" v="₹1,500 / T" />
              <Row k="Processing" v="₹0 / T" />
              <div className="lp-bar"><i style={{ width: '100%', background: 'rgba(255,255,255,.28)' }} /></div>
              <Row k="Total for 20 T" v="₹17,30,000" strong />
            </div>
            <div className="lp-route win">
              <div className="lp-route-h"><Route size={18} />Route B · Inter-plant transfer</div>
              <Row k="Base material" v="₹0 / T (sunk at Manesar)" />
              <Row k="Freight & handling" v="₹3,800 / T" />
              <Row k="Slitting" v="₹1,200 / T" />
              <div className="lp-bar"><i style={{ width: '5.8%', background: '#2dd4bf' }} /></div>
              <Row k="Total for 20 T" v="₹1,00,000" strong />
            </div>
            <div className="lp-result">
              <div className="lp-result-v">₹16,30,000</div>
              <div>net enterprise capital recovered</div>
              <div className="lp-result-p">94.2% cash preserved</div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── Impact ─── */}
      <section className="lp-sec" id="impact">
        <div className="lp-wrap lp-split">
          <div className="lp-head" style={{ textAlign: 'left', margin: 0 }}>
            <span className="lp-kicker">05 · Business impact</span>
            <h2>Small redeployment shares, large annual value.</h2>
            <p>Adjust the group inventory base and the share of surplus redeployed to see the illustrative annual impact.</p>
            <div className="stack" style={{ gap: 18, marginTop: 20, maxWidth: 420 }}>
              <div className="slider">
                <div className="slider-top"><span className="ink2">Group inventory base</span><b>₹{base} Cr</b></div>
                <input type="range" min={50} max={1000} step={10} value={base} onChange={(e) => setBase(+e.target.value)} aria-label="Inventory base" />
              </div>
              <div className="slider">
                <div className="slider-top"><span className="ink2">Surplus redeployed</span><b>{share}%</b></div>
                <input type="range" min={0.5} max={5} step={0.5} value={share} onChange={(e) => setShare(+e.target.value)} aria-label="Share redeployed" />
              </div>
            </div>
          </div>
          <div className="lp-impact">
            <div className="lp-impact-card hero">
              <Boxes size={20} />
              <div className="v">₹{released.toFixed(2)} Cr</div>
              <div className="l">working capital released / year</div>
            </div>
            <div className="lp-impact-card">
              <Gauge size={20} />
              <div className="v">{inr(released * 1e7 * 0.18)}</div>
              <div className="l">carrying cost avoided at 18% p.a.</div>
            </div>
            <div className="lp-impact-card">
              <Recycle size={20} />
              <div className="v">{inr(released * 1e7 * 0.125)}</div>
              <div className="l">scrap liquidation uplift</div>
            </div>
            <div className="lp-impact-list">
              <span><BadgeCheck size={15} />Less exposure to spot-market price swings</span>
              <span><BadgeCheck size={15} />Faster turnaround from sister-plant stock vs. mill lead times</span>
              <span><BadgeCheck size={15} />Central visibility stops duplicate bulk purchases</span>
            </div>
          </div>
        </div>
      </section>

      {/* ─── CTA ─── */}
      <section className="lp-sec" style={{ paddingTop: 0 }}>
        <div className="lp-wrap">
          <div className="lp-final">
            <div>
              <span className="lp-eyebrow" style={{ background: 'rgba(45,212,191,.14)' }}><BrainCircuit size={13} />Decision support, not black-box automation</span>
              <h2>Start with a 3-week proof of value.</h2>
              <p>Two plants. Non-moving stock older than 90 days and the next 60 days of BOM and PO demand. Target: ₹50 L+ of high-confidence redeployment opportunities at &gt;95% technical equivalence accuracy.</p>
            </div>
            <div className="stack" style={{ gap: 10, alignItems: 'stretch', minWidth: 240 }}>
              <button className="btn primary lp-cta" onClick={() => onOpen()}>Open live dashboard <ArrowRight size={16} /></button>
              <button className="btn lp-ghost lp-cta" onClick={() => onOpen('scenarios')}>Try the what-if engine</button>
            </div>
          </div>
        </div>
      </section>

      <footer className="lp-foot">
        <div className="lp-wrap row-between wrap" style={{ gap: 12 }}>
          <Logo />
          <span className="muted" style={{ fontSize: 12.5 }}>Cross-plant inventory intelligence & redeployment · demo data shown</span>
        </div>
      </footer>
    </div>
  )
}

function Row({ k, v, strong }: { k: string; v: string; strong?: boolean }) {
  return (
    <div className="row-between" style={{ padding: '8px 0', fontSize: strong ? 15 : 13.5, fontWeight: strong ? 700 : 450, borderTop: strong ? '1px dashed rgba(255,255,255,.2)' : undefined, marginTop: strong ? 6 : 0 }}>
      <span style={{ opacity: strong ? 1 : 0.7 }}>{k}</span>
      <span className="tnum">{v}</span>
    </div>
  )
}
