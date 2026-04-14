/**
 * CampaignExplainer — explains WHY a set of incidents were clustered together.
 * Pulls from cluster metadata + correlation pairs to surface shared signals.
 */

const CLUSTER_COLORS = [
  '#f59e0b', '#a855f7', '#00ff88', '#ff7b7b', '#38bdf8',
  '#fb7185', '#34d399', '#fbbf24', '#c084fc', '#f97316',
];

function getClusterColor(clusterId) {
  if (clusterId === null || clusterId === undefined) return '#3d3218';
  return CLUSTER_COLORS[clusterId % CLUSTER_COLORS.length];
}

function cohesionVerdict(score) {
  if (score >= 0.85) return { label: 'Confirmed campaign', detail: 'Algorithm is highly certain these incidents share the same threat actor or campaign.' };
  if (score >= 0.68) return { label: 'Highly likely',      detail: 'Strong evidence of coordinated activity — treat as a confirmed campaign pending investigation.' };
  if (score >= 0.50) return { label: 'Probable',           detail: 'Incidents share enough signals to warrant treating this as a related campaign.' };
  if (score >= 0.30) return { label: 'Possible',           detail: 'Some overlap in TTPs or infrastructure — investigate before concluding it is coordinated.' };
  return                    { label: 'Weak signal',        detail: 'Minimal shared indicators — may be coincidental. Monitor for additional activity.' };
}

function humanTimeSpan(hours) {
  if (hours < 1)    return 'less than 1 hour';
  if (hours < 24)   return `${Math.round(hours)} hour${Math.round(hours) !== 1 ? 's' : ''}`;
  if (hours < 168)  return `${Math.round(hours / 24)} day${Math.round(hours / 24) !== 1 ? 's' : ''}`;
  return `${Math.round(hours / 168)} week${Math.round(hours / 168) !== 1 ? 's' : ''}`;
}

