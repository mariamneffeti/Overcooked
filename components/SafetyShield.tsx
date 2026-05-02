import { useEffect, useState } from 'react'

interface SafetyResult {
  topic: string
  verdict: 'safe' | 'caution' | 'avoid'
  risk_score: number
  overall_score: number
  toxic_score: number
  controversy_score: number
  reason: string
}

const VERDICT_META = {
  safe:    { icon: '🟢', color: '#22c55e', bg: 'rgba(34,197,94,0.1)' },
  caution: { icon: '🟡', color: '#eab308', bg: 'rgba(234,179,8,0.1)' },
  avoid:   { icon: '🔴', color: '#ef4444', bg: 'rgba(239,68,68,0.1)' },
}

export default function SafetyShield() {
  const [data, setData] = useState<SafetyResult[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = () =>
      fetch('/api/v1/intelligence/brand-safety')
        .then(r => r.json())
        .then(d => { setData(d); setLoading(false) })
        .catch(() => setLoading(false))
    load()
    const t = setInterval(load, 20000)
    return () => clearInterval(t)
  }, [])

  if (loading) return <div style={styles.empty}>Loading safety data…</div>

  if (!data.length) {
    return (
      <div style={styles.allSafe}>
        <span style={{ fontSize: '1.5rem' }}>🛡</span>
        <span style={{ color: '#22c55e', fontSize: '0.85rem', fontWeight: 600 }}>All clear — no active risk signals</span>
      </div>
    )
  }

  const counts = { safe: 0, caution: 0, avoid: 0 }
  data.forEach(d => counts[d.verdict]++)

  return (
    <div>
      <div style={styles.summary}>
        {(['safe', 'caution', 'avoid'] as const).map(v => (
          <div key={v} style={{ ...styles.summaryChip, background: VERDICT_META[v].bg }}>
            <span>{VERDICT_META[v].icon}</span>
            <span style={{ color: VERDICT_META[v].color, fontWeight: 700, fontSize: '0.9rem' }}>{counts[v]}</span>
            <span style={{ color: '#64748b', fontSize: '0.7rem', textTransform: 'capitalize' }}>{v}</span>
          </div>
        ))}
      </div>

      <div style={styles.list}>
        {data.slice(0, 6).map((item, i) => {
          const m = VERDICT_META[item.verdict]
          return (
            <div key={i} style={styles.row}>
              <span style={{ fontSize: '0.9rem' }}>{m.icon}</span>
              <span style={styles.topic} title={item.topic}>{item.topic}</span>
              <div style={styles.barWrap}>
                <div style={{ ...styles.bar, width: `${Math.round(item.risk_score * 100)}%`, background: m.color }} />
              </div>
              <span style={{ ...styles.pct, color: m.color }}>
                {Math.round(item.risk_score * 100)}%
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  empty: { color: '#64748b', fontSize: '0.8rem', padding: '0.5rem 0' },
  allSafe: {
    display: 'flex', flexDirection: 'column', alignItems: 'center',
    gap: '0.5rem', padding: '1rem 0', textAlign: 'center',
  },
  summary: { display: 'flex', gap: '0.5rem', marginBottom: '1rem' },
  summaryChip: {
    flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center',
    gap: '0.15rem', padding: '0.5rem', borderRadius: 8,
  },
  list: { display: 'flex', flexDirection: 'column', gap: '0.4rem' },
  row: {
    display: 'flex', alignItems: 'center', gap: '0.5rem',
    padding: '0.3rem 0', borderBottom: '1px solid rgba(255,255,255,0.04)',
  },
  topic: {
    flex: 1, fontSize: '0.75rem', color: '#cbd5e1',
    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', minWidth: 0,
  },
  barWrap: { width: 50, height: 4, background: '#0f172a', borderRadius: 2, overflow: 'hidden', flexShrink: 0 },
  bar: { height: '100%', borderRadius: 2, transition: 'width 0.5s ease' },
  pct: { fontSize: '0.7rem', fontWeight: 700, minWidth: 32, textAlign: 'right' },
}
