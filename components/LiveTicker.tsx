import { useEffect, useState } from 'react'
import { Radio } from 'lucide-react'

interface TickItem {
  id: string
  time: string
  source: string
  message: string
}

const SRC_COLOR: Record<string, string> = {
  tiktok:        'hsl(var(--magma))',
  google_trends: 'hsl(var(--amber))',
  instagram:     'hsl(280 87% 65%)',
  facebook:      'hsl(217 91% 60%)',
  twitter:       'hsl(var(--primary))',
}

const MESSAGES = [
  'Velocity surge detected on',
  'New cluster forming near',
  'Sentiment pivot on',
  'Reach +24% in last 5m on',
  'Cross-platform mirror of',
  'Pre-viral threshold crossed on',
  'Bias spike detected on',
]

export default function LiveTicker() {
  const [items, setItems] = useState<TickItem[]>([])

  useEffect(() => {
    const seed = () =>
      fetch('/api/v1/pulse/alerts?limit=20')
        .then(r => r.json())
        .then(d => {
          const alerts = d.alerts ?? []
          const ticks: TickItem[] = alerts.map((a: any, i: number) => {
            const now = new Date(a.timestamp_ms)
            return {
              id: a.signal_id + i,
              time: `${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}`,
              source: a.source,
              message: `${MESSAGES[i % MESSAGES.length]} ${a.title}`,
            }
          })
          if (ticks.length) setItems(ticks)
        })
        .catch(() => {})
    seed()

    const interval = setInterval(() => {
      fetch('/api/v1/pulse/alerts?limit=20')
        .then(r => r.json())
        .then(d => {
          const alerts = d.alerts ?? []
          if (!alerts.length) return
          const a = alerts[Math.floor(Math.random() * alerts.length)]
          const now = new Date()
          const tick: TickItem = {
            id: `t-${Date.now()}`,
            time: `${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}`,
            source: a.source,
            message: `${MESSAGES[Math.floor(Math.random() * MESSAGES.length)]} ${a.title}`,
          }
          setItems(prev => [tick, ...prev].slice(0, 24))
        })
        .catch(() => {})
    }, 3500)
    return () => clearInterval(interval)
  }, [])

  const display = items.length ? items : [
    { id: 'placeholder', time: '--:--', source: 'system', message: 'Awaiting signal data from backend…' }
  ]

  return (
    <div className="fixed bottom-0 inset-x-0 z-30 glass-strong border-t border-white/10">
      <div className="flex items-center px-4 py-2.5 gap-4 overflow-hidden">
        <div className="flex items-center gap-2 shrink-0 font-mono text-[10px] tracking-[0.25em] text-muted-foreground">
          <Radio className="h-3.5 w-3.5 animate-pulse-slow" style={{ color: 'hsl(var(--primary))' }} />
          LIVE FEED
          <span style={{ color: 'hsl(var(--primary))' }}>●</span>
        </div>
        <div className="flex-1 overflow-hidden relative">
          <div className="flex gap-8" style={{ animation: 'ticker 45s linear infinite' }}>
            {[...display, ...display].map((t, i) => (
              <div key={`${t.id}-${i}`} className="flex items-center gap-2 font-mono text-xs whitespace-nowrap">
                <span className="text-muted-foreground">{t.time}</span>
                <span className="font-semibold" style={{ color: SRC_COLOR[t.source] ?? 'hsl(var(--foreground))' }}>
                  {t.source.toUpperCase()}
                </span>
                <span style={{ color: 'hsl(var(--foreground) / 0.8)' }}>{t.message}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="shrink-0 font-mono text-[10px] text-muted-foreground">
          +{display.length} events
        </div>
      </div>
    </div>
  )
}
