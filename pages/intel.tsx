import { useEffect, useState, FormEvent } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowLeft, Brain, Search, Network, MessageSquare, RotateCw } from 'lucide-react'
import Link from 'next/link'

interface Heatmap {
  signal_id: string; topic: string
  yt_sensationalism_score: number; trends_alignment_score: number
  institutional_gap_score: number; composite_score: number
  intensity_label: string; blindspot_detected: boolean
  blindspot_reason: string; outlier_outlet: string | null
}

interface EmotionResult {
  topic: string; dominant_emotion: string
  emotion_scores: Record<string, number>; sample_size: number
}

interface LifecycleResult {
  signal_id: string; topic: string; current_phase: string
  current_velocity: number; hours_to_peak: number; peak_velocity: number
  half_life_hours: number; dead_in_hours: number
  chart_timestamps: number[]; chart_velocities: number[]
  chart_is_forecast: boolean[]
}

interface NarrativeNode {
  node_id: string; narrative: string; cluster_size: number
  top_sources: string[]; avg_velocity: number; similarity: number
}

interface Alert {
  signal_id: string; title: string; source: string; category: string
  region: string; velocity_score: number; pre_viral: boolean; timestamp_ms: number
}

const INTENSITY: Record<string, { color: string; label: string; bg: string }> = {
  hot_red:   { color: 'hsl(344 100% 59%)',  label: 'HOT RED — Sensationalism risk', bg: 'hsl(344 100% 59% / 0.12)' },
  cool_blue: { color: 'hsl(187 92% 53%)',   label: 'COOL BLUE — Trends-dominant',   bg: 'hsl(187 92% 53% / 0.12)' },
  neutral:   { color: 'hsl(215 20% 55%)',   label: 'NEUTRAL — Balanced signal',     bg: 'hsl(215 20% 55% / 0.08)' },
}

const EMOTION_COLORS: Record<string, string> = {
  outrage: 'hsl(344 100% 59%)',
  fear:    'hsl(30 90% 60%)',
  humor:   'hsl(142 70% 50%)',
  pride:   'hsl(187 92% 53%)',
  hope:    'hsl(280 87% 65%)',
  sadness: 'hsl(215 60% 55%)',
}

const PHASE_COLORS: Record<string, string> = {
  emerging: 'hsl(142 70% 50%)', accelerating: 'hsl(187 92% 53%)',
  peak: 'hsl(43 96% 56%)', declining: 'hsl(30 90% 60%)',
  fading: 'hsl(344 100% 59%)', dead: 'hsl(215 20% 40%)',
}

function Meter({ label, value, color }: { label: string; value: number; color: string }) {
  const pct = Math.min(100, Math.round(Math.abs(value) * 100))
  return (
    <div className="space-y-1.5">
      <div className="flex justify-between font-mono text-[10px]">
        <span className="text-muted-foreground">{label}</span>
        <span className="tabular-nums" style={{ color }}>{pct}%</span>
      </div>
      <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'hsl(0 0% 100% / 0.06)' }}>
        <motion.div initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ duration: 0.8 }}
          className="h-full rounded-full" style={{ background: color }} />
      </div>
    </div>
  )
}

