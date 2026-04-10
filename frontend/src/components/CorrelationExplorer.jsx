import { useState, useMemo } from 'react';
import IncidentDrawer from './IncidentDrawer.jsx';

const SEV_COLOR = {
  High: '#ff7b7b',
  Medium: '#f59e0b',
  Low: '#38bdf8',
  Informational: '#6b7280',
};

const CLUSTER_COLORS = [
  '#f59e0b','#a855f7','#00ff88','#ff7b7b','#38bdf8',
  '#fb7185','#34d399','#fbbf24','#c084fc','#f97316',
];

function getClusterColor(clusterId) {
  if (clusterId === null || clusterId === undefined) return '#4b5563';
  return CLUSTER_COLORS[clusterId % CLUSTER_COLORS.length];
}

function scoreColor(score) {
  if (score >= 0.75) return '#ff7b7b';
  if (score >= 0.55) return '#f59e0b';
  if (score >= 0.40) return '#38bdf8';
  return '#6b7280';
}

function scoreLabel(score) {
  if (score >= 0.75) return 'Very Strong';
  if (score >= 0.55) return 'Strong';
  if (score >= 0.40) return 'Moderate';
  return 'Weak';
}

function timeDeltaLabel(dtA, dtB) {
  if (!dtA || !dtB) return null;
  const diff = Math.abs(new Date(dtA) - new Date(dtB));
  const hours = diff / 3600000;
  if (hours < 1) return `${Math.round(hours * 60)}m apart`;
  if (hours < 24) return `${Math.round(hours)}h apart`;
  return `${Math.round(hours / 24)}d apart`;
}

