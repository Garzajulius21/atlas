/**
 * CampaignsTab — Campaign intelligence view modeled after enterprise SIEM tools
 * (Splunk ES, CrowdStrike Falcon, Microsoft Sentinel).
 *
 * One expandable table row per campaign. No dot-clicking. Full-width hit targets.
 * Expanded row shows incident list, affected departments, MITRE, and explainer.
 */

import { useState } from 'react';
import CampaignExplainer from './CampaignExplainer.jsx';
import IncidentDrawer from './IncidentDrawer.jsx';

const CLUSTER_COLORS = [
  '#f59e0b','#a855f7','#00ff88','#ff7b7b','#38bdf8',
  '#fb7185','#34d399','#fbbf24','#c084fc','#f97316',
];
const ISOLATED_COLOR  = '#6b7280';
const SEVERITY_COLORS = { High: '#ff7b7b', Medium: '#ffaa33', Low: '#f59e0b', Informational: '#5a7a9a' };
const SEV_ORDER       = ['High', 'Medium', 'Low', 'Informational'];

function getClusterColor(id) {
  if (id === null || id === undefined) return ISOLATED_COLOR;
  return CLUSTER_COLORS[id % CLUSTER_COLORS.length];
}

// ── Inline severity bars (Few-compliant) ──────────────────────────────────────
function SeverityBars({ breakdown, compact = false }) {
  const entries = SEV_ORDER.filter(s => breakdown?.[s] > 0).map(s => ({ sev: s, count: breakdown[s] }));
  if (!entries.length) return null;
  const max = Math.max(...entries.map(e => e.count));
  if (compact) {
    // Compact: colored count badges only
    return (
      <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
        {entries.map(({ sev, count }) => (
          <span key={sev} style={{
            fontSize: '10px', fontFamily: 'monospace', fontWeight: 600,
            padding: '1px 6px', borderRadius: '3px',
            backgroundColor: SEVERITY_COLORS[sev] + '20',
            border: `1px solid ${SEVERITY_COLORS[sev]}50`,
            color: SEVERITY_COLORS[sev],
          }}>
            {sev[0]} {count}
          </span>
        ))}
      </div>
    );
  }
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
      {entries.map(({ sev, count }) => (
        <div key={sev} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ width: '86px', fontSize: '10px', color: 'var(--text-secondary)', textAlign: 'right', flexShrink: 0 }}>{sev}</span>
          <div style={{ flex: 1, height: '8px', backgroundColor: 'var(--border)', borderRadius: '2px' }}>
            <div style={{ width: `${(count / max) * 100}%`, height: '100%', backgroundColor: SEVERITY_COLORS[sev], borderRadius: '2px', transition: 'width 0.4s' }} />
          </div>
          <span style={{ fontSize: '10px', fontFamily: 'monospace', color: SEVERITY_COLORS[sev], width: '14px', flexShrink: 0 }}>{count}</span>
        </div>
      ))}
    </div>
  );
}

function CohesionPill({ value }) {
  const pct = Math.round(value * 100);
  const color = value >= 0.7 ? '#ff7b7b' : value >= 0.5 ? '#ffaa33' : '#f59e0b';
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
      <div style={{ width: '52px', height: '4px', backgroundColor: 'var(--border)', borderRadius: '2px' }}>
        <div style={{ width: `${pct}%`, height: '100%', backgroundColor: color, borderRadius: '2px' }} />
      </div>
      <span style={{ fontSize: '10px', fontFamily: 'monospace', color }}>{pct}%</span>
    </div>
  );
}