/* ─── 2D BIAS HEATMAP ──────────────────────────────────────────────── */
function BiasHeatmap2D({ data }: { data: Heatmap }) {
  const yt = Math.abs(data.yt_sensationalism_score)
  const align = data.trends_alignment_score
  const dotX = Math.min(0.93, Math.max(0.05, yt))
  const dotY = Math.min(0.93, Math.max(0.05, (1 - align) / 2))

  const dotColor = INTENSITY[data.intensity_label]?.color ?? 'hsl(187 92% 53%)'

  return (
    <div className="space-y-3">
      <div className="font-mono text-[10px] tracking-[0.3em] text-muted-foreground">// BIAS_SPECTRUM_2D</div>
      <div className="relative rounded-xl overflow-hidden"
           style={{ background: 'hsl(0 0% 0% / 0.3)', aspectRatio: '1/1', maxHeight: 260, border: '1px solid hsl(0 0% 100% / 0.08)' }}>
        {/* Quadrant backgrounds */}
        <div className="absolute inset-0 grid grid-cols-2 grid-rows-2">
          <div className="border-r border-b border-white/5 flex items-center justify-center"
               style={{ background: 'hsl(187 92% 53% / 0.07)' }}>
            <span className="font-mono text-[8px] text-center leading-tight" style={{ color: 'hsl(187 92% 53% / 0.5)' }}>COOL BLUE<br/>Aligned</span>
          </div>
          <div className="border-b border-white/5 flex items-center justify-center"
               style={{ background: 'hsl(43 96% 56% / 0.06)' }}>
            <span className="font-mono text-[8px] text-center leading-tight" style={{ color: 'hsl(43 96% 56% / 0.5)' }}>OVERLAP<br/>Convergence</span>
          </div>
          <div className="border-r border-white/5 flex items-center justify-center"
               style={{ background: 'hsl(280 87% 65% / 0.05)' }}>
            <span className="font-mono text-[8px] text-center leading-tight" style={{ color: 'hsl(280 87% 65% / 0.5)' }}>BLIND SPOT<br/>Underreported</span>
          </div>
          <div className="flex items-center justify-center"
               style={{ background: 'hsl(344 100% 59% / 0.09)' }}>
            <span className="font-mono text-[8px] text-center leading-tight" style={{ color: 'hsl(344 100% 59% / 0.6)' }}>HOT RED<br/>Sensational</span>
          </div>
        </div>

        {/* Axes */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute left-0 right-0 top-1/2 h-px" style={{ background: 'hsl(0 0% 100% / 0.1)' }} />
          <div className="absolute top-0 bottom-0 left-1/2 w-px" style={{ background: 'hsl(0 0% 100% / 0.1)' }} />
        </div>

        {/* Axis labels */}
        <div className="absolute bottom-1 left-2 right-2 flex justify-between">
          <span className="font-mono text-[8px]" style={{ color: 'hsl(187 92% 53% / 0.5)' }}>Low Sens.</span>
          <span className="font-mono text-[8px]" style={{ color: 'hsl(344 100% 59% / 0.5)' }}>High Sens.</span>
        </div>
        <div className="absolute top-8 bottom-8 left-1 flex flex-col justify-between">
          <span className="font-mono text-[8px]" style={{ color: 'hsl(187 92% 53% / 0.5)', writingMode: 'vertical-lr', transform: 'rotate(180deg)' }}>Aligned</span>
          <span className="font-mono text-[8px]" style={{ color: 'hsl(344 100% 59% / 0.5)', writingMode: 'vertical-lr', transform: 'rotate(180deg)' }}>Misaligned</span>
        </div>

        {/* Pulsing ring */}
        <motion.div
          animate={{ scale: [1, 2.5], opacity: [0.5, 0] }}
          transition={{ duration: 2, repeat: Infinity }}
          className="absolute w-4 h-4 rounded-full -translate-x-1/2 -translate-y-1/2 pointer-events-none"
          style={{ left: `${dotX * 100}%`, top: `${dotY * 100}%`, border: `2px solid ${dotColor}`, zIndex: 9 }}
        />
        {/* Signal dot */}
        <motion.div
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', delay: 0.3 }}
          className="absolute w-4 h-4 rounded-full -translate-x-1/2 -translate-y-1/2"
          style={{ left: `${dotX * 100}%`, top: `${dotY * 100}%`, background: dotColor, boxShadow: `0 0 14px ${dotColor}`, zIndex: 10 }}
        />
      </div>

      {/* Topic label + badge */}
      <div className="flex items-center gap-2 font-mono text-[11px] flex-wrap">
        <span className="h-2 w-2 rounded-full shrink-0" style={{ background: dotColor }} />
        <span className="text-muted-foreground truncate flex-1">{data.topic}</span>
        <span className="px-2 py-0.5 rounded border text-[10px] shrink-0"
              style={{ color: dotColor, borderColor: `${dotColor}40`, background: `${dotColor}1a` }}>
          {INTENSITY[data.intensity_label]?.label.split(' — ')[0] ?? 'NEUTRAL'}
        </span>
      </div>
    </div>
  )
}

/* ─── EMOTION PULSE ───────────────────────────────────────────────── */
function EmotionChart({ data }: { data: EmotionResult }) {
  const sorted = Object.entries(data.emotion_scores).sort((a, b) => b[1] - a[1])
  const domColor = EMOTION_COLORS[data.dominant_emotion] ?? 'hsl(var(--primary))'
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="font-mono text-[10px] tracking-[0.3em] text-muted-foreground">// EMOTION_PULSE</div>
        <span className="font-mono text-[10px] px-2 py-0.5 rounded border capitalize"
              style={{ color: domColor, borderColor: `${domColor}50`, background: `${domColor}1a` }}>
          {data.dominant_emotion}
        </span>
      </div>
      <div className="space-y-2.5">
        {sorted.map(([emotion, score]) => {
          const pct = Math.round(score * 100)
          const color = EMOTION_COLORS[emotion] ?? 'hsl(215 20% 55%)'
          return (
            <div key={emotion}>
              <div className="flex justify-between font-mono text-[10px] mb-1">
                <span className="capitalize" style={{ color }}>{emotion}</span>
                <span className="tabular-nums text-muted-foreground">{pct}%</span>
              </div>
              <div className="h-2 rounded-full overflow-hidden" style={{ background: 'hsl(0 0% 100% / 0.05)' }}>
                <motion.div initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ duration: 0.9 }}
                  className="h-full rounded-full" style={{ background: color }} />
              </div>
            </div>
          )
        })}
      </div>
      <div className="font-mono text-[10px] text-muted-foreground">{data.sample_size} signal docs analysed</div>
    </div>
  )
}