function IncidentCard({ incident, clusters, correlations, allIncidents, side }) {
  const [open, setOpen] = useState(false);

  const clusterList = clusters?.clusters || [];
  const campaignId = clusterList.find(c => c.incident_ids?.includes(incident.IncidentId))?.id ?? null;
  const campaignLabel = campaignId !== null ? `Campaign ${campaignId + 1}` : null;
  const color = getClusterColor(campaignId);
  const sevColor = SEV_COLOR[incident.Severity] || '#6b7280';

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        style={{
          flex: 1, minWidth: 0,
          background: 'none', border: '1px solid var(--border)',
          borderRadius: '8px', padding: '10px 12px',
          cursor: 'pointer', textAlign: side === 'left' ? 'right' : 'left',
          transition: 'border-color 0.15s, background 0.15s',
        }}
        onMouseEnter={e => {
          e.currentTarget.style.borderColor = sevColor + '88';
          e.currentTarget.style.backgroundColor = sevColor + '0a';
        }}
        onMouseLeave={e => {
          e.currentTarget.style.borderColor = 'var(--border)';
          e.currentTarget.style.backgroundColor = 'transparent';
        }}
      >
        <div style={{
          fontSize: '10px', fontFamily: 'monospace', color: 'var(--text-secondary)',
          marginBottom: '3px',
        }}>
          {incident.IncidentId}
        </div>
        <div style={{
          fontSize: '12px', fontWeight: 600, color: 'var(--text-primary)',
          lineHeight: 1.4, marginBottom: '6px',
          whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
        }}>
          {incident.Title || incident.IncidentId}
        </div>
        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', justifyContent: side === 'left' ? 'flex-end' : 'flex-start' }}>
          <span style={{
            fontSize: '10px', fontWeight: 700, fontFamily: 'monospace',
            color: sevColor, backgroundColor: sevColor + '18',
            padding: '1px 6px', borderRadius: '3px',
          }}>
            {incident.Severity}
          </span>
          {campaignLabel && (
            <span style={{
              fontSize: '10px', fontFamily: 'monospace', fontWeight: 600,
              color, backgroundColor: color + '18',
              padding: '1px 6px', borderRadius: '3px',
            }}>
              {campaignLabel}
            </span>
          )}
          {incident.Department && (
            <span style={{
              fontSize: '10px', color: 'var(--text-secondary)',
              padding: '1px 6px', borderRadius: '3px',
              border: '1px solid var(--border)',
            }}>
              {incident.Department}
            </span>
          )}
        </div>
      </button>

      {open && (
        <IncidentDrawer
          incident={incident}
          clusters={clusters}
          correlations={correlations}
          allIncidents={allIncidents}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  );
}

function PairRow({ pair, incA, incB, clusters, correlations, allIncidents }) {
  const [expanded, setExpanded] = useState(false);
  const sc    = pair.score;
  const col   = scoreColor(sc);
  const delta = timeDeltaLabel(incA?.CreatedTime, incB?.CreatedTime);

  // Campaign context for collapsed row
  const clusterList = clusters?.clusters || [];
  const campA = clusterList.find(c => c.incident_ids?.includes(pair.a));
  const campB = clusterList.find(c => c.incident_ids?.includes(pair.b));
  const sameCampaign = campA && campB && campA.id === campB.id;
  const crossCampaign = campA && campB && campA.id !== campB.id;

  return (
    <div style={{
      border: '1px solid var(--border)',
      borderRadius: '8px',
      overflow: 'hidden',
      transition: 'border-color 0.15s',
    }}>
      {/* Score bar + summary row */}
      <button
        onClick={() => setExpanded(e => !e)}
        style={{
          width: '100%', background: 'none', border: 'none', cursor: 'pointer',
          padding: '10px 14px', display: 'flex', alignItems: 'center', gap: '12px',
          textAlign: 'left',
        }}
        onMouseEnter={e => e.currentTarget.style.backgroundColor = col + '08'}
        onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
      >
        {/* Score */}
        <div style={{ width: '72px', flexShrink: 0 }}>
          <div style={{ fontSize: '18px', fontWeight: 700, fontFamily: 'monospace', color: col, lineHeight: 1 }}>
            {Math.round(sc * 100)}%
          </div>
          <div style={{ fontSize: '9px', color: col, fontWeight: 600, marginTop: '2px' }}>
            {scoreLabel(sc)}
          </div>
          {/* Bar */}
          <div style={{ marginTop: '4px', height: '3px', borderRadius: '2px', backgroundColor: 'var(--border)', overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${sc * 100}%`, backgroundColor: col, borderRadius: '2px' }} />
          </div>
        </div>

        {/* Incident titles */}
        <div style={{ flex: 1, minWidth: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: '10px', fontFamily: 'monospace', color: 'var(--text-secondary)', marginBottom: '2px' }}>{pair.a}</div>
            <div style={{ fontSize: '12px', color: 'var(--text-primary)', fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {incA?.Title || pair.a}
            </div>
          </div>
          <div style={{ fontSize: '16px', color: 'var(--text-secondary)', flexShrink: 0 }}>↔</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: '10px', fontFamily: 'monospace', color: 'var(--text-secondary)', marginBottom: '2px' }}>{pair.b}</div>
            <div style={{ fontSize: '12px', color: 'var(--text-primary)', fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {incB?.Title || pair.b}
            </div>
          </div>
        </div>

        {/* Shared signals summary */}
        <div style={{ display: 'flex', gap: '6px', flexShrink: 0, alignItems: 'center', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
          {pair.shared_mitre?.length > 0 && (
            <span style={{ fontSize: '10px', fontFamily: 'monospace', color: '#a855f7', backgroundColor: 'rgba(168,85,247,0.12)', padding: '2px 7px', borderRadius: '3px' }}>
              {pair.shared_mitre.length} technique{pair.shared_mitre.length !== 1 ? 's' : ''}
            </span>
          )}
          {pair.shared_entities?.length > 0 && (
            <span style={{ fontSize: '10px', fontFamily: 'monospace', color: '#38bdf8', backgroundColor: 'rgba(56,189,248,0.12)', padding: '2px 7px', borderRadius: '3px' }}>
              {pair.shared_entities.length} entit{pair.shared_entities.length !== 1 ? 'ies' : 'y'}
            </span>
          )}
          {delta && (
            <span style={{ fontSize: '10px', color: 'var(--text-secondary)', padding: '2px 7px', borderRadius: '3px', border: '1px solid var(--border)' }}>
              {delta}
            </span>
          )}
          {sameCampaign && (
            <span style={{ fontSize: '10px', fontFamily: 'monospace', fontWeight: 600, padding: '2px 7px', borderRadius: '3px',
              backgroundColor: getClusterColor(campA.id) + '20', border: `1px solid ${getClusterColor(campA.id)}50`,
              color: getClusterColor(campA.id) }}>
              Same campaign
            </span>
          )}
          {crossCampaign && (
            <span style={{ fontSize: '10px', fontFamily: 'monospace', fontWeight: 600, padding: '2px 7px', borderRadius: '3px',
              backgroundColor: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.15)',
              color: 'var(--text-secondary)' }}>
              Cross-campaign
            </span>
          )}
          <span style={{ fontSize: '11px', color: 'var(--text-secondary)', marginLeft: '4px' }}>
            {expanded ? '▲' : '▾'}
          </span>
        </div>
      </button>

      {/* Expanded detail */}
      {expanded && (
        <div style={{ borderTop: '1px solid var(--border)', padding: '12px 14px', display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
          {/* Incident cards */}
          {incA && <IncidentCard incident={incA} clusters={clusters} correlations={correlations} allIncidents={allIncidents} side="left" />}
          {/* Middle: shared signals */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', minWidth: '180px', flex: '0 0 200px', alignItems: 'center', padding: '8px 0' }}>
            <div style={{ fontSize: '10px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--text-secondary)' }}>
              Shared Signals
            </div>
            {pair.shared_mitre?.length > 0 && (
              <div style={{ width: '100%' }}>
                <div style={{ fontSize: '10px', color: 'var(--text-secondary)', marginBottom: '5px', textAlign: 'center' }}>MITRE Techniques</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', justifyContent: 'center' }}>
                  {pair.shared_mitre.map(t => (
                    <a
                      key={t}
                      href={`https://attack.mitre.org/techniques/${t.replace('.', '/')}/`}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={e => e.stopPropagation()}
                      style={{
                        fontSize: '10px', fontFamily: 'monospace', fontWeight: 700,
                        color: '#a855f7', backgroundColor: 'rgba(168,85,247,0.15)',
                        padding: '2px 6px', borderRadius: '3px',
                        textDecoration: 'none', border: '1px solid rgba(168,85,247,0.3)',
                      }}
                    >
                      {t} ↗
                    </a>
                  ))}
                </div>
              </div>
            )}
            {pair.shared_entities?.length > 0 && (
              <div style={{ width: '100%' }}>
                <div style={{ fontSize: '10px', color: 'var(--text-secondary)', marginBottom: '5px', textAlign: 'center' }}>Shared Entities</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', justifyContent: 'center' }}>
                  {pair.shared_entities.map((e, i) => (
                    <span key={i} style={{
                      fontSize: '9px', fontFamily: 'monospace', color: '#38bdf8',
                      backgroundColor: 'rgba(56,189,248,0.1)', padding: '2px 6px',
                      borderRadius: '3px', border: '1px solid rgba(56,189,248,0.2)',
                      maxWidth: '140px', overflow: 'hidden', textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap', display: 'block',
                    }}>
                      {e}
                    </span>
                  ))}
                </div>
              </div>
            )}
            {delta && (
              <div style={{ fontSize: '10px', color: 'var(--text-secondary)', textAlign: 'center' }}>
                ⏱ {delta}
              </div>
            )}
          </div>
          {incB && <IncidentCard incident={incB} clusters={clusters} correlations={correlations} allIncidents={allIncidents} side="right" />}
        </div>
      )}
    </div>
  );
}

