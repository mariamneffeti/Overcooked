import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import Link from 'next/link'
import { Radar, Brain, ShieldAlert, ScrollText, Zap, Activity } from 'lucide-react'

interface Stats {
  signals: number
  regions: number
  topVelocity: number
  topTopic: string
}

const MODULES = [
  {
    href: '/dash', icon: Radar, label: 'Tactical Radar', color: 'primary',
    desc: 'Real-time geo-velocity map across 6 MENA regions. Click a signal to drill into the intelligence dossier.',
  },
  {
    href: '/intel', icon: Brain, label: 'Intelligence', color: 'primary',
    desc: 'Trigger analysis, emotional resonance, signal lifecycle prediction, and media bias breakdown.',
  },
  {
    href: '/safety', icon: ShieldAlert, label: 'Safety Radar', color: 'magma',
    desc: 'Cross-correlation engine. Toxic signals are flagged and blocked when conflicting with dominant national sentiment.',
  },
  {
    href: '/briefing', icon: ScrollText, label: 'AI Strategist', color: 'primary',
    desc: 'Context-aware, tone-variable strategy briefs synthesized from live signal data. Typewriter reveal.',
  },
]

export default function HomePage() {
  const [stats, setStats] = useState<Stats | null>(null)

  useEffect(() => {
    Promise.all([
      fetch('/api/v1/pulse/geo').then(r => r.json()).catch(() => []),
      fetch('/api/v1/pulse/alerts?limit=100').then(r => r.json()).catch(() => ({ alerts: [], total: 0 })),
    ]).then(([geo, ad]) => {
      const geoArr = Array.isArray(geo) ? geo : []
      const top = [...geoArr].sort((a: any, b: any) => b.avg_velocity - a.avg_velocity)[0]
      setStats({
        signals: ad.total ?? ad.alerts?.length ?? 0,
        regions: geoArr.length,
        topVelocity: top?.avg_velocity ?? 0,
        topTopic: top?.top_topic ?? '—',
      })
    })
  }, [])

  return (
    <div className="flex-1 pb-20">
      {/* Grid texture */}
      <div className="fixed inset-0 grid-bg opacity-40 pointer-events-none z-0" />

      <div className="relative z-10 max-w-5xl mx-auto px-4 pt-16 pb-24">
        {/* Hero */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <div className="inline-flex items-center gap-2 font-mono text-[10px] tracking-[0.3em] px-3 py-1.5 rounded-full mb-6 border"
               style={{ color: 'hsl(var(--primary))', borderColor: 'hsl(var(--primary) / 0.3)', background: 'hsl(var(--primary) / 0.08)' }}>
            <span className="h-1.5 w-1.5 rounded-full animate-pulse-slow" style={{ background: 'hsl(var(--primary))' }} />
            DECODE-TN · LIVE · TUNISIAN &amp; MENA MARKET
          </div>

          <h1 className="text-5xl font-bold tracking-tight leading-tight mb-4">
            Real-time cultural<br />
            <span className="text-gradient-cyan">trend intelligence</span>
          </h1>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto leading-relaxed">
            Monitor cultural velocity, detect pre-viral signals, analyse media bias, and generate AI-powered marketing strategy — all wired to live FastAPI data.
          </p>

          <div className="flex items-center gap-3 justify-center mt-8 flex-wrap">
            <Link href="/dash" className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-sm transition-all"
                  style={{ background: 'hsl(var(--primary))', color: 'hsl(var(--primary-foreground))' }}>
              <Radar className="h-4 w-4" />
              Open Radar
            </Link>
            <Link href="/briefing" className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-sm glass glass-hover">
              <Zap className="h-4 w-4" style={{ color: 'hsl(var(--primary))' }} />
              Generate Brief
            </Link>
          </div>
        </motion.div>

        {/* Live stats */}
        {stats && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25 }}
            className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-12"
          >
            {[
              { label: 'ACTIVE SIGNALS', value: `${stats.signals}`, color: 'primary' },
              { label: 'GEO REGIONS',    value: `${stats.regions}`, color: 'primary' },
              { label: 'TOP VELOCITY',   value: stats.topVelocity.toFixed(1), color: 'magma' },
              { label: 'LEADING TOPIC',  value: stats.topTopic, color: 'amber', small: true },
            ].map((item, i) => (
              <div key={i} className="glass rounded-2xl p-5">
                <div className="font-mono text-[10px] tracking-[0.2em] text-muted-foreground mb-2">{item.label}</div>
                <div
                  className={`font-mono font-bold tabular-nums ${item.small ? 'text-sm leading-snug' : 'text-3xl'}`}
                  style={{ color: `hsl(var(--${item.color}))` }}
                >
                  {item.value}
                </div>
              </div>
            ))}
          </motion.div>
        )}

        {/* Module cards */}
        <div className="font-mono text-[10px] tracking-[0.3em] text-muted-foreground mb-4">// MODULES</div>
        <div className="grid sm:grid-cols-2 gap-4 mb-12">
          {MODULES.map((m, i) => {
            const Icon = m.icon
            const isMagma = m.color === 'magma'
            return (
              <motion.div
                key={m.href}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.35 + i * 0.07 }}
              >
                <Link href={m.href} className="block glass glass-hover rounded-2xl p-5 group h-full">
                  <div className="flex items-start gap-4">
                    <div className="h-10 w-10 rounded-xl grid place-items-center shrink-0 border transition-colors"
                         style={{
                           background: `hsl(var(--${m.color}) / 0.1)`,
                           borderColor: `hsl(var(--${m.color}) / 0.4)`,
                         }}>
                      <Icon className="h-5 w-5" style={{ color: `hsl(var(--${m.color}))` }} />
                    </div>
                    <div>
                      <div className="font-semibold text-sm mb-1">{m.label}</div>
                      <p className="text-xs text-muted-foreground leading-relaxed">{m.desc}</p>
                    </div>
                  </div>
                </Link>
              </motion.div>
            )
          })}
        </div>

        {/* API tier table */}
        <div className="font-mono text-[10px] tracking-[0.3em] text-muted-foreground mb-4">// API_TIERS</div>
        <div className="glass rounded-2xl overflow-hidden">
          {[
            { tier: 'Tier 1', name: 'Starter',      color: 'primary', eps: ['/v1/pulse/geo', '/v1/pulse/alerts', '/v1/pulse/live'] },
            { tier: 'Tier 2', name: 'Professional',  color: 'amber',   eps: ['/v1/intelligence/heatmap', '/v1/intelligence/brand-safety', '/v1/intelligence/emotion/{topic}'] },
            { tier: 'Tier 3', name: 'Enterprise',    color: 'magma',   eps: ['/v1/strategy/brief', '/v1/strategy/briefs', '/v1/strategy/narrative-graph'] },
          ].map((row, i) => (
            <div key={row.tier} className={`flex items-start gap-4 px-5 py-4 ${i < 2 ? 'border-b border-white/5' : ''}`}>
              <div className="shrink-0 font-mono text-[10px] px-2 py-1 rounded border"
                   style={{ color: `hsl(var(--${row.color}))`, borderColor: `hsl(var(--${row.color}) / 0.4)`, background: `hsl(var(--${row.color}) / 0.1)` }}>
                {row.tier}
              </div>
              <div className="shrink-0 text-sm font-semibold w-28">{row.name}</div>
              <div className="flex flex-wrap gap-2">
                {row.eps.map(ep => (
                  <code key={ep} className="font-mono text-[11px] px-2 py-0.5 rounded"
                        style={{ color: 'hsl(var(--primary))', background: 'hsl(var(--primary) / 0.08)', border: '1px solid hsl(var(--primary) / 0.2)' }}>
                    {ep}
                  </code>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