/* ─── LIFECYCLE CHART ─────────────────────────────────────────────── */
function LifecycleChart({ data }: { data: LifecycleResult }) {
  const vels = data.chart_velocities.slice(0, 30)
  const maxV = Math.max(...vels, 0.01)
  const phaseColor = PHASE_COLORS[data.current_phase] ?? 'hsl(187 92% 53%)'

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="font-mono text-[10px] tracking-[0.3em] text-muted-foreground">// LIFECYCLE_DECAY</div>
        <span className="font-mono text-[10px] px-2 py-0.5 rounded border capitalize"
              style={{ color: phaseColor, borderColor: `${phaseColor}50`, background: `${phaseColor}1a` }}>
          {data.current_phase}
        </span>
      </div>

      <div className="relative h-20 rounded-lg overflow-hidden" style={{ background: 'hsl(0 0% 0% / 0.2)' }}>
        <svg className="absolute inset-0 w-full h-full" viewBox={`0 0 ${vels.length} 100`} preserveAspectRatio="none">
          <defs>
            <linearGradient id="lc-grad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={phaseColor} stopOpacity="0.3" />
              <stop offset="100%" stopColor={phaseColor} stopOpacity="0" />
            </linearGradient>
          </defs>
          <path
            d={`M 0 ${100 - (vels[0] / maxV) * 90} ${vels.map((v, i) => `L ${i} ${100 - (v / maxV) * 90}`).join(' ')} L ${vels.length - 1} 100 L 0 100 Z`}
            fill="url(#lc-grad)"
          />
          <polyline
            points={vels.map((v, i) => `${i},${100 - (v / maxV) * 90}`).join(' ')}
            fill="none" stroke={phaseColor} strokeWidth="2"
          />
          <polyline
            points={vels.map((v, i) => data.chart_is_forecast[i] ? `${i},${100 - (v / maxV) * 90}` : null).filter(Boolean).join(' ')}
            fill="none" stroke={phaseColor} strokeWidth="1.5" strokeDasharray="3,3" opacity="0.5"
          />
        </svg>
      </div>

      <div className="grid grid-cols-3 gap-2 font-mono text-[10px]">
        {[
          { label: 'VELOCITY', value: `${Math.round(data.current_velocity * 100)}%`, color: phaseColor },
          { label: 'HALF-LIFE', value: data.half_life_hours > 9000 ? '∞' : `${Math.round(data.half_life_hours)}h`, color: 'hsl(43 96% 56%)' },
          { label: 'DEAD IN', value: data.dead_in_hours > 9000 ? 'Active' : `${Math.round(data.dead_in_hours)}h`, color: 'hsl(280 87% 65%)' },
        ].map(item => (
          <div key={item.label} className="rounded-md px-2 py-1.5 text-center"
               style={{ background: 'hsl(0 0% 100% / 0.03)', border: '1px solid hsl(0 0% 100% / 0.06)' }}>
            <div className="text-muted-foreground text-[9px] mb-0.5">{item.label}</div>
            <div style={{ color: item.color }}>{item.value}</div>
          </div>
        ))}
      </div>
    </div>
  )
}

