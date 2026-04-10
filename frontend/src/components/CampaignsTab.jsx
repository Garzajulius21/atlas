/**
 * CampaignsTab — merges Campaign Map and Campaign detail cards into one view.
 * Layout follows Stephen Few's overview-first, detail-on-demand principle:
 *   1. Spatial map (overview)
 *   2. Campaign cards (detail)
 * Shared highlightCluster state links both sections — hover a card to
 * highlight its dots on the map and vice versa.
 */

import { useState } from 'react';
import {
  ScatterChart, Scatter, XAxis, YAxis, ZAxis,
  Tooltip, ResponsiveContainer, Cell
} from 'recharts';
import CampaignExplainer from './CampaignExplainer.jsx';
import IncidentDrawer from './IncidentDrawer.jsx';

const CLUSTER_COLORS = [
  '#f59e0b','#a855f7','#00ff88','#ff7b7b','#38bdf8',
  '#fb7185','#34d399','#fbbf24','#c084fc','#f97316',
];
const ISOLATED_COLOR = '#6b7280';
const SEVERITY_SIZES = { High: 120, Medium: 80, Low: 55, Informational: 40 };
const SEVERITY_COLORS = { High: '#ff7b7b', Medium: '#ffaa33', Low: '#f59e0b', Informational: '#5a7a9a' };
const SEV_ORDER = ['High', 'Medium', 'Low', 'Informational'];

function getClusterColor(clusterId) {
  if (clusterId === null || clusterId === undefined) return ISOLATED_COLOR;
  return CLUSTER_COLORS[clusterId % CLUSTER_COLORS.length];
}

