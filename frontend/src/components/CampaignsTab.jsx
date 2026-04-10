/**
 * CampaignsTab — overview-first campaign intelligence.
 * Section 1: Gantt-style timeline — one lane per campaign, incidents as
 *   clickable circles on a real time axis, duration line connecting them.
 * Section 2: Campaign detail cards.
 */

import { useState, useRef } from 'react';
import CampaignExplainer from './CampaignExplainer.jsx';
import IncidentDrawer from './IncidentDrawer.jsx';

const CLUSTER_COLORS = [
  '#f59e0b','#a855f7','#00ff88','#ff7b7b','#38bdf8',
  '#fb7185','#34d399','#fbbf24','#c084fc','#f97316',
];
const ISOLATED_COLOR = '#6b7280';
const SEVERITY_COLORS = { High: '#ff7b7b', Medium: '#ffaa33', Low: '#f59e0b', Informational: '#5a7a9a' };
const DOT_SIZES   = { High: 18, Medium: 14, Low: 11, Informational: 9 };
const SEV_ORDER   = ['High', 'Medium', 'Low', 'Informational'];

function getClusterColor(clusterId) {
  if (clusterId === null || clusterId === undefined) return ISOLATED_COLOR;
  return CLUSTER_COLORS[clusterId % CLUSTER_COLORS.length];
}

