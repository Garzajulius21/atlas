import { useState } from 'react';
import {
  ScatterChart, Scatter, XAxis, YAxis, ZAxis,
  Tooltip, ResponsiveContainer, Cell
} from 'recharts';
import IncidentDrawer from './IncidentDrawer.jsx';
import CampaignExplainer from './CampaignExplainer.jsx';

const CLUSTER_COLORS = [
  '#f97316', // orange   — campaign 1
  '#8b5cf6', // violet   — campaign 2
  '#2dd4bf', // teal     — campaign 3
  '#f43f5e', // rose     — campaign 4
  '#38bdf8', // sky      — campaign 5
  '#84cc16', // lime     — campaign 6
  '#34d399', // emerald  — campaign 7
  '#fb923c', // amber    — campaign 8
  '#a78bfa', // lavender — campaign 9
  '#22d3ee', // cyan     — campaign 10
];

const ISOLATED_COLOR = '#6b7280'; // visible muted grey

const SEVERITY_SIZES = { High: 120, Medium: 80, Low: 55, Informational: 40 };

function getClusterColor(clusterId) {
  if (clusterId === null || clusterId === undefined) return ISOLATED_COLOR;
  return CLUSTER_COLORS[clusterId % CLUSTER_COLORS.length];
}



function CustomTooltip({ active, payload }) {
  if (!active || !payload?.length) return null;
  const d = payload[0]?.payload;
  if (!d) return null;
  const color = getClusterColor(d.clusterId);

  return (
    <div style={{
      backgroundColor: 'var(--bg-elevated)',
      border: `1px solid ${color}55`,
      borderRadius: '8px',
      padding: '10px 14px',
      fontSize: '12px',
      maxWidth: '280px',
      boxShadow: `0 4px 20px rgba(0,0,0,0.5)`,
    }}>
      <div style={{ fontFamily: 'monospace', fontSize: '10px', color: 'var(--text-secondary)', marginBottom: '4px' }}>
        {d.incidentId}
      </div>
      <div style={{ color: 'var(--text-primary)', fontWeight: 600, marginBottom: '6px', lineHeight: 1.4 }}>
        {d.title}
      </div>
      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
        <span style={{ fontSize: '10px', fontFamily: 'monospace', color, fontWeight: 700 }}>
          {d.clusterLabel}
        </span>
        <span style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>·</span>
        <span style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>{d.severity}</span>
        {d.department && (
          <>
            <span style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>·</span>
            <span style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>{d.department}</span>
          </>
        )}
      </div>
      <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '6px', fontStyle: 'italic' }}>
        Click to inspect
      </div>
    </div>
  );
}


