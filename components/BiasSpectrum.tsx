import { useEffect, useState } from 'react'

interface HeatmapData {
  signal_id: string
  topic: string
  yt_sensationalism_score: number
  trends_alignment_score: number
  institutional_gap_score: number
  composite_score: number
  intensity_label: 'hot_red' | 'cool_blue' | 'neutral'
  blindspot_detected: boolean
  blindspot_reason: string
  outlier_outlet: string | null
  timestamp: number
}

const LABEL_META: Record<string, { color: string; bg: string; label: string }> = {
  hot_red:   { color: '#ef4444', bg: 'rgba(239,68,68,0.12)',  label: '🔴 Hot Red — Sensationalism risk' },
  cool_blue: { color: '#38bdf8', bg: 'rgba(56,189,248,0.12)', label: '🔵 Cool Blue — Trends-dominant' },
  neutral:   { color: '#94a3b8', bg: 'rgba(148,163,184,0.08)',label: '⚪ Neutral' },
}

function Meter({ value, color, label }: { value: number; color: string; label: string }) {
  const pct = Math.round(Math.abs(value) * 100)
  return (
    <div style={{ marginBottom: '0.6rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
        <span style={{ fontSize: '0.72rem', color: '#94a3b8' }}>{label}</span>
        <span style={{ fontSize: '0.72rem', color, fontWeight: 700 }}>{pct}%</span>
      </div>
      <div style={{ height: 5, background: '#0f172a', borderRadius: 3, overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${pct}%`, background: color, borderRadius: 3, transition: 'width 0.6s ease' }} />
      </div>
    </div>
  )
}

export default function BiasSpectrum() {
  const [data, setData] = useState<HeatmapData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = () =>
      fetch('/api/v1/intelligence/heatmap')
        .then(r => r.json())
        .then(d => { setData(d); setLoading(false) })
        .catch(() => setLoading(false))
    load()
    const t = setInterval(load, 15000)
    return () => clearInterval(t)
  }, [])

  if (loading) return <div style={{ color: '#64748b', fontSize: '0.8rem' }}>Loading heatmap…</div>

  if (!data || !data.signal_id) {
    return <div style={{ color: '#64748b', fontSize: '0.8rem' }}>No signals available yet. Ingest data to see the bias spectrum.</div>
  }

  const meta = LABEL_META[data.intensity_label] ?? LABEL_META.neutral
  const composite = Math.round(Math.abs(data.composite_score) * 100)

  return (
    <div>
      <div style={{ ...styles.badge, background: meta.bg, borderColor: meta.color, color: meta.color }}>
        {meta.label}
      </div>
      <div style={styles.topicRow}>
        <span style={styles.topicLabel}>Topic:</span>
        <span style={styles.topicValue}>{data.topic}</span>
      </div>

      <div style={{ marginTop: '1rem' }}>
        <Meter value={data.yt_sensationalism_score} color="#f97316" label="YT Sensationalism" />
        <Meter value={data.institutional_gap_score} color="#a855f7" label="Institutional Gap" />
        <Meter value={Math.abs(data.composite_score)} color={meta.color} label="Composite Score" />
      </div>

      {data.blindspot_detected && (
        <div style={styles.blindspot}>
          <span style={{ fontWeight: 600, color: '#fbbf24' }}>⚠ Blindspot detected</span>
          <p style={{ margin: '0.25rem 0 0', fontSize: '0.72rem', color: '#94a3b8' }}>{data.blindspot_reason}</p>
        </div>
      )}
      {data.outlier_outlet && (
        <div style={styles.pill}>Outlier outlet: <strong>{data.outlier_outlet}</strong></div>
      )}
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  badge: {
    display: 'inline-block', padding: '0.25rem 0.65rem',
    borderRadius: 20, border: '1px solid', fontSize: '0.75rem',
    fontWeight: 600, marginBottom: '0.75rem',
  },
  topicRow: { display: 'flex', alignItems: 'baseline', gap: '0.4rem' },
  topicLabel: { fontSize: '0.7rem', color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em' },
  topicValue: { fontSize: '0.85rem', color: '#e2e8f0', fontWeight: 600 },
  blindspot: {
    marginTop: '0.75rem', padding: '0.6rem 0.8rem',
    background: 'rgba(251,191,36,0.08)', borderRadius: 8, border: '1px solid rgba(251,191,36,0.2)',
  },
  pill: {
    marginTop: '0.5rem', fontSize: '0.72rem', color: '#64748b',
  },
}
