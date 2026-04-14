import { useState } from 'react';
import CampaignExplainer from './CampaignExplainer.jsx';
import IncidentDrawer from './IncidentDrawer.jsx';

const SEVERITY_COLORS = {
  High: '#ff7b7b',
  Medium: '#ffaa33',
  Low: '#f59e0b',
  Informational: '#5a7a9a',
};

const SEV_ORDER = ['High', 'Medium', 'Low', 'Informational'];

const CLUSTER_COLORS = [
  '#f97316','#8b5cf6','#2dd4bf','#f43f5e','#38bdf8',
  '#84cc16','#34d399','#fb923c','#a78bfa','#22d3ee',
];

function getClusterColor(clusterId) {
  return CLUSTER_COLORS[clusterId % CLUSTER_COLORS.length];
}

function CohesionBar({ value }) {
  const pct = Math.round(value * 100);
  const color = value >= 0.7 ? '#ff7b7b' : value >= 0.5 ? '#ffaa33' : '#f59e0b';
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
      <div style={{ flex: 1, height: '4px', backgroundColor: 'var(--border)', borderRadius: '2px' }}>
        <div style={{ width: `${pct}%`, height: '100%', backgroundColor: color, borderRadius: '2px', transition: 'width 0.3s' }} />
      </div>
      <span style={{ fontSize: '10px', fontFamily: 'monospace', color, minWidth: '28px' }}>{pct}%</span>
    </div>
  );
}

// Few-compliant horizontal severity bars
function SeverityBars({ breakdown }) {
  const entries = SEV_ORDER.filter(s => breakdown?.[s] > 0).map(s => ({ sev: s, count: breakdown[s] }));
  if (!entries.length) return null;
  const max = Math.max(...entries.map(e => e.count));
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
      {entries.map(({ sev, count }) => (
        <div key={sev} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ width: '86px', fontSize: '10px', color: 'var(--text-secondary)', textAlign: 'right', flexShrink: 0 }}>{sev}</span>
          <div style={{ flex: 1, height: '8px', backgroundColor: 'var(--border)', borderRadius: '2px' }}>
            <div style={{
              width: `${(count / max) * 100}%`, height: '100%',
              backgroundColor: SEVERITY_COLORS[sev], borderRadius: '2px',
              transition: 'width 0.4s',
            }} />
          </div>
          <span style={{ fontSize: '10px', fontFamily: 'monospace', color: SEVERITY_COLORS[sev], width: '14px', flexShrink: 0 }}>{count}</span>
        </div>
      ))}
    </div>
  );
}

function ClusterCard({ cluster, correlations, allIncidents }) {
  const [showWhy, setShowWhy] = useState(false);
  const [selectedIncident, setSelectedIncident] = useState(null);
  const color = getClusterColor(cluster.id);

  const incidentMap = Object.fromEntries((allIncidents || []).map(i => [i.IncidentId, i]));

  return (
    <>
      <div style={{
        backgroundColor: 'var(--bg-primary)',
        border: `1px solid ${color}40`,
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
            backgroundColor: color + '20', border: `1px solid ${color}50`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '13px', fontWeight: 700, color, fontFamily: 'monospace'
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

        {/* Severity bars — horizontal, Few-compliant */}
        <SeverityBars breakdown={cluster.severity_breakdown} />

        {/* MITRE techniques */}
        {cluster.top_techniques.length > 0 && (
          <div>
            <div style={{ fontSize: '10px', color: 'var(--text-secondary)', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Top Techniques</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
              {cluster.top_techniques.map(t => (
                <a
                  key={t}
                  href={`https://attack.mitre.org/techniques/${t.replace('.', '/')}/`}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    padding: '2px 7px', borderRadius: '3px', fontSize: '10px', fontFamily: 'monospace',
                    backgroundColor: 'var(--accent-dim)', border: '1px solid var(--accent-border)',
                    color: 'var(--accent)', textDecoration: 'none', transition: 'border-color 0.15s',
                  }}
                  onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--accent)'}
                  onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--accent-border)'}
                >{t} ↗</a>
              ))}
            </div>
          </div>
        )}

        {/* Incident IDs — clickable */}
        <div>
          <div style={{ fontSize: '10px', color: 'var(--text-secondary)', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
            Incidents
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px' }}>
            {cluster.incident_ids.map(id => {
              const inc = incidentMap[id];
              return (
                <button
                  key={id}
                  onClick={() => inc && setSelectedIncident(inc)}
                  title={inc?.Title || id}
                  style={{
                    padding: '2px 8px', borderRadius: '3px', fontSize: '10px',
                    fontFamily: 'monospace', cursor: inc ? 'pointer' : 'default',
                    backgroundColor: color + '12', border: `1px solid ${color}35`,
                    color, transition: 'all 0.15s',
                  }}
                  onMouseEnter={e => { if (inc) e.currentTarget.style.backgroundColor = color + '25'; }}
                  onMouseLeave={e => { e.currentTarget.style.backgroundColor = color + '12'; }}
                >
                  {id}
                </button>
              );
            })}
          </div>
        </div>

        {/* Why button */}
        <button
          onClick={() => setShowWhy(w => !w)}
          style={{
            width: '100%', padding: '7px', borderRadius: '5px', fontSize: '11px',
            fontWeight: 600, cursor: 'pointer', fontFamily: 'monospace',
            border: `1px solid ${color}50`,
            backgroundColor: showWhy ? color + '20' : 'transparent',
            color, transition: 'all 0.15s',
          }}
        >
          {showWhy ? '▲ Hide explanation' : '▾ Why were these clustered?'}
        </button>

        {showWhy && <CampaignExplainer cluster={cluster} correlations={correlations} />}
      </div>

      {selectedIncident && (
        <IncidentDrawer
          incident={selectedIncident}
          clusters={{ clusters: [cluster] }}
          correlations={correlations}
          allIncidents={allIncidents}
          onClose={() => setSelectedIncident(null)}
        />
      )}
    </>
  );
}

export default function ClusterPanel({ data, correlations, allIncidents }) {
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
          <span style={{ fontSize: '12px', fontFamily: 'monospace', color: 'var(--accent)' }}>{total_clusters} campaign{total_clusters !== 1 ? 's' : ''}</span>
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
            {clusters.map(c => (
              <ClusterCard key={c.id} cluster={c} correlations={correlations} allIncidents={allIncidents} />
            ))}
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
