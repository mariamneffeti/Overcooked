import { useEffect, useRef, useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Activity, ArrowUpRight, Globe, Wifi, WifiOff, RefreshCw, Database, Rss } from 'lucide-react'
import Link from 'next/link'

interface GeoRegion  { region: string; active_signals: number; avg_velocity: number; top_topic: string }
interface Alert      { signal_id: string; title: string; source: string; category: string; region: string; velocity_score: number; pre_viral: boolean; timestamp_ms: number }

const CAT_COLORS: Record<string, string> = {
  politics: 'hsl(var(--magma))', tech: 'hsl(var(--primary))', culture: 'hsl(280 87% 65%)',
  sports: 'hsl(142 70% 50%)', economy: 'hsl(var(--amber))', entertainment: 'hsl(30 90% 60%)', general: 'hsl(var(--muted-foreground))',
}

function velColor(v: number) {
  if (v >= 85) return 'hsl(var(--magma))'
  if (v >= 70) return 'hsl(var(--amber))'
  return 'hsl(var(--primary))'
}

function timeAgo(ms: number) {
  const d = (Date.now() - ms) / 1000
  if (d < 10) return 'live'
  if (d < 60) return `${Math.floor(d)}s ago`
  if (d < 3600) return `${Math.floor(d / 60)}m ago`
  return `${Math.floor(d / 3600)}h ago`
}

