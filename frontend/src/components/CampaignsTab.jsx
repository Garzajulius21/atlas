/**
 * CampaignsTab — overview-first campaign intelligence view.
 * Layout (Stephen Few, overview → detail):
 *   1. Campaign Timeline — incidents plotted at actual timestamps per campaign lane
 *   2. Campaign Detail cards — severity, MITRE, incidents, explainer
 *
 * Shared highlightCluster links both sections on hover.
 */

import { useState } from 'react';
import {
  ScatterChart, Scatter, XAxis, YAxis, ZAxis,
  Tooltip, ResponsiveContainer, Cell, ReferenceArea,
} from 'recharts';
import CampaignExplainer from './CampaignExplainer.jsx';
import IncidentDrawer from './IncidentDrawer.jsx';

const CLUSTER_COLORS = [
  '#f59e0b','#a855f7','#00ff88','#ff7b7b','#38bdf8',
  '#fb7185','#34d399','#fbbf24','#c084fc','#f97316',
];
const ISOLATED_COLOR = '#6b7280';
const SEVERITY_SIZES = { High: 130, Medium: 85, Low: 55, Informational: 38 };
const SEVERITY_COLORS = { High: '#ff7b7b', Medium: '#ffaa33', Low: '#f59e0b', Informational: '#5a7a9a' };
const SEV_ORDER = ['High', 'Medium', 'Low', 'Informational'];

function getClusterColor(clusterId) {
  if (clusterId === null || clusterId === undefined) return ISOLATED_COLOR;
  return CLUSTER_COLORS[clusterId % CLUSTER_COLORS.length];
}

// ── Timeline tooltip ──────────────────────────────────────────────────────────
function TimelineTooltip({ active, payload }) {
  if (!active || !payload?.length) return null;
  const d = payload[0]?.payload;
  if (!d) return null;
  const color = getClusterColor(d.clusterId);
  const time = new Date(d.x).toLocaleString([], {
    month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
  });
  return (
    <div style={{
      backgroundColor: '#13100a', border: `1px solid ${color}55`,
      borderRadius: '8px', padding: '10px 14px', fontSize: '12px',
      maxWidth: '300px', boxShadow: '0 4px 20px rgba(0,0,0,0.6)',
    }}>
      <div style={{ fontFamily: 'monospace', fontSize: '10px', color: '#7a6a4a', marginBottom: '4px' }}>
        {d.incidentId} · {time}
      </div>
      <div style={{ color: '#e8dcc8', fontWeight: 600, marginBottom: '6px', lineHeight: 1.4 }}>
        {d.title}
      </div>
      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
        <span style={{ fontSize: '10px', fontFamily: 'monospace', color, fontWeight: 700 }}>{d.clusterLabel}</span>
        <span style={{ fontSize: '10px', color: '#7a6a4a' }}>·</span>
        <span style={{ fontSize: '10px', color: SEVERITY_COLORS[d.severity] || '#7a6a4a' }}>{d.severity}</span>
        {d.department && (
          <><span style={{ fontSize: '10px', color: '#7a6a4a' }}>·</span>
          <span style={{ fontSize: '10px', color: '#7a6a4a' }}>{d.department}</span></>
        )}
      </div>
      <div style={{ fontSize: '10px', color: '#7a6a4a', marginTop: '6px', fontStyle: 'italic' }}>
        Click to inspect
      </div>
    </div>
  );
}