// ── Gantt Timeline ────────────────────────────────────────────────────────────
function GanttTimeline({ clusters, allIncidents, highlightCluster, setHighlightCluster, onSelectIncident, selectedIncidentId }) {
  const containerRef = useRef(null);
  const [tooltip, setTooltip] = useState(null); // { inc, x, y }

  const campaignList = clusters?.clusters || [];

  // incidentId → clusterId
  const incidentClusterMap = {};
  for (const c of campaignList) {
    for (const id of c.incident_ids) incidentClusterMap[id] = c.id;
  }

  const incidentMap = Object.fromEntries((allIncidents || []).map(i => [i.IncidentId, i]));

  // Build one lane per campaign
  const lanes = campaignList.map(c => ({
    id: c.id,
    label: c.label,
    color: getClusterColor(c.id),
    isIsolated: false,
    incidents: c.incident_ids
      .map(id => incidentMap[id])
      .filter(Boolean)
      .map(i => ({ ...i, ts: new Date(i.CreatedTime).getTime() }))
      .filter(i => !isNaN(i.ts))
      .sort((a, b) => a.ts - b.ts),
  }));

  // Isolated lane
  const isolatedIncidents = (allIncidents || [])
    .filter(i => incidentClusterMap[i.IncidentId] === undefined)
    .map(i => ({ ...i, ts: new Date(i.CreatedTime).getTime() }))
    .filter(i => !isNaN(i.ts))
    .sort((a, b) => a.ts - b.ts);

  if (isolatedIncidents.length > 0) {
    lanes.push({ id: null, label: 'Isolated', color: ISOLATED_COLOR, isIsolated: true, incidents: isolatedIncidents });
  }

  const allTimes = lanes.flatMap(l => l.incidents.map(i => i.ts));
  if (!allTimes.length) return null;

  const minT = Math.min(...allTimes);
  const maxT = Math.max(...allTimes);
  const span = Math.max(maxT - minT, 3_600_000); // at least 1h span
  const pad  = Math.max(span * 0.07, 1_800_000);
  const domainMin = minT - pad;
  const domainMax = maxT + pad;
  const domain    = domainMax - domainMin;

  const toPct = (ts) => `${((ts - domainMin) / domain) * 100}%`;

  const formatTs = (ts) => {
    const d = new Date(ts);
    if (span < 86_400_000)        return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    if (span < 7 * 86_400_000)   return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
    return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
  };

  const ticks = [0, 0.25, 0.5, 0.75, 1].map(f => ({
    pct: f * 100,
    label: formatTs(domainMin + f * domain),
  }));

  const showTooltip = (e, inc) => {
    const cRect = containerRef.current.getBoundingClientRect();
    const dRect = e.currentTarget.getBoundingClientRect();
    setTooltip({
      inc,
      x: dRect.left - cRect.left + dRect.width / 2,
      y: dRect.top  - cRect.top,
    });
  };

  return (
    <div ref={containerRef} style={{
      position: 'relative',
      backgroundColor: '#0a0805',
      border: '1px solid #2e2410',
      borderRadius: '8px',
      padding: '12px 16px 4px',
      overflowX: 'hidden',
    }}>

      {/* Lanes */}
      {lanes.map((lane, laneIdx) => {
        const firstTs = lane.incidents[0]?.ts;
        const lastTs  = lane.incidents[lane.incidents.length - 1]?.ts;
        const dimmed  = highlightCluster !== null && highlightCluster !== lane.id && !lane.isIsolated;

        return (
          <div
            key={lane.id ?? 'isolated'}
            onMouseEnter={() => !lane.isIsolated && setHighlightCluster(lane.id)}
            onMouseLeave={() => setHighlightCluster(null)}
            style={{
              display: 'flex', alignItems: 'center', height: '54px',
              opacity: dimmed ? 0.15 : 1, transition: 'opacity 0.15s',
              backgroundColor: laneIdx % 2 === 0 ? 'rgba(255,255,255,0.013)' : 'transparent',
              borderRadius: '4px',
            }}
          >
            {/* Label column */}
            <div style={{ width: '155px', flexShrink: 0, paddingRight: '14px', textAlign: 'right' }}>
              <div style={{ fontSize: '10px', fontFamily: 'monospace', fontWeight: 600,
                color: lane.color, opacity: lane.isIsolated ? 0.55 : 1,
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {lane.label}
              </div>
              <div style={{ fontSize: '9px', color: '#5a4a2a', marginTop: '2px' }}>
                {lane.incidents.length} incident{lane.incidents.length !== 1 ? 's' : ''}
              </div>
            </div>

            {/* Track */}
            <div style={{ flex: 1, position: 'relative', height: '100%' }}>
              {/* Duration line (only if >1 incident) */}
              {lane.incidents.length > 1 && (
                <div style={{
                  position: 'absolute',
                  top: '50%', transform: 'translateY(-50%)',
                  left: toPct(firstTs),
                  right: `${(1 - (lastTs - domainMin) / domain) * 100}%`,
                  height: '2px',
                  backgroundColor: lane.isIsolated ? '#3a3a3a' : lane.color + '38',
                }} />
              )}

              {/* Incident dots */}
              {lane.incidents.map((inc) => {
                const size = DOT_SIZES[inc.Severity] || 11;
                const isSelected = selectedIncidentId === inc.IncidentId;
                return (
                  <div
                    key={inc.IncidentId}
                    onClick={() => onSelectIncident?.(inc)}
                    onMouseEnter={(e) => showTooltip(e, inc)}
                    onMouseLeave={() => setTooltip(null)}
                    style={{
                      position: 'absolute',
                      left: toPct(inc.ts), top: '50%',
                      transform: 'translate(-50%, -50%)',
                      width: size, height: size,
                      borderRadius: '50%',
                      backgroundColor: lane.isIsolated ? ISOLATED_COLOR : lane.color,
                      opacity: lane.isIsolated ? 0.45 : 0.9,
                      border: isSelected ? '2px solid #ffffff' : `1.5px solid ${lane.isIsolated ? '#888' : lane.color}`,
                      boxShadow: isSelected ? `0 0 0 3px ${lane.color}50` : `0 0 6px ${lane.color}50`,
                      cursor: 'pointer',
                      zIndex: isSelected ? 10 : 2,
                      transition: 'transform 0.1s, box-shadow 0.1s',
                    }}
                    onMouseOver={e => { e.currentTarget.style.transform = 'translate(-50%, -50%) scale(1.35)'; e.currentTarget.style.zIndex = 20; }}
                    onMouseOut={e => { e.currentTarget.style.transform = 'translate(-50%, -50%) scale(1)'; e.currentTarget.style.zIndex = isSelected ? 10 : 2; }}
                  />
                );
              })}
            </div>
          </div>
        );
      })}

      {/* X axis */}
      <div style={{ display: 'flex', marginLeft: '155px', marginTop: '2px', position: 'relative', height: '26px' }}>
        {ticks.map(tick => (
          <div key={tick.pct} style={{
            position: 'absolute', left: `${tick.pct}%`,
            transform: 'translateX(-50%)',
            fontSize: '9px', fontFamily: 'monospace', color: '#4a3a1a',
            textAlign: 'center', whiteSpace: 'nowrap',
            paddingTop: '4px',
            borderTop: '1px solid #2e2410',
          }}>
            {tick.label}
          </div>
        ))}
      </div>

      {/* Floating tooltip */}
      {tooltip && (() => {
        const color = getClusterColor(incidentClusterMap[tooltip.inc.IncidentId] ?? null);
        const ts = new Date(tooltip.inc.ts).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
        return (
          <div style={{
            position: 'absolute',
            left: Math.min(tooltip.x + 14, 800),
            top: tooltip.y - 4,
            transform: 'translateY(-100%)',
            backgroundColor: '#13100a',
            border: `1px solid ${color}55`,
            borderRadius: '8px', padding: '10px 14px',
            fontSize: '12px', maxWidth: '270px',
            boxShadow: '0 4px 20px rgba(0,0,0,0.7)',
            pointerEvents: 'none', zIndex: 100,
          }}>
            <div style={{ fontFamily: 'monospace', fontSize: '10px', color: '#7a6a4a', marginBottom: '3px' }}>
              {tooltip.inc.IncidentId} · {ts}
            </div>
            <div style={{ color: '#e8dcc8', fontWeight: 600, marginBottom: '5px', lineHeight: 1.4 }}>
              {tooltip.inc.Title}
            </div>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '10px', color: SEVERITY_COLORS[tooltip.inc.Severity] || '#aaa' }}>
                {tooltip.inc.Severity}
              </span>
              {tooltip.inc.Department && (
                <><span style={{ fontSize: '10px', color: '#5a4a2a' }}>·</span>
                <span style={{ fontSize: '10px', color: '#7a6a4a' }}>{tooltip.inc.Department}</span></>
              )}
            </div>
            <div style={{ fontSize: '10px', color: '#5a4a2a', marginTop: '4px', fontStyle: 'italic' }}>
              Click to inspect
            </div>
          </div>
        );
      })()}
    </div>
  );
}

