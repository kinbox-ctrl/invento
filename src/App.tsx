import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  ArrowLeftRight, Boxes, Bot, CheckCircle2, ClipboardList, Gauge, Info, Menu, Moon, Network, RefreshCw, Search, Settings2, SlidersHorizontal, Sparkles, Sun, TriangleAlert,
} from 'lucide-react'
import { useStore } from './store'
import { AGENTS, MATERIAL, PLANT } from './data/catalog'
import { specLabel, shortGrade, timeAgo } from './engine/format'
import Dashboard from './pages/Dashboard'
import Inventory from './pages/Inventory'
import DemandPage from './pages/Demand'
import Opportunities from './pages/Opportunities'
import Transfers from './pages/Transfers'
import Scenarios from './pages/Scenarios'
import NetworkPage from './pages/Network'
import Copilot from './pages/Copilot'
import SettingsPage from './pages/Settings'
import Landing from './pages/Landing'
import { Logo } from './components/Logo'

export type Route = 'landing' | 'dashboard' | 'inventory' | 'demand' | 'opportunities' | 'transfers' | 'scenarios' | 'network' | 'copilot' | 'settings'
export interface Nav { go: (r: Route, param?: string) => void; param?: string; scanStep: number | null; runScan: () => void }

const ROUTES: { id: Route; label: string; icon: typeof Gauge; group: string; title: string; crumb: string }[] = [
  { id: 'dashboard', label: 'Command Center', icon: Gauge, group: 'Overview', title: 'Command Center', crumb: 'Group-wide inventory intelligence' },
  { id: 'inventory', label: 'Inventory', icon: Boxes, group: 'Operate', title: 'Cross-Plant Inventory', crumb: 'Normalized ledger across all plants' },
  { id: 'demand', label: 'Demand', icon: ClipboardList, group: 'Operate', title: 'Demand & Requisitions', crumb: 'BOM runs and open PRs, next 60 days' },
  { id: 'opportunities', label: 'Redeployment', icon: Sparkles, group: 'Operate', title: 'Redeployment Opportunities', crumb: 'AI-matched surplus → sister-plant demand' },
  { id: 'transfers', label: 'Transfers', icon: ArrowLeftRight, group: 'Operate', title: 'Inter-Plant Transfers', crumb: 'Approval → QA → dispatch → receipt' },
  { id: 'scenarios', label: 'What-If Scenarios', icon: SlidersHorizontal, group: 'Analyze', title: 'What-If Scenarios', crumb: 'Sensitivity across price, freight, scrap & demand' },
  { id: 'network', label: 'Plant Network', icon: Network, group: 'Analyze', title: 'Plant Network', crumb: 'Lanes, distances and plant health' },
  { id: 'copilot', label: 'Copilot', icon: Bot, group: 'Analyze', title: 'Supply Chain Copilot', crumb: 'Ask about group-wide inventory' },
  { id: 'settings', label: 'Assumptions', icon: Settings2, group: 'System', title: 'Assumptions & Agents', crumb: 'Engine parameters, agents and data' },
]

