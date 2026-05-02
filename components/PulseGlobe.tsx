import { useEffect, useState } from 'react'

interface GeoSnapshot {
  region: string
  active_signals: number
  avg_velocity: number
  top_topic: string
}

const velocityColor = (v: number) => {
  if (v >= 85) return '#ef4444'
  if (v >= 70) return '#f97316'
  if (v >= 55) return '#eab308'
  return '#22c55e'
}

export default function PulseGlobe() {
  const [data, setData] = useState<GeoSnapshot[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/v1/pulse/geo')
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false) })
      .catch(() => { setError('Could not reach backend'); setLoading(false) })

    const interval = setInterval(() => {
      fetch('/api/v1/pulse/geo')
        .then(r => r.json())
        .then(d => setData(d))
        .catch(() => {})
    }, 10000)
    return () => clearInterval(interval)
  }, [])

  if (loading) return <div style={styles.empty}>Loading geo data…</div>
  if (error) return <div style={{ ...styles.empty, color: '#f87171' }}>{error}</div>
  if (!data.length) return <div style={styles.empty}>No active signal regions yet.</div>

  const sorted = [...data].sort((a, b) => b.avg_velocity - a.avg_velocity)

  return (
    <div style={styles.wrapper}>
      {sorted.map(item => (
        <div key={item.region} style={styles.row}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flex: 1, minWidth: 0 }}>
            <span style={{ ...styles.dot, background: velocityColor(item.avg_velocity) }} />
            <span style={styles.regionCode}>{item.region}</span>
            <span style={styles.topic} title={item.top_topic}>{item.top_topic}</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexShrink: 0 }}>
            <div style={styles.barTrack}>
              <div style={{ ...styles.barFill, width: `${item.avg_velocity}%`, background: velocityColor(item.avg_velocity) }} />
            </div>
            <span style={{ ...styles.score, color: velocityColor(item.avg_velocity) }}>
              {item.avg_velocity.toFixed(1)}
            </span>
          </div>
        </div>
      ))}
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  wrapper: { display: 'flex', flexDirection: 'column', gap: '0.5rem' },
  empty: { color: '#64748b', fontSize: '0.8rem', padding: '0.5rem 0' },
  row: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    gap: '0.5rem', padding: '0.4rem 0',
    borderBottom: '1px solid rgba(255,255,255,0.05)',
  },
  dot: { width: 8, height: 8, borderRadius: '50%', flexShrink: 0 },
  regionCode: { fontSize: '0.75rem', fontWeight: 700, color: '#94a3b8', minWidth: 48, flexShrink: 0 },
  topic: {
    fontSize: '0.78rem', color: '#cbd5e1',
    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
  },
  barTrack: { width: 60, height: 4, background: '#1e293b', borderRadius: 2, overflow: 'hidden' },
  barFill: { height: '100%', borderRadius: 2, transition: 'width 0.5s ease' },
  score: { fontSize: '0.75rem', fontWeight: 700, minWidth: 36, textAlign: 'right' },
}
