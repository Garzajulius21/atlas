const TACTIC_ORDER = [
  'TA0001', 'TA0002', 'TA0003', 'TA0004', 'TA0005', 'TA0006',
  'TA0007', 'TA0008', 'TA0009', 'TA0010', 'TA0011', 'TA0040',
];

function TacticCell({ tactic }) {
  const covered = tactic.count > 0;
  const intensity = covered ? Math.min(tactic.count / 10, 1) : 0;

  return (
    <div style={{
      padding: '10px',
      borderRadius: '6px',
      border: covered
        ? `1px solid rgba(168,85,247,${0.25 + intensity * 0.5})`
        : '1px solid var(--border)',
      backgroundColor: covered
        ? `rgba(168,85,247,${0.06 + intensity * 0.18})`
        : 'var(--bg-primary)',
      cursor: 'default',
      transition: 'all 0.15s',
      minWidth: 0,
    }}>
      <div style={{ fontSize: '10px', fontFamily: 'monospace', color: covered ? '#a855f7' : 'var(--border-hi)', marginBottom: '4px' }}>
        {tactic.id}
      </div>
      <div style={{ fontSize: '11px', fontWeight: 600, color: covered ? 'var(--text-primary)' : 'var(--text-secondary)', marginBottom: '6px', lineHeight: 1.3 }}>
        {tactic.name}
      </div>
      {covered ? (
        <div style={{ fontSize: '16px', fontWeight: 700, fontFamily: 'monospace', color: '#a855f7' }}>
          {tactic.count}
          <span style={{ fontSize: '10px', color: 'var(--text-secondary)', fontWeight: 400, marginLeft: '4px' }}>incidents</span>
        </div>
      ) : (
        <div style={{ fontSize: '11px', color: 'var(--border-hi)', fontStyle: 'italic' }}>No coverage</div>
      )}
      {tactic.techniques.length > 0 && (
        <div style={{ marginTop: '6px', display: 'flex', flexWrap: 'wrap', gap: '3px' }}>
          {tactic.techniques.slice(0, 4).map(t => (
            <span key={t} style={{
              padding: '1px 5px', borderRadius: '3px', fontSize: '9px', fontFamily: 'monospace',
              backgroundColor: 'rgba(168,85,247,0.15)', color: '#a855f7'
            }}>{t}</span>
          ))}
        </div>
      )}
    </div>
  );
}

export default function MitrePanel({ data }) {
  if (!data) return null;
  const { tactic_coverage, top_techniques, covered_tactics, gap_tactics, total_unique_techniques } = data;

  const tacticMap = Object.fromEntries((tactic_coverage || []).map(t => [t.id, t]));

  return (
    <div style={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: '10px', overflow: 'hidden' }}>

      {/* Header */}
      <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
        <div style={{ fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--text-secondary)' }}>
          MITRE ATT&CK Coverage
        </div>
        <div style={{ display: 'flex', gap: '12px', marginLeft: 'auto', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '12px', fontFamily: 'monospace', color: '#a855f7' }}>{covered_tactics?.length || 0} tactics covered</span>
          <span style={{ fontSize: '12px', fontFamily: 'monospace', color: '#ff7b7b' }}>{gap_tactics?.length || 0} gaps</span>
          <span style={{ fontSize: '12px', fontFamily: 'monospace', color: 'var(--text-secondary)' }}>{total_unique_techniques} unique techniques</span>
        </div>
      </div>

      <div style={{ padding: '16px' }}>
        {/* Tactic grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: '8px', marginBottom: '20px' }}>
          {TACTIC_ORDER.map(id => {
            const tactic = tacticMap[id];
            return tactic ? <TacticCell key={id} tactic={tactic} /> : null;
          })}
        </div>

        {/* Top techniques table */}
        {top_techniques?.length > 0 && (
          <div>
            <div style={{ fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-secondary)', marginBottom: '10px' }}>
              Top Techniques by Frequency
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              {top_techniques.map((item, i) => {
                const barPct = top_techniques[0].count > 0 ? (item.count / top_techniques[0].count) * 100 : 0;
                return (
                  <div key={item.technique} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '6px 10px', backgroundColor: i % 2 === 0 ? 'var(--bg-primary)' : 'transparent', borderRadius: '4px' }}>
                    <span style={{ fontFamily: 'monospace', fontSize: '11px', color: '#a855f7', minWidth: '60px' }}>{item.technique}</span>
                    <div style={{ flex: 1, height: '4px', backgroundColor: 'var(--border)', borderRadius: '2px' }}>
                      <div style={{ width: `${barPct}%`, height: '100%', backgroundColor: '#a855f7', borderRadius: '2px', opacity: 0.7 }} />
                    </div>
                    <span style={{ fontSize: '11px', fontFamily: 'monospace', color: 'var(--text-primary)', minWidth: '24px', textAlign: 'right' }}>{item.count}</span>
                    <span style={{ fontSize: '10px', color: 'var(--text-secondary)', minWidth: '140px' }}>{item.tactic_name}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
