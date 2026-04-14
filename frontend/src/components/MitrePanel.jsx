import { useState } from 'react';
import IncidentDrawer from './IncidentDrawer.jsx';

const TACTIC_ORDER = [
  'TA0001','TA0002','TA0003','TA0004','TA0005','TA0006',
  'TA0007','TA0008','TA0009','TA0010','TA0011','TA0040',
];

const CLUSTER_COLORS = [
  '#f59e0b','var(--accent)','#00ff88','#ff7b7b','#38bdf8',
  '#fb7185','#34d399','#fbbf24','var(--accent)','#f97316',
];

function getClusterColor(id) {
  if (id === null || id === undefined) return '#6b7280';
  return CLUSTER_COLORS[id % CLUSTER_COLORS.length];
}

function tacticUrl(id)   { return `https://attack.mitre.org/tactics/${id}/`; }
function techniqueUrl(t) { return `https://attack.mitre.org/techniques/${t.replace('.', '/')}/`; }

// ── Tactic card ───────────────────────────────────────────────────────────────
function TacticCell({ tactic, onDrillDown, isDrilled, maxCount }) {
  const covered   = tactic.count > 0;
  const intensity = covered ? Math.min(tactic.count / 10, 1) : 0;
  const barPct    = maxCount > 0 ? (tactic.count / maxCount) * 100 : 0;

  return (
    <div
      onClick={() => covered && onDrillDown(tactic)}
      style={{
        padding: '10px', borderRadius: '6px', position: 'relative',
        border: isDrilled
          ? '2px solid var(--accent-border)'
          : covered
            ? `1px solid rgba(129,140,248,${0.25 + intensity * 0.5})`
            : '1px solid rgba(255,68,68,0.25)',
        backgroundColor: isDrilled
          ? 'var(--accent-dim)'
          : covered
            ? `rgba(129,140,248,${0.06 + intensity * 0.18})`
            : 'rgba(255,68,68,0.04)',
        cursor: covered ? 'pointer' : 'default',
        transition: 'all 0.15s',
        minWidth: 0,
      }}
      onMouseEnter={e => { if (covered) e.currentTarget.style.borderColor = 'var(--accent)'; }}
      onMouseLeave={e => {
        if (covered && !isDrilled) e.currentTarget.style.borderColor = `rgba(129,140,248,${0.25 + intensity * 0.5})`;
        if (!covered) e.currentTarget.style.borderColor = 'rgba(255,68,68,0.25)';
      }}
    >
      {covered && (
        <a href={tacticUrl(tactic.id)} target="_blank" rel="noreferrer"
          onClick={e => e.stopPropagation()}
          style={{ position: 'absolute', top: '6px', right: '6px', fontSize: '9px', color: 'var(--accent-border)', textDecoration: 'none' }}
        >↗</a>
      )}

      <div style={{ fontSize: '10px', fontFamily: 'monospace', color: covered ? 'var(--accent)' : 'rgba(255,68,68,0.5)', marginBottom: '3px' }}>
        {tactic.id}
      </div>
      <div style={{ fontSize: '11px', fontWeight: 600, color: covered ? 'var(--text-primary)' : 'rgba(255,100,100,0.6)', marginBottom: '6px', lineHeight: 1.3 }}>
        {tactic.name}
      </div>

      {covered ? (
        <>
          <div style={{ fontSize: '16px', fontWeight: 700, fontFamily: 'monospace', color: 'var(--accent)' }}>
            {tactic.count}
            <span style={{ fontSize: '10px', color: 'var(--text-secondary)', fontWeight: 400, marginLeft: '4px' }}>incidents</span>
          </div>
          {/* Few-compliant length encoding — comparable across all cards */}
          <div style={{ height: '4px', backgroundColor: 'var(--border)', borderRadius: '2px', marginTop: '6px', marginBottom: '6px' }}>
            <div style={{ width: `${barPct}%`, height: '100%', backgroundColor: 'var(--accent)', borderRadius: '2px', opacity: 0.75, transition: 'width 0.4s' }} />
          </div>
          {/* Severity breakdown */}
          {tactic.severity_breakdown && (
            <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', marginBottom: '5px' }}>
              {[['High','#ff7b7b'],['Medium','#ffaa33'],['Low','#f59e0b'],['Informational','#5a7a9a']].map(([sev, color]) => {
                const n = tactic.severity_breakdown[sev] || 0;
                if (!n) return null;
                return (
                  <span key={sev} style={{
                    fontSize: '9px', fontFamily: 'monospace', fontWeight: 700,
                    color, backgroundColor: color + '18',
                    border: `1px solid ${color}44`,
                    padding: '0px 4px', borderRadius: '3px',
                  }}>{sev[0]}{n}</span>
                );
              })}
            </div>
          )}
          {/* Technique coverage fraction */}
          <div style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>
            {tactic.techniques.length}
            {tactic.total_known_techniques > 0 && (
              <span style={{ color: 'var(--accent-border)' }}>/{tactic.total_known_techniques}</span>
            )} technique{tactic.techniques.length !== 1 ? 's' : ''} observed
          </div>
          <div style={{ fontSize: '9px', color: 'var(--accent-border)', marginTop: '4px' }}>
            {isDrilled ? 'Click to close ▲' : 'Click to explore ▾'}
          </div>
        </>
      ) : (
        <>
          <div style={{ fontSize: '10px', fontWeight: 600, color: 'rgba(255,100,100,0.7)', marginBottom: '2px' }}>
            Coverage Gap
          </div>
          <div style={{ fontSize: '10px', color: 'rgba(255,100,100,0.5)', fontStyle: 'italic' }}>
            No incidents observed
          </div>
        </>
      )}
    </div>
  );
}

