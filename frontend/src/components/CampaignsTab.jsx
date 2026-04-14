/**
 * CampaignsTab — Campaign intelligence view modeled after enterprise SIEM tools
 * (Splunk ES, CrowdStrike Falcon, Microsoft Sentinel).
 *
 * Sortable table, one expandable row per campaign, no dot-clicking.
 * Expanding a row shows incidents + MITRE + explainer inline — no extra clicks.
 */

import { useState } from 'react';
import CampaignExplainer from './CampaignExplainer.jsx';
import IncidentDrawer from './IncidentDrawer.jsx';
import Tooltip from './Tooltip.jsx';

const CLUSTER_COLORS = [
  '#f97316','#8b5cf6','#2dd4bf','#f43f5e','#38bdf8',
  '#84cc16','#34d399','#fb923c','#a78bfa','#22d3ee',
];
const ISOLATED_COLOR  = '#6b7280';
const SEVERITY_COLORS = { High: '#ff7b7b', Medium: '#ffaa33', Low: '#f59e0b', Informational: '#5a7a9a' };
const SEV_ORDER       = ['High', 'Medium', 'Low', 'Informational'];
const SEV_SCORE       = { High: 4, Medium: 3, Low: 2, Informational: 1 };

function getClusterColor(id) {
  if (id === null || id === undefined) return ISOLATED_COLOR;
  return CLUSTER_COLORS[id % CLUSTER_COLORS.length];
}

function cohesionVerdict(score) {
  if (score >= 0.85) return { label: 'Confirmed campaign', color: '#ff7b7b' };
  if (score >= 0.68) return { label: 'Highly likely',      color: '#fb7185' };
  if (score >= 0.50) return { label: 'Probable',           color: '#ffaa33' };
  if (score >= 0.30) return { label: 'Possible',           color: '#f59e0b' };
  return                    { label: 'Weak signal',        color: '#5a7a9a' };
}

// ── Severity bars ─────────────────────────────────────────────────────────────
function SeverityBars({ breakdown, compact = false }) {
  const entries = SEV_ORDER.filter(s => breakdown?.[s] > 0).map(s => ({ sev: s, count: breakdown[s] }));
  if (!entries.length) return null;
  const max = Math.max(...entries.map(e => e.count));
  if (compact) {
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
  const pct             = Math.round(value * 100);
  const { label, color } = cohesionVerdict(value);
  return (
    <Tooltip
      text="Campaign cohesion measures how tightly linked the incidents are across shared entities, techniques, timing, and severity. ≥85% = Confirmed · ≥68% = Highly likely · ≥50% = Probable · ≥30% = Possible"
      maxWidth={260}
      block
    >
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '3px' }}>
          <div style={{ width: '52px', height: '4px', backgroundColor: 'var(--border)', borderRadius: '2px' }}>
            <div style={{ width: `${pct}%`, height: '100%', backgroundColor: color, borderRadius: '2px' }} />
          </div>
          <span style={{ fontSize: '10px', fontFamily: 'monospace', color }}>{pct}%</span>
        </div>
        <div style={{ fontSize: '9px', color, opacity: 0.85 }}>{label}</div>
      </div>
    </Tooltip>
  );
}

// ── Sortable column header ────────────────────────────────────────────────────
function SortHeader({ label, col, sortCol, sortDir, onSort, style = {} }) {
  const active = sortCol === col;
  return (
    <div
      onClick={() => onSort(col)}
      style={{
        padding: '0 8px', fontSize: '10px', fontWeight: 600,
        textTransform: 'uppercase', letterSpacing: '0.08em',
        color: active ? 'var(--accent)' : 'var(--text-secondary)',
        cursor: 'pointer', userSelect: 'none',
        display: 'flex', alignItems: 'center', gap: '4px',
        transition: 'color 0.15s',
        ...style,
      }}
      onMouseEnter={e => { if (!active) e.currentTarget.style.color = 'var(--text-primary)'; }}
      onMouseLeave={e => { if (!active) e.currentTarget.style.color = 'var(--text-secondary)'; }}
    >
      {label}
      <span style={{ fontSize: '8px', opacity: active ? 1 : 0.3 }}>
        {active ? (sortDir === 'asc' ? '▲' : '▼') : '▼'}
      </span>
    </div>
  );
}

