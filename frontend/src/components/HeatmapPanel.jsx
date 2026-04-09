const SEVERITY_ORDER = ['High', 'Medium', 'Low', 'Informational'];
const SEVERITY_COLORS = {
  High: '#ff7b7b',
  Medium: '#ffaa33',
  Low: '#00d4ff',
  Informational: '#5a7a9a',
};

function RiskBar({ score, maxScore }) {
  const pct = maxScore > 0 ? (score / maxScore) * 100 : 0;
  const color = pct >= 75 ? '#ff4444' : pct >= 50 ? '#ff9500' : pct >= 25 ? '#ffaa33' : '#00d4ff';
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
      <div style={{ flex: 1, height: '6px', backgroundColor: 'var(--border)', borderRadius: '3px' }}>
        <div style={{ width: `${pct}%`, height: '100%', backgroundColor: color, borderRadius: '3px', transition: 'width 0.4s' }} />
      </div>
      <span style={{ fontSize: '11px', fontFamily: 'monospace', color, minWidth: '30px', textAlign: 'right' }}>{score}</span>
    </div>
  );
}

function SevPips({ breakdown }) {
  return (
    <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
      {SEVERITY_ORDER.map(sev => {
        const count = breakdown[sev] || 0;
        if (count === 0) return null;
        return (
          <span key={sev} style={{
            padding: '1px 6px', borderRadius: '3px', fontSize: '10px', fontFamily: 'monospace',
            backgroundColor: `${SEVERITY_COLORS[sev]}18`,
            border: `1px solid ${SEVERITY_COLORS[sev]}44`,
            color: SEVERITY_COLORS[sev]
          }}>
            {sev[0]} {count}
          </span>
        );
      })}
    </div>
  );
}

export default function HeatmapPanel({ data }) {
  if (!data) return null;
  const { departments, max_risk_score, total_departments, unassigned_count } = data;

  return (
    <div style={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: '10px', overflow: 'hidden' }}>

      {/* Header */}
      <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: '16px' }}>
        <div style={{ fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--text-secondary)' }}>
          Departmental Risk
        </div>
        <div style={{ display: 'flex', gap: '12px', marginLeft: 'auto' }}>
          <span style={{ fontSize: '12px', fontFamily: 'monospace', color: 'var(--accent-blue)' }}>{total_departments} dept{total_departments !== 1 ? 's' : ''}</span>
          {unassigned_count > 0 && (
            <span style={{ fontSize: '12px', fontFamily: 'monospace', color: 'var(--text-secondary)' }}>{unassigned_count} unassigned</span>
          )}
        </div>
      </div>

      {/* Table */}
      <div style={{ padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {departments.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '24px', color: 'var(--text-secondary)', fontSize: '13px' }}>
            No department data available. Add a "Department" column to your CSV to enable this view.
          </div>
        ) : (
          departments.map((dept, i) => (
            <div key={dept.name} style={{
              display: 'grid',
              gridTemplateColumns: '180px 1fr 200px 180px',
              alignItems: 'center',
              gap: '16px',
              padding: '10px 14px',
              backgroundColor: i % 2 === 0 ? 'var(--bg-primary)' : 'transparent',
              borderRadius: '6px',
            }}>
              {/* Rank + name */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{
                  width: '20px', height: '20px', borderRadius: '4px', fontSize: '10px', fontWeight: 700,
                  backgroundColor: i === 0 ? 'rgba(255,68,68,0.15)' : 'var(--border)',
                  color: i === 0 ? '#ff7b7b' : 'var(--text-secondary)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'monospace', flexShrink: 0
                }}>{i + 1}</span>
                <span style={{ fontSize: '13px', color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {dept.name}
                </span>
              </div>

              {/* Risk bar */}
              <RiskBar score={dept.risk_score} maxScore={max_risk_score} />

              {/* Severity pips */}
              <SevPips breakdown={dept.severity_breakdown} />

              {/* Top techniques */}
              <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                {dept.top_techniques.slice(0, 3).map(t => (
                  <span key={t} style={{
                    padding: '1px 5px', borderRadius: '3px', fontSize: '9px', fontFamily: 'monospace',
                    backgroundColor: 'rgba(168,85,247,0.1)', border: '1px solid rgba(168,85,247,0.25)', color: '#a855f7'
                  }}>{t}</span>
                ))}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