/* ─── NARRATIVE GRAPH ─────────────────────────────────────────────── */
function NarrativeGraph({ nodes }: { nodes: NarrativeNode[] }) {
  if (!nodes.length) return (
    <div className="space-y-2">
      <div className="font-mono text-[10px] tracking-[0.3em] text-muted-foreground">// NARRATIVE_GRAPH</div>
      <div className="font-mono text-[11px] text-muted-foreground py-3">No narrative clusters yet.</div>
    </div>
  )
  return (
    <div className="space-y-2">
      <div className="font-mono text-[10px] tracking-[0.3em] text-muted-foreground">// NARRATIVE_GRAPH</div>
      {nodes.slice(0, 5).map((node, i) => (
        <motion.div key={node.node_id} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }}
          transition={{ delay: i * 0.06 }}
          className="rounded-xl p-3 border border-white/5 space-y-1.5"
          style={{ background: 'hsl(0 0% 100% / 0.02)' }}>
          <div className="flex items-start gap-2">
            <Network className="h-3 w-3 mt-0.5 shrink-0" style={{ color: 'hsl(187 92% 53%)' }} />
            <p className="font-mono text-[11px] leading-snug flex-1">{node.narrative}</p>
          </div>
          <div className="flex items-center gap-3 font-mono text-[10px] text-muted-foreground flex-wrap">
            <span>{node.cluster_size} signals</span>
            <span>v{node.avg_velocity.toFixed(1)}</span>
            {node.top_sources.slice(0, 2).map(s => (
              <span key={s} className="px-1.5 py-0.5 rounded border border-white/5"
                    style={{ background: 'hsl(187 92% 53% / 0.06)', color: 'hsl(187 92% 53%)' }}>{s}</span>
            ))}
          </div>
        </motion.div>
      ))}
    </div>
  )
}