export default function ClusterMap({ points, clusters, correlations, allIncidents }) {
  const [selectedIncident, setSelectedIncident] = useState(null);
  const [highlightCluster, setHighlightCluster] = useState(null);
  const [pinnedCluster, setPinnedCluster] = useState(null);
  const clusterLookup = Object.fromEntries(
    (clusters?.clusters || []).map(c => [c.id, c])
  );
  const pinnedClusterData = pinnedCluster !== null ? clusterLookup[pinnedCluster] : null;

  if (!points || points.length === 0) return null;

  const xDomain = [-110, 110];
  const yDomain = [-110, 110];

  // Group points by cluster label for separate Scatter series
  const groups = {};
  for (const p of points) {
    const key = p.clusterLabel;
    if (!groups[key]) groups[key] = { label: key, clusterId: p.clusterId, points: [] };
    groups[key].points.push(p);
  }

  const sortedGroups = Object.values(groups).sort((a, b) => {
    if (a.clusterId === null) return 1;
    if (b.clusterId === null) return -1;
    return a.clusterId - b.clusterId;
  });

  const handleDotClick = (data) => {
    if (!data) return;
    const inc = allIncidents?.find(i => i.IncidentId === data.incidentId);
    if (inc) setSelectedIncident(inc);
  };

  return (
    <>
      <div style={{
        backgroundColor: 'var(--bg-surface)',
        border: '1px solid var(--border)',
        borderRadius: '10px',
        overflow: 'hidden',
      }}>
        {/* Header */}
        <div style={{
          padding: '14px 16px',
          borderBottom: '1px solid var(--border)',
          display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap'
        }}>
          <div style={{ fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--text-secondary)' }}>
            Campaign Map
          </div>
          <div style={{ display: 'flex', gap: '8px', marginLeft: 'auto', flexWrap: 'wrap', alignItems: 'center' }}>
            {sortedGroups.filter(g => g.clusterId !== null).map(g => {
              const isPinned = pinnedCluster === g.clusterId;
              const color = getClusterColor(g.clusterId);
              return (
                <button
                  key={g.label}
                  onMouseEnter={() => setHighlightCluster(g.clusterId)}
                  onMouseLeave={() => setHighlightCluster(null)}
                  onClick={() => setPinnedCluster(isPinned ? null : g.clusterId)}
                  style={{
                    padding: '3px 10px', borderRadius: '4px', fontSize: '11px',
                    fontWeight: 600, fontFamily: 'monospace', cursor: 'pointer',
                    border: `1px solid ${isPinned ? color : color + '55'}`,
                    backgroundColor: isPinned ? `${color}30` : `${color}18`,
                    color,
                    transition: 'all 0.15s',
                    opacity: highlightCluster !== null && highlightCluster !== g.clusterId ? 0.4 : 1,
                  }}
                >
                  {g.label} · {isPinned ? 'Hide Intel ▲' : 'Campaign Intel ▾'}
                </button>
              );
            })}
            <span style={{ fontSize: '11px', fontFamily: 'monospace', color: 'var(--text-secondary)', padding: '3px 8px' }}>
              {groups['Isolated']?.points.length || 0} isolated
            </span>
          </div>
        </div>

        {/* Legend hint */}
        <div style={{ padding: '10px 20px 0', display: 'flex', gap: '16px', flexWrap: 'wrap', alignItems: 'center' }}>
          <span style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>
            Color = campaign membership &nbsp;·&nbsp; Size = severity &nbsp;·&nbsp; Gray = no campaign detected &nbsp;·&nbsp; Click any dot to inspect
          </span>
          {/* Isolated legend swatch */}
          <span style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '10px', color: 'var(--text-secondary)' }}>
            <svg width="10" height="10"><circle cx="5" cy="5" r="4" fill={ISOLATED_COLOR} fillOpacity={0.7} /></svg>
            Isolated
          </span>
        </div>

        {/* Explainer */}
        {pinnedClusterData && (
          <div style={{ padding: '0 16px' }}>
            <CampaignExplainer cluster={pinnedClusterData} correlations={correlations} />
          </div>
        )}

        {/* Chart */}
        <div style={{ padding: '8px 16px 16px' }}>
          {/* Container provides the dark background — recharts SVG is transparent */}
          <div style={{
            backgroundColor: 'var(--bg-primary)',
            border: '1px solid var(--border)',
            borderRadius: '8px',
            overflow: 'hidden',
          }}>
          <ResponsiveContainer width="100%" height={480}>
            <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
              <XAxis
                type="number" dataKey="x" domain={xDomain}
                tick={false} axisLine={false} tickLine={false}
              />
              <YAxis
                type="number" dataKey="y" domain={yDomain}
                tick={false} axisLine={false} tickLine={false}
              />
              <ZAxis type="number" dataKey="z" range={[40, 140]} />
              <Tooltip content={<CustomTooltip />} cursor={false} />
              {sortedGroups.map(group => {
                const color = getClusterColor(group.clusterId);
                const isIsolated = group.clusterId === null;
                const dimmed = highlightCluster !== null && highlightCluster !== group.clusterId && !isIsolated;

                return (
                  <Scatter
                    key={group.label}
                    name={group.label}
                    data={group.points.map(p => ({
                      ...p,
                      z: SEVERITY_SIZES[p.severity] || 50,
                    }))}
                    onClick={handleDotClick}
                    style={{ cursor: 'pointer' }}
                  >
                    {group.points.map((p, i) => {
                      const isSelected = selectedIncident?.IncidentId === p.incidentId;
                      return (
                        <Cell
                          key={i}
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

      {selectedIncident && (
        <IncidentDrawer
          incident={selectedIncident}
          clusters={clusters}
          correlations={correlations}
          allIncidents={allIncidents}
          onClose={() => setSelectedIncident(null)}
        />
      )}
    </>
  );
}

