import { useEffect, useRef, useState, FormEvent } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Sparkles, RotateCw, Copy, Check, ArrowLeft, TrendingUp, Lightbulb, DollarSign, Palette } from 'lucide-react'
import Link from 'next/link'

interface Brief {
  id: string; tier: number; topic: string
  headline: string; body: string
  key_insights: string[]; recommended_actions: string[]
  roi: Record<string, any> | null
  creative_brief: Record<string, any> | null
  generated_ms: number
}

interface BriefSummary { brief_id: string; headline: string; tier: number; generated_ms: number; topic: string }

const TONES = ['professional', 'bold', 'empathetic', 'urgent', 'neutral']
const REGIONS = ['Tunisia', 'Morocco', 'Algeria', 'Egypt', 'MENA', 'global']

function timeAgo(ms: number) {
  const d = (Date.now() - ms) / 1000
  if (d < 60) return 'just now'
  if (d < 3600) return `${Math.floor(d / 60)}m ago`
  return `${Math.floor(d / 3600)}h ago`
}

function InsightBadge({ text }: { text: string }) {
  return (
    <div className="flex items-start gap-2 rounded-lg p-2.5 border border-white/5" style={{ background: 'hsl(0 0% 100% / 0.02)' }}>
      <Lightbulb className="h-3 w-3 mt-0.5 shrink-0" style={{ color: 'hsl(43 96% 56%)' }} />
      <span className="text-xs leading-snug">{text}</span>
    </div>
  )
}

function ActionBadge({ text, idx }: { text: string; idx: number }) {
  return (
    <div className="flex items-start gap-2.5 rounded-lg p-2.5 border border-white/5" style={{ background: 'hsl(0 0% 100% / 0.02)' }}>
      <span className="font-mono text-[10px] h-4 w-4 rounded border flex items-center justify-center shrink-0 mt-0.5"
            style={{ color: 'hsl(187 92% 53%)', borderColor: 'hsl(187 92% 53% / 0.4)', background: 'hsl(187 92% 53% / 0.08)' }}>
        {idx + 1}
      </span>
      <span className="text-xs leading-snug">{text}</span>
    </div>
  )
}

function ROIPanel({ roi }: { roi: Record<string, any> }) {
  const entries = Object.entries(roi).filter(([, v]) => typeof v !== 'object' && v !== null)
  if (!entries.length) return null
  return (
    <div className="rounded-xl border border-white/5 p-3 space-y-2" style={{ background: 'hsl(142 70% 50% / 0.05)' }}>
      <div className="flex items-center gap-2 font-mono text-[10px] text-muted-foreground">
        <DollarSign className="h-3 w-3" style={{ color: 'hsl(142 70% 50%)' }} /> ROI PROJECTION
      </div>
      <div className="grid grid-cols-2 gap-2">
        {entries.slice(0, 4).map(([k, v]) => (
          <div key={k} className="rounded-md px-2 py-1.5" style={{ background: 'hsl(0 0% 100% / 0.03)' }}>
            <div className="font-mono text-[9px] text-muted-foreground capitalize">{k.replace(/_/g, ' ')}</div>
            <div className="font-mono text-[11px] mt-0.5" style={{ color: 'hsl(142 70% 50%)' }}>{String(v)}</div>
          </div>
        ))}
      </div>
    </div>
  )
}

function CreativeBriefPanel({ cb }: { cb: Record<string, any> }) {
  const entries = Object.entries(cb)
  if (!entries.length) return null
  return (
    <div className="rounded-xl border border-white/5 p-3 space-y-2" style={{ background: 'hsl(280 87% 65% / 0.05)' }}>
      <div className="flex items-center gap-2 font-mono text-[10px] text-muted-foreground">
        <Palette className="h-3 w-3" style={{ color: 'hsl(280 87% 65%)' }} /> CREATIVE BRIEF
      </div>
      {entries.map(([k, v]) => (
        <div key={k}>
          <div className="font-mono text-[9px] text-muted-foreground capitalize mb-1">{k.replace(/_/g, ' ')}</div>
          {Array.isArray(v) ? (
            <div className="flex flex-wrap gap-1">
              {v.map((item, i) => (
                <span key={i} className="font-mono text-[9px] px-1.5 py-0.5 rounded border border-white/5"
                      style={{ color: 'hsl(280 87% 65%)', background: 'hsl(280 87% 65% / 0.06)' }}>{item}</span>
              ))}
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">{String(v)}</p>
          )}
        </div>
      ))}
    </div>
  )
}