// ── Severity bars ─────────────────────────────────────────────────────────────
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
            <div style={{ width: `${(count / max) * 100}%`, height: '100%', backgroundColor: SEVERITY_COLORS[sev], borderRadius: '2px', transition: 'width 0.4s' }} />
          </div>
          <span style={{ fontSize: '10px', fontFamily: 'monospace', color: SEVERITY_COLORS[sev], width: '14px', flexShrink: 0 }}>{count}</span>
        </div>
      ))}
    </div>
  );
}

function CohesionBar({ value }) {
  const pct = Math.round(value * 100);
  const color = value >= 0.7 ? '#ff7b7b' : value >= 0.5 ? '#ffaa33' : '#f59e0b';
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
      <div style={{ flex: 1, height: '4px', backgroundColor: 'var(--border)', borderRadius: '2px' }}>
        <div style={{ width: `${pct}%`, height: '100%', backgroundColor: color, borderRadius: '2px' }} />
      </div>
      <span style={{ fontSize: '10px', fontFamily: 'monospace', color, minWidth: '28px' }}>{pct}%</span>
    </div>
  );
}

// ── Campaign card ─────────────────────────────────────────────────────────────
function CampaignCard({ cluster, correlations, allIncidents, highlighted, onMouseEnter, onMouseLeave }) {
  const [showWhy, setShowWhy] = useState(false);
  const [selectedIncident, setSelectedIncident] = useState(null);
  const color = getClusterColor(cluster.id);
  const incidentMap = Object.fromEntries((allIncidents || []).map(i => [i.IncidentId, i]));

  // First / last seen
  const times = cluster.incident_ids
    .map(id => incidentMap[id]?.CreatedTime)
    .filter(Boolean)
    .map(t => new Date(t).getTime())
    .filter(t => !isNaN(t))
    .sort((a, b) => a - b);

  const fmt = ts => new Date(ts).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  const firstSeen = times[0] ? fmt(times[0]) : null;
  const lastSeen  = times[times.length - 1] && times[times.length - 1] !== times[0] ? fmt(times[times.length - 1]) : null;

  // Affected departments
  const depts = [...new Set(cluster.incident_ids.map(id => incidentMap[id]?.Department).filter(Boolean))];

  return (
    <>
      <div
        onMouseEnter={onMouseEnter}
        onMouseLeave={onMouseLeave}
        style={{
          backgroundColor: 'var(--bg-primary)',
          border: `1px solid ${highlighted ? color + '90' : color + '40'}`,
          borderRadius: '8px', padding: '16px',
          display: 'flex', flexDirection: 'column', gap: '12px',
          transition: 'border-color 0.15s, box-shadow 0.15s',
          boxShadow: highlighted ? `0 0 0 1px ${color}30` : 'none',
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
          <div style={{
            width: '32px', height: '32px', borderRadius: '6px', flexShrink: 0,
            backgroundColor: color + '20', border: `1px solid ${color}50`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '13px', fontWeight: 700, color, fontFamily: 'monospace',
          }}>
            {cluster.id + 1}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)', lineHeight: 1.3 }}>{cluster.label}</div>
            <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '2px' }}>
              {cluster.size} incident{cluster.size !== 1 ? 's' : ''}
            </div>
          </div>
          <div style={{ textAlign: 'right', flexShrink: 0 }}>
            <div style={{ fontSize: '10px', color: 'var(--text-secondary)', marginBottom: '2px' }}>Cohesion</div>
            <div style={{ width: '90px' }}><CohesionBar value={cluster.cohesion} /></div>
          </div>
        </div>

        {/* Severity breakdown — most critical signal */}
        <SeverityBars breakdown={cluster.severity_breakdown} />

        {/* Time window */}
        {firstSeen && (
          <div style={{ fontSize: '11px', fontFamily: 'monospace',
            backgroundColor: 'var(--bg-surface)', padding: '6px 10px', borderRadius: '4px',
            border: '1px solid var(--border)', color: 'var(--text-secondary)' }}>
            <span style={{ color: 'var(--text-primary)' }}>{firstSeen}</span>
            {lastSeen && <> <span>→</span> <span style={{ color: 'var(--text-primary)' }}>{lastSeen}</span></>}
            <span style={{ marginLeft: '8px' }}>({cluster.time_span_hours.toFixed(0)}h span)</span>
          </div>
        )}

        {/* Affected departments */}
        {depts.length > 0 && (
          <div>
            <div style={{ fontSize: '10px', color: 'var(--text-secondary)', marginBottom: '5px', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Affected</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
              {depts.map(d => (
                <span key={d} style={{ padding: '2px 7px', borderRadius: '3px', fontSize: '10px',
                  backgroundColor: color + '10', border: `1px solid ${color}30`, color }}>
                  {d}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* MITRE */}
        {cluster.top_techniques.length > 0 && (
          <div>
            <div style={{ fontSize: '10px', color: 'var(--text-secondary)', marginBottom: '5px', textTransform: 'uppercase', letterSpacing: '0.08em' }}>MITRE Techniques</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
              {cluster.top_techniques.map(t => (
                <a key={t} href={`https://attack.mitre.org/techniques/${t.replace('.', '/')}/`}
                  target="_blank" rel="noopener noreferrer"
                  style={{ padding: '2px 7px', borderRadius: '3px', fontSize: '10px', fontFamily: 'monospace',
                    backgroundColor: 'rgba(168,85,247,0.12)', border: '1px solid rgba(168,85,247,0.3)',
                    color: '#a855f7', textDecoration: 'none', transition: 'border-color 0.15s' }}
                  onMouseEnter={e => e.currentTarget.style.borderColor = 'rgba(168,85,247,0.7)'}
                  onMouseLeave={e => e.currentTarget.style.borderColor = 'rgba(168,85,247,0.3)'}
                >{t} ↗</a>
              ))}
            </div>
          </div>
        )}

        {/* Incident IDs */}
        <div>
          <div style={{ fontSize: '10px', color: 'var(--text-secondary)', marginBottom: '5px', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Incidents</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px' }}>
            {cluster.incident_ids.map(id => {
              const inc = incidentMap[id];
              return (
                <button key={id} onClick={() => inc && setSelectedIncident(inc)} title={inc?.Title || id}
                  style={{ padding: '2px 8px', borderRadius: '3px', fontSize: '10px', fontFamily: 'monospace',
                    cursor: inc ? 'pointer' : 'default', backgroundColor: color + '12',
                    border: `1px solid ${color}35`, color, transition: 'all 0.15s' }}
                  onMouseEnter={e => { if (inc) e.currentTarget.style.backgroundColor = color + '25'; }}
                  onMouseLeave={e => { e.currentTarget.style.backgroundColor = color + '12'; }}
                >{id}</button>
              );
            })}
          </div>
        </div>

        {/* Why clustered */}
        <button onClick={() => setShowWhy(w => !w)} style={{
          width: '100%', padding: '7px', borderRadius: '5px', fontSize: '11px',
          fontWeight: 600, cursor: 'pointer', fontFamily: 'monospace',
          border: `1px solid ${color}50`,
          backgroundColor: showWhy ? color + '20' : 'transparent',
          color, transition: 'all 0.15s',
        }}>
          {showWhy ? '▲ Hide explanation' : '▾ Why were these clustered?'}
        </button>

        {showWhy && <CampaignExplainer cluster={cluster} correlations={correlations} />}
      </div>

      {selectedIncident && (
        <IncidentDrawer incident={selectedIncident} clusters={{ clusters: [cluster] }}
          correlations={correlations} allIncidents={allIncidents}
          onClose={() => setSelectedIncident(null)} />
      )}
    </>
  );
}

// ── Main export ───────────────────────────────────────────────────────────────
export default function CampaignsTab({ points, clusters, correlations, allIncidents }) {
  const [highlightCluster, setHighlightCluster] = useState(null);
  const [selectedIncident, setSelectedIncident] = useState(null);

  if (!clusters) return null;
  const { clusters: clusterList, noise, total_clusters, total_noise } = clusters;

  const handleDotClick = (inc) => {
    if (inc) setSelectedIncident(inc);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

      {/* ── Section 1: Timeline ── */}
      <div style={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: '10px', overflow: 'hidden' }}>
        <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
          <div style={{ fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--text-secondary)' }}>
            Campaign Timeline
          </div>
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', alignItems: 'center' }}>
            {clusterList.map(c => {
              const color = getClusterColor(c.id);
              return (
                <span key={c.id}
                  onMouseEnter={() => setHighlightCluster(c.id)}
                  onMouseLeave={() => setHighlightCluster(null)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '5px',
                    fontSize: '10px', fontFamily: 'monospace', fontWeight: 600, color,
                    padding: '2px 8px', borderRadius: '4px', cursor: 'default',
                    backgroundColor: highlightCluster === c.id ? color + '20' : 'transparent',
                    border: `1px solid ${highlightCluster === c.id ? color + '60' : 'transparent'}`,
                    opacity: highlightCluster !== null && highlightCluster !== c.id ? 0.35 : 1,
                    transition: 'all 0.15s',
                  }}
                >
                  <svg width="8" height="8"><circle cx="4" cy="4" r="3.5" fill={color} /></svg>
                  {c.label}
                </span>
              );
            })}
          </div>
          <span style={{ marginLeft: 'auto', fontSize: '10px', color: 'var(--text-secondary)' }}>
            Dot size = severity · Hover to inspect · Click to open
          </span>
        </div>

        <div style={{ padding: '12px 16px 16px' }}>
          <GanttTimeline
            clusters={clusters}
            allIncidents={allIncidents}
            highlightCluster={highlightCluster}
            setHighlightCluster={setHighlightCluster}
            onSelectIncident={handleDotClick}
            selectedIncidentId={selectedIncident?.IncidentId}
          />
        </div>
      </div>

      {/* ── Section 2: Campaign Cards ── */}
      <div style={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: '10px', overflow: 'hidden' }}>
        <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--text-secondary)' }}>
            Campaign Details
          </div>
          <span style={{ fontSize: '12px', fontFamily: 'monospace', color: '#a855f7' }}>
            {total_clusters} campaign{total_clusters !== 1 ? 's' : ''}
          </span>
          <span style={{ fontSize: '12px', fontFamily: 'monospace', color: 'var(--text-secondary)' }}>
            {total_noise} isolated
          </span>
        </div>

        <div style={{ padding: '16px' }}>
          {clusterList.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '32px', color: 'var(--text-secondary)', fontSize: '13px' }}>
              No campaign clusters detected. Try uploading more incidents or lowering the correlation threshold.
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '12px' }}>
              {clusterList.map(c => (
                <CampaignCard
                  key={c.id}
                  cluster={c}
                  correlations={correlations}
                  allIncidents={allIncidents}
                  highlighted={highlightCluster === c.id}
                  onMouseEnter={() => setHighlightCluster(c.id)}
                  onMouseLeave={() => setHighlightCluster(null)}
                />
              ))}
            </div>
          )}

          {noise.length > 0 && (
            <div style={{ marginTop: '12px', padding: '10px 14px', backgroundColor: 'var(--bg-primary)', border: '1px solid var(--border)', borderRadius: '6px' }}>
              <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '4px' }}>
                Isolated incidents ({noise.length}) — not part of any campaign
              </div>
              <div style={{ fontSize: '10px', fontFamily: 'monospace', color: 'var(--text-mono)' }}>
                {noise.slice(0, 10).join('  ·  ')}{noise.length > 10 ? ` +${noise.length - 10} more` : ''}
              </div>
            </div>
          )}
        </div>
      </div>

      {selectedIncident && (
        <IncidentDrawer incident={selectedIncident} clusters={clusters}
          correlations={correlations} allIncidents={allIncidents}
          onClose={() => setSelectedIncident(null)} />
      )}
    </div>
  );
}