export default function RadarPage() {
  const [geo,     setGeo]     = useState<GeoRegion[]>([])
  const [alerts,  setAlerts]  = useState<Alert[]>([])
  const [loading, setLoading] = useState(true)
  const [sseStatus, setSseStatus] = useState<'connecting'|'live'|'offline'>('connecting')
  const [lastLiveTs, setLastLiveTs] = useState<number>(0)
  const [seeding,  setSeeding]  = useState(false)
  const [seedMsg,  setSeedMsg]  = useState<string | null>(null)
  const [scraping, setScraping] = useState(false)
  const [scrapeMsg, setScrapeMsg] = useState<string | null>(null)
  const [liveFlash, setLiveFlash] = useState(false)
  const esSrc = useRef<EventSource | null>(null)

  const loadData = useCallback(async () => {
    const [g, ad] = await Promise.all([
      fetch('/api/v1/pulse/geo').then(r => r.json()).catch(() => []),
      fetch('/api/v1/pulse/alerts?limit=20').then(r => r.json()).catch(() => ({ alerts: [] })),
    ])
    setGeo(Array.isArray(g) ? g : [])
    const rawAlerts: Alert[] = ad.alerts ?? []
    const seen = new Set<string>()
    setAlerts(rawAlerts.filter(a => { if (seen.has(a.signal_id)) return false; seen.add(a.signal_id); return true }))
    setLoading(false)
  }, [])

  /* ─── SSE ──────────────────────────────────────────────────────── */
  useEffect(() => {
    loadData()
    const pollId = setInterval(loadData, 10000)

    const connect = () => {
      if (esSrc.current) { esSrc.current.close() }
      const es = new EventSource('/api/v1/pulse/live')
      esSrc.current = es
      setSseStatus('connecting')

      es.onopen = () => setSseStatus('live')
      es.addEventListener('signal', (evt: MessageEvent) => {
        try {
          const sig = JSON.parse(evt.data)
          setAlerts(prev => {
            const exists = prev.find(a => a.signal_id === (sig.id ?? sig.signal_id))
            if (exists) return prev
            return [{ ...sig, signal_id: sig.id ?? sig.signal_id, pre_viral: (sig.velocity_score ?? 0) >= 80 }, ...prev].slice(0, 20)
          })
          setLastLiveTs(Date.now())
          setLiveFlash(true)
          setTimeout(() => setLiveFlash(false), 600)
        } catch {}
      })
      es.onerror = () => {
        setSseStatus('offline')
        es.close()
        setTimeout(connect, 5000)
      }
    }
    connect()

    return () => {
      clearInterval(pollId)
      esSrc.current?.close()
    }
  }, [loadData])

  /* ─── Seed data ─────────────────────────────────────────────────── */
  const handleSeed = async () => {
    setSeeding(true); setSeedMsg(null)
    try {
      const res = await fetch('/api/v1/ingest/seed', { method: 'POST' })
      const data = await res.json()
      setSeedMsg(`Seeded ${data.seeded} signals across ${data.regions} regions.`)
      await loadData()
    } catch (e) { setSeedMsg('Seed failed — check backend.') }
    finally { setSeeding(false); setTimeout(() => setSeedMsg(null), 6000) }
  }

  /* ─── Live scrape ─────────────────────────────────────────────── */
  const handleScrape = async () => {
    setScraping(true); setScrapeMsg(null)
    try {
      const res = await fetch('/api/v1/ingest/scrape', { method: 'POST' })
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      const label = data.status === 'live'
        ? `${data.scraped} live trends pulled from Google Trends TN.`
        : `${data.scraped} synthetic MENA pulse signals injected (Google Trends unreachable).`
      setScrapeMsg(label)
      await loadData()
    } catch (e: any) {
      setScrapeMsg(e.message?.includes('Network') || e.message?.includes('fetch')
        ? 'Network error — ensure backend is running.'
        : (e.message ?? 'Scrape failed.'))
    }
    finally { setScraping(false); setTimeout(() => setScrapeMsg(null), 8000) }
  }

  const sorted = [...alerts].sort((a, b) => b.velocity_score - a.velocity_score)

  return (
    <div className="flex-1 grid grid-cols-1 xl:grid-cols-[1fr_360px] gap-4 p-4 pb-24">

      {/* Left — geo panel */}
      <div className="space-y-4 min-h-0">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <div className="font-mono text-[10px] tracking-[0.3em] text-muted-foreground">// TACTICAL_RADAR</div>
            <h1 className="text-3xl font-bold tracking-tight mt-1">
              Tunisia <span className="text-gradient-cyan">Live Signal Map</span>
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Real-time trend triangulation across 6 MENA regions.
            </p>
          </div>

          {/* Controls */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* SSE status badge */}
            <div className={`flex items-center gap-1.5 font-mono text-[10px] px-2.5 py-1.5 rounded-full border transition-colors ${
              sseStatus === 'live' ? 'border-green-500/30' : sseStatus === 'connecting' ? 'border-amber-500/30' : 'border-red-500/30'
            }`}
            style={{
              color: sseStatus === 'live' ? 'hsl(142 70% 50%)' : sseStatus === 'connecting' ? 'hsl(43 96% 56%)' : 'hsl(344 100% 59%)',
              background: sseStatus === 'live' ? 'hsl(142 70% 50% / 0.08)' : sseStatus === 'connecting' ? 'hsl(43 96% 56% / 0.08)' : 'hsl(344 100% 59% / 0.08)',
            }}>
              {sseStatus === 'live' ? <><Wifi className="h-3 w-3" /><motion.span animate={liveFlash ? { opacity: [1, 0.3, 1] } : {}}>LIVE</motion.span></> :
               sseStatus === 'connecting' ? <><RefreshCw className="h-3 w-3 animate-spin" /> CONNECTING</> :
               <><WifiOff className="h-3 w-3" /> OFFLINE</>}
            </div>

            {/* Seed button */}
            <button onClick={handleSeed} disabled={seeding || scraping}
              className="flex items-center gap-1.5 font-mono text-[10px] px-2.5 py-1.5 rounded-full border transition-colors disabled:opacity-50"
              style={{ color: 'hsl(var(--primary))', borderColor: 'hsl(var(--primary) / 0.3)', background: 'hsl(var(--primary) / 0.06)' }}>
              {seeding ? <RefreshCw className="h-3 w-3 animate-spin" /> : <Database className="h-3 w-3" />}
              {seeding ? 'Seeding…' : 'Seed Data'}
            </button>

            {/* Live scrape button */}
            <button onClick={handleScrape} disabled={scraping || seeding}
              className="flex items-center gap-1.5 font-mono text-[10px] px-2.5 py-1.5 rounded-full border transition-colors disabled:opacity-50"
              style={{ color: 'hsl(344 100% 59%)', borderColor: 'hsl(344 100% 59% / 0.3)', background: 'hsl(344 100% 59% / 0.06)' }}>
              {scraping
                ? <><RefreshCw className="h-3 w-3 animate-spin" /> Scraping…</>
                : <><Rss className="h-3 w-3" /> Scrape Live</>
              }
            </button>
          </div>
        </div>

        {/* Feedback banners */}
        <AnimatePresence>
          {seedMsg && (
            <motion.div key="seed-msg" initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              className="font-mono text-[11px] px-3 py-2 rounded-lg border"
              style={{ color: 'hsl(142 70% 50%)', borderColor: 'hsl(142 70% 50% / 0.3)', background: 'hsl(142 70% 50% / 0.06)' }}>
              ✓ {seedMsg}
            </motion.div>
          )}
          {scrapeMsg && (
            <motion.div key="scrape-msg" initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              className="font-mono text-[11px] px-3 py-2 rounded-lg border flex items-start gap-2"
              style={{
                color: scrapeMsg.toLowerCase().includes('fail') || scrapeMsg.toLowerCase().includes('error')
                  ? 'hsl(344 100% 59%)' : 'hsl(142 70% 50%)',
                borderColor: scrapeMsg.toLowerCase().includes('fail') || scrapeMsg.toLowerCase().includes('error')
                  ? 'hsl(344 100% 59% / 0.3)' : 'hsl(142 70% 50% / 0.3)',
                background: scrapeMsg.toLowerCase().includes('fail') || scrapeMsg.toLowerCase().includes('error')
                  ? 'hsl(344 100% 59% / 0.06)' : 'hsl(142 70% 50% / 0.06)',
              }}>
              <Rss className="h-3 w-3 mt-0.5 shrink-0" />
              {scrapeMsg}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Geo grid */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {loading
            ? Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="glass rounded-2xl p-4 h-28 animate-pulse" style={{ opacity: 0.4 }} />
              ))
            : [...geo].sort((a, b) => b.avg_velocity - a.avg_velocity).map((r, i) => (
                <motion.div
                  key={r.region}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.06 }}
                  className="glass glass-hover rounded-2xl p-4 relative overflow-hidden"
                  style={{ borderColor: `${velColor(r.avg_velocity)}30` }}
                >
                  <div className="absolute -top-8 -right-8 h-24 w-24 rounded-full pointer-events-none"
                       style={{ background: `${velColor(r.avg_velocity)}12`, filter: 'blur(16px)' }} />
                  <div className="relative">
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <span className="font-mono text-[10px] tracking-[0.2em] text-muted-foreground flex items-center gap-1">
                        <Globe className="h-3 w-3" /> {r.region}
                      </span>
                      <span className="font-mono text-[10px] px-1.5 py-0.5 rounded border"
                            style={{ color: velColor(r.avg_velocity), borderColor: `${velColor(r.avg_velocity)}50`, background: `${velColor(r.avg_velocity)}12` }}>
                        {r.avg_velocity.toFixed(1)}
                      </span>
                    </div>
                    <div className="font-semibold text-sm leading-snug mb-2">{r.top_topic}</div>
                    <div className="h-1 rounded-full overflow-hidden" style={{ background: 'hsl(var(--border))' }}>
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${r.avg_velocity}%` }}
                        transition={{ duration: 0.8, delay: i * 0.06 }}
                        className="h-full rounded-full"
                        style={{ background: `linear-gradient(90deg, ${velColor(r.avg_velocity)}, ${velColor(r.avg_velocity)}99)` }}
                      />
                    </div>
                    <div className="font-mono text-[10px] text-muted-foreground mt-2">
                      {r.active_signals} active signal{r.active_signals !== 1 ? 's' : ''}
                    </div>
                  </div>
                </motion.div>
              ))
          }
        </div>
      </div>

      {/* Right — live signals list */}
      <aside className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="font-mono text-[10px] tracking-[0.3em] text-muted-foreground">// LIVE_SIGNALS</div>
          <div className="font-mono text-[10px] text-muted-foreground tabular-nums flex items-center gap-1.5">
            <Activity className="h-3 w-3" style={{ color: 'hsl(var(--primary))' }} />
            {sorted.length} active
            {lastLiveTs > 0 && (
              <span className="text-[9px] ml-1" style={{ color: 'hsl(142 70% 50%)' }}>
                · updated {timeAgo(lastLiveTs)}
              </span>
            )}
          </div>
        </div>

        <div className="space-y-2.5">
          {loading
            ? Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="glass rounded-xl p-4 h-24 animate-pulse" style={{ opacity: 0.4 }} />
              ))
            : sorted.map((a, i) => (
                <motion.div
                  key={a.signal_id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.04 }}
                  layout
                >
                  <Link href="/intel" className="block w-full text-left glass glass-hover rounded-xl p-4 group">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-mono text-[10px] px-1.5 py-0.5 rounded border border-white/10"
                                style={{ color: 'hsl(var(--muted-foreground))', background: 'hsl(0 0% 100% / 0.04)' }}>
                            {a.category}
                          </span>
                          {a.pre_viral && (
                            <span className="font-mono text-[10px] px-1.5 py-0.5 rounded border"
                                  style={{ color: 'hsl(var(--magma))', borderColor: 'hsl(var(--magma) / 0.5)', background: 'hsl(var(--magma) / 0.1)' }}>
                              PRE-VIRAL
                            </span>
                          )}
                        </div>
                        <div className="font-semibold text-sm leading-snug mt-1.5 truncate">{a.title}</div>
                        <div className="font-mono text-[11px] text-muted-foreground mt-0.5">
                          {a.region} · {a.source} · {timeAgo(a.timestamp_ms)}
                        </div>
                      </div>
                      <ArrowUpRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors shrink-0" />
                    </div>
                    <div className="flex items-center gap-4 mt-3 font-mono text-[10px]">
                      <div className="flex items-center gap-1" style={{ color: 'hsl(var(--primary))' }}>
                        <Activity className="h-3 w-3" /> v {a.velocity_score.toFixed(1)}%
                      </div>
                      <div className="ml-auto text-muted-foreground capitalize"
                           style={{ color: CAT_COLORS[a.category] ?? 'hsl(var(--muted-foreground))' }}>
                        {a.category}
                      </div>
                    </div>
                    <div className="mt-2 h-1 rounded-full overflow-hidden" style={{ background: 'hsl(0 0% 100% / 0.05)' }}>
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${a.velocity_score}%` }}
                        transition={{ duration: 0.8, delay: i * 0.04 }}
                        className="h-full rounded-full"
                        style={{
                          background: a.pre_viral
                            ? 'linear-gradient(90deg, hsl(var(--magma)), hsl(var(--magma-glow)))'
                            : 'linear-gradient(90deg, hsl(var(--primary)), hsl(var(--primary-glow)))',
                        }}
                      />
                    </div>
                  </Link>
                </motion.div>
              ))
          }
        </div>
      </aside>
    </div>
  )
}
