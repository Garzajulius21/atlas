const PRIORITY_STYLES = {
  Critical: { bg: 'rgba(255,68,68,0.12)',  border: 'rgba(255,68,68,0.35)',  text: '#ff7b7b',  dot: '#ff4444' },
  High:     { bg: 'rgba(255,149,0,0.12)',  border: 'rgba(255,149,0,0.35)',  text: '#ffaa33',  dot: '#ff9500' },
  Medium:   { bg: 'rgba(245,158,11,0.08)',  border: 'rgba(245,158,11,0.25)',  text: '#f59e0b',  dot: '#f59e0b' },
  Low:      { bg: 'rgba(90,122,154,0.1)', border: 'rgba(90,122,154,0.25)', text: '#5a7a9a',  dot: '#5a7a9a' },
};

const SOURCE_ICONS = {
  'Technique Frequency': '🔍',
  'Cluster Analysis':    '🔗',
  'MITRE Gap':           '⚠️',
  'Departmental Risk':   '🏢',
};

function RecommendCard({ rec, index }) {
  const p = PRIORITY_STYLES[rec.priority] || PRIORITY_STYLES.Low;
  return (
    <div style={{
      padding: '14px 16px',
      backgroundColor: 'var(--bg-primary)',
      border: `1px solid ${p.border}`,
      borderRadius: '8px',
      display: 'flex',
      gap: '14px',
    }}>
      {/* Index */}
      <div style={{
        width: '28px', height: '28px', borderRadius: '5px', flexShrink: 0,
        backgroundColor: p.bg, border: `1px solid ${p.border}`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: '12px', fontWeight: 700, color: p.text, fontFamily: 'monospace'
      }}>
        {index + 1}
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        {/* Title row */}
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', marginBottom: '6px', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)', flex: 1 }}>{rec.title}</span>
          <div style={{ display: 'flex', gap: '6px', flexShrink: 0 }}>
            <span style={{
              padding: '2px 8px', borderRadius: '4px', fontSize: '10px', fontWeight: 700, fontFamily: 'monospace',
              backgroundColor: p.bg, border: `1px solid ${p.border}`, color: p.text
            }}>{rec.priority}</span>
            <span style={{
              padding: '2px 8px', borderRadius: '4px', fontSize: '10px', fontFamily: 'monospace',
              backgroundColor: 'var(--bg-input)', border: '1px solid var(--border)', color: 'var(--text-secondary)'
            }}>{rec.control}</span>
          </div>
        </div>

        {/* Detail */}
        <div style={{ fontSize: '12px', color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: '8px' }}>
          {rec.detail}
        </div>

        {/* Evidence */}
        <div style={{ fontSize: '11px', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span>{SOURCE_ICONS[rec.source] || '·'}</span>
          <span style={{ fontFamily: 'monospace', color: 'var(--text-mono)' }}>{rec.source}</span>
          {rec.evidence && (
            <>
              <span style={{ color: 'var(--border-hi)' }}>·</span>
              <span>{rec.evidence}</span>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default function RecommendPanel({ data }) {
  if (!data) return null;
  const { recommendations, total } = data;

  const counts = (recommendations || []).reduce((acc, r) => {
    acc[r.priority] = (acc[r.priority] || 0) + 1;
    return acc;
  }, {});

  return (
    <div style={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: '10px', overflow: 'hidden' }}>

      {/* Header */}
      <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
        <div style={{ fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--text-secondary)' }}>
          Hardening Recommendations
        </div>
        <div style={{ display: 'flex', gap: '10px', marginLeft: 'auto' }}>
          {['Critical', 'High', 'Medium'].map(p => {
            const c = counts[p] || 0;
            const s = PRIORITY_STYLES[p];
            if (!c) return null;
            return (
              <span key={p} style={{
                fontSize: '11px', fontFamily: 'monospace',
                padding: '2px 8px', borderRadius: '4px',
                backgroundColor: s.bg, border: `1px solid ${s.border}`, color: s.text
              }}>{c} {p}</span>
            );
          })}
          <span style={{ fontSize: '12px', fontFamily: 'monospace', color: 'var(--text-secondary)' }}>{total} total</span>
        </div>
      </div>

      <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {!recommendations || recommendations.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '32px', color: 'var(--text-secondary)', fontSize: '13px' }}>
            No recommendations generated. Upload incident data to run analysis.
          </div>
        ) : (
          recommendations.map((rec, i) => <RecommendCard key={i} rec={rec} index={i} />)
        )}
      </div>
    </div>
  );
}