// ── Campaign Timeline ─────────────────────────────────────────────────────────
function CampaignTimeline({ clusters, allIncidents, highlightCluster, setHighlightCluster, onSelectIncident, selectedIncidentId }) {
  const campaignList = clusters?.clusters || [];

  // Build incidentId → clusterId map
  const incidentClusterMap = {};
  for (const c of campaignList) {
    for (const id of c.incident_ids) incidentClusterMap[id] = c.id;
  }

  // Parse incidents into timeline points
  const allPoints = [];
  for (const inc of (allIncidents || [])) {
    const ts = new Date(inc.CreatedTime).getTime();
    if (isNaN(ts)) continue;
    const clusterId = incidentClusterMap[inc.IncidentId];
    const lane = clusterId !== undefined ? clusterId : campaignList.length;
    allPoints.push({
      x: ts,
      y: lane,
      z: SEVERITY_SIZES[inc.Severity] || 50,
      incidentId: inc.IncidentId,
      title: inc.Title,
      severity: inc.Severity,
      clusterId: clusterId !== undefined ? clusterId : null,
      clusterLabel: clusterId !== undefined ? (campaignList[clusterId]?.label || `Campaign ${clusterId + 1}`) : 'Isolated',
      department: inc.Department,
    });
  }

  if (!allPoints.length) return null;

  const times = allPoints.map(p => p.x);
  const minT = Math.min(...times);
  const maxT = Math.max(...times);
  const span = maxT - minT;
  const pad = Math.max(span * 0.08, 3_600_000); // min 1h padding
  const xDomain = [minT - pad, maxT + pad];

  const numLanes = campaignList.length + 1; // last lane = isolated
  const yDomain = [-0.65, numLanes - 0.35];

  // Group by clusterId for separate Scatter series
  const groups = {};
  for (const p of allPoints) {
    const key = p.clusterId === null ? '__isolated' : `c${p.clusterId}`;
    if (!groups[key]) groups[key] = { clusterId: p.clusterId, points: [] };
    groups[key].points.push(p);
  }

  const formatTick = (ts) => {
    const d = new Date(ts);
    if (span < 86_400_000) return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    if (span < 7 * 86_400_000) return d.toLocaleDateString([], { month: 'short', day: 'numeric' }) + ' ' + d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
  };

  // Custom Y-axis tick: campaign label with color dot
  const CustomYTick = ({ x, y, payload }) => {
    const lane = payload.value;
    const isIsolated = lane === campaignList.length;
    const color = isIsolated ? ISOLATED_COLOR : getClusterColor(lane);
    const label = isIsolated ? 'Isolated' : (campaignList[lane]?.label || `Campaign ${lane + 1}`);
    // Truncate long labels
    const maxLen = 18;
    const display = label.length > maxLen ? label.slice(0, maxLen - 1) + '…' : label;
    return (
      <g transform={`translate(${x},${y})`}>
        <circle cx={-6} cy={1} r={3.5} fill={color} fillOpacity={isIsolated ? 0.5 : 0.9} />
        <text x={-14} y={0} dy={4} textAnchor="end" fontSize={10} fill={color}
          fontFamily="monospace" fillOpacity={isIsolated ? 0.6 : 1}>
          {display}
        </text>
      </g>
    );
  };

  const chartHeight = Math.max(300, numLanes * 72 + 70);

  return (
    <div style={{ backgroundColor: '#0a0805', border: '1px solid #2e2410', borderRadius: '8px', overflow: 'hidden' }}>
      <ResponsiveContainer width="100%" height={chartHeight}>
        <ScatterChart margin={{ top: 24, right: 28, bottom: 32, left: 160 }}>
          {/* Subtle alternating lane stripes */}
          {Array.from({ length: numLanes }, (_, i) => (
            i % 2 === 0
              ? <ReferenceArea key={i} y1={i - 0.5} y2={i + 0.5} fill="#ffffff" fillOpacity={0.015} />
              : null
          ))}

          <XAxis
            type="number" dataKey="x"
            domain={xDomain} scale="time"
            tickFormatter={formatTick}
            tick={{ fontSize: 10, fill: '#7a6a4a', fontFamily: 'monospace' }}
            axisLine={{ stroke: '#2e2410' }}
            tickLine={{ stroke: '#2e2410' }}
          />
          <YAxis
            type="number" dataKey="y"
            domain={yDomain}
            ticks={Array.from({ length: numLanes }, (_, i) => i)}
            tick={<CustomYTick />}
            axisLine={false}
            tickLine={false}
            width={155}
          />
          <ZAxis type="number" dataKey="z" range={[38, 140]} />
          <Tooltip content={<TimelineTooltip />} cursor={false} />

          {Object.values(groups).map(group => {
            const color = group.clusterId === null ? ISOLATED_COLOR : getClusterColor(group.clusterId);
            const isIsolated = group.clusterId === null;
            const dimmed = highlightCluster !== null && highlightCluster !== group.clusterId && !isIsolated;
            return (
              <Scatter
                key={group.clusterId === null ? 'isolated' : group.clusterId}
                data={group.points}
                onClick={(data) => onSelectIncident?.(data)}
                style={{ cursor: 'pointer' }}
              >
                {group.points.map((p, i) => {
                  const isSelected = selectedIncidentId === p.incidentId;
                  return (
                    <Cell key={i}
                      fill={color}
                      fillOpacity={dimmed ? 0.08 : isIsolated ? 0.45 : 0.88}
                      stroke={isSelected ? '#ffffff' : color}
                      strokeWidth={isSelected ? 3 : 1}
                      strokeOpacity={dimmed ? 0.04 : isSelected ? 1 : 0.85}
                    />
                  );
                })}
              </Scatter>
            );
          })}
        </ScatterChart>
      </ResponsiveContainer>
    </div>
  );
}

