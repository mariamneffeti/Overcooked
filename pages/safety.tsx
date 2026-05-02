import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { ShieldCheck, ShieldAlert, ShieldX, AlertTriangle, ArrowRight } from 'lucide-react'
import Link from 'next/link'

interface SafetyItem {
  topic: string; verdict: 'safe' | 'caution' | 'avoid'
  risk_score: number; overall_score: number; toxic_score: number
  controversy_score: number; reason: string
}

const VERDICT: Record<string, { icon: any; color: string; label: string }> = {
  safe:    { icon: ShieldCheck, color: 'hsl(var(--primary))', label: 'SAFE'      },
  caution: { icon: ShieldAlert, color: 'hsl(var(--amber))',   label: 'RESTRAINT' },
  avoid:   { icon: ShieldX,     color: 'hsl(var(--magma))',   label: 'TOXIC'     },
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md px-2 py-1.5 border border-white/5" style={{ background: 'hsl(0 0% 100% / 0.03)' }}>
      <div className="font-mono text-[10px] text-muted-foreground">{label}</div>
      <div className="font-mono text-xs capitalize">{value}</div>
    </div>
  )
}

export default function SafetyPage() {
  const [items,   setItems]   = useState<SafetyItem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = () =>
      fetch('/api/v1/intelligence/brand-safety')
        .then(r => r.json())
        .then(d => { setItems(Array.isArray(d) ? d : []); setLoading(false) })
        .catch(() => setLoading(false))
    load()
    const t = setInterval(load, 20000)
    return () => clearInterval(t)
  }, [])

  const sorted = [...items].sort((a, b) => {
    const order: Record<string, number> = { avoid: 0, caution: 1, safe: 2 }
    return (order[a.verdict] ?? 2) - (order[b.verdict] ?? 2) || b.risk_score - a.risk_score
  })

  const toxic   = sorted.filter(i => i.verdict === 'avoid')
  const caution = sorted.filter(i => i.verdict === 'caution')

  return (
    <div className="flex-1 p-4 pb-24 space-y-4">
      <div>
        <div className="font-mono text-[10px] tracking-[0.3em] text-muted-foreground">// SAFETY_RADAR</div>
        <h1 className="text-3xl font-bold tracking-tight mt-1">
          Cross-Correlation <span className="text-gradient-magma">Safety Advisory</span>
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Brand-safety verdicts derived from multi-signal correlation. Toxic signals should be avoided in all commercial communications.
        </p>
      </div>

      {/* Critical alert banner */}
      {!loading && toxic.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative rounded-2xl p-6 overflow-hidden border glow-magma"
          style={{ borderColor: 'hsl(var(--magma) / 0.4)', background: 'linear-gradient(135deg, hsl(var(--magma) / 0.15), hsl(var(--background)))' }}
        >
          <div className="absolute inset-0 grid-bg opacity-20 pointer-events-none" />
          <div className="relative flex items-start gap-4">
            <div className="h-12 w-12 rounded-xl grid place-items-center shrink-0 border"
                 style={{ background: 'hsl(var(--magma) / 0.2)', borderColor: 'hsl(var(--magma) / 0.4)' }}>
              <AlertTriangle className="h-6 w-6" style={{ color: 'hsl(var(--magma))' }} />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-mono text-[10px] tracking-[0.3em]" style={{ color: 'hsl(var(--magma))' }}>
                  CRITICAL CONTEXT ALERT
                </span>
                <span className="font-mono text-[10px] px-2 py-0.5 rounded border"
                      style={{ color: 'hsl(var(--magma))', borderColor: 'hsl(var(--magma) / 0.4)', background: 'hsl(var(--magma) / 0.1)' }}>
                  RISK: HIGH
                </span>
              </div>
              <h2 className="text-xl font-bold mt-1 leading-tight">
                {toxic.length} topic{toxic.length > 1 ? 's' : ''} flagged as <span style={{ color: 'hsl(var(--magma))' }}>TOXIC</span>.
              </h2>
              <p className="text-sm text-muted-foreground mt-2 max-w-3xl">
                Posting commercial or playful content on these topics may trigger brand backlash. Strategic hold is advised.
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                {toxic.map(t => (
                  <Link key={t.topic} href="/briefing"
                        className="font-mono text-[10px] px-2.5 py-1 rounded-md border flex items-center gap-1.5 transition-colors"
                        style={{ color: 'hsl(var(--magma))', borderColor: 'hsl(var(--magma) / 0.4)', background: 'hsl(var(--magma) / 0.08)' }}>
                    DO NOT POST · {t.topic.slice(0, 24)}
                    <ArrowRight className="h-3 w-3" />
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {loading && (
        <div className="grid md:grid-cols-2 gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="glass rounded-2xl p-5 h-40 animate-pulse" style={{ opacity: 0.4 }} />
          ))}
        </div>
      )}

      {!loading && sorted.length === 0 && (
        <div className="glass rounded-2xl p-8 text-center">
          <div className="text-4xl mb-3">🛡</div>
          <div className="font-semibold" style={{ color: 'hsl(var(--primary))' }}>All clear — no active risk signals</div>
          <p className="text-sm text-muted-foreground mt-2">Ingest signals to populate the safety advisor.</p>
        </div>
      )}

      {!loading && sorted.length > 0 && (
        <div className="grid md:grid-cols-2 gap-3">
          {sorted.map((item, i) => {
            const v = VERDICT[item.verdict] ?? VERDICT.safe
            const Icon = v.icon
            const pct = Math.round(item.risk_score * 100)
            return (
              <motion.div
                key={item.topic + i}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04 }}
                className="glass glass-hover rounded-2xl p-5 relative overflow-hidden"
                style={{ borderColor: `${v.color}30` }}
              >
                <div className="absolute -top-12 -right-12 h-32 w-32 rounded-full pointer-events-none"
                     style={{ background: `${v.color}10`, filter: 'blur(20px)' }} />
                <div className="relative flex items-start gap-3">
                  <div className="h-10 w-10 rounded-lg grid place-items-center shrink-0 border"
                       style={{ background: `${v.color}15`, borderColor: `${v.color}40`, color: v.color }}>
                    <Icon className="h-5 w-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono text-[10px] px-2 py-0.5 rounded border"
                            style={{ color: v.color, borderColor: `${v.color}50`, background: `${v.color}12` }}>
                        {v.label}
                      </span>
                    </div>
                    <div className="font-semibold mt-1.5 leading-snug">{item.topic}</div>
                    {item.reason && (
                      <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{item.reason}</p>
                    )}
                    <div className="mt-3 grid grid-cols-3 gap-2">
                      <Metric label="RISK"  value={`${pct}%`} />
                      <Metric label="TOXIC" value={`${Math.round(item.toxic_score * 100)}%`} />
                      <Metric label="CONTR" value={`${Math.round(item.controversy_score * 100)}%`} />
                    </div>
                    <div className="mt-3 h-1 rounded-full overflow-hidden" style={{ background: 'hsl(0 0% 100% / 0.06)' }}>
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${pct}%` }}
                        transition={{ duration: 0.8, delay: i * 0.04 }}
                        className="h-full rounded-full"
                        style={{ background: v.color }}
                      />
                    </div>
                  </div>
                </div>
              </motion.div>
            )
          })}
        </div>
      )}
    </div>
  )
}