function readHash(): { route: Route; param?: string } {
  const [r, p] = window.location.hash.replace(/^#\/?/, '').split('/')
  if (!r) return { route: 'landing' }
  const route = (ROUTES.find((x) => x.id === r)?.id ?? 'dashboard') as Route
  return { route, param: p ? decodeURIComponent(p) : undefined }
}

export default function App() {
  const { state, dispatch, opportunities, toasts, toast } = useStore()
  const [{ route, param }, setLoc] = useState(readHash)
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    try { return (localStorage.getItem('invento:theme') as 'light' | 'dark') ?? 'light' } catch { return 'light' }
  })
  const [navOpen, setNavOpen] = useState(false)
  const [scanStep, setScanStep] = useState<number | null>(null)
  const [q, setQ] = useState('')
  const [searchOpen, setSearchOpen] = useState(false)
  const searchRef = useRef<HTMLInputElement>(null)
  const contentRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const h = () => setLoc(readHash())
    window.addEventListener('hashchange', h)
    return () => window.removeEventListener('hashchange', h)
  }, [])
  useEffect(() => {
    document.documentElement.dataset.theme = theme
    try { localStorage.setItem('invento:theme', theme) } catch { /* ignore */ }
  }, [theme])
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        searchRef.current?.focus()
      }
    }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [])

  const go = useCallback((r: Route, p?: string) => {
    window.location.hash = `/${r}${p ? `/${encodeURIComponent(p)}` : ''}`
    setNavOpen(false)
    contentRef.current?.scrollTo({ top: 0 })
  }, [])

  const runScan = useCallback(() => {
    if (scanStep != null) return
    let i = 0
    setScanStep(0)
    const tick = () => {
      i++
      if (i >= AGENTS.length) {
        setScanStep(null)
        dispatch({ type: 'scan' })
        toast('Scan complete — 10 agents ran across 5 plants', 'good')
        return
      }
      setScanStep(i)
      setTimeout(tick, 260)
    }
    setTimeout(tick, 260)
  }, [scanStep, dispatch, toast])

  const nav: Nav = { go, param, scanStep, runScan }
  const meta = ROUTES.find((r) => r.id === route) ?? ROUTES[0]
  const pendingQA = state.transfers.filter((t) => t.status === 'Pending QA' || t.status === 'Approved').length

  const results = useMemo(() => {
    const s = q.trim().toLowerCase()
    if (!s) return []
    const inv = state.inventory
      .filter((i) => `${i.localPartNo} ${i.localDesc} ${MATERIAL[i.spec.material].name} ${PLANT[i.plantId].name} ${specLabel(i.spec)}`.toLowerCase().includes(s))
      .slice(0, 6)
      .map((i) => ({ id: i.id, kind: 'Inventory', title: `${shortGrade(i.spec.material)} ${specLabel(i.spec)}`, sub: `${PLANT[i.plantId].name} · ${i.localPartNo}`, go: () => go('inventory', i.id) }))
    const dm = state.demand
      .filter((d) => `${d.part} ${d.program} ${MATERIAL[d.spec.material].name} ${PLANT[d.plantId].name}`.toLowerCase().includes(s))
      .slice(0, 4)
      .map((d) => ({ id: d.id, kind: 'Demand', title: d.part, sub: `${PLANT[d.plantId].name} · ${d.program}`, go: () => go('demand', d.id) }))
    return [...inv, ...dm]
  }, [q, state.inventory, state.demand, go])

  if (route === 'landing') return <Landing onOpen={(r) => go((r as Route) ?? 'dashboard')} />

  let lastGroup = ''
  return (
    <div className="shell">
      <nav className="nav" style={navOpen ? { display: 'flex', position: 'fixed', inset: '0 auto 0 0', width: 260, zIndex: 50 } : undefined}>
        <div className="logo" onClick={() => { window.location.hash = '' }} style={{ cursor: 'pointer' }} title="Back to home">
          <Logo size={34} light sub="Inventory Intelligence" />
        </div>
        {ROUTES.map((r) => {
          const header = r.group !== lastGroup ? <div className="nav-group" key={`g-${r.group}`}>{r.group}</div> : null
          lastGroup = r.group
          const Icon = r.icon
          const count = r.id === 'opportunities' ? opportunities.filter((o) => o.band !== 'Red').length : r.id === 'transfers' ? pendingQA : null
          return (
            <div key={r.id}>
              {header}
              <button className={`nav-item ${route === r.id ? 'active' : ''}`} onClick={() => go(r.id)}>
                <Icon size={17} strokeWidth={1.9} />
                {r.label}
                {count ? <span className={`nav-count ${r.id === 'transfers' ? 'warn' : ''}`}>{count}</span> : null}
              </button>
            </div>
          )
        })}
        <div className="nav-foot">
          <div className="row" style={{ marginBottom: 4 }}>
            <span className="pulse" />
            <b>Engine live</b>
          </div>
          5 plants · {state.inventory.length} ledger lines
          <br />
          Last scan {timeAgo(state.lastScan)}
        </div>
      </nav>
      {navOpen && <div className="scrim" style={{ zIndex: 49 }} onClick={() => setNavOpen(false)} />}

      <div className="main">
        <header className="topbar">
          <button className="btn icon ghost mobile-only" onClick={() => setNavOpen(true)} aria-label="Menu">
            <Menu size={18} />
          </button>
          <div style={{ minWidth: 0 }}>
            <div className="crumb">{meta.crumb}</div>
            <h1 className="page-title">{meta.title}</h1>
          </div>
          <div className="search" style={{ position: 'relative' }}>
            <Search size={15} />
            <input
              ref={searchRef}
              placeholder="Search parts, grades, plants…"
              value={q}
              onChange={(e) => { setQ(e.target.value); setSearchOpen(true) }}
              onFocus={() => setSearchOpen(true)}
              onBlur={() => setTimeout(() => setSearchOpen(false), 150)}
              aria-label="Search"
            />
            <span className="kbd">⌘K</span>
            {searchOpen && q && (
              <div className="card" style={{ position: 'absolute', top: 'calc(100% + 6px)', left: 0, right: 0, zIndex: 20, boxShadow: 'var(--shadow)', padding: 6, maxHeight: 380, overflowY: 'auto' }}>
                {results.length === 0 && <div className="muted" style={{ padding: 10, fontSize: 13 }}>No matches for “{q}”</div>}
                {results.map((r) => (
                  <button
                    key={r.id}
                    onMouseDown={() => { r.go(); setQ('') }}
                    style={{ display: 'flex', width: '100%', textAlign: 'left', gap: 10, alignItems: 'center', padding: '8px 10px', border: 0, background: 'none', borderRadius: 7 }}
                    className="search-hit"
                  >
                    <span className="pill neutral" style={{ minWidth: 72, justifyContent: 'center' }}>{r.kind}</span>
                    <span className="grow">
                      <div style={{ fontWeight: 560, color: 'var(--ink)', fontSize: 13 }}>{r.title}</div>
                      <div className="muted" style={{ fontSize: 12 }}>{r.sub}</div>
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
          <button className="btn" onClick={runScan} disabled={scanStep != null}>
            <RefreshCw size={15} className={scanStep != null ? 'spin' : ''} />
            {scanStep != null ? `Agent ${AGENTS[scanStep].n}…` : 'Run scan'}
          </button>
          <button className="btn icon ghost" onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')} aria-label="Toggle theme">
            {theme === 'light' ? <Moon size={17} /> : <Sun size={17} />}
          </button>
          <div className="avatar" title="V. Sharma — Group SCM">VS</div>
        </header>

        <div className="content" ref={contentRef}>
          {route === 'dashboard' && <Dashboard nav={nav} />}
          {route === 'inventory' && <Inventory nav={nav} />}
          {route === 'demand' && <DemandPage nav={nav} />}
          {route === 'opportunities' && <Opportunities nav={nav} />}
          {route === 'transfers' && <Transfers nav={nav} />}
          {route === 'scenarios' && <Scenarios nav={nav} />}
          {route === 'network' && <NetworkPage nav={nav} />}
          {route === 'copilot' && <Copilot nav={nav} />}
          {route === 'settings' && <SettingsPage nav={nav} />}
        </div>
      </div>

      <div className="toast-stack" aria-live="polite">
        {toasts.map((t) => (
          <div className="toast" key={t.id}>
            {t.tone === 'good' ? <CheckCircle2 size={17} color="#5eead4" /> : t.tone === 'warn' ? <TriangleAlert size={17} color="#fcd34d" /> : <Info size={17} color="#93c5fd" />}
            {t.text}
          </div>
        ))}
      </div>
    </div>
  )
}
