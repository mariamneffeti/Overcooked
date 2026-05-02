import Link from 'next/link'
import { useRouter } from 'next/router'
import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { Activity, Radar, Brain, ShieldAlert, ScrollText } from 'lucide-react'

const NAV = [
  { href: '/dash',     label: 'Tactical Radar',  icon: Radar },
  { href: '/intel',    label: 'Intelligence',     icon: Brain },
  { href: '/briefing', label: 'Strategist',       icon: ScrollText },
  { href: '/safety',   label: 'Safety Radar',     icon: ShieldAlert },
]

export default function AppHeader() {
  const { pathname } = useRouter()
  const [liveCount, setLiveCount] = useState(0)
  const [alertCount, setAlertCount] = useState(0)

  useEffect(() => {
    const load = () =>
      fetch('/api/v1/pulse/alerts?limit=50')
        .then(r => r.json())
        .then(d => {
          setLiveCount(d.total ?? 0)
          setAlertCount(d.alerts?.filter((a: any) => a.pre_viral).length ?? 0)
        })
        .catch(() => {})
    load()
    const t = setInterval(load, 10000)
    return () => clearInterval(t)
  }, [])

  return (
    <header className="sticky top-0 z-40 glass-strong border-b border-white/10">
      <div className="flex items-center gap-4 px-4 py-3">
        <Link href="/" className="flex items-center gap-2.5 group shrink-0">
          <div className="relative h-8 w-8 rounded-md grid place-items-center overflow-hidden"
               style={{ background: 'linear-gradient(135deg, hsl(var(--primary)), hsl(var(--magma)))' }}>
            <Activity className="h-4 w-4 text-black relative z-10" strokeWidth={2.5} />
          </div>
          <div className="leading-tight hidden sm:block">
            <div className="font-mono text-[10px] tracking-[0.3em] text-muted-foreground">DECODE-TN</div>
            <div className="font-semibold tracking-tight text-sm">
              Cultural <span className="text-gradient-cyan">Command</span>
            </div>
          </div>
        </Link>

        <nav className="flex items-center gap-1 ml-1 min-w-0">
          {NAV.map(item => {
            const active = pathname === item.href || (item.href === '/dash' && pathname === '/')
            const Icon = item.icon
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`relative px-2.5 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-all ${
                  active ? 'text-primary' : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <Icon className="h-4 w-4 shrink-0" />
                <span className="hidden xl:inline">{item.label}</span>
                {active && (
                  <motion.div
                    layoutId="nav-active"
                    className="absolute inset-0 rounded-lg -z-10"
                    style={{ background: 'hsl(var(--primary) / 0.1)', border: '1px solid hsl(var(--primary) / 0.3)' }}
                    transition={{ type: 'spring', duration: 0.5 }}
                  />
                )}
              </Link>
            )
          })}
        </nav>

        <div className="ml-auto flex items-center gap-2 font-mono text-xs shrink-0">
          <div className="hidden md:flex items-center gap-2 px-2.5 py-1.5 rounded-md"
               style={{ background: 'hsl(var(--primary) / 0.05)', border: '1px solid hsl(var(--primary) / 0.2)' }}>
            <span className="h-2 w-2 rounded-full glow-cyan animate-pulse-slow"
                  style={{ background: 'hsl(var(--primary))' }} />
            <span className="text-muted-foreground">LIVE</span>
            <span className="tabular-nums">{liveCount}</span>
          </div>
          {alertCount > 0 && (
            <div className="flex items-center gap-1.5 px-2 py-1.5 rounded-md"
                 style={{ background: 'hsl(var(--magma) / 0.1)', border: '1px solid hsl(var(--magma) / 0.3)', color: 'hsl(var(--magma))' }}>
              <ShieldAlert className="h-3.5 w-3.5" />
              <span className="tabular-nums">{alertCount}</span>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}