export default function CorrelationExplorer({ correlations, allIncidents, clusters }) {
  const [minScore, setMinScore]       = useState(35);
  const [search, setSearch]           = useState('');
  const [strengthFilter, setStrengthFilter] = useState(null); // 'verystrong'|'strong'|'moderate'|null

  const incidentLookup = useMemo(() => {
    const map = {};
    for (const inc of (allIncidents || [])) map[inc.IncidentId] = inc;
    return map;
  }, [allIncidents]);

  const pairs = correlations?.pairs || [];

  const filtered = useMemo(() => {
    const threshold = minScore / 100;
    return pairs.filter(p => {
      if (p.score < threshold) return false;
      if (strengthFilter === 'verystrong' && p.score < 0.75) return false;
      if (strengthFilter === 'strong'     && (p.score < 0.55 || p.score >= 0.75)) return false;
      if (strengthFilter === 'moderate'   && (p.score < 0.40 || p.score >= 0.55)) return false;
      if (search) {
        const q = search.toLowerCase();
        const a = incidentLookup[p.a];
        const b = incidentLookup[p.b];
        const titleA = (a?.Title || p.a).toLowerCase();
        const titleB = (b?.Title || p.b).toLowerCase();
        const techMatch = p.shared_mitre?.some(t => t.toLowerCase().includes(q));
        if (!titleA.includes(q) && !titleB.includes(q) && !techMatch &&
            !p.a.toLowerCase().includes(q) && !p.b.toLowerCase().includes(q)) return false;
      }
      return true;
    });
  }, [pairs, minScore, search, strengthFilter, incidentLookup]);

  if (!pairs.length) {
    return (
      <div style={{
        backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border)',
        borderRadius: '10px', padding: '48px', textAlign: 'center',
      }}>
        <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
          No correlated pairs found above threshold.
        </div>
      </div>
    );
  }

  // Stats
  const veryStrong = pairs.filter(p => p.score >= 0.75).length;
  const strong = pairs.filter(p => p.score >= 0.55 && p.score < 0.75).length;
  const moderate = pairs.filter(p => p.score >= 0.40 && p.score < 0.55).length;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

      {/* Header card */}
      <div style={{
        backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border)',
        borderRadius: '10px', padding: '16px 20px',
        display: 'flex', alignItems: 'center', gap: '24px', flexWrap: 'wrap',
      }}>
        <div>
          <div style={{ fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--text-secondary)', marginBottom: '2px' }}>
            Correlation Explorer
          </div>
          <div style={{ fontSize: '22px', fontWeight: 700, fontFamily: 'monospace', color: 'var(--text-primary)' }}>
            {filtered.length}
            <span style={{ fontSize: '13px', fontWeight: 400, color: 'var(--text-secondary)', marginLeft: '6px' }}>
              pair{filtered.length !== 1 ? 's' : ''} shown
            </span>
          </div>
        </div>

        {/* Strength breakdown — clickable filters */}
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          {[
            { label: 'Very Strong', key: 'verystrong', count: veryStrong, color: '#ff7b7b' },
            { label: 'Strong',      key: 'strong',     count: strong,     color: '#f59e0b' },
            { label: 'Moderate',    key: 'moderate',   count: moderate,   color: '#38bdf8' },
          ].map(({ label, key, count, color }) => {
            const active = strengthFilter === key;
            return (
              <button key={key}
                onClick={() => setStrengthFilter(active ? null : key)}
                style={{
                  textAlign: 'center', cursor: 'pointer', padding: '6px 12px',
                  borderRadius: '6px', border: `1px solid ${active ? color + '80' : 'var(--border)'}`,
                  backgroundColor: active ? color + '15' : 'transparent',
                  transition: 'all 0.15s',
                }}
                onMouseEnter={e => { if (!active) e.currentTarget.style.borderColor = color + '50'; }}
                onMouseLeave={e => { if (!active) e.currentTarget.style.borderColor = 'var(--border)'; }}
              >
                <div style={{ fontSize: '16px', fontWeight: 700, fontFamily: 'monospace', color }}>{count}</div>
                <div style={{ fontSize: '10px', color: active ? color : 'var(--text-secondary)' }}>{label}</div>
              </button>
            );
          })}
        </div>

        {/* Controls */}
        <div style={{ marginLeft: 'auto', display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '11px', color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>
              Min score: <span style={{ fontFamily: 'monospace', color: scoreColor(minScore / 100) }}>{minScore}%</span>
            </span>
            <input
              type="range" min={20} max={90} step={5} value={minScore}
              onChange={e => setMinScore(Number(e.target.value))}
              style={{ width: '100px', accentColor: '#f59e0b', cursor: 'pointer' }}
            />
          </div>
          <input
            type="text"
            placeholder="Search incidents or techniques…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{
              padding: '5px 10px', borderRadius: '5px', fontSize: '11px',
              border: '1px solid var(--border)', backgroundColor: 'var(--bg-primary)',
              color: 'var(--text-primary)', outline: 'none', width: '220px',
            }}
          />
        </div>
      </div>

      {/* Pairs list */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {filtered.length === 0 ? (
          <div style={{
            backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border)',
            borderRadius: '8px', padding: '32px', textAlign: 'center',
            fontSize: '13px', color: 'var(--text-secondary)',
          }}>
            No pairs match the current filters.
          </div>
        ) : (
          filtered.map((pair, i) => (
            <PairRow
              key={i}
              pair={pair}
              incA={incidentLookup[pair.a]}
              incB={incidentLookup[pair.b]}
              clusters={clusters}
              correlations={correlations}
              allIncidents={allIncidents}
            />
          ))
        )}
      </div>

      <div style={{ fontSize: '10px', color: 'var(--text-secondary)', textAlign: 'center', paddingBottom: '8px' }}>
        Scores weighted: 35% shared entities · 30% MITRE technique overlap · 25% time proximity · 10% severity match
      </div>
    </div>
  );
}