// ── Shared tooltip ────────────────────────────────────────────────────────────
function MapTooltip({ active, payload }) {
  if (!active || !payload?.length) return null;
  const d = payload[0]?.payload;
  if (!d) return null;
  const color = getClusterColor(d.clusterId);
  return (
    <div style={{
      backgroundColor: '#13100a', border: `1px solid ${color}55`,
      borderRadius: '8px', padding: '10px 14px', fontSize: '12px',
      maxWidth: '280px', boxShadow: '0 4px 20px rgba(0,0,0,0.5)',
    }}>
      <div style={{ fontFamily: 'monospace', fontSize: '10px', color: '#7a6a4a', marginBottom: '4px' }}>{d.incidentId}</div>
      <div style={{ color: '#e8dcc8', fontWeight: 600, marginBottom: '6px', lineHeight: 1.4 }}>{d.title}</div>
      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
        <span style={{ fontSize: '10px', fontFamily: 'monospace', color, fontWeight: 700 }}>{d.clusterLabel}</span>
        <span style={{ fontSize: '10px', color: '#7a6a4a' }}>·</span>
        <span style={{ fontSize: '10px', color: '#7a6a4a' }}>{d.severity}</span>
        {d.department && <><span style={{ fontSize: '10px', color: '#7a6a4a' }}>·</span><span style={{ fontSize: '10px', color: '#7a6a4a' }}>{d.department}</span></>}
      </div>
      <div style={{ fontSize: '10px', color: '#7a6a4a', marginTop: '6px', fontStyle: 'italic' }}>Click to inspect</div>
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
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{
            width: '32px', height: '32px', borderRadius: '6px',
            backgroundColor: color + '20', border: `1px solid ${color}50`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '13px', fontWeight: 700, color, fontFamily: 'monospace',
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
            <div style={{ width: '100px' }}><CohesionBar value={cluster.cohesion} /></div>
          </div>
        </div>

        <SeverityBars breakdown={cluster.severity_breakdown} />

        {/* MITRE techniques */}
        {cluster.top_techniques.length > 0 && (
          <div>
            <div style={{ fontSize: '10px', color: 'var(--text-secondary)', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Top Techniques</div>
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
          <div style={{ fontSize: '10px', color: 'var(--text-secondary)', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Incidents</div>
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

  // Group map points by cluster
  const groups = {};
  for (const p of (points || [])) {
    const key = p.clusterLabel;
    if (!groups[key]) groups[key] = { label: key, clusterId: p.clusterId, points: [] };
    groups[key].points.push(p);
  }
  const sortedGroups = Object.values(groups).sort((a, b) => {
    if (a.clusterId === null) return 1;
    if (b.clusterId === null) return -1;
    return a.clusterId - b.clusterId;
  });
  const campaignGroups = sortedGroups.filter(g => g.clusterId !== null);

  const handleDotClick = (data) => {
    if (!data) return;
    const inc = allIncidents?.find(i => i.IncidentId === data.incidentId);
    if (inc) setSelectedIncident(inc);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

      {/* ── Section 1: Spatial overview ── */}
      <div style={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: '10px', overflow: 'hidden' }}>

        {/* Map header */}
        <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
          <div style={{ fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--text-secondary)' }}>
            Spatial Overview
          </div>
          {/* Campaign color swatches — hover to highlight */}
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', alignItems: 'center' }}>
            {campaignGroups.map(g => {
              const color = getClusterColor(g.clusterId);
              return (
                <span
                  key={g.label}
                  onMouseEnter={() => setHighlightCluster(g.clusterId)}
                  onMouseLeave={() => setHighlightCluster(null)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '5px',
                    fontSize: '10px', fontFamily: 'monospace', fontWeight: 600,
                    color, padding: '2px 8px', borderRadius: '4px', cursor: 'default',
                    backgroundColor: highlightCluster === g.clusterId ? color + '20' : 'transparent',
                    border: `1px solid ${highlightCluster === g.clusterId ? color + '60' : 'transparent'}`,
                    transition: 'all 0.15s',
                    opacity: highlightCluster !== null && highlightCluster !== g.clusterId ? 0.4 : 1,
                  }}
                >
                  <svg width="8" height="8"><circle cx="4" cy="4" r="3.5" fill={color} /></svg>
                  {g.label}
                </span>
              );
            })}
            <span style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '10px', color: 'var(--text-secondary)', padding: '2px 8px' }}>
              <svg width="8" height="8"><circle cx="4" cy="4" r="3.5" fill={ISOLATED_COLOR} /></svg>
              {groups['Isolated']?.points.length || 0} isolated
            </span>
          </div>
          <span style={{ marginLeft: 'auto', fontSize: '10px', color: 'var(--text-secondary)' }}>
            Color = campaign · Size = severity · Click dot to inspect
          </span>
        </div>

        {/* Scatter chart */}
        <div style={{ padding: '12px 16px 16px' }}>
          <div style={{ backgroundColor: '#0a0805', border: '1px solid #2e2410', borderRadius: '8px', overflow: 'hidden' }}>
            <ResponsiveContainer width="100%" height={420}>
              <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                <XAxis type="number" dataKey="x" domain={[-110, 110]} tick={false} axisLine={false} tickLine={false} />
                <YAxis type="number" dataKey="y" domain={[-110, 110]} tick={false} axisLine={false} tickLine={false} />
                <ZAxis type="number" dataKey="z" range={[40, 140]} />
                <Tooltip content={<MapTooltip />} cursor={false} />
                {sortedGroups.map(group => {
                  const color = getClusterColor(group.clusterId);
                  const isIsolated = group.clusterId === null;
                  const dimmed = highlightCluster !== null && highlightCluster !== group.clusterId && !isIsolated;
                  return (
                    <Scatter
                      key={group.label}
                      name={group.label}
                      data={group.points.map(p => ({ ...p, z: SEVERITY_SIZES[p.severity] || 50 }))}
                      onClick={handleDotClick}
                      style={{ cursor: 'pointer' }}
                    >
                      {group.points.map((p, i) => {
                        const isSelected = selectedIncident?.IncidentId === p.incidentId;
                        return (
                          <Cell key={i}
                            fill={isIsolated ? ISOLATED_COLOR : color}
                            fillOpacity={dimmed ? 0.1 : isIsolated ? 0.55 : 0.85}
                            stroke={isSelected ? '#ffffff' : isIsolated ? ISOLATED_COLOR : color}
                            strokeOpacity={dimmed ? 0.05 : isSelected ? 1 : 0.9}
                            strokeWidth={isSelected ? 3 : 1}
                          />
                        );
                      })}
                    </Scatter>
                  );
                })}
              </ScatterChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* ── Section 2: Campaign detail ── */}
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