function getSharedEntities(cluster, correlations) {
  if (!correlations?.pairs) return [];
  const ids = new Set(cluster.incident_ids);
  // Count distinct incidents (not pairs) each entity appears in
  const entityIncidents = {};
  for (const pair of correlations.pairs) {
    if (ids.has(pair.a) && ids.has(pair.b)) {
      for (const e of (pair.shared_entities || [])) {
        if (!entityIncidents[e]) entityIncidents[e] = new Set();
        entityIncidents[e].add(pair.a);
        entityIncidents[e].add(pair.b);
      }
    }
  }
  return Object.entries(entityIncidents)
    .map(([entity, incSet]) => ({ entity, count: incSet.size }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 6);
}

function Tag({ children, color = '#f59e0b' }) {
  return (
    <span style={{
      padding: '2px 8px', borderRadius: '4px', fontSize: '11px', fontFamily: 'monospace',
      backgroundColor: `${color}18`, border: `1px solid ${color}44`, color,
      whiteSpace: 'nowrap',
    }}>{children}</span>
  );
}

function Row({ label, children }) {
  return (
    <div style={{ padding: '10px 0', borderBottom: '1px solid var(--border)' }}>
      <div style={{ fontSize: '10px', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '5px' }}>{label}</div>
      {children}
    </div>
  );
}

export default function CampaignExplainer({ cluster, correlations }) {
  if (!cluster) return null;

  const color = getClusterColor(cluster.id);
  const cohesion = cohesionVerdict(cluster.cohesion);
  const sharedEntities = getSharedEntities(cluster, correlations);
  const timeSpan = humanTimeSpan(cluster.time_span_hours);

  const sevOrder = ['High', 'Medium', 'Low', 'Informational'];
  const sevColors = { High: '#ff7b7b', Medium: '#ffaa33', Low: '#f59e0b', Informational: '#5a7a9a' };
  const sevEntries = sevOrder.filter(s => cluster.severity_breakdown?.[s] > 0);

  return (
    <div style={{
      backgroundColor: 'var(--bg-primary)',
      border: `1px solid ${color}44`,
      borderRadius: '8px',
      padding: '16px 20px',
      marginTop: '12px',
    }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '4px' }}>
        <div style={{
          width: '10px', height: '10px', borderRadius: '50%',
          backgroundColor: color, flexShrink: 0,
        }} />
        <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)' }}>
          {cluster.label}
        </div>
        <div style={{ marginLeft: 'auto', fontSize: '11px', color: 'var(--text-secondary)', fontFamily: 'monospace' }}>
          {cluster.size} incident{cluster.size !== 1 ? 's' : ''} · {timeSpan}
        </div>
      </div>

      {/* Plain-English summary */}
      <div style={{
        fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.6,
        marginBottom: '12px', paddingLeft: '22px',
      }}>
        {cluster.size} incidents were grouped together because they share{' '}
        {cluster.top_techniques.length > 0
          ? <>the techniques <strong style={{ color: 'var(--text-primary)' }}>{cluster.top_techniques.slice(0, 3).join(', ')}</strong></>
          : 'overlapping attack signals'
        }
        {sharedEntities.length > 0 && (
          <>, reuse of the same {sharedEntities.length === 1 ? 'entity' : 'entities'} (
            <strong style={{ color: 'var(--text-primary)' }}>
              {sharedEntities.slice(0, 2).map(e => e.entity).join(', ')}
            </strong>)
          </>
        )}
        , and occurred within <strong style={{ color: 'var(--text-primary)' }}>{timeSpan}</strong> of each other.
      </div>

      {/* Detail rows */}
      <Row label="Why clustered">
        <div style={{ fontSize: '12px', color, fontWeight: 600, marginBottom: '2px' }}>{cohesion.label} ({Math.round(cluster.cohesion * 100)}% cohesion)</div>
        <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{cohesion.detail}</div>
      </Row>

      <Row label="Shared MITRE techniques">
        {cluster.top_techniques.length > 0 ? (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
            {cluster.top_techniques.map(t => (
              <a
                key={t}
                href={`https://attack.mitre.org/techniques/${t.replace('.', '/')}`}
                target="_blank"
                rel="noreferrer"
                style={{ textDecoration: 'none' }}
              >
                <Tag color="var(--accent)">{t} ↗</Tag>
              </a>
            ))}
          </div>
        ) : (
          <span style={{ fontSize: '12px', color: 'var(--text-secondary)', fontStyle: 'italic' }}>No MITRE techniques mapped</span>
        )}
      </Row>

      {sharedEntities.length > 0 && (
        <Row label="Shared entities (hashed)">
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
            {sharedEntities.map(({ entity, count }) => (
              <span key={entity} style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <Tag color={color}>{entity}</Tag>
                <span style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>×{count}</span>
              </span>
            ))}
          </div>
          <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '5px' }}>
            Same compromised account, host, or IP seen across multiple incidents
          </div>
        </Row>
      )}

      <Row label="Time window">
        <div style={{ fontSize: '12px', color: 'var(--text-primary)' }}>
          All incidents occurred within <strong>{timeSpan}</strong> of each other
        </div>
        <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '2px' }}>
          {cluster.time_span_hours < 24
            ? 'Tight time window — consistent with a fast-moving, targeted attack.'
            : cluster.time_span_hours < 72
            ? 'Multi-day campaign — attacker may have established persistence.'
            : 'Extended campaign — dwell time detected, thorough investigation recommended.'}
        </div>
      </Row>

      <Row label="Severity breakdown">
        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
          {sevEntries.map(sev => (
            <Tag key={sev} color={sevColors[sev]}>
              {sev} {cluster.severity_breakdown[sev]}
            </Tag>
          ))}
        </div>
      </Row>

      <Row label="Incident IDs in this campaign">
        <div style={{ fontSize: '11px', fontFamily: 'monospace', color: 'var(--text-mono)', lineHeight: 2 }}>
          {cluster.incident_ids.join('  ·  ')}
        </div>
      </Row>

    </div>
  );
}
