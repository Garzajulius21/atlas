import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';

const SEVERITY_COLORS = {
  High: '#ff7b7b',
  Medium: '#ffaa33',
  Low: '#00d4ff',
  Informational: '#5a7a9a',
};

const PRIORITY_COLORS = {
  Critical: '#ff4444',
  High: '#ff9500',
  Medium: '#00d4ff',
  Low: '#5a7a9a',
};

function CohesionBar({ value }) {
  const pct = Math.round(value * 100);
  const color = value >= 0.7 ? '#ff7b7b' : value >= 0.5 ? '#ffaa33' : '#00d4ff';
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
      <div style={{ flex: 1, height: '4px', backgroundColor: 'var(--border)', borderRadius: '2px' }}>
        <div style={{ width: `${pct}%`, height: '100%', backgroundColor: color, borderRadius: '2px', transition: 'width 0.3s' }} />
      </div>
      <span style={{ fontSize: '10px', fontFamily: 'monospace', color, minWidth: '28px' }}>{pct}%</span>
    </div>
  );
}

function ClusterCard({ cluster }) {
  const sevData = Object.entries(cluster.severity_breakdown)
    .filter(([, v]) => v > 0)
    .map(([sev, count]) => ({ sev, count, fill: SEVERITY_COLORS[sev] }));

  return (
    <div style={{
      backgroundColor: 'var(--bg-primary)',
      border: '1px solid var(--border)',
      borderRadius: '8px',
      padding: '16px',
      display: 'flex',
      flexDirection: 'column',
      gap: '12px'
    }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        <div style={{
          width: '32px', height: '32px', borderRadius: '6px',
          backgroundColor: 'rgba(168,85,247,0.15)', border: '1px solid rgba(168,85,247,0.35)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '13px', fontWeight: 700, color: '#a855f7', fontFamily: 'monospace'
        }}>
          {cluster.id + 1}
        </div>
        <div>
          <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>{cluster.label}</div>
          <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
            {cluster.size} incident{cluster.size !== 1 ? 's' : ''} · {cluster.time_span_hours.toFixed(0)}h span
          </div>
        </div>
        <div style={{ marginLeft: 'auto', textAlign: 'right' }}>
          <div style={{ fontSize: '10px', color: 'var(--text-secondary)', marginBottom: '2px' }}>Cohesion</div>
          <div style={{ width: '100px' }}>
            <CohesionBar value={cluster.cohesion} />
          </div>
        </div>
      </div>

      {/* Severity bar chart */}
      {sevData.length > 0 && (
        <ResponsiveContainer width="100%" height={60}>
          <BarChart data={sevData} margin={{ top: 0, right: 0, bottom: 0, left: -20 }}>
            <XAxis dataKey="sev" tick={{ fontSize: 10, fill: '#5a7a9a' }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 9, fill: '#5a7a9a' }} axisLine={false} tickLine={false} />
            <Tooltip
              contentStyle={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: '6px', fontSize: '11px' }}
              cursor={{ fill: 'rgba(255,255,255,0.04)' }}
            />
            <Bar dataKey="count" radius={[3, 3, 0, 0]}>
              {sevData.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      )}

      {/* MITRE techniques */}
      {cluster.top_techniques.length > 0 && (
        <div>
          <div style={{ fontSize: '10px', color: 'var(--text-secondary)', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Top Techniques</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
            {cluster.top_techniques.map(t => (
              <span key={t} style={{
                padding: '2px 7px', borderRadius: '3px', fontSize: '10px', fontFamily: 'monospace',
                backgroundColor: 'rgba(168,85,247,0.12)', border: '1px solid rgba(168,85,247,0.3)', color: '#a855f7'
              }}>{t}</span>
            ))}
          </div>
        </div>
      )}

      {/* Incident IDs */}
      <div>
        <div style={{ fontSize: '10px', color: 'var(--text-secondary)', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Incident IDs</div>
        <div style={{ fontSize: '10px', fontFamily: 'monospace', color: 'var(--text-mono)', lineHeight: 1.8 }}>
          {cluster.incident_ids.slice(0, 6).join('  ·  ')}
          {cluster.incident_ids.length > 6 && <span style={{ color: 'var(--text-secondary)' }}> +{cluster.incident_ids.length - 6} more</span>}
        </div>
      </div>
    </div>
  );
}

export default function ClusterPanel({ data }) {
  if (!data) return null;
  const { clusters, noise, total_clusters, total_noise } = data;

  return (
    <div style={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: '10px', overflow: 'hidden' }}>

      {/* Header */}
      <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: '16px' }}>
        <div style={{ fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--text-secondary)' }}>
          Campaign Clusters
        </div>
        <div style={{ display: 'flex', gap: '12px', marginLeft: 'auto' }}>
          <span style={{ fontSize: '12px', fontFamily: 'monospace', color: '#a855f7' }}>{total_clusters} campaign{total_clusters !== 1 ? 's' : ''}</span>
          <span style={{ fontSize: '12px', fontFamily: 'monospace', color: 'var(--text-secondary)' }}>{total_noise} isolated</span>
        </div>
      </div>

      <div style={{ padding: '16px' }}>
        {clusters.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '32px', color: 'var(--text-secondary)', fontSize: '13px' }}>
            No campaign clusters detected. Try uploading more incidents or lowering the correlation threshold.
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '12px' }}>
            {clusters.map(c => <ClusterCard key={c.id} cluster={c} />)}
          </div>
        )}

        {/* Noise summary */}
        {noise.length > 0 && (
          <div style={{ marginTop: '12px', padding: '10px 14px', backgroundColor: 'var(--bg-primary)', border: '1px solid var(--border)', borderRadius: '6px' }}>
            <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '4px' }}>
              Isolated incidents ({noise.length}) — not part of any campaign
            </div>
            <div style={{ fontSize: '10px', fontFamily: 'monospace', color: 'var(--text-mono)' }}>
              {noise.slice(0, 8).join('  ·  ')}{noise.length > 8 ? ` +${noise.length - 8} more` : ''}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