// ── Single expandable campaign row ────────────────────────────────────────────
function CampaignRow({ cluster, correlations, allIncidents, isExpanded, onToggle }) {
  const [showWhy, setShowWhy]           = useState(false);
  const [selectedIncident, setSelectedIncident] = useState(null);

  const color      = getClusterColor(cluster.id);
  const incidentMap = Object.fromEntries((allIncidents || []).map(i => [i.IncidentId, i]));

  // Time window
  const times = cluster.incident_ids
    .map(id => incidentMap[id]?.CreatedTime)
    .filter(Boolean)
    .map(t => new Date(t).getTime())
    .filter(t => !isNaN(t))
    .sort((a, b) => a - b);

  const fmt      = ts => new Date(ts).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  const firstSeen = times[0]                   ? fmt(times[0])                   : null;
  const lastSeen  = times[times.length - 1]    ? fmt(times[times.length - 1])    : null;
  const sameDay   = firstSeen === lastSeen;

  // Departments
  const depts = [...new Set(cluster.incident_ids.map(id => incidentMap[id]?.Department).filter(Boolean))];

  // Top severity for row accent
  const topSev = SEV_ORDER.find(s => cluster.severity_breakdown?.[s] > 0);
  const topSevColor = SEVERITY_COLORS[topSev] || color;

  return (
    <>
      {/* ── Summary row (always visible) ── */}
      <div
        onClick={onToggle}
        style={{
          display: 'grid',
          gridTemplateColumns: '4px 44px 1fr 140px 150px 110px 96px 32px',
          alignItems: 'center',
          gap: '0',
          cursor: 'pointer',
          backgroundColor: isExpanded ? 'rgba(255,255,255,0.03)' : 'transparent',
          borderBottom: '1px solid var(--border)',
          transition: 'background-color 0.15s',
          minHeight: '52px',
        }}
        onMouseEnter={e => { if (!isExpanded) e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.02)'; }}
        onMouseLeave={e => { if (!isExpanded) e.currentTarget.style.backgroundColor = 'transparent'; }}
      >
        {/* Left accent bar */}
        <div style={{ height: '100%', backgroundColor: color, opacity: 0.7 }} />

        {/* Campaign # badge */}
        <div style={{ display: 'flex', justifyContent: 'center', paddingLeft: '4px' }}>
          <div style={{
            width: '26px', height: '26px', borderRadius: '5px',
            backgroundColor: color + '20', border: `1px solid ${color}50`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '12px', fontWeight: 700, color, fontFamily: 'monospace',
          }}>
            {cluster.id + 1}
          </div>
        </div>

        {/* Campaign label + departments */}
        <div style={{ padding: '10px 12px' }}>
          <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)', lineHeight: 1.3, marginBottom: '3px' }}>
            {cluster.label}
          </div>
          {depts.length > 0 && (
            <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
              {depts.map(d => (
                <span key={d} style={{
                  fontSize: '10px', padding: '1px 5px', borderRadius: '3px',
                  backgroundColor: color + '12', border: `1px solid ${color}25`, color,
                }}>
                  {d}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Severity compact badges */}
        <div style={{ padding: '0 8px' }}>
          <SeverityBars breakdown={cluster.severity_breakdown} compact />
        </div>

        {/* Time window */}
        <div style={{ padding: '0 8px' }}>
          {firstSeen ? (
            <div style={{ fontSize: '10px', fontFamily: 'monospace', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
              <div style={{ color: 'var(--text-primary)' }}>{firstSeen}</div>
              {!sameDay && <div>{lastSeen}</div>}
              <div style={{ color: 'var(--text-secondary)', fontSize: '9px' }}>{cluster.time_span_hours.toFixed(0)}h span</div>
            </div>
          ) : (
            <span style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>—</span>
          )}
        </div>

        {/* Cohesion */}
        <div style={{ padding: '0 8px' }}>
          <div style={{ fontSize: '9px', color: 'var(--text-secondary)', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Cohesion</div>
          <CohesionPill value={cluster.cohesion} />
        </div>

        {/* Incident count */}
        <div style={{ padding: '0 8px', textAlign: 'center' }}>
          <div style={{ fontSize: '20px', fontWeight: 700, fontFamily: 'monospace', color, lineHeight: 1 }}>
            {cluster.size}
          </div>
          <div style={{ fontSize: '9px', color: 'var(--text-secondary)', marginTop: '2px' }}>
            incident{cluster.size !== 1 ? 's' : ''}
          </div>
        </div>

        {/* Expand toggle */}
        <div style={{ display: 'flex', justifyContent: 'center', fontSize: '12px', color: 'var(--text-secondary)' }}>
          {isExpanded ? '▲' : '▾'}
        </div>
      </div>

      {/* ── Expanded detail panel ── */}
      {isExpanded && (
        <div style={{
          borderBottom: '1px solid var(--border)',
          backgroundColor: 'var(--bg-primary)',
          padding: '16px 20px',
          display: 'flex', flexDirection: 'column', gap: '14px',
          borderLeft: `3px solid ${color}60`,
        }}>

          {/* Severity full bars */}
          <div>
            <div style={{ fontSize: '10px', color: 'var(--text-secondary)', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Severity Breakdown</div>
            <SeverityBars breakdown={cluster.severity_breakdown} />
          </div>

          {/* MITRE */}
          {cluster.top_techniques.length > 0 && (
            <div>
              <div style={{ fontSize: '10px', color: 'var(--text-secondary)', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.08em' }}>MITRE Techniques</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px' }}>
                {cluster.top_techniques.map(t => (
                  <a key={t}
                    href={`https://attack.mitre.org/techniques/${t.replace('.', '/')}/`}
                    target="_blank" rel="noopener noreferrer"
                    style={{
                      padding: '3px 8px', borderRadius: '3px', fontSize: '11px', fontFamily: 'monospace',
                      backgroundColor: 'rgba(168,85,247,0.12)', border: '1px solid rgba(168,85,247,0.3)',
                      color: '#a855f7', textDecoration: 'none', transition: 'border-color 0.15s',
                    }}
                    onMouseEnter={e => e.currentTarget.style.borderColor = 'rgba(168,85,247,0.7)'}
                    onMouseLeave={e => e.currentTarget.style.borderColor = 'rgba(168,85,247,0.3)'}
                  >{t} ↗</a>
                ))}
              </div>
            </div>
          )}

          {/* Incident list */}
          <div>
            <div style={{ fontSize: '10px', color: 'var(--text-secondary)', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              Incidents in this campaign
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              {cluster.incident_ids.map(id => {
                const inc = incidentMap[id];
                const sevColor = SEVERITY_COLORS[inc?.Severity] || 'var(--text-secondary)';
                const ts = inc?.CreatedTime ? new Date(inc.CreatedTime).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : null;
                return (
                  <button
                    key={id}
                    onClick={() => inc && setSelectedIncident(inc)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: '10px',
                      padding: '8px 12px', borderRadius: '5px', textAlign: 'left',
                      cursor: inc ? 'pointer' : 'default',
                      backgroundColor: color + '08',
                      border: `1px solid ${color}25`,
                      transition: 'background-color 0.12s, border-color 0.12s',
                      width: '100%',
                    }}
                    onMouseEnter={e => { if (inc) { e.currentTarget.style.backgroundColor = color + '18'; e.currentTarget.style.borderColor = color + '50'; } }}
                    onMouseLeave={e => { e.currentTarget.style.backgroundColor = color + '08'; e.currentTarget.style.borderColor = color + '25'; }}
                  >
                    {/* Severity dot */}
                    <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: sevColor, flexShrink: 0 }} />
                    {/* ID */}
                    <span style={{ fontSize: '11px', fontFamily: 'monospace', color, fontWeight: 600, flexShrink: 0, minWidth: '70px' }}>{id}</span>
                    {/* Title */}
                    <span style={{ fontSize: '12px', color: 'var(--text-primary)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {inc?.Title || '—'}
                    </span>
                    {/* Severity label */}
                    <span style={{ fontSize: '10px', color: sevColor, flexShrink: 0 }}>{inc?.Severity}</span>
                    {/* Timestamp */}
                    {ts && <span style={{ fontSize: '10px', fontFamily: 'monospace', color: 'var(--text-secondary)', flexShrink: 0 }}>{ts}</span>}
                    {/* Open indicator */}
                    {inc && <span style={{ fontSize: '10px', color: 'var(--text-secondary)', flexShrink: 0 }}>↗</span>}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Why clustered */}
          <button
            onClick={() => setShowWhy(w => !w)}
            style={{
              alignSelf: 'flex-start', padding: '6px 14px', borderRadius: '5px',
              fontSize: '11px', fontWeight: 600, cursor: 'pointer', fontFamily: 'monospace',
              border: `1px solid ${color}50`,
              backgroundColor: showWhy ? color + '20' : 'transparent',
              color, transition: 'all 0.15s',
            }}
          >
            {showWhy ? '▲ Hide explanation' : '▾ Why were these clustered?'}
          </button>

          {showWhy && <CampaignExplainer cluster={cluster} correlations={correlations} />}
        </div>
      )}

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

// ── Main export ───────────────────────────────────────────────────────────────
export default function CampaignsTab({ clusters, correlations, allIncidents }) {
  const [expandedId, setExpandedId] = useState(null);

  if (!clusters) return null;
  const { clusters: clusterList, noise, total_clusters, total_noise } = clusters;

  const sortedClusters = [...clusterList].sort((a, b) => a.id - b.id);

  const toggle = (id) => setExpandedId(prev => prev === id ? null : id);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0' }}>
      <div style={{
        backgroundColor: 'var(--bg-surface)',
        border: '1px solid var(--border)',
        borderRadius: '10px',
        overflow: 'hidden',
      }}>

        {/* Table header */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: '4px 44px 1fr 140px 150px 110px 96px 32px',
          gap: '0',
          padding: '10px 0',
          borderBottom: '1px solid var(--border)',
          backgroundColor: 'var(--bg-primary)',
        }}>
          <div />
          <div />
          <div style={{ padding: '0 12px', fontSize: '10px', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Campaign</div>
          <div style={{ padding: '0 8px', fontSize: '10px', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Severity</div>
          <div style={{ padding: '0 8px', fontSize: '10px', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Time Window</div>
          <div style={{ padding: '0 8px', fontSize: '10px', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Cohesion</div>
          <div style={{ padding: '0 8px', fontSize: '10px', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.08em', textAlign: 'center' }}>Count</div>
          <div />
        </div>

        {/* Campaign rows */}
        {sortedClusters.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '48px', color: 'var(--text-secondary)', fontSize: '13px' }}>
            No campaign clusters detected. Try uploading more incidents or lowering the correlation threshold.
          </div>
        ) : (
          sortedClusters.map(c => (
            <CampaignRow
              key={c.id}
              cluster={c}
              correlations={correlations}
              allIncidents={allIncidents}
              isExpanded={expandedId === c.id}
              onToggle={() => toggle(c.id)}
            />
          ))
        )}

        {/* Isolated incidents */}
        {noise.length > 0 && (
          <div style={{ padding: '10px 16px', borderTop: sortedClusters.length > 0 ? '1px solid var(--border)' : 'none',
            display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '10px', color: 'var(--text-secondary)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              Isolated ({noise.length})
            </span>
            <span style={{ fontSize: '10px', fontFamily: 'monospace', color: 'var(--text-secondary)' }}>
              {noise.slice(0, 12).join('  ·  ')}{noise.length > 12 ? ` +${noise.length - 12} more` : ''}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