// ── Single expandable campaign row ────────────────────────────────────────────
function CampaignRow({ cluster, correlations, allIncidents, incidentMap, isExpanded, onToggle }) {
  const [selectedIncident, setSelectedIncident] = useState(null);
  const color = getClusterColor(cluster.id);

  const times = cluster.incident_ids
    .map(id => incidentMap[id]?.CreatedTime)
    .filter(Boolean)
    .map(t => new Date(t).getTime())
    .filter(t => !isNaN(t))
    .sort((a, b) => a - b);

  const fmt       = ts => new Date(ts).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  const firstSeen = times[0]                 ? fmt(times[0])                 : null;
  const lastSeen  = times[times.length - 1]  ? fmt(times[times.length - 1])  : null;
  const sameTime  = firstSeen === lastSeen;

  const depts = [...new Set(cluster.incident_ids.map(id => incidentMap[id]?.Department).filter(Boolean))];

  return (
    <>
      {/* ── Summary row ── */}
      <div
        onClick={onToggle}
        style={{
          display: 'grid',
          gridTemplateColumns: '4px 44px 1fr 140px 150px 96px 110px 32px',
          alignItems: 'center',
          cursor: 'pointer',
          backgroundColor: isExpanded ? 'rgba(255,255,255,0.03)' : 'transparent',
          borderBottom: '1px solid var(--border)',
          transition: 'background-color 0.15s',
          minHeight: '52px',
        }}
        onMouseEnter={e => { if (!isExpanded) e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.02)'; }}
        onMouseLeave={e => { if (!isExpanded) e.currentTarget.style.backgroundColor = isExpanded ? 'rgba(255,255,255,0.03)' : 'transparent'; }}
      >
        <div style={{ height: '100%', backgroundColor: color, opacity: 0.7 }} />

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
                }}>{d}</span>
              ))}
            </div>
          )}
        </div>

        <div style={{ padding: '0 8px' }}>
          <SeverityBars breakdown={cluster.severity_breakdown} compact />
        </div>

        <div style={{ padding: '0 8px' }}>
          {firstSeen ? (
            <div style={{ fontSize: '10px', fontFamily: 'monospace', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
              <div style={{ color: 'var(--text-primary)' }}>{firstSeen}</div>
              {!sameTime && <div>{lastSeen}</div>}
              <div style={{ fontSize: '9px' }}>{cluster.time_span_hours.toFixed(0)}h span</div>
            </div>
          ) : <span style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>—</span>}
        </div>

        <div style={{ padding: '0 8px', textAlign: 'center' }}>
          <div style={{ fontSize: '20px', fontWeight: 700, fontFamily: 'monospace', color, lineHeight: 1 }}>{cluster.size}</div>
          <div style={{ fontSize: '9px', color: 'var(--text-secondary)', marginTop: '2px' }}>incident{cluster.size !== 1 ? 's' : ''}</div>
        </div>

        <div style={{ padding: '0 8px' }}>
          <CohesionPill value={cluster.cohesion} />
        </div>

        <div style={{ display: 'flex', justifyContent: 'center', fontSize: '12px', color: 'var(--text-secondary)' }}>
          {isExpanded ? '▲' : '▾'}
        </div>
      </div>

      {/* ── Expanded detail — no extra clicks needed ── */}
      {isExpanded && (
        <div className="expand-in" style={{
          borderBottom: '1px solid var(--border)',
          backgroundColor: 'var(--bg-primary)',
          padding: '16px 20px',
          display: 'flex', flexDirection: 'column', gap: '16px',
          borderLeft: `3px solid ${color}60`,
        }}>

          {/* Two-column layout: left = severity + MITRE, right = incidents */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', alignItems: 'start' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <div style={{ fontSize: '10px', color: 'var(--text-secondary)', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Severity Breakdown</div>
                <SeverityBars breakdown={cluster.severity_breakdown} />
              </div>
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
            </div>

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
                    <button key={id} onClick={() => inc && setSelectedIncident(inc)}
                      style={{
                        display: 'flex', alignItems: 'center', gap: '10px',
                        padding: '8px 12px', borderRadius: '5px', textAlign: 'left',
                        cursor: inc ? 'pointer' : 'default',
                        backgroundColor: color + '08', border: `1px solid ${color}25`,
                        transition: 'background-color 0.12s, border-color 0.12s', width: '100%',
                      }}
                      onMouseEnter={e => { if (inc) { e.currentTarget.style.backgroundColor = color + '18'; e.currentTarget.style.borderColor = color + '50'; } }}
                      onMouseLeave={e => { e.currentTarget.style.backgroundColor = color + '08'; e.currentTarget.style.borderColor = color + '25'; }}
                    >
                      <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: sevColor, flexShrink: 0 }} />
                      <span style={{ fontSize: '11px', fontFamily: 'monospace', color, fontWeight: 600, flexShrink: 0, minWidth: '70px' }}>{id}</span>
                      <span style={{ fontSize: '12px', color: 'var(--text-primary)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{inc?.Title || '—'}</span>
                      <span style={{ fontSize: '10px', color: sevColor, flexShrink: 0 }}>{inc?.Severity}</span>
                      {ts && <span style={{ fontSize: '10px', fontFamily: 'monospace', color: 'var(--text-secondary)', flexShrink: 0 }}>{ts}</span>}
                      {inc && <span style={{ fontSize: '10px', color: 'var(--text-secondary)', flexShrink: 0 }}>↗</span>}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Explainer — always visible when expanded, no extra click */}
          <CampaignExplainer cluster={cluster} correlations={correlations} />
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
  const [sortCol, setSortCol]       = useState('id');
  const [sortDir, setSortDir]       = useState('asc');

  if (!clusters) return null;
  const { clusters: clusterList, noise } = clusters;

  const incidentMap = Object.fromEntries((allIncidents || []).map(i => [i.IncidentId, i]));

  const handleSort = (col) => {
    if (sortCol === col) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    } else {
      setSortCol(col);
      setSortDir(col === 'id' ? 'asc' : 'desc');
    }
  };

  const getFirstTs = (c) => {
    const ts = c.incident_ids
      .map(id => new Date(incidentMap[id]?.CreatedTime).getTime())
      .filter(t => !isNaN(t));
    return ts.length ? Math.min(...ts) : 0;
  };

  const getTopSevScore = (c) => {
    const b = c.severity_breakdown || {};
    return SEV_ORDER.reduce((acc, s) => acc + (b[s] || 0) * SEV_SCORE[s], 0);
  };

  const sorted = [...clusterList].sort((a, b) => {
    let av, bv;
    if (sortCol === 'size')     { av = a.size;          bv = b.size; }
    else if (sortCol === 'cohesion') { av = a.cohesion;  bv = b.cohesion; }
    else if (sortCol === 'firstSeen') { av = getFirstTs(a); bv = getFirstTs(b); }
    else if (sortCol === 'severity')  { av = getTopSevScore(a); bv = getTopSevScore(b); }
    else                        { av = a.id;            bv = b.id; }
    return sortDir === 'asc' ? av - bv : bv - av;
  });

  const toggle = (id) => setExpandedId(prev => prev === id ? null : id);

  const headerPad = { padding: '0 12px' };
  const colPad    = { padding: '0 8px' };

  const totalIncidentsInCampaigns = clusterList.reduce((s, c) => s + c.size, 0);
  const noiseCount = noise?.length || 0;
  const highConfidence = clusterList.filter(c => c.cohesion >= 0.68).length;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

      {/* Summary header card */}
      <div style={{
        backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border)',
        borderRadius: '10px', padding: '16px 20px',
        display: 'flex', alignItems: 'flex-start', gap: '24px', flexWrap: 'wrap',
      }}>
        <div style={{ paddingLeft: '12px', borderLeft: '3px solid var(--accent)' }}>
          <div style={{ fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--text-secondary)', marginBottom: '2px' }}>
            Campaign Intelligence
          </div>
          <div style={{ fontSize: '22px', fontWeight: 700, fontFamily: 'monospace', color: 'var(--text-primary)', lineHeight: 1 }}>
            {clusterList.length}
            <span style={{ fontSize: '13px', fontWeight: 400, color: 'var(--text-secondary)', marginLeft: '6px' }}>
              campaign{clusterList.length !== 1 ? 's' : ''} detected
            </span>
          </div>
          {highConfidence > 0 && (
            <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '6px' }}>
              <span style={{ color: '#ff7b7b', fontWeight: 600 }}>{highConfidence}</span> highly likely or confirmed
            </div>
          )}
        </div>

        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'flex-start' }}>
          {[
            { label: 'Incidents in campaigns', value: totalIncidentsInCampaigns, color: 'var(--accent)' },
            { label: 'Isolated incidents',     value: noiseCount,               color: 'var(--text-secondary)' },
          ].map(({ label, value, color }) => (
            <div key={label} style={{
              padding: '8px 14px', backgroundColor: 'var(--bg-input)',
              border: '1px solid var(--border)', borderRadius: '6px', minWidth: '120px',
            }}>
              <div style={{ fontSize: '10px', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '4px' }}>{label}</div>
              <div style={{ fontSize: '18px', fontWeight: 700, fontFamily: 'monospace', color }}>{value}</div>
            </div>
          ))}
        </div>
      </div>

      <div style={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: '10px', overflow: 'hidden' }}>

        {/* Sortable table header */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: '4px 44px 1fr 140px 150px 96px 110px 32px',
          padding: '10px 0',
          borderBottom: '1px solid var(--border)',
          backgroundColor: 'var(--bg-primary)',
        }}>
          <div /><div />
          <SortHeader label="Campaign"    col="id"        sortCol={sortCol} sortDir={sortDir} onSort={handleSort} style={headerPad} />
          <SortHeader label="Severity"    col="severity"  sortCol={sortCol} sortDir={sortDir} onSort={handleSort} style={colPad} />
          <SortHeader label="Time Window" col="firstSeen" sortCol={sortCol} sortDir={sortDir} onSort={handleSort} style={colPad} />
          <SortHeader label="Incidents"   col="size"      sortCol={sortCol} sortDir={sortDir} onSort={handleSort} style={{ ...colPad, justifyContent: 'center' }} />
          <SortHeader label="Confidence"  col="cohesion"  sortCol={sortCol} sortDir={sortDir} onSort={handleSort} style={colPad} />
          <div />
        </div>

        {sorted.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '48px 40px' }}>
            <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '8px' }}>
              No campaigns detected
            </div>
            <div style={{ fontSize: '12px', color: 'var(--text-secondary)', lineHeight: 1.7, maxWidth: '380px', margin: '0 auto' }}>
              ATLAS groups incidents into campaigns using entity overlap, MITRE technique similarity, timing,
              and severity patterns. With this dataset, all incidents appear isolated — no coordinated
              attack activity was identified.
            </div>
          </div>
        ) : (
          sorted.map(c => (
            <CampaignRow
              key={c.id}
              cluster={c}
              correlations={correlations}
              allIncidents={allIncidents}
              incidentMap={incidentMap}
              isExpanded={expandedId === c.id}
              onToggle={() => toggle(c.id)}
            />
          ))
        )}

        {noise.length > 0 && (
          <div style={{ padding: '10px 16px', borderTop: sorted.length > 0 ? '1px solid var(--border)' : 'none', display: 'flex', alignItems: 'center', gap: '10px' }}>
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