// ── Drill-down panel ──────────────────────────────────────────────────────────
function TacticDrillDown({ tactic, allIncidents, clusters, correlations, onClose }) {
  const [selectedIncident, setSelectedIncident] = useState(null);

  // Build campaignId lookup from clusters
  const incidentCampaignMap = {};
  for (const c of (clusters?.clusters || [])) {
    for (const id of c.incident_ids) incidentCampaignMap[id] = c.id;
  }

  const tacticTechs = new Set(tactic.techniques.map(t => t.toUpperCase()));

  const tacticIncidents = (allIncidents || [])
    .filter(inc => {
      const techs = (inc.MitreTechniques || '').split(',').map(t => t.trim().toUpperCase());
      return techs.some(t => tacticTechs.has(t));
    })
    .map(inc => {
      const techs = (inc.MitreTechniques || '').split(',').map(t => t.trim()).filter(Boolean);
      const matchedTechs = techs.filter(t => tacticTechs.has(t.toUpperCase()));
      return { ...inc, matchedTechs };
    });

  const SEVERITY_COLORS = {
    High:          { bg: 'rgba(255,68,68,0.15)',   border: 'rgba(255,68,68,0.4)',   text: '#ff7b7b' },
    Medium:        { bg: 'rgba(255,149,0,0.15)',   border: 'rgba(255,149,0,0.4)',   text: '#ffaa33' },
    Low:           { bg: 'rgba(245,158,11,0.12)',  border: 'rgba(245,158,11,0.35)', text: '#f59e0b' },
    Informational: { bg: 'rgba(90,122,154,0.15)',  border: 'rgba(90,122,154,0.4)',  text: '#5a7a9a' },
  };

  return (
    <>
      <div style={{
        marginTop: '12px',
        backgroundColor: 'var(--bg-primary)',
        border: '2px solid var(--accent-border)',
        borderRadius: '8px', overflow: 'hidden',
      }}>
        {/* Header */}
        <div style={{
          padding: '12px 16px', borderBottom: '1px solid var(--border)',
          backgroundColor: 'var(--accent-dim)',
          display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap',
        }}>
          <span style={{ fontSize: '10px', fontFamily: 'monospace', color: 'var(--accent)' }}>{tactic.id}</span>
          <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>{tactic.name}</span>
          <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
            {tacticIncidents.length} incident{tacticIncidents.length !== 1 ? 's' : ''}
          </span>
          <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
            {tactic.techniques.map(t => (
              <a key={t} href={techniqueUrl(t)} target="_blank" rel="noreferrer"
                style={{
                  padding: '1px 6px', borderRadius: '3px', fontSize: '10px', fontFamily: 'monospace',
                  textDecoration: 'none', backgroundColor: 'var(--accent-dim)',
                  border: '1px solid var(--accent-border)', color: 'var(--accent)', transition: 'border-color 0.15s',
                }}
                onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--accent)'}
                onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--accent-border)'}
              >{t} ↗</a>
            ))}
          </div>
          <a href={tacticUrl(tactic.id)} target="_blank" rel="noreferrer"
            style={{
              fontSize: '11px', color: 'var(--accent)', textDecoration: 'none',
              padding: '2px 8px', borderRadius: '4px',
              border: '1px solid var(--accent-border)',
              backgroundColor: 'var(--accent-dim)',
            }}
          >View on MITRE ↗</a>
          <button onClick={onClose} style={{
            marginLeft: 'auto', background: 'none', border: '1px solid var(--border)',
            borderRadius: '4px', color: 'var(--text-secondary)', cursor: 'pointer',
            fontSize: '12px', padding: '2px 8px',
          }}>✕</button>
        </div>

        {/* Incident list */}
        {tacticIncidents.length === 0 ? (
          <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '12px' }}>
            No incidents directly mapped to this tactic's techniques.
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ backgroundColor: 'var(--bg-surface)' }}>
                  {['ID', 'Title', 'Severity', 'Matched Technique', 'Campaign', 'Created', 'Department'].map(h => (
                    <th key={h} style={{
                      fontSize: '10px', fontWeight: 600, textTransform: 'uppercase',
                      letterSpacing: '0.08em', color: 'var(--text-secondary)',
                      padding: '8px 12px', textAlign: 'left', borderBottom: '1px solid var(--border)',
                    }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {tacticIncidents.map((inc, i) => {
                  const sev       = SEVERITY_COLORS[inc.Severity] || SEVERITY_COLORS.Informational;
                  const campaignId = incidentCampaignMap[inc.IncidentId];
                  const campColor  = campaignId !== undefined ? getClusterColor(campaignId) : null;
                  return (
                    <tr key={inc.IncidentId || i} onClick={() => setSelectedIncident(inc)}
                      style={{
                        cursor: 'pointer',
                        backgroundColor: i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.01)',
                        transition: 'background 0.1s',
                      }}
                      onMouseEnter={e => e.currentTarget.style.backgroundColor = 'var(--accent-dim)'}
                      onMouseLeave={e => e.currentTarget.style.backgroundColor = i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.01)'}
                    >
                      <td style={{ padding: '8px 12px', fontFamily: 'monospace', fontSize: '10px', color: 'var(--text-mono)', whiteSpace: 'nowrap', borderBottom: '1px solid var(--border)' }}>
                        {inc.IncidentId}
                      </td>
                      <td style={{ padding: '8px 12px', fontSize: '12px', maxWidth: '220px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', borderBottom: '1px solid var(--border)' }}>
                        {inc.Title}
                      </td>
                      <td style={{ padding: '8px 12px', borderBottom: '1px solid var(--border)' }}>
                        <span style={{
                          padding: '1px 7px', borderRadius: '3px', fontSize: '10px', fontWeight: 700,
                          fontFamily: 'monospace', backgroundColor: sev.bg, border: `1px solid ${sev.border}`, color: sev.text,
                        }}>{inc.Severity}</span>
                      </td>
                      {/* Matched technique — shows exactly why this incident appears here */}
                      <td style={{ padding: '8px 12px', borderBottom: '1px solid var(--border)' }}>
                        <div style={{ display: 'flex', gap: '3px', flexWrap: 'wrap' }}>
                          {inc.matchedTechs.map(t => (
                            <a key={t} href={techniqueUrl(t)} target="_blank" rel="noreferrer"
                              onClick={e => e.stopPropagation()}
                              style={{
                                padding: '1px 5px', borderRadius: '3px', fontSize: '10px', fontFamily: 'monospace',
                                textDecoration: 'none', backgroundColor: 'var(--accent-dim)',
                                border: '1px solid var(--accent-border)', color: 'var(--accent)',
                              }}
                            >{t} ↗</a>
                          ))}
                        </div>
                      </td>
                      {/* Campaign attribution */}
                      <td style={{ padding: '8px 12px', borderBottom: '1px solid var(--border)' }}>
                        {campColor ? (
                          <span style={{
                            padding: '1px 7px', borderRadius: '3px', fontSize: '10px', fontFamily: 'monospace',
                            backgroundColor: campColor + '20', border: `1px solid ${campColor}50`, color: campColor,
                          }}>
                            Campaign {(campaignId + 1)}
                          </span>
                        ) : (
                          <span style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>Isolated</span>
                        )}
                      </td>
                      <td style={{ padding: '8px 12px', fontSize: '10px', fontFamily: 'monospace', color: 'var(--text-secondary)', whiteSpace: 'nowrap', borderBottom: '1px solid var(--border)' }}>
                        {inc.CreatedTime ? inc.CreatedTime.slice(0, 16).replace('T', ' ') : '—'}
                      </td>
                      <td style={{ padding: '8px 12px', fontSize: '11px', color: 'var(--text-secondary)', borderBottom: '1px solid var(--border)' }}>
                        {inc.Department || '—'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {selectedIncident && (
        <IncidentDrawer incident={selectedIncident} clusters={clusters}
          correlations={correlations} allIncidents={allIncidents}
          onClose={() => setSelectedIncident(null)} />
      )}
    </>
  );
}

// ── Main panel ────────────────────────────────────────────────────────────────
export default function MitrePanel({ data, allIncidents, clusters, correlations }) {
  const [drilledTactic, setDrilledTactic] = useState(null);
  const [sortMode, setSortMode]           = useState('killchain'); // 'killchain' | 'active'

  if (!data) return null;
  const { tactic_coverage, top_techniques, covered_tactics, gap_tactics, total_unique_techniques } = data;

  const tacticMap  = Object.fromEntries((tactic_coverage || []).map(t => [t.id, t]));
  const maxCount   = Math.max(...(tactic_coverage || []).map(t => t.count), 1);

  const tacticIds  = sortMode === 'active'
    ? [...TACTIC_ORDER].sort((a, b) => (tacticMap[b]?.count || 0) - (tacticMap[a]?.count || 0))
    : TACTIC_ORDER;

  // Build technique → campaign map for top techniques attribution
  const techCampaignMap = {};
  for (const c of (clusters?.clusters || [])) {
    for (const id of c.incident_ids) {
      const inc = (allIncidents || []).find(i => i.IncidentId === id);
      if (!inc) continue;
      const techs = (inc.MitreTechniques || '').split(',').map(t => t.trim()).filter(Boolean);
      for (const t of techs) {
        if (!techCampaignMap[t]) techCampaignMap[t] = new Set();
        techCampaignMap[t].add(c.id);
      }
    }
  }

  const handleDrillDown = (tactic) =>
    setDrilledTactic(prev => prev?.id === tactic.id ? null : tactic);

  const coveredCount = covered_tactics?.length || 0;
  const gapCount     = gap_tactics?.length || 0;

  return (
    <div style={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: '10px', overflow: 'hidden' }}>

      {/* Header */}
      <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
        <div style={{ paddingLeft: '12px', borderLeft: '3px solid var(--accent)' }}>
          <div style={{ fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--text-secondary)' }}>
            MITRE ATT&CK Coverage
          </div>
          <div style={{ fontSize: '18px', fontWeight: 700, fontFamily: 'monospace', color: 'var(--text-primary)', lineHeight: 1.2, marginTop: '2px' }}>
            {coveredCount}
            <span style={{ fontSize: '12px', fontWeight: 400, color: 'var(--text-secondary)', marginLeft: '6px' }}>tactic{coveredCount !== 1 ? 's' : ''} observed</span>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '12px', marginLeft: 'auto', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '12px', fontFamily: 'monospace', color: '#ff7b7b' }}>{gapCount} gap{gapCount !== 1 ? 's' : ''}</span>
          <span style={{ fontSize: '12px', fontFamily: 'monospace', color: 'var(--text-secondary)' }}>{total_unique_techniques} unique techniques</span>
          <div style={{ display: 'flex', gap: '0', border: '1px solid var(--border)', borderRadius: '5px', overflow: 'hidden' }}>
            {[['killchain', 'Kill Chain'], ['active', 'Most Active']].map(([mode, label]) => (
              <button key={mode} onClick={() => setSortMode(mode)} style={{
                padding: '3px 10px', fontSize: '10px', fontWeight: 600, cursor: 'pointer',
                border: 'none', borderRight: mode === 'killchain' ? '1px solid var(--border)' : 'none',
                backgroundColor: sortMode === mode ? 'var(--accent-dim)' : 'transparent',
                color: sortMode === mode ? 'var(--accent)' : 'var(--text-secondary)',
                transition: 'all 0.15s',
              }}>{label}</button>
            ))}
          </div>
        </div>
      </div>

      <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '20px' }}>

        {/* Hint */}
        <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
          Indigo = incidents observed · <span style={{ color: 'rgba(255,100,100,0.7)' }}>Red border = coverage gap</span> · Click a covered tactic to drill down · ↗ opens MITRE ATT&CK
        </div>

        {/* Tactic grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(148px, 1fr))', gap: '8px' }}>
          {tacticIds.map(id => {
            const tactic = tacticMap[id];
            return tactic ? (
              <TacticCell key={id} tactic={tactic} onDrillDown={handleDrillDown} isDrilled={drilledTactic?.id === id} maxCount={maxCount} />
            ) : null;
          })}
        </div>

        {/* Drill-down */}
        {drilledTactic && (
          <TacticDrillDown
            tactic={drilledTactic}
            allIncidents={allIncidents}
            clusters={clusters}
            correlations={correlations}
            onClose={() => setDrilledTactic(null)}
          />
        )}

        {/* Top techniques */}
        {top_techniques?.length > 0 && (
          <div>
            <div style={{ fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-secondary)', marginBottom: '10px' }}>
              Top Techniques by Frequency
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              {top_techniques.map((item, i) => {
                const barPct     = top_techniques[0].count > 0 ? (item.count / top_techniques[0].count) * 100 : 0;
                const campaigns  = techCampaignMap[item.technique] ? [...techCampaignMap[item.technique]] : [];
                return (
                  <div key={item.technique} style={{
                    display: 'flex', alignItems: 'center', gap: '10px', padding: '7px 10px',
                    backgroundColor: i % 2 === 0 ? 'var(--bg-primary)' : 'transparent', borderRadius: '4px',
                  }}>
                    <a href={techniqueUrl(item.technique)} target="_blank" rel="noreferrer"
                      style={{ fontFamily: 'monospace', fontSize: '11px', color: 'var(--accent)', minWidth: '72px', textDecoration: 'none', fontWeight: 600, transition: 'color 0.15s' }}
                      onMouseEnter={e => e.currentTarget.style.color = 'var(--accent)'}
                      onMouseLeave={e => e.currentTarget.style.color = 'var(--accent)'}
                    >{item.technique} ↗</a>
                    <div style={{ flex: 1, height: '5px', backgroundColor: 'var(--border)', borderRadius: '2px' }}>
                      <div style={{ width: `${barPct}%`, height: '100%', backgroundColor: 'var(--accent)', borderRadius: '2px', opacity: 0.7 }} />
                    </div>
                    <span style={{ fontSize: '11px', fontFamily: 'monospace', color: 'var(--text-primary)', minWidth: '24px', textAlign: 'right' }}>{item.count}</span>
                    <span style={{ fontSize: '10px', color: 'var(--text-secondary)', minWidth: '130px' }}>{item.tactic_name}</span>
                    {/* Campaign attribution badges */}
                    <div style={{ display: 'flex', gap: '3px' }}>
                      {campaigns.slice(0, 4).map(cid => {
                        const color = getClusterColor(cid);
                        return (
                          <span key={cid} style={{
                            padding: '1px 5px', borderRadius: '3px', fontSize: '9px', fontFamily: 'monospace',
                            backgroundColor: color + '20', border: `1px solid ${color}50`, color,
                          }}>C{cid + 1}</span>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Coverage gap summary */}
        {gapCount > 0 && (
          <div style={{ padding: '14px 16px', backgroundColor: 'rgba(255,68,68,0.04)', border: '1px solid rgba(255,68,68,0.2)', borderRadius: '8px' }}>
            <div style={{ fontSize: '11px', fontWeight: 600, color: '#ff7b7b', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              Coverage Gaps — {gapCount} tactic{gapCount !== 1 ? 's' : ''} with no observed incidents
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
              {(gap_tactics || []).map(t => {
                const tactic = tacticMap[t];
                return tactic ? (
                  <a key={t} href={tacticUrl(t)} target="_blank" rel="noreferrer"
                    style={{
                      padding: '3px 10px', borderRadius: '4px', fontSize: '11px', textDecoration: 'none',
                      backgroundColor: 'rgba(255,68,68,0.08)', border: '1px solid rgba(255,68,68,0.3)',
                      color: '#ff7b7b', transition: 'border-color 0.15s',
                      display: 'flex', alignItems: 'center', gap: '5px',
                    }}
                    onMouseEnter={e => e.currentTarget.style.borderColor = 'rgba(255,68,68,0.6)'}
                    onMouseLeave={e => e.currentTarget.style.borderColor = 'rgba(255,68,68,0.3)'}
                  >
                    <span style={{ fontFamily: 'monospace', fontSize: '9px', opacity: 0.7 }}>{t}</span>
                    {tactic.name} ↗
                  </a>
                ) : null;
              })}
            </div>
            <div style={{ fontSize: '10px', color: 'rgba(255,100,100,0.6)', marginTop: '8px' }}>
              No incidents observed for these tactics in the current dataset. Absence may indicate a detection gap or that these phases were not part of the observed activity.
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