/* ─── RAG QUERY ────────────────────────────────────────────────────── */
function RAGQuery() {
  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<{ answer: string; context_hits: number; sources: any[] } | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!query.trim()) return
    setLoading(true); setError(null); setResult(null)
    try {
      const res = await fetch('/api/v1/intelligence/query', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: query.trim(), max_results: 10 }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.detail || `HTTP ${res.status}`)
      }
      setResult(await res.json())
    } catch (e: any) { setError(e.message || 'Query failed') }
    finally { setLoading(false) }
  }

  return (
    <div className="space-y-3">
      <div className="font-mono text-[10px] tracking-[0.3em] text-muted-foreground">// RAG_QUERY</div>
      <form onSubmit={handleSubmit} className="flex gap-2">
        <input value={query} onChange={e => setQuery(e.target.value)}
          placeholder="e.g. What political trends are emerging?"
          className="flex-1 rounded-lg px-3 py-2 text-sm font-mono border bg-transparent outline-none focus:border-primary/50"
          style={{ borderColor: 'hsl(var(--border))', background: 'hsl(0 0% 100% / 0.03)' }} />
        <button type="submit" disabled={loading}
          className="px-3 py-2 rounded-lg border flex items-center gap-1.5 text-sm transition-colors disabled:opacity-50"
          style={{ background: 'hsl(var(--primary) / 0.1)', borderColor: 'hsl(var(--primary) / 0.3)', color: 'hsl(var(--primary))' }}>
          {loading ? <RotateCw className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
        </button>
      </form>

      <AnimatePresence>
        {error && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="font-mono text-[11px] px-3 py-2 rounded-lg border"
            style={{ color: 'hsl(344 100% 59%)', borderColor: 'hsl(344 100% 59% / 0.3)', background: 'hsl(344 100% 59% / 0.06)' }}>
            {error}
          </motion.div>
        )}
        {result && (
          <motion.div initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}
            className="rounded-xl p-4 border border-white/8 space-y-3"
            style={{ background: 'hsl(0 0% 100% / 0.02)' }}>
            <div className="flex items-center gap-2 font-mono text-[10px] text-muted-foreground">
              <MessageSquare className="h-3 w-3" style={{ color: 'hsl(var(--primary))' }} />
              {result.context_hits} context documents retrieved
            </div>
            <p className="text-sm leading-relaxed">{result.answer}</p>
            {result.sources.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {result.sources.map((s: any, i: number) => (
                  <span key={i} className="font-mono text-[9px] px-1.5 py-0.5 rounded border border-white/5"
                        style={{ color: 'hsl(var(--primary) / 0.7)', background: 'hsl(var(--primary) / 0.06)' }}>
                    {s.source ?? s.id}
                  </span>
                ))}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

/* ─── MAIN PAGE ────────────────────────────────────────────────────── */
export default function IntelPage() {
  const [heatmap, setHeatmap]     = useState<Heatmap | null>(null)
  const [emotion, setEmotion]     = useState<EmotionResult | null>(null)
  const [lifecycle, setLifecycle] = useState<LifecycleResult | null>(null)
  const [narratives, setNarratives] = useState<NarrativeNode[]>([])
  const [alerts, setAlerts]       = useState<Alert[]>([])
  const [loading, setLoading]     = useState(true)
  const [activeSignal, setActiveSignal] = useState<Alert | null>(null)

  const loadAll = async (signal?: Alert) => {
    const topSignal = signal ?? activeSignal
    const [hm, ad, narr] = await Promise.all([
      fetch('/api/v1/intelligence/heatmap').then(r => r.json()).catch(() => null),
      fetch('/api/v1/pulse/alerts?limit=12').then(r => r.json()).catch(() => ({ alerts: [] })),
      fetch('/api/v1/intelligence/narrative-graph?limit=5').then(r => r.json()).catch(() => ({ nodes: [] })),
    ])
    setHeatmap(hm)
    const rawAlerts: Alert[] = ad.alerts ?? []
    const seen = new Set<string>()
    const alertList = rawAlerts.filter(a => { if (seen.has(a.signal_id)) return false; seen.add(a.signal_id); return true })
    setAlerts(alertList)
    setNarratives(narr.nodes ?? [])
    setLoading(false)

    const sigToUse = topSignal ?? alertList[0]
    if (sigToUse) {
      fetch(`/api/v1/intelligence/emotion/${encodeURIComponent(sigToUse.category || sigToUse.title.split(' ')[0])}`)
        .then(r => r.json()).then(setEmotion).catch(() => {})
      fetch(`/api/v1/intelligence/lifecycle/${sigToUse.signal_id}`)
        .then(r => r.json()).then(setLifecycle).catch(() => {})
    }
  }

  useEffect(() => {
    loadAll()
    const t = setInterval(() => loadAll(), 20000)
    return () => clearInterval(t)
  }, [])

  const handleSignalClick = (a: Alert) => {
    setActiveSignal(a)
    setEmotion(null); setLifecycle(null)
    fetch(`/api/v1/intelligence/emotion/${encodeURIComponent(a.category || a.title.split(' ')[0])}`)
      .then(r => r.json()).then(setEmotion).catch(() => {})
    fetch(`/api/v1/intelligence/lifecycle/${a.signal_id}`)
      .then(r => r.json()).then(setLifecycle).catch(() => {})
  }

  const intMeta = INTENSITY[heatmap?.intensity_label ?? 'neutral'] ?? INTENSITY.neutral
  const composite = Math.min(100, Math.round(Math.abs(heatmap?.composite_score ?? 0) * 100))

  return (
    <div className="flex-1 p-4 pb-24 space-y-4">
      <Link href="/dash" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
        <ArrowLeft className="h-4 w-4" /> Back to Radar
      </Link>

      <div>
        <div className="font-mono text-[10px] tracking-[0.3em] text-muted-foreground">// INTELLIGENCE_DOSSIER</div>
        <h1 className="text-3xl font-bold tracking-tight mt-1">
          Bias <span className="text-gradient-cyan">Spectrum</span> & Intelligence
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          2D bias heatmap, emotion pulse, lifecycle decay, narrative clusters & RAG query.
        </p>
      </div>

      {loading ? (
        <div className="grid gap-4 lg:grid-cols-3">
          {[1,2,3].map(i => <div key={i} className="glass rounded-2xl h-48 animate-pulse" style={{ opacity: 0.4 }} />)}
        </div>
      ) : (
        <>
          {/* Row 1: 2D heatmap + bias meters + composite ring */}
          <div className="grid lg:grid-cols-[260px_1fr_220px] gap-4">
            <div className="glass rounded-2xl p-5">
              {heatmap ? <BiasHeatmap2D data={heatmap} /> :
                <div className="font-mono text-[11px] text-muted-foreground">No heatmap data — seed signals first.</div>}
            </div>

            <div className="glass rounded-2xl p-5 space-y-4">
              <div>
                <div className="font-mono text-[10px] tracking-[0.3em] text-muted-foreground">// BIAS_METERS</div>
                {heatmap && (
                  <div className="flex items-center gap-2 mt-1 flex-wrap">
                    <span className="font-mono text-[10px] px-2 py-0.5 rounded border"
                          style={{ color: intMeta.color, borderColor: `${intMeta.color}50`, background: intMeta.bg }}>
                      {intMeta.label}
                    </span>
                    <span className="font-mono text-[10px] text-muted-foreground">{heatmap.topic}</span>
                  </div>
                )}
              </div>
              {heatmap ? (
                <div className="space-y-3 pt-1">
                  <Meter label="YT Sensationalism" value={heatmap.yt_sensationalism_score} color="hsl(344 100% 59%)" />
                  <Meter label="Trends Alignment"  value={heatmap.trends_alignment_score}  color="hsl(187 92% 53%)" />
                  <Meter label="Institutional Gap" value={heatmap.institutional_gap_score} color="hsl(280 87% 65%)" />
                  <Meter label="Composite Score"   value={heatmap.composite_score}         color="hsl(43 96% 56%)" />
                  {heatmap.blindspot_detected && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                      className="rounded-xl p-3 border"
                      style={{ borderColor: 'hsl(43 96% 56% / 0.4)', background: 'hsl(43 96% 56% / 0.08)' }}>
                      <div className="font-mono text-[10px] mb-1" style={{ color: 'hsl(43 96% 56%)' }}>⚠ BLINDSPOT DETECTED</div>
                      <p className="text-xs text-muted-foreground">{heatmap.blindspot_reason}</p>
                    </motion.div>
                  )}
                </div>
              ) : <div className="font-mono text-[11px] text-muted-foreground pt-2">No heatmap data.</div>}
            </div>

            {/* Composite ring */}
            <div className="glass rounded-2xl p-5 flex flex-col items-center justify-center gap-3">
              <div className="font-mono text-[10px] tracking-[0.3em] text-muted-foreground text-center">// COMPOSITE</div>
              <div className="relative h-28 w-28">
                <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
                  <circle cx="50" cy="50" r="40" fill="none" stroke="hsl(0 0% 100% / 0.06)" strokeWidth="8" />
                  <motion.circle cx="50" cy="50" r="40" fill="none"
                    stroke={intMeta.color} strokeWidth="8" strokeLinecap="round"
                    strokeDasharray={`${2 * Math.PI * 40}`}
                    initial={{ strokeDashoffset: 2 * Math.PI * 40 }}
                    animate={{ strokeDashoffset: 2 * Math.PI * 40 * (1 - composite / 100) }}
                    transition={{ duration: 1.2 }}
                    style={{ filter: `drop-shadow(0 0 6px ${intMeta.color})` }}
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="font-mono text-2xl font-bold" style={{ color: intMeta.color }}>{composite}%</span>
                  <span className="font-mono text-[9px] text-muted-foreground mt-0.5">SCORE</span>
                </div>
              </div>
              {heatmap?.outlier_outlet && (
                <div className="font-mono text-[10px] text-center">
                  <div className="text-muted-foreground mb-0.5">Outlier</div>
                  <div style={{ color: intMeta.color }}>{heatmap.outlier_outlet}</div>
                </div>
              )}
            </div>
          </div>

          {/* Row 2: Emotion + Lifecycle + Signal selector */}
          <div className="grid lg:grid-cols-3 gap-4">
            <div className="glass rounded-2xl p-5">
              {emotion ? <EmotionChart data={emotion} /> : (
                <div className="space-y-2">
                  <div className="font-mono text-[10px] tracking-[0.3em] text-muted-foreground">// EMOTION_PULSE</div>
                  <div className="font-mono text-[11px] text-muted-foreground">Loading emotion analysis…</div>
                </div>
              )}
            </div>

            <div className="glass rounded-2xl p-5">
              {lifecycle ? <LifecycleChart data={lifecycle} /> : (
                <div className="space-y-2">
                  <div className="font-mono text-[10px] tracking-[0.3em] text-muted-foreground">// LIFECYCLE_DECAY</div>
                  <div className="font-mono text-[11px] text-muted-foreground">Select a signal to view lifecycle prediction.</div>
                </div>
              )}
            </div>

            <div className="glass rounded-2xl p-5 space-y-3">
              <div className="flex items-center justify-between">
                <div className="font-mono text-[10px] tracking-[0.3em] text-muted-foreground">// SELECT_SIGNAL</div>
                <Brain className="h-3.5 w-3.5" style={{ color: 'hsl(var(--primary))' }} />
              </div>
              <div className="space-y-1.5">
                {alerts.slice(0, 6).map(a => (
                  <button key={a.signal_id} onClick={() => handleSignalClick(a)}
                    className={`w-full text-left rounded-lg px-3 py-2 border transition-all font-mono text-[11px] ${
                      activeSignal?.signal_id === a.signal_id ? 'border-primary/40' : 'border-white/5 hover:border-white/15'
                    }`}
                    style={activeSignal?.signal_id === a.signal_id
                      ? { background: 'hsl(var(--primary) / 0.08)' }
                      : { background: 'hsl(0 0% 100% / 0.02)' }}>
                    <div className="flex items-center justify-between gap-2">
                      <span className="truncate">{a.title.slice(0, 32)}</span>
                      <span className="tabular-nums shrink-0" style={{
                        color: a.velocity_score >= 85 ? 'hsl(344 100% 59%)' : a.velocity_score >= 70 ? 'hsl(43 96% 56%)' : 'hsl(187 92% 53%)'
                      }}>{a.velocity_score.toFixed(0)}</span>
                    </div>
                    <div className="text-muted-foreground text-[10px] mt-0.5">{a.region} · {a.category}</div>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Row 3: Narrative graph + RAG query */}
          <div className="grid lg:grid-cols-2 gap-4">
            <div className="glass rounded-2xl p-5">
              <NarrativeGraph nodes={narratives} />
            </div>
            <div className="glass rounded-2xl p-5">
              <RAGQuery />
            </div>
          </div>
        </>
      )}
    </div>
  )
}