// ── Severity bars (Few-compliant horizontal) ──────────────────────────────────
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

  // Compute first/last seen from allIncidents
  const times = cluster.incident_ids
    .map(id => incidentMap[id]?.CreatedTime)
    .filter(Boolean)
    .map(t => new Date(t).getTime())
    .filter(t => !isNaN(t))
    .sort((a, b) => a - b);

  const firstSeen = times[0] ? new Date(times[0]).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : null;
  const lastSeen  = times[times.length - 1] ? new Date(times[times.length - 1]).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : null;

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

        {/* Severity bars — most important signal, prominent position */}
        <SeverityBars breakdown={cluster.severity_breakdown} />

        {/* Time window */}
        {firstSeen && (
          <div style={{ fontSize: '11px', color: 'var(--text-secondary)', fontFamily: 'monospace',
            backgroundColor: 'var(--bg-surface)', padding: '6px 10px', borderRadius: '4px',
            border: '1px solid var(--border)' }}>
            <span style={{ color: 'var(--text-primary)' }}>{firstSeen}</span>
            {lastSeen && lastSeen !== firstSeen && (
              <> <span style={{ color: 'var(--text-secondary)' }}>→</span> <span style={{ color: 'var(--text-primary)' }}>{lastSeen}</span></>
            )}
            <span style={{ marginLeft: '8px', color: 'var(--text-secondary)' }}>({cluster.time_span_hours.toFixed(0)}h)</span>
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

        {/* MITRE techniques */}
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

        {/* Incident IDs — clickable */}
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

  const handleDotClick = (data) => {
    if (!data) return;
    const inc = allIncidents?.find(i => i.IncidentId === data.incidentId);
    if (inc) setSelectedIncident(inc);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

      {/* ── Section 1: Campaign Timeline ── */}
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
                    opacity: highlightCluster !== null && highlightCluster !== c.id ? 0.4 : 1,
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
            Size = severity · Click dot to inspect
          </span>
        </div>

        <div style={{ padding: '12px 16px 16px' }}>
          <CampaignTimeline
            clusters={clusters}
            allIncidents={allIncidents}
            highlightCluster={highlightCluster}
            setHighlightCluster={setHighlightCluster}
            onSelectIncident={handleDotClick}
            selectedIncidentId={selectedIncident?.IncidentId}
          />
        </div>
      </div>

      {/* ── Section 2: Campaign Detail Cards ── */}
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