export default function StrategistPage() {
  const [brief,      setBrief]      = useState<Brief | null>(null)
  const [briefList,  setBriefList]  = useState<BriefSummary[]>([])
  const [generating, setGenerating] = useState(false)
  const [error,      setError]      = useState<string | null>(null)
  const [copied,     setCopied]     = useState(false)
  const [typed,      setTyped]      = useState('')
  const [done,       setDone]       = useState(false)
  const timer = useRef<ReturnType<typeof setInterval> | null>(null)

  const [topic,      setTopic]      = useState('CAN 2026 Tunisie')
  const [region,     setRegion]     = useState('Tunisia')
  const [audience,   setAudience]   = useState('general')
  const [tone,       setTone]       = useState('professional')
  const [inclROI,    setInclROI]    = useState(true)
  const [inclCreat,  setInclCreat]  = useState(true)
  const [extraCtx,   setExtraCtx]   = useState('')

  useEffect(() => {
    fetch('/api/v1/strategy/briefs').then(r => r.json())
      .then(d => setBriefList(d.items ?? []))
      .catch(() => {})
  }, [])

  useEffect(() => {
    if (!brief?.body) return
    const full = brief.body
    setTyped(''); setDone(false)
    if (timer.current) clearInterval(timer.current)
    let i = 0
    timer.current = setInterval(() => {
      i += Math.random() < 0.5 ? 2 : 3
      if (i >= full.length) { setTyped(full); setDone(true); clearInterval(timer.current!) }
      else { setTyped(full.slice(0, i)) }
    }, 14)
    return () => { if (timer.current) clearInterval(timer.current) }
  }, [brief])

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!topic.trim()) { setError('Topic is required.'); return }
    setError(null); setGenerating(true); setBrief(null)
    try {
      const res = await fetch('/api/v1/strategy/brief', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topic: topic.trim(), region: region || null,
          target_audience: audience || 'general', tone,
          include_roi: inclROI, include_creative_brief: inclCreat,
          extra_context: extraCtx.trim() || null,
        }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.detail || `HTTP ${res.status}`)
      }
      const data: Brief = await res.json()
      setBrief(data)
      setBriefList(prev => [{ brief_id: data.id, headline: data.headline, tier: data.tier, generated_ms: data.generated_ms, topic: data.topic }, ...prev].slice(0, 20))
    } catch (e: any) { setError(e.message || 'Generation failed.') }
    finally { setGenerating(false) }
  }

  const onCopy = async () => {
    if (!brief?.body) return
    await navigator.clipboard.writeText(`${brief.headline}\n\n${brief.body}`)
    setCopied(true); setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="flex-1 p-4 pb-24 space-y-4">
      <Link href="/dash" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
        <ArrowLeft className="h-4 w-4" /> Back to Radar
      </Link>

      <div className="flex items-end justify-between gap-4 flex-wrap">
        <div>
          <div className="font-mono text-[10px] tracking-[0.3em] text-muted-foreground">// AI_STRATEGIST</div>
          <h1 className="text-3xl font-bold tracking-tight mt-1">
            Strategic <span className="text-gradient-cyan">Brief Generator</span>
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Context-aware briefs synthesized from live signal data — includes insights, actions & ROI.
          </p>
        </div>
      </div>

      <div className="grid lg:grid-cols-[1fr_320px] gap-4">
        {/* Main output panel */}
        <div className="glass rounded-2xl p-6 relative overflow-hidden min-h-[500px]">
          <div className="absolute inset-0 grid-bg pointer-events-none opacity-30" />
          <div className="relative space-y-5">
            {/* Header */}
            <div className="flex items-start justify-between gap-3 flex-wrap">
              <div className="flex items-center gap-2">
                <div className="h-9 w-9 rounded-lg border grid place-items-center"
                     style={{ background: 'hsl(var(--primary) / 0.1)', borderColor: 'hsl(var(--primary) / 0.3)' }}>
                  <Sparkles className="h-4 w-4" style={{ color: 'hsl(var(--primary))' }} />
                </div>
                <div>
                  <div className="font-mono text-[10px] tracking-[0.3em] text-muted-foreground">AI STRATEGIC BRIEF</div>
                  <div className="text-sm font-semibold">{brief?.headline ?? 'Awaiting generation…'}</div>
                </div>
              </div>
              {brief && (
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-mono text-[10px] px-2 py-1 rounded border capitalize"
                        style={{ color: 'hsl(var(--primary))', borderColor: 'hsl(var(--primary) / 0.5)', background: 'hsl(var(--primary) / 0.1)' }}>
                    TONE · {tone.toUpperCase()}
                  </span>
                  <button onClick={onCopy} disabled={!done}
                    className="font-mono text-[10px] px-2.5 py-1.5 rounded-md border border-white/10 hover:border-white/30 flex items-center gap-1.5 disabled:opacity-40 transition-colors"
                    style={{ background: 'hsl(0 0% 100% / 0.04)' }}>
                    {copied ? <><Check className="h-3 w-3" /> Copied</> : <><Copy className="h-3 w-3" /> Copy</>}
                  </button>
                  <button onClick={() => setBrief(prev => prev ? { ...prev } : null)}
                    className="font-mono text-[10px] px-2.5 py-1.5 rounded-md border border-white/10 hover:border-white/30 flex items-center gap-1.5 transition-colors"
                    style={{ background: 'hsl(0 0% 100% / 0.04)' }}>
                    <RotateCw className="h-3 w-3" /> Replay
                  </button>
                </div>
              )}
            </div>

            {/* Empty state */}
            {!brief && !generating && (
              <div className="flex flex-col items-center justify-center h-64 text-center space-y-3">
                <div className="font-mono text-[10px] tracking-[0.3em] text-muted-foreground">// AWAITING_INPUT</div>
                <p className="text-sm text-muted-foreground max-w-xs">
                  Configure your brief parameters on the right, then click Generate Brief.
                </p>
              </div>
            )}

            {/* Generating state */}
            {generating && (
              <div className="flex items-center gap-3 font-mono text-sm text-muted-foreground mt-4">
                <RotateCw className="h-4 w-4 animate-spin" style={{ color: 'hsl(var(--primary))' }} />
                Synthesizing brief from live signal data…
              </div>
            )}

            {/* Brief output */}
            <AnimatePresence>
              {brief && !generating && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-5">
                  {/* Body typewriter */}
                  <div className="font-mono text-[13px] leading-relaxed whitespace-pre-wrap min-h-[80px]"
                       style={{ color: 'hsl(var(--foreground) / 0.9)' }}>
                    {typed}
                    {!done && <span className="caret" />}
                  </div>

                  {/* Key Insights */}
                  {done && brief.key_insights.length > 0 && (
                    <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
                      <div className="flex items-center gap-2 mb-2">
                        <Lightbulb className="h-3.5 w-3.5" style={{ color: 'hsl(43 96% 56%)' }} />
                        <span className="font-mono text-[10px] tracking-[0.2em] text-muted-foreground">KEY INSIGHTS</span>
                      </div>
                      <div className="space-y-1.5">
                        {brief.key_insights.map((ins, i) => <InsightBadge key={i} text={ins} />)}
                      </div>
                    </motion.div>
                  )}

                  {/* Recommended Actions */}
                  {done && brief.recommended_actions.length > 0 && (
                    <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
                      <div className="flex items-center gap-2 mb-2">
                        <TrendingUp className="h-3.5 w-3.5" style={{ color: 'hsl(187 92% 53%)' }} />
                        <span className="font-mono text-[10px] tracking-[0.2em] text-muted-foreground">RECOMMENDED ACTIONS</span>
                      </div>
                      <div className="space-y-1.5">
                        {brief.recommended_actions.map((act, i) => <ActionBadge key={i} text={act} idx={i} />)}
                      </div>
                    </motion.div>
                  )}

                  {/* ROI */}
                  {done && brief.roi && <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }}>
                    <ROIPanel roi={brief.roi} />
                  </motion.div>}

                  {/* Creative Brief */}
                  {done && brief.creative_brief && <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }}>
                    <CreativeBriefPanel cb={brief.creative_brief} />
                  </motion.div>}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Right sidebar */}
        <div className="space-y-3">
          {/* Generate form */}
          <div className="glass rounded-2xl p-5">
            <div className="font-mono text-[10px] tracking-[0.3em] text-muted-foreground mb-4">// GENERATE_BRIEF</div>
            <form onSubmit={handleSubmit} className="space-y-3">
              <div>
                <label className="font-mono text-[10px] text-muted-foreground block mb-1.5">TOPIC *</label>
                <input value={topic} onChange={e => setTopic(e.target.value)}
                  placeholder="e.g. CAN 2026 Tunisie"
                  className="w-full rounded-lg px-3 py-2 text-sm font-mono border bg-transparent outline-none focus:border-primary/50"
                  style={{ borderColor: 'hsl(var(--border))', background: 'hsl(0 0% 100% / 0.03)' }} />
              </div>

              <div>
                <label className="font-mono text-[10px] text-muted-foreground block mb-1.5">REGION</label>
                <select value={region} onChange={e => setRegion(e.target.value)}
                  className="w-full rounded-lg px-3 py-2 text-sm font-mono border outline-none"
                  style={{ borderColor: 'hsl(var(--border))', background: 'hsl(222 40% 7%)' }}>
                  {REGIONS.map(r => <option key={r} value={r} className="bg-background">{r}</option>)}
                </select>
              </div>

              <div>
                <label className="font-mono text-[10px] text-muted-foreground block mb-1.5">TARGET AUDIENCE</label>
                <input value={audience} onChange={e => setAudience(e.target.value)}
                  placeholder="e.g. young adults, brands, media"
                  className="w-full rounded-lg px-3 py-2 text-sm font-mono border bg-transparent outline-none focus:border-primary/50"
                  style={{ borderColor: 'hsl(var(--border))', background: 'hsl(0 0% 100% / 0.03)' }} />
              </div>

              <div>
                <label className="font-mono text-[10px] text-muted-foreground block mb-1.5">TONE</label>
                <select value={tone} onChange={e => setTone(e.target.value)}
                  className="w-full rounded-lg px-3 py-2 text-sm font-mono border outline-none"
                  style={{ borderColor: 'hsl(var(--border))', background: 'hsl(222 40% 7%)' }}>
                  {TONES.map(t => <option key={t} value={t} className="bg-background">{t}</option>)}
                </select>
              </div>

              <div>
                <label className="font-mono text-[10px] text-muted-foreground block mb-1.5">EXTRA CONTEXT</label>
                <textarea value={extraCtx} onChange={e => setExtraCtx(e.target.value)}
                  placeholder="Additional context or constraints…"
                  rows={2}
                  className="w-full rounded-lg px-3 py-2 text-sm font-mono border bg-transparent outline-none focus:border-primary/50 resize-none"
                  style={{ borderColor: 'hsl(var(--border))', background: 'hsl(0 0% 100% / 0.03)' }} />
              </div>

              <div className="flex gap-4 font-mono text-[11px]">
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input type="checkbox" checked={inclROI} onChange={e => setInclROI(e.target.checked)} className="accent-primary" />
                  Include ROI
                </label>
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input type="checkbox" checked={inclCreat} onChange={e => setInclCreat(e.target.checked)} className="accent-primary" />
                  Creative Brief
                </label>
              </div>

              {error && (
                <div className="text-xs font-mono px-3 py-2 rounded-lg border"
                     style={{ color: 'hsl(344 100% 59%)', borderColor: 'hsl(344 100% 59% / 0.3)', background: 'hsl(344 100% 59% / 0.06)' }}>
                  {error}
                </div>
              )}

              <button type="submit" disabled={generating}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl font-semibold text-sm transition-opacity disabled:opacity-50"
                style={{ background: 'hsl(var(--primary))', color: 'hsl(var(--primary-foreground))' }}>
                <Sparkles className="h-4 w-4" />
                {generating ? 'Generating…' : 'Generate Brief'}
              </button>
            </form>
          </div>

          {/* History */}
          {briefList.length > 0 && (
            <div className="glass rounded-2xl p-5">
              <div className="font-mono text-[10px] tracking-[0.3em] text-muted-foreground mb-3">// BRIEF_HISTORY</div>
              <div className="space-y-1.5">
                {briefList.slice(0, 6).map(b => (
                  <button key={b.brief_id}
                    className="w-full text-left rounded-xl px-3 py-2.5 border transition-colors border-white/5 hover:border-white/15"
                    style={{ background: 'hsl(0 0% 100% / 0.02)' }}>
                    <div className="font-mono text-[11px] truncate">{b.headline || b.topic}</div>
                    <div className="font-mono text-[10px] text-muted-foreground mt-0.5">
                      {b.topic} · {b.generated_ms ? timeAgo(b.generated_ms) : 'just now'}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
